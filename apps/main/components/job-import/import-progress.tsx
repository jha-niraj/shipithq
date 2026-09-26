"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, CircleAlert, RotateCcw } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from "@repo/ui/components/ui/input"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { cancelImport, getImport, resumeImport, type ImportView } from "@/actions/(main)/jobs/import.action"

/*
 * An import on its way (plan/job-import JI-7): the steps from the row's status,
 * polled every 2 seconds; the paste form when the link couldn't be read; the
 * reason when it failed. At READY the page re-renders as the job's rounds.
 */

const POLL_MS = 2000

type StepKey = "read" | "company" | "plan" | "rounds"
const ORDER: StepKey[] = ["read", "company", "plan", "rounds"]

/** Which step a status is on. */
const STEP_OF: Record<string, StepKey> = {
    QUEUED: "read", FETCHING: "read", NEEDS_TEXT: "read", EXTRACTING: "read",
    COMPANY: "company", PLANNING: "plan", ROUNDS: "rounds",
}

export function ImportProgress({ initial }: { initial: ImportView }) {
    const router = useRouter()
    const [view, setView] = useState(initial)
    const waiting = view.status === "NEEDS_TEXT"
    const finished = view.status === "READY" || view.status === "FAILED"

    useEffect(() => {
        if (waiting || finished) return
        let stop = false
        const tick = async () => {
            const r = await getImport(view.id)
            if (stop) return
            if (r.success) {
                setView(r.data)
                if (r.data.status === "READY") { router.refresh(); return }
                if (r.data.status === "FAILED" || r.data.status === "NEEDS_TEXT") return
            }
            setTimeout(() => void tick(), POLL_MS)
        }
        const t = setTimeout(() => void tick(), POLL_MS)
        return () => { stop = true; clearTimeout(t) }
    }, [view.id, waiting, finished, router])

    const current = STEP_OF[view.status]
    const at = current ? ORDER.indexOf(current) : view.status === "READY" ? ORDER.length : -1
    const label = (k: StepKey, done: boolean): string => {
        if (k === "read") return done ? "Read the job" : "Reading the job"
        if (k === "company") return done ? `Found the company${view.companyName ? `: ${view.companyName}` : ""}` : "Finding the company"
        if (k === "plan") return done ? "Planned the rounds" : "Planning the rounds"
        return done ? "Built the rounds" : (view.status === "ROUNDS" && view.step) || "Building the rounds"
    }

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <Link href="/jobs/import" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">
                <ArrowLeft className="h-4 w-4" /> Practise any job
            </Link>
            <PageHeader
                title={view.title ?? "Building your rounds"}
                subtitle={view.title
                    ? `${view.companyName ?? "The company"} · ${view.visibility === "PRIVATE" ? "private, only you see it" : "public, any student can practise it"}`
                    : "Reading the posting and designing its interview as rounds. This usually takes under a minute; you can leave and come back."}
            />

            {waiting ? (
                <NeedsText view={view} onChange={setView} />
            ) : view.status === "FAILED" ? (
                <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="flex items-start gap-2 font-medium text-neutral-900 dark:text-white"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {view.error === "Cancelled" ? "You cancelled this import." : "We couldn't build this one."}</p>
                    {view.error && view.error !== "Cancelled" && <p className="text-sm text-neutral-700 dark:text-neutral-300">{view.error}</p>}
                    {view.visibility === "PRIVATE" && view.isOwner && <p className="text-sm text-neutral-600 dark:text-neutral-400">Your credits were refunded.</p>}
                    <Button asChild variant="outline" size="sm" className="gap-1.5"><Link href="/jobs/import"><RotateCcw className="h-3.5 w-3.5" /> Try another link or paste the text</Link></Button>
                </div>
            ) : (
                <ol className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900" aria-live="polite">
                    {ORDER.map((k, i) => {
                        const done = i < at
                        const active = i === at
                        return (
                            <li key={k} className={cn("flex items-center gap-3 text-sm", done || active ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-neutral-500")}>
                                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", done ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 dark:border-neutral-700")}>
                                    {done ? <Check className="h-3.5 w-3.5" /> : active ? <InlineLoader size="sm" label={label(k, false)} /> : <span className="text-[11px]">{i + 1}</span>}
                                </span>
                                {label(k, done)}
                            </li>
                        )
                    })}
                    <li className="pt-2">
                        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                            <div className="h-full rounded-full bg-neutral-900 transition-all duration-700 dark:bg-white" style={{ width: `${Math.max(5, view.progress)}%` }} />
                        </div>
                    </li>
                </ol>
            )}
        </div>
    )
}

/** The link couldn't be read: paste the posting and the company, and the same import continues. */
function NeedsText({ view, onChange }: { view: ImportView; onChange: (v: ImportView) => void }) {
    const [text, setText] = useState("")
    const [company, setCompany] = useState(view.companyName ?? "")
    const [busy, setBusy] = useState<"resume" | "cancel" | null>(null)
    const ok = text.trim().length >= 200 && company.trim().length >= 2

    if (!view.canResume) {
        return <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">This import is waiting for its owner to paste the posting.</p>
    }
    const resume = async () => {
        setBusy("resume")
        const r = await resumeImport(view.id, { text, companyName: company })
        setBusy(null)
        if (!r.success) { toast.error(r.error); return }
        onChange({ ...view, status: "QUEUED", step: null, error: null, canResume: false })
    }
    const cancel = async () => {
        setBusy("cancel")
        const r = await cancelImport(view.id)
        setBusy(null)
        if (!r.success) { toast.error(r.error); return }
        const fresh = await getImport(view.id)
        onChange(fresh.success ? fresh.data : { ...view, status: "FAILED", error: "Cancelled" })
    }
    return (
        <form className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900" onSubmit={(e) => { e.preventDefault(); if (ok && !busy) void resume() }}>
            <div className="space-y-1">
                <p className="font-medium text-neutral-900 dark:text-white">We couldn&apos;t read that link</p>
                {view.error && <p className="text-sm text-neutral-600 dark:text-neutral-400">{view.error}</p>}
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Open the posting, copy its text, and paste it here. We&apos;ll carry on from there.</p>
            </div>
            <div className="space-y-2">
                <label htmlFor="needs-text" className="text-sm font-medium text-neutral-900 dark:text-white">The posting</label>
                <Textarea id="needs-text" value={text} onChange={(e) => setText(e.target.value)} className="min-h-[9rem] resize-y" maxLength={20_000} placeholder="The role, what you'd do, and what they ask for" />
                {text.trim().length > 0 && text.trim().length < 200 && <p className="text-xs text-neutral-500 dark:text-neutral-400">Paste the whole posting, not just the title.</p>}
            </div>
            <div className="space-y-2">
                <label htmlFor="needs-company" className="text-sm font-medium text-neutral-900 dark:text-white">Company</label>
                <Input id="needs-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} placeholder="Who is hiring?" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={!ok || busy !== null} className="gap-1.5">{busy === "resume" && <InlineLoader size="sm" />} Continue</Button>
                {view.isOwner && (
                    <Button type="button" variant="ghost" disabled={busy !== null} onClick={() => void cancel()} className="gap-1.5">
                        {busy === "cancel" && <InlineLoader size="sm" />} Cancel{view.visibility === "PRIVATE" ? " and refund" : ""}
                    </Button>
                )}
            </div>
        </form>
    )
}
