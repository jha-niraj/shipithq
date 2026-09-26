"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, CircleAlert, Clock, Lock, Play, RotateCcw, Send, Sparkles, Timer } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { startRound, type OverviewRound, type RoundsOverview, type SendSummary } from "@/actions/hiring/run.action"
import { OUTCOMES, OutcomeSelect, WithdrawButton } from "@/components/hiring/send-controls"
import type { RoundState } from "@/lib/hiring/round-state"
import { ROUND_TYPE_LABEL } from "@/lib/hiring/round-types"

/*
 * A pipeline's rounds for a student (plan/hiring-rounds HR-13): each round in
 * order with its gate, pass mark, time, price and where the student stands.
 * Starting a round opens the focused runner at /round/[attemptId].
 */

const TYPE_LABEL = ROUND_TYPE_LABEL
const AI_ASSESSED = new Set(["SYSTEM_DESIGN", "VOICE_BEHAVIOURAL", "VOICE_CULTURE"])

const when = (d: Date | string) => new Date(d).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })

/** `extra`: shown under the rounds (an imported job's rounds we can't run yet). */
export function RoundsOverviewView({ data, signedIn, extra }: { data: RoundsOverview; signedIn: boolean; extra?: React.ReactNode }) {
    const router = useRouter()
    const [busy, setBusy] = useState<string | null>(null)
    const ctx = data.context
    const input = ctx.kind === "job" ? { jobSlug: ctx.jobSlug } : ctx.kind === "import" ? { importId: ctx.importId } : { companySlug: ctx.companySlug, processId: ctx.processId }
    const backHref = ctx.kind === "job" ? `/jobs/${ctx.jobSlug}` : ctx.kind === "import" ? (ctx.companyHref ?? "/jobs") : `/companies/${ctx.companySlug}`
    const selfHref = ctx.kind === "job" ? `/jobs/${ctx.jobSlug}/rounds` : ctx.kind === "import" ? `/jobs/import/${ctx.importId}` : `/companies/${ctx.companySlug}/rounds/${ctx.processId}`
    const cleared = data.states.filter((s) => s.isCleared).length

    const start = async (round: OverviewRound) => {
        setBusy(round.id)
        const r = await startRound(input, round.id)
        if (!r.success) { setBusy(null); toast.error(r.error); return }
        router.push(`/round/${r.data.attemptId}`)
    }

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">
                <ArrowLeft className="h-4 w-4" /> {ctx.kind === "job" ? ctx.jobTitle : ctx.kind === "import" ? (ctx.companyHref ? ctx.companyName : "Jobs") : ctx.companyName}
            </Link>
            <PageHeader
                title={ctx.kind === "job" ? `Rounds for ${ctx.jobTitle}` : ctx.kind === "import" ? `Practise: ${ctx.jobTitle}` : `Practise: ${data.pipelineName}`}
                subtitle={ctx.kind === "job"
                    ? `${ctx.companyName} · ${data.rounds.length} rounds, taken in order. ${cleared} of ${data.rounds.length} cleared.`
                    : ctx.kind === "import"
                        ? `${ctx.companyName}${ctx.pending ? " (under review by ShipItHQ)" : ""} · ${data.rounds.length} rounds, taken in order. ${cleared} of ${data.rounds.length} cleared.`
                        : `ShipItHQ's rounds for this kind of role, not ${ctx.companyName}'s own process. Practice only.`}
            />

            {ctx.kind === "import" && (
                <p className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                    {ctx.companyVersion
                        ? <>{ctx.companyName}&apos;s own rounds for this role, set up by {ctx.companyName} from a student&apos;s import. Practice only: results aren&apos;t sent.</>
                        : <>Built by ShipItHQ from the posting: our best reading of how {ctx.companyName} interviews for this role, not its confirmed process. Practice only.</>}
                </p>
            )}

            {data.byShipItHQ && ctx.kind !== "import" && (
                <p className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                    By ShipItHQ. These rounds are for practice: results from them can&apos;t be sent to {ctx.companyName} until it claims its page and sets up its own.
                </p>
            )}

            {!signedIn && (
                <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                    <Link href={`/signin?callbackUrl=${encodeURIComponent(selfHref)}`} className="font-medium underline underline-offset-2">Sign in</Link> to take the rounds.
                </p>
            )}

            {ctx.kind === "job" && data.send && <SendBanner send={data.send} jobSlug={ctx.jobSlug} companyName={ctx.companyName} />}

            <ol className="space-y-3">
                {data.rounds.map((r, i) => (
                    <RoundRow key={r.id} round={r} state={data.states[i]!} busy={busy === r.id} disabled={!signedIn || busy !== null} onStart={() => void start(r)} />
                ))}
            </ol>

            {extra}

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Each attempt draws a new set of questions and runs on a timer; credits are held when it starts and refunded if it can&apos;t be scored. AI assistants are off while a round is running.
            </p>
        </div>
    )
}

