"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, CircleAlert, RotateCcw } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from "@repo/ui/components/ui/input"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { unwrapJobText } from "@repo/db/job-text"
import { Shimmer } from "@repo/ui/components/skeleton-kit"
import { cancelImport, getImport, resumeImport, type ImportAllowance, type ImportView } from "@/actions/(main)/jobs/import.action"
import { ImportForm } from "./import-form"
import { ImportReview } from "./import-review"

/*
 * "Practise any job" as one wizard on /jobs/import (plan/job-import JI-19): the page
 * title and the one stepper on the left, the current step on the right at full height.
 * No import yet: the paste form (and "Your imports" as a rail, JI-20). With `?id=`:
 * reading (polled every 2 seconds), the student's check, the paste form when a link
 * couldn't be read, the build's progress, or why it failed. At READY the rounds open
 * at /jobs/import/[id], the link students share.
 */

const POLL_MS = 2000

type StepKey = "read" | "company" | "plan" | "rounds"
const ORDER: StepKey[] = ["read", "company", "plan", "rounds"]

/** Which build step a status is on. */
const STEP_OF: Record<string, StepKey> = {
    QUEUED: "read", FETCHING: "read", NEEDS_TEXT: "read", EXTRACTING: "read",
    COMPANY: "company", PLANNING: "plan", ROUNDS: "rounds",
}

/** The one list of steps, the same before and after there's an import. */
const STEPS = [
    { title: "Paste the job", body: "Its link, or the posting's text. Reading it is free." },
    { title: "Check what we read", body: "Fix the title, company or any of the text. No AI yet." },
    { title: "Build the rounds", body: "We design its interview as rounds with pass marks." },
    { title: "Practise", body: "Clear a round to open the next." },
]

/** Where the wizard is: the form (0), a draft being read or checked (1), a build (2), ready (3). */
function stepOf(v: ImportView | null): number {
    if (!v) return 0
    if (v.status === "READY") return 3
    return v.draft ? 1 : 2
}

