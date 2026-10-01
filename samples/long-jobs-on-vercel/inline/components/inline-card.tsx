"use client"

import { useState } from "react"
import { Elapsed } from "./elapsed"

type State =
    | { kind: "idle" }
    | { kind: "running"; since: number }
    | { kind: "done"; seconds: number; steps: number }
    | { kind: "failed"; status: number; seconds: number }

// Awaits the whole report in one request. The tab is the job: close it and nobody gets the answer.
export function InlineCard() {
    const [state, setState] = useState<State>({ kind: "idle" })

    async function run() {
        const since = Date.now()
        setState({ kind: "running", since })
        const res = await fetch("/api/report/inline", { method: "POST" })
        const seconds = Math.round((Date.now() - since) / 1000)
        if (!res.ok) return setState({ kind: "failed", status: res.status, seconds })
        const body = (await res.json()) as { lines: unknown[] }
        setState({ kind: "done", seconds, steps: body.lines.length })
    }

    return (
        <section className="card">
            <h2>Inline</h2>
            <p className="muted">One request awaits all 10 steps. The function may run for 60 seconds.</p>
            <button onClick={run} disabled={state.kind === "running"}>Run inline</button>
            {state.kind === "running" && <p>Waiting... <Elapsed since={state.since} /></p>}
            {state.kind === "done" && <p className="good">Done: {state.steps} steps in {state.seconds} s</p>}
            {state.kind === "failed" && <p className="bad">Failed with {state.status} after {state.seconds} s</p>}
        </section>
    )
}