function RoundRow({ round: r, state: s, busy, disabled, onStart }: { round: OverviewRound; state: RoundState; busy: boolean; disabled: boolean; onStart: () => void }) {
    const locked = s.status === "locked"
    return (
        <li className={cn("rounded-2xl border bg-white p-4 sm:p-5 dark:bg-neutral-900", locked ? "border-neutral-200 opacity-70 dark:border-neutral-800" : "border-neutral-200 dark:border-neutral-800")}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <span className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                    s.isCleared ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500" : "border-neutral-300 text-neutral-700 dark:border-neutral-600 dark:text-neutral-200",
                )}>
                    {s.isCleared ? <Check className="h-4 w-4" /> : r.number}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-neutral-900 dark:text-white">{r.title}</h3>
                        <span className={cn("rounded-md px-1.5 py-0.5 font-mono text-[11px]", r.gateMode === "HARD" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300")}>
                            {r.gateMode === "HARD" ? `Pass ${r.passMark} to go on` : `Advisory · ${r.passMark}`}
                        </span>
                        {AI_ASSESSED.has(r.type) && <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">AI-assessed</span>}
                        {r.aiWritten && <span title="Some of this round's questions were written by AI for this job and haven't been reviewed by ShipItHQ yet." className="rounded-md border border-dashed border-neutral-300 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:border-neutral-600 dark:text-neutral-300">AI-written, not yet reviewed</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                        {TYPE_LABEL[r.type] ?? r.type} · {r.timeLimitMinutes} min{r.type === "APTITUDE" ? ` · ${r.drawCount} questions` : ""} · {r.price > 0 ? `${r.price} credits` : "free"}
                    </p>
                    {r.description && <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{r.description}</p>}
                    <StatusLine state={s} />
                </div>
                <div className="shrink-0 sm:pt-0.5">
                    <Action round={r} state={s} busy={busy} disabled={disabled} onStart={onStart} />
                </div>
            </div>
        </li>
    )
}

function StatusLine({ state: s }: { state: RoundState }) {
    const bits: React.ReactNode[] = []
    if (s.best !== null) bits.push(<span key="best">Best {s.best}</span>)
    if (s.attempts > 0) bits.push(<span key="n">{s.attempts} {s.attempts === 1 ? "attempt" : "attempts"}</span>)
    if (s.status === "cooling_down" && s.availableAt) bits.push(<span key="cd" className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Next try {when(s.availableAt)}</span>)
    if (s.status === "in_progress") bits.push(<span key="ip" className="inline-flex items-center gap-1 text-neutral-900 dark:text-white"><Timer className="h-3 w-3" /> In progress</span>)
    if (!bits.length) return null
    return <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">{bits}</p>
}

function Action({ round: r, state: s, busy, disabled, onStart }: { round: OverviewRound; state: RoundState; busy: boolean; disabled: boolean; onStart: () => void }) {
    if (!r.runnable) return <span className="text-xs text-neutral-500 dark:text-neutral-400">Opens soon</span>
    if (s.status === "locked") return <span className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400"><Lock className="h-3.5 w-3.5" /> Locked</span>
    if (s.status === "in_progress" && s.liveAttemptId) {
        return <Button asChild size="sm" className="gap-1.5"><Link href={`/round/${s.liveAttemptId}`}><Play className="h-3.5 w-3.5" /> Resume</Link></Button>
    }
    if (s.status === "cooling_down") return <span className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400"><CircleAlert className="h-3.5 w-3.5" /> Cooling down</span>
    if (s.status === "cleared") {
        return s.canRetake
            ? <Button variant="outline" size="sm" className="gap-1.5" onClick={onStart} disabled={disabled}>{busy ? <InlineLoader size="sm" /> : <RotateCcw className="h-3.5 w-3.5" />} Retake</Button>
            : <span className="inline-flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400"><Check className="h-3.5 w-3.5" /> Cleared</span>
    }
    return (
        <Button size="sm" className="gap-1.5" onClick={onStart} disabled={disabled}>
            {busy ? <InlineLoader size="sm" /> : <Play className="h-3.5 w-3.5" />} {s.attempts > 0 ? "Try again" : "Start"}{r.price > 0 ? ` · ${r.price} cr` : ""}
        </Button>
    )
}

const SEND_STATUS: Record<string, string> = { SENT: "Sent", VIEWED: "Viewed by the team", INVITED: "Invited" }

/** Where sending stands (HR-17): send, sent (with withdraw), or why not yet. */
function SendBanner({ send, jobSlug, companyName }: { send: SendSummary; jobSlug: string; companyName: string }) {
    if (send.state === "blocked") {
        return (
            <p className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {send.message}
            </p>
        )
    }
    if (send.state === "declined") {
        return (
            <div className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="font-medium text-neutral-900 dark:text-white">{companyName} declined on {when(send.at)}</p>
                {send.feedback
                    ? <p className="whitespace-pre-line rounded-xl bg-neutral-50 p-3 text-sm text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">{send.feedback}</p>
                    : <p className="text-sm text-neutral-600 dark:text-neutral-400">They didn&apos;t add a message.</p>}
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{send.message}</p>
            </div>
        )
    }
    if (send.state === "invited") return <InvitedBanner send={send} companyName={companyName} />
    if (send.state === "ready") {
        return (
            <div className="flex flex-col gap-3 rounded-2xl border border-neutral-900 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white dark:bg-neutral-900">
                <div>
                    <p className="font-medium text-neutral-900 dark:text-white">{send.reusedFrom ? "You've already cleared these rounds" : "Every round cleared"}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {send.reusedFrom
                            ? `The rounds for ${send.reusedFrom} at ${companyName} are the same test. Send those results; no retake needed.`
                            : send.declinedFeedback !== null
                                ? `You have a new attempt since ${companyName} declined. Send your improved results.`
                                : `Choose what to send, preview exactly what ${companyName} will see, and send.`}
                    </p>
                </div>
                <Button asChild className="gap-1.5"><Link href={`/jobs/${jobSlug}/rounds/send`}><Send className="h-4 w-4" /> Send your results</Link></Button>
            </div>
        )
    }
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900">
            <div>
                <p className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-white"><Check className="h-4 w-4" /> {SEND_STATUS[send.status] ?? send.status}</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">You sent your results to {companyName} on {when(send.sentAt)}.</p>
            </div>
            {send.status !== "INVITED" && <WithdrawButton sendId={send.sendId} />}
        </div>
    )
}

/** Invited (HR-19): the inviter's contact, the conversation, and the outcome on both sides. */
function InvitedBanner({ send, companyName }: { send: Extract<SendSummary, { state: "invited" }>; companyName: string }) {
    return (
        <div className="space-y-3 rounded-2xl border border-neutral-900 bg-white p-4 dark:border-white dark:bg-neutral-900">
            <p className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-white"><Check className="h-4 w-4" /> {companyName} invited you to talk</p>
            {send.message && <p className="whitespace-pre-line text-sm text-neutral-700 dark:text-neutral-300">{send.message}</p>}
            {send.contact && <p className="text-sm text-neutral-700 dark:text-neutral-300">Your contact: {send.contact.name}, <a href={`mailto:${send.contact.email}`} className="underline underline-offset-2">{send.contact.email}</a></p>}
            <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3 text-sm dark:border-neutral-800">
                <Button asChild size="sm" variant="outline"><Link href="/inbox">Open the conversation</Link></Button>
                <OutcomeSelect sendId={send.sendId} initial={send.studentOutcome} companyName={companyName} />
                <span className="text-neutral-500 dark:text-neutral-400">{companyName} says: {send.companyOutcome ? OUTCOMES[send.companyOutcome] : "nothing yet"}</span>
            </div>
        </div>
    )
}