export function ImportWizard({ initial, allowance, company, rail }: {
    initial: ImportView | null
    allowance: ImportAllowance
    company?: string
    /** "Your imports", beside the form on wide screens (JI-20); only without an import. */
    rail?: React.ReactNode
}) {
    const router = useRouter()
    const [view, setView] = useState(initial)
    const waiting = view?.status === "NEEDS_TEXT" || view?.status === "REVIEW"
    const finished = view?.status === "READY" || view?.status === "FAILED"

    useEffect(() => {
        if (!view || waiting || finished) return
        let stop = false
        const tick = async () => {
            const r = await getImport(view.id)
            if (stop) return
            if (r.success) {
                setView(r.data)
                if (r.data.status === "READY") { router.replace(`/jobs/import/${r.data.id}`); return }
                if (r.data.status === "FAILED" || r.data.status === "NEEDS_TEXT" || r.data.status === "REVIEW") return
            }
            setTimeout(() => void tick(), POLL_MS)
        }
        const t = setTimeout(() => void tick(), POLL_MS)
        return () => { stop = true; clearTimeout(t) }
    }, [view?.id, waiting, finished, router]) // eslint-disable-line react-hooks/exhaustive-deps

    const step = stepOf(view)
    const failed = view?.status === "FAILED"
    const title = view?.title ?? (view?.facts?.title || null)
    const heading = !view ? "Practise any job"
        : view.draft ? (view.status === "REVIEW" ? "Check the job" : view.status === "NEEDS_TEXT" ? "Paste the posting" : "Reading the job")
            : title ?? "Building your rounds"
    const sub = !view ? "Paste a job from LinkedIn, a careers page or anywhere else. We read it, you check it, then we design its interview as rounds with pass marks."
        : view.draft
            ? view.status === "REVIEW" ? "This is what we read. Fix anything that's off, then build the rounds. Nothing is charged until you build." : "You'll check it before anything is built."
            : `${view.companyName ?? "The company"} · ${view.visibility === "PRIVATE" ? "private, only you see it" : "public, any student can practise it"}`

    return (
        <div className={cn(
            "page-frame grid gap-6 px-page py-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start",
            rail && !view && "xl:grid-cols-[16rem_minmax(0,1fr)_20rem]",
        )}>
            <aside className="space-y-5 lg:sticky lg:top-4">
                {view && (
                    <Link href="/jobs/import" className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                        <ArrowLeft className="h-4 w-4" /> Import another job
                    </Link>
                )}
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-neutral-900 break-words dark:text-white">{heading}</h1>
                    <p className="mt-1.5 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{sub}</p>
                </div>
                <ol className="relative flex gap-4 overflow-x-auto no-scrollbar lg:flex-col lg:gap-6" aria-label="Steps">
                    {STEPS.map((w, i) => {
                        const done = i < step
                        const active = i === step && !failed
                        return (
                            <li key={w.title} className="relative flex shrink-0 gap-3" aria-current={active ? "step" : undefined}>
                                {i < STEPS.length - 1 && <span aria-hidden className="absolute top-8 bottom-[-1.5rem] left-[13px] hidden w-px bg-neutral-200 lg:block dark:bg-neutral-800" />}
                                <span className={cn(
                                    "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                                    done || active ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400",
                                )}>{done ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
                                <span className="pt-0.5">
                                    <span className={cn("block text-sm font-medium", done || active ? "text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400")}>{w.title}</span>
                                    <span className="mt-1 hidden text-xs leading-5 text-neutral-600 lg:block dark:text-neutral-400">{w.body}</span>
                                </span>
                            </li>
                        )
                    })}
                </ol>
            </aside>

            <div className="min-w-0 space-y-5">
                {!view ? (
                    <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
                        <ImportForm allowance={allowance} company={company} onStarted={(id) => router.replace(`/jobs/import?id=${id}`)} />
                    </div>
                ) : <StepBody view={view} allowance={allowance} onChange={setView} />}
            </div>

            {rail && !view && <div className="min-w-0 xl:sticky xl:top-4">{rail}</div>}
        </div>
    )
}

/** The right column for an import. */
function StepBody({ view, allowance, onChange }: { view: ImportView; allowance: ImportAllowance; onChange: (v: ImportView) => void }) {
    const current = STEP_OF[view.status]
    const at = current ? ORDER.indexOf(current) : view.status === "READY" ? ORDER.length : -1
    const label = (k: StepKey, done: boolean): string => {
        if (k === "read") return done ? "Read the job" : "Reading the job"
        if (k === "company") return done ? `Found the company${view.companyName ? `: ${view.companyName}` : ""}` : "Finding the company"
        if (k === "plan") return done ? "Planned the rounds" : "Planning the rounds"
        return done ? "Built the rounds" : (view.status === "ROUNDS" && view.step) || "Building the rounds"
    }
    const reading = view.draft && (view.status === "QUEUED" || view.status === "FETCHING")
    const reviewing = view.status === "REVIEW" && view.isOwner
    return (
        <>
            {view.duplicateOf ? (
                <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="font-medium text-neutral-900 dark:text-white">This job was already built</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">Someone built the same job first, so you practise theirs for free. Nothing was charged.</p>
                    <Button asChild size="sm" className="gap-1.5"><Link href={`/jobs/import/${view.duplicateOf}`}>Open its rounds <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
                </div>
            ) : reviewing ? (
                <ImportReview view={view} allowance={allowance} onChange={onChange} />
            ) : view.status === "NEEDS_TEXT" ? (
                <NeedsText view={view} onChange={onChange} />
            ) : view.status === "FAILED" ? (
                <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="flex items-start gap-2 font-medium text-neutral-900 dark:text-white"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {view.error === "Cancelled" ? "You cancelled this import." : "We couldn't build this one."}</p>
                    {view.error && view.error !== "Cancelled" && <p className="text-sm text-neutral-700 dark:text-neutral-300">{view.error}</p>}
                    {view.visibility === "PRIVATE" && view.isOwner && !view.draft && view.error !== "Cancelled" && <p className="text-sm text-neutral-600 dark:text-neutral-400">Your credits were refunded.</p>}
                    <Button asChild variant="outline" size="sm" className="gap-1.5"><Link href="/jobs/import"><RotateCcw className="h-3.5 w-3.5" /> Try another link or paste the text</Link></Button>
                </div>
            ) : view.status === "READY" ? (
                <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="font-medium text-neutral-900 dark:text-white">Your rounds are ready</p>
                    <Button asChild size="sm" className="gap-1.5"><Link href={`/jobs/import/${view.id}`}>Practise <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
                </div>
            ) : reading ? (
                <ReadingSkeleton />
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

            {view.sourceText && !reviewing && !reading && !view.duplicateOf && <ReadFromPage text={unwrapJobText(view.sourceText).replace(/\*\*/g, "")} url={view.sourceUrl} />}
        </>
    )
}

/** The page is being read: the review step's shape, so nothing jumps when it lands. */
function ReadingSkeleton() {
    return (
        <div className="space-y-5" aria-busy="true" aria-live="polite">
            <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300"><InlineLoader size="sm" label="Reading the job" /> Reading the job. This takes a few seconds.</div>
            <div className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="space-y-2 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800"><Shimmer className="h-4 w-36" /><Shimmer className="h-3 w-72" /></div>
                <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
                    {[0, 1, 2].map((i) => <div key={i} className="space-y-1.5"><Shimmer className="h-3 w-16" /><Shimmer className="h-9 w-full rounded-md" /></div>)}
                </div>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800"><Shimmer className="h-8 w-56 rounded-md" /></div>
                <div className="space-y-3 px-5 py-4">
                    <Shimmer className="h-4 w-40" />
                    {["w-11/12", "w-full", "w-5/6", "w-full", "w-2/3"].map((w, i) => <Shimmer key={i} className={cn("h-3", w)} delay={i * 0.04} />)}
                    <Shimmer className="mt-4 h-4 w-32" />
                    {["w-5/6", "w-11/12", "w-3/5"].map((w, i) => <Shimmer key={i} className={cn("h-3", w)} delay={i * 0.04} />)}
                </div>
            </div>
        </div>
    )
}

/** What was read from the link, as the model gets it: so a student (and we) can see what a
 * site gave us before trusting the rounds built from it. */
function ReadFromPage({ text, url }: { text: string; url: string | null }) {
    const words = text.trim().split(/\s+/).length
    return (
        <section aria-label="What we read" className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">What we read from {url ? "the page" : "your paste"}</h2>
                <p className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                    {text.length.toLocaleString("en")} characters · {words.toLocaleString("en")} words
                    {url && <> · <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">open the posting</a></>}
                </p>
            </div>
            <ScrollArea className="max-h-[28rem]" viewportClassName="max-h-[28rem]">
                <pre className="whitespace-pre-wrap break-words px-5 py-4 font-sans text-sm leading-6 text-neutral-800 dark:text-neutral-200">{text}</pre>
            </ScrollArea>
        </section>
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
