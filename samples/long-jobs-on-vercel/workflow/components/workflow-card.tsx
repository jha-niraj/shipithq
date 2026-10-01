"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { STEPS, type StepResult } from "@/lib/report"

type Status = "pending" | "running" | "completed" | "failed" | "cancelled"

// Starts a run and keeps its id in the URL (?run=...). Close the tab, open the link again
// later, and the card picks up where the run is, not where the page was.
export function WorkflowCard() {
    const router = useRouter()
    const pathname = usePathname()
    const runId = useSearchParams().get("run")
    const [starting, setStarting] = useState(false)
    const [status, setStatus] = useState<Status | null>(null)
    const [done, setDone] = useState<StepResult[]>([])

    async function run() {
        setStarting(true)
        const res = await fetch("/api/report/workflow", { method: "POST" })
        const { runId } = (await res.json()) as { runId: string }
        setDone([])
        router.replace(`${pathname}?run=${runId}`)
        setStarting(false)
    }

    // Progress: read the run's stream line by line.
    useEffect(() => {
        if (!runId) return
        const abort = new AbortController()
        ;(async () => {
            const res = await fetch(`/api/report/workflow/${runId}/progress`, { signal: abort.signal })
            if (!res.body) return
            const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
            let buffer = ""
            for (;;) {
                const { value, done: end } = await reader.read()
                if (end) break
                buffer += value
                const lines = buffer.split("\n")
                buffer = lines.pop() ?? ""
                for (const line of lines) if (line) setDone((d) => [...d, JSON.parse(line) as StepResult])
            }
        })().catch(() => {})
        return () => abort.abort()
    }, [runId])

    // Status: ask every 5 seconds until the run ends.
    useEffect(() => {
        if (!runId) return
        let stop = false
        const tick = async () => {
            const res = await fetch(`/api/report/workflow/${runId}`)
            if (!res.ok) return
            const body = (await res.json()) as { status: Status }
            setStatus(body.status)
            if (!stop && (body.status === "pending" || body.status === "running")) setTimeout(tick, 5000)
        }
        tick()
        return () => {
            stop = true
        }
    }, [runId])

    return (
        <section className="card">
            <h2>With Workflow</h2>
            <p className="muted">Each step is its own function. The run has no time limit.</p>
            <button onClick={run} disabled={starting || status === "pending" || status === "running"}>Run with Workflow</button>
            {runId && (
                <>
                    <p>
                        {status === "completed" ? <span className="good">Done</span> : status === "failed" ? <span className="bad">Failed</span> : "Running"}
                        {" "}: {done.length} of {STEPS.length} steps
                    </p>
                    <ol>{done.map((s) => <li key={s.step}>{s.name}</li>)}</ol>
                    <p className="muted">Run {runId}. Close this tab and open the link again: the run carries on.</p>
                </>
            )}
        </section>
    )
}
