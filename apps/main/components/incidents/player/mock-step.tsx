"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Mic, RotateCcw } from "lucide-react"
import toast from "@repo/ui/components/ui/sonner"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { TranscriptPane } from "@repo/ui/components/hiring/transcript-pane"
import { cn } from "@repo/ui/lib/utils"
import { LiveInterview } from "@/components/voice/live-interview"
import { finishIncidentMock, listIncidentMocks, startIncidentMock, type IncidentMockView } from "@/actions/(main)/incidents/mock.action"
import { useGate } from "../sign-in-gate"

/**
 * Talk it through (plan/incidents INC-15): the case's incident lead asks what happened
 * and pushes on the half-right parts; the reader speaks (Sarvam) or types. The live
 * interview itself is the shared component used by mocks, rounds and standups; this
 * step owns starting a session (free, 3 a day), handing it in, and the feedback.
 */

type Content = { intro?: string; role?: string; opening: string; probe: string[]; minutes: number }

/**
 * `capped`: the closing talk (3 a day). A chapter's short talk is free and uncapped
 * (plan/incidents round 4). `onFinished` marks the step done once a talk is handed in.
 */
export function MockStep({ slug, stepKey, content, capped = false, onFinished }: { slug: string; stepKey: string; content: Content; capped?: boolean; onFinished?: () => void }) {
    const { signedIn, gate } = useGate()
    const [loading, setLoading] = useState(signedIn)
    const [sessions, setSessions] = useState<IncidentMockView[]>([])
    const [left, setLeft] = useState(3)
    const [starting, setStarting] = useState(false)

    useEffect(() => {
        if (!signedIn) return
        let gone = false
        void listIncidentMocks(slug, stepKey).then((r) => {
            if (gone) return
            setLoading(false)
            if (r.success) { setSessions(r.data.sessions); setLeft(r.data.leftToday) }
        })
        return () => { gone = true }
    }, [signedIn, slug, stepKey])

    const open = sessions.find((s) => s.status === "SCHEDULED" || s.status === "IN_PROGRESS")
    const done = sessions.filter((s) => s.status === "COMPLETED")

    const start = () => gate(async () => {
        setStarting(true)
        const r = await startIncidentMock(slug, stepKey)
        setStarting(false)
        if (!r.success) { toast.error(r.error); return }
        setSessions((s) => [r.data, ...s.filter((x) => x.id !== r.data.id)])
        if (capped) setLeft((n) => Math.max(0, n - 1))
    }, stepKey)

    const handIn = async (id: string) => {
        const r = await finishIncidentMock(id)
        if (!r.success) { toast.error(r.error); return }
        setSessions((s) => s.map((x) => (x.id === id ? r.data : x)))
        onFinished?.()
    }

    return (
        <div className="space-y-8">
            <div className="rounded-3xl bg-neutral-950 p-6 text-white ring-1 ring-white/10 sm:p-8">
                <div className="flex items-start gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Mic className="size-5" aria-hidden /></span>
                    <div className="min-w-0">
                        <p className="text-[16px] leading-7 text-neutral-200">{content.intro ?? `The incident lead will ask: "${content.opening}" Answer out loud or type. It takes about ${content.minutes} minutes.`}</p>
                        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-400">It will push on</p>
                        <ul className="mt-2 space-y-1.5">
                            {content.probe.map((p) => <li key={p} className="flex gap-2 text-[14px] leading-6 text-neutral-300"><span aria-hidden className="mt-2.5 size-1 shrink-0 rounded-full bg-neutral-500" />{p}</li>)}
                        </ul>
                        <p className="mt-4 font-mono text-[11px] text-neutral-400">About {content.minutes} minutes · free{capped ? `, ${signedIn ? `${left} left today` : "3 a day"}` : ""}</p>
                    </div>
                </div>
                {!open && (
                    <button
                        type="button"
                        onClick={start}
                        disabled={starting || (capped && signedIn && left === 0)}
                        className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200 disabled:opacity-40"
                    >
                        {starting ? <InlineLoader size="sm" /> : done.length ? <RotateCcw className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
                        {done.length ? "Talk it through again" : "Start the conversation"}
                    </button>
                )}
            </div>

            {loading && (
                <div className="space-y-3" aria-busy="true">
                    <ShimmerStyles />
                    <Shimmer className="h-6 w-48" />
                    <Shimmer className="h-40 w-full rounded-2xl" delay={0.05} />
                </div>
            )}

            {open && (
                <div className="overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-800">
                    <LiveInterview
                        voiceRef={{ kind: "incident", id: open.id }}
                        title={content.role ?? "Talk it through with the incident lead"}
                        allows={{ voice: true, typed: true }}
                        initial={{ mode: open.mode, consented: open.consented, turns: open.turns }}
                        ending={false}
                        onHandIn={() => handIn(open.id)}
                    />
                </div>
            )}

            {done.map((s, i) => <Feedback key={s.id} s={s} latest={i === 0} />)}
        </div>
    )
}

function Feedback({ s, latest }: { s: IncidentMockView; latest: boolean }) {
    const [showTranscript, setShowTranscript] = useState(false)
    const f = s.feedback
    return (
        <article className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
                    {latest ? "Your last conversation" : "Earlier"} · {new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
                {f && <span className={cn("rounded-full px-2.5 py-0.5 font-mono text-[12px] tabular-nums", f.score >= 70 ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300")}>{f.score}/100</span>}
            </div>
            {f ? (
                <>
                    <p className="mt-3 text-[15.5px] leading-7 text-neutral-800 dark:text-neutral-200">{f.summary}</p>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <div>
                            <p className="text-[13px] font-semibold text-neutral-900 dark:text-white">What you got right</p>
                            <ul className="mt-2 space-y-1.5">{f.strengths.map((x) => <li key={x} className="text-[14px] leading-6 text-neutral-700 dark:text-neutral-300">{x}</li>)}</ul>
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-rose-700 dark:text-rose-400">What was missing</p>
                            <ul className="mt-2 space-y-1.5">{f.gaps.map((x) => <li key={x} className="text-[14px] leading-6 text-neutral-700 dark:text-neutral-300">{x}</li>)}</ul>
                        </div>
                    </div>
                </>
            ) : (
                <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">Nothing was said in this one, so there is no feedback.</p>
            )}
            {s.turns.length > 0 && (
                <>
                    <button type="button" onClick={() => setShowTranscript((v) => !v)} className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
                        {showTranscript ? "Hide" : "Read"} the transcript <ChevronDown className={cn("size-3.5 transition-transform", showTranscript && "rotate-180")} aria-hidden />
                    </button>
                    {showTranscript && <TranscriptPane turns={s.turns} className="mt-3 max-h-96 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-900" />}
                </>
            )}
        </article>
    )
}
