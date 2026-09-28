"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, CircleAlert, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmDialog } from "@repo/ui/components/ui/confirm-dialog"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { finishScoring, saveAttempt, submitAttempt, type RunnerAttempt } from "@/actions/hiring/run.action"
import { DesignRunner, DesignSubmission } from "./design-runner"
import { DsaRunner } from "./dsa-runner"
import { VoiceRunner } from "./voice-runner"
import { TranscriptPane } from "@repo/ui/components/hiring/transcript-pane"
import { RunnerShell as Shell, useRoundClock } from "./runner-shell"

/*
 * The focused round runner (plan/hiring-rounds HR-13 layout, HR-14 aptitude).
 * A slim top bar: where this is, the round, the server's timer, progress and
 * Exit. Leaving keeps the timer running; answers are saved as they change. At
 * zero the attempt is handed in. Answers are never on the page before it is
 * scored.
 */

const SECTION: Record<string, string> = { QUANT: "Quant", LOGICAL: "Logical", VERBAL: "Verbal" }
const LETTERS = ["A", "B", "C", "D"]
const SAVE_DEBOUNCE_MS = 1200

export function RoundRunner({ attempt }: { attempt: RunnerAttempt }) {
    if (attempt.status === "SCORED" || attempt.status === "NOT_SCORED") return <Result attempt={attempt} />
    if (attempt.status === "SUBMITTED") return <Scoring attempt={attempt} />
    if (attempt.roundType === "SYSTEM_DESIGN") return <DesignRunner attempt={attempt} />
    if (attempt.roundType === "DSA") return <DsaRunner attempt={attempt} />
    if (attempt.voice) return <VoiceRunner attempt={attempt} />
    if (attempt.roundType !== "APTITUDE") {
        return (
            <Shell attempt={attempt} remaining={null} answered={0} total={0} onExit={null}>
                <p className="py-24 text-center text-neutral-600 dark:text-neutral-400">This round type opens soon.</p>
            </Shell>
        )
    }
    return <AptitudeRunner attempt={attempt} />
}

function AptitudeRunner({ attempt }: { attempt: RunnerAttempt }) {
    const router = useRouter()
    const questions = attempt.questions
    const [answers, setAnswers] = useState<Record<string, number>>(() => {
        const saved = (attempt.responses.answers ?? {}) as Record<string, unknown>
        return Object.fromEntries(Object.entries(saved).filter(([, v]) => typeof v === "number")) as Record<string, number>
    })
    const [index, setIndex] = useState(0)
    const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle")
    const [confirmSubmit, setConfirmSubmit] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Integrity signals (DoD 12): tab leaves, pastes, seconds on each question.
    const signals = useRef({ tabLeaves: 0, pastes: 0, seconds: questions.map(() => 0) })
    const shownAt = useRef(Date.now())
    const recordTime = useCallback(() => {
        const now = Date.now()
        signals.current.seconds[index] = (signals.current.seconds[index] ?? 0) + (now - shownAt.current) / 1000
        shownAt.current = now
    }, [index])

    const pending = useRef<{ tabLeaves: number; pastes: number }>({ tabLeaves: 0, pastes: 0 })
    const takeIntegrity = () => {
        recordTime()
        const delta = { tabLeaves: pending.current.tabLeaves, pastes: pending.current.pastes, secondsPerItem: signals.current.seconds.map((s) => Math.round(s)) }
        pending.current = { tabLeaves: 0, pastes: 0 }
        return delta
    }

    const save = useCallback(async (next: Record<string, number>) => {
        setSaving("saving")
        const r = await saveAttempt(attempt.id, { responses: { answers: next }, integrity: takeIntegrity() })
        setSaving(r.success ? "saved" : "error")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt.id, index])

    // Debounced autosave whenever an answer changes.
    const timer = useRef<number | null>(null)
    const first = useRef(true)
    useEffect(() => {
        if (first.current) { first.current = false; return }
        if (timer.current) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => void save(answers), SAVE_DEBOUNCE_MS)
        return () => { if (timer.current) window.clearTimeout(timer.current) }
    }, [answers, save])

    const submit = useCallback(async () => {
        if (submitting) return
        setSubmitting(true)
        if (timer.current) window.clearTimeout(timer.current)
        const r = await submitAttempt(attempt.id, { responses: { answers }, integrity: takeIntegrity() })
        if (!r.success) { setSubmitting(false); toast.error(r.error); return }
        router.refresh()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt.id, answers, submitting, router])

    // The server's clock; at zero, hand in what's there (an open "Submit?" dialog closes first:
    // the hand-in never waits on it).
    const remaining = useRoundClock(attempt, () => { setConfirmSubmit(false); void submit() })

    useEffect(() => {
        const onVis = () => { if (document.visibilityState === "hidden") { signals.current.tabLeaves++; pending.current.tabLeaves++ } }
        const onPaste = () => { signals.current.pastes++; pending.current.pastes++ }
        document.addEventListener("visibilitychange", onVis)
        document.addEventListener("paste", onPaste)
        return () => { document.removeEventListener("visibilitychange", onVis); document.removeEventListener("paste", onPaste) }
    }, [])

    const go = useCallback((i: number) => {
        if (i < 0 || i >= questions.length) return
        recordTime()
        setIndex(i)
    }, [questions.length, recordTime])
    const choose = useCallback((qid: string, option: number) => setAnswers((a) => ({ ...a, [qid]: option })), [])

    // Keys: 1-4 or A-D answer, arrows move.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return
            const q = questions[index]
            if (!q) return
            const k = e.key.toLowerCase()
            const byNumber = ["1", "2", "3", "4"].indexOf(k)
            const byLetter = ["a", "b", "c", "d"].indexOf(k)
            const pick = byNumber >= 0 ? byNumber : byLetter
            if (pick >= 0 && pick < q.options.length) { e.preventDefault(); choose(q.id, pick) }
            else if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1) }
            else if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1) }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [questions, index, choose, go])

    const answered = useMemo(() => questions.filter((q) => answers[q.id] !== undefined).length, [questions, answers])
    const unanswered = questions.length - answered
    const q = questions[index]

    const exit = async () => {
        if (timer.current) window.clearTimeout(timer.current)
        await saveAttempt(attempt.id, { responses: { answers }, integrity: takeIntegrity() })
        router.push(attempt.backHref)
    }

    return (
        <Shell attempt={attempt} remaining={remaining} answered={answered} total={questions.length} onExit={() => void exit()}>
            {q ? (
                // The question and its options on the left; the question grid, counts and Submit in a
                // sticky column on the right (plan/jobs-polish JP-8).
                <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
                    <div className="min-w-0">
                        <div className="mb-4 flex items-center justify-between gap-3 text-sm text-neutral-500 dark:text-neutral-400">
                            <span>Question {index + 1} of {questions.length}</span>
                            <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-xs dark:border-neutral-700">{SECTION[q.section] ?? q.section}</span>
                        </div>
                        <PromptText text={q.prompt} className="text-lg" />

                        <div role="radiogroup" aria-label={`Answers to question ${index + 1}`} className="mt-6 grid gap-2.5 sm:grid-cols-2">
                            {q.options.map((o, i) => {
                                const picked = answers[q.id] === i
                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        role="radio"
                                        aria-checked={picked}
                                        onClick={() => choose(q.id, i)}
                                        className={cn(
                                            "flex h-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                                            picked ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 bg-white hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600",
                                        )}
                                    >
                                        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium", picked ? "border-white/40 dark:border-neutral-900/30" : "border-neutral-300 text-neutral-600 dark:border-neutral-600 dark:text-neutral-300")}>{LETTERS[i]}</span>
                                        <span className="text-sm sm:text-base">{o}</span>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                            <Button variant="outline" onClick={() => go(index - 1)} disabled={index === 0} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Previous</Button>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400" aria-live="polite">
                                {saving === "saving" ? "Saving" : saving === "saved" ? "Saved" : saving === "error" ? "Not saved: check your connection" : ""}
                            </span>
                            {index < questions.length - 1
                                ? <Button onClick={() => go(index + 1)} className="gap-1.5">Next <ArrowRight className="h-4 w-4" /></Button>
                                : <Button onClick={() => setConfirmSubmit(true)} disabled={submitting} className="gap-1.5">{submitting && <InlineLoader size="sm" />} Submit</Button>}
                        </div>
                    </div>

                    <aside className="rounded-2xl border border-neutral-200 bg-white p-4 lg:sticky lg:top-20 dark:border-neutral-800 dark:bg-neutral-900">
                        <nav aria-label="Questions">
                            <p className="mb-3 text-xs font-medium text-neutral-500 dark:text-neutral-400">{questions.length} questions</p>
                            <div className="grid grid-cols-5 gap-1.5">
                                {questions.map((qq, i) => (
                                    <button
                                        key={qq.id}
                                        type="button"
                                        onClick={() => go(i)}
                                        aria-label={`Question ${i + 1}${answers[qq.id] !== undefined ? ", answered" : ""}`}
                                        aria-current={i === index ? "step" : undefined}
                                        className={cn(
                                            "h-9 rounded-lg border text-xs font-medium tabular-nums",
                                            answers[qq.id] !== undefined ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300",
                                            i === index && "ring-2 ring-neutral-400 ring-offset-2 ring-offset-white dark:ring-neutral-500 dark:ring-offset-neutral-900",
                                        )}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        </nav>
                        <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-neutral-200 pt-4 text-center dark:border-neutral-800">
                            <div><dd className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-white">{answered}</dd><dt className="text-xs text-neutral-500">answered</dt></div>
                            <div><dd className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-white">{unanswered}</dd><dt className="text-xs text-neutral-500">left</dt></div>
                        </dl>
                        <Button onClick={() => setConfirmSubmit(true)} disabled={submitting} className="mt-4 w-full gap-1.5">{submitting && <InlineLoader size="sm" />} Submit answers</Button>
                        <p className="mt-3 text-xs leading-5 text-neutral-500 dark:text-neutral-400">Keys: 1 to 4 (or A to D) to answer, arrow keys to move. Leaving the tab is recorded.</p>
                    </aside>

                    <ConfirmDialog
                        open={confirmSubmit}
                        onOpenChange={setConfirmSubmit}
                        title={unanswered > 0 ? `Submit with ${unanswered} unanswered?` : "Submit your answers?"}
                        description={unanswered > 0
                            ? "Unanswered questions count as wrong. Once submitted, the round is scored and can't be changed."
                            : "The round is scored straight away and your answers can't be changed after."}
                        confirmLabel="Submit"
                        cancelLabel="Keep going"
                        onConfirm={submit}
                    />
                </div>
            ) : (
                <p className="py-24 text-center text-neutral-600 dark:text-neutral-400">This attempt has no questions.</p>
            )}
        </Shell>
    )
}

/**
 * A question's text laid out as it was written (JP-8): its lines kept, a line ending in a
 * colon ("Conclusions:") as a label, and numbered lines ("I.", "II.", "1.", "a)") as an
 * indented list.
 */
const LIST_LINE = /^\s*((?:[IVX]+|\d+|[a-hA-H])[.)])\s+(.*)$/
export function PromptText({ text, className }: { text: string; className?: string }) {
    const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter((l, i, all) => l !== "" || (i > 0 && all[i - 1] !== ""))
    return (
        <div className={cn("space-y-1.5 leading-relaxed text-neutral-900 dark:text-white", className)}>
            {lines.map((line, i) => {
                const item = LIST_LINE.exec(line)
                if (item) {
                    return (
                        <p key={i} className="flex gap-2 pl-4">
                            <span className="shrink-0 font-medium tabular-nums text-neutral-500 dark:text-neutral-400">{item[1]}</span>
                            <span>{item[2]}</span>
                        </p>
                    )
                }
                if (line === "") return <div key={i} className="h-1" />
                // Words straight before a colon ("Statements:"), never an analogy's " : ".
                const label = /^([A-Za-z][A-Za-z ()/-]{1,38}[A-Za-z)]):\s*(.*)$/.exec(line)
                if (label && !label[2]) return <p key={i} className="pt-1 text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label[1]}</p>
                if (label) return <p key={i}><span className="font-medium">{label[1]}:</span> {label[2]}</p>
                return <p key={i}>{line}</p>
            })}
        </div>
    )
}

function Result({ attempt }: { attempt: RunnerAttempt }) {
    const r = attempt.result
    if (attempt.status === "NOT_SCORED" || !r || r.score === null) {
        return (
            <Shell attempt={attempt} remaining={null} answered={0} total={0} onExit={null}>
                <div className="mx-auto max-w-md px-4 py-24 text-center">
                    <CircleAlert className="mx-auto mb-3 h-6 w-6 text-neutral-500" />
                    <p className="font-medium text-neutral-900 dark:text-white">This attempt couldn&apos;t be scored</p>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Your credits were refunded, and you can start the round again straight away.</p>
                    {attempt.result?.notScoredReason && <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">Reason: {attempt.result.notScoredReason}</p>}
                    <Button asChild className="mt-6"><Link href={attempt.backHref}>Back to the rounds</Link></Button>
                </div>
            </Shell>
        )
    }
    const passed = r.score >= attempt.passMark
    const rubric = r.rubric
    const dsa = r.dsa
    const breakdown = r.breakdown
    const right = breakdown?.filter((b) => b.right).length ?? 0
    const unanswered = breakdown?.filter((b) => b.chosen === null).length ?? 0
    const wrong = (breakdown?.length ?? 0) - right - unanswered
    const minutes = attempt.timeTakenSec !== null ? `${Math.floor(attempt.timeTakenSec / 60)}m ${String(attempt.timeTakenSec % 60).padStart(2, "0")}s` : null
    const hasDetail = Boolean(rubric || dsa || breakdown || attempt.voice || attempt.roundType === "SYSTEM_DESIGN")

    return (
        <Shell attempt={attempt} remaining={null} answered={0} total={0} onExit={null}>
            {/* The result on the left, sticky; everything asked on the right, scrolling (JP-9). */}
            <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
                <aside className="space-y-4 lg:sticky lg:top-20">
                    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Your score</p>
                        <p className={cn("mt-1 text-5xl font-semibold tabular-nums", passed ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-900 dark:text-white")}>{r.score}</p>
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Pass mark {attempt.passMark}</p>
                        <p className={cn(
                            "mt-3 rounded-lg px-3 py-2 text-sm",
                            attempt.gateMode !== "HARD" ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                                : passed ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
                        )}>
                            {attempt.gateMode === "HARD"
                                ? passed ? "Cleared. The next round is open." : "Below the mark, so the next round stays locked. Retake free after the cool-down, or try again now for the round's credits."
                                : "Advisory: shown to the company, never blocks you."}
                        </p>
                        <dl className="mt-4 space-y-2 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
                            {breakdown && (
                                <>
                                    <Stat label="Right" value={right} />
                                    <Stat label="Wrong" value={wrong} />
                                    <Stat label="Unanswered" value={unanswered} />
                                </>
                            )}
                            {dsa && <Stat label="Tests passed" value={`${dsa.reduce((n, d) => n + d.passed, 0)} of ${dsa.reduce((n, d) => n + d.total, 0)}`} />}
                            {rubric && <Stat label="Scored by" value="AI, against the rubric" />}
                            {minutes && <Stat label="Time taken" value={minutes} />}
                        </dl>
                        <Button asChild className="mt-5 w-full"><Link href={attempt.backHref}>Back to the rounds</Link></Button>
                    </div>
                    {r.reviewMode !== "FULL" && (
                        <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs leading-5 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                            {r.reviewMode === "SCORE"
                                ? "Whoever set this round shows the score only, so the questions and answers stay private."
                                : "Whoever set this round shows which answers were right, not the correct answers."}
                        </p>
                    )}
                </aside>

                {hasDetail && (
                    <ScrollArea className="min-w-0 lg:h-[calc(100dvh-7.5rem)]" viewportClassName="lg:pr-3">
                        <div className="space-y-8 pb-4">
                {rubric && (
                    <section aria-label="Rubric" className="space-y-3">
                        {rubric.summary && <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-relaxed text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">{rubric.summary}</p>}
                        <ul className="space-y-3">
                            {rubric.criteria.map((c) => (
                                <li key={c.criterion} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <p className="text-sm font-medium text-neutral-900 dark:text-white">{c.criterion} <span className="font-normal text-neutral-500 dark:text-neutral-400">· weight {c.weight}%</span></p>
                                        <p className="shrink-0 font-mono text-sm tabular-nums text-neutral-900 dark:text-white">{c.score}/10</p>
                                    </div>
                                    <div className="mt-2 h-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
                                        <div className={cn("h-full rounded-full", c.score >= 7 ? "bg-emerald-600 dark:bg-emerald-500" : c.score >= 4 ? "bg-neutral-700 dark:bg-neutral-300" : "bg-rose-600 dark:bg-rose-500")} style={{ width: `${c.score * 10}%` }} />
                                    </div>
                                    {c.evidence && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{c.evidence}</p>}
                                </li>
                            ))}
                        </ul>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">AI-assessed. The company sees the same criteria and evidence.</p>
                    </section>
                )}

                            {attempt.roundType === "SYSTEM_DESIGN" && <DesignSubmission attempt={attempt} />}

                            {attempt.voice && (
                    <section aria-label="Transcript" className="">
                        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Transcript{attempt.voice.mode === "TYPED" ? " (typed)" : ""}</p>
                        <TranscriptPane turns={attempt.voice.turns} className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950" empty="No transcript." />
                    </section>
                )}

                            {dsa && (
                    <ol aria-label="Problems" className="space-y-3">
                        {dsa.map((d, i) => {
                            const code = ((attempt.responses.code ?? {}) as Record<string, { code?: unknown }>)[d.problemId]?.code
                            const samples = d.cases.filter((c) => !c.hidden)
                            return (
                                <li key={d.problemId} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <p className="text-sm font-medium text-neutral-900 dark:text-white">Problem {i + 1} · {d.title}</p>
                                        <p className="shrink-0 font-mono text-sm tabular-nums text-neutral-900 dark:text-white">{d.passed}/{d.total}</p>
                                    </div>
                                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                                        {d.status === "empty" ? "Not attempted." : d.status === "compile_error" ? "Didn't compile, so no tests passed." : `Samples ${d.samplePassed}/${d.sampleTotal}, hidden ${d.hiddenPassed}/${d.hiddenTotal}.`}
                                    </p>
                                    {samples.some((c) => !c.passed) && (
                                        <ul className="mt-2 space-y-1">
                                            {samples.filter((c) => !c.passed).map((c) => (
                                                <li key={c.id} className="text-xs text-neutral-600 dark:text-neutral-400">
                                                    <span className="text-rose-700 dark:text-rose-400">{c.timedOut ? "Timed out" : "Failed"}</span> {c.label}: expected <code className="font-mono">{c.expectedOutput.slice(0, 80)}</code>, got <code className="font-mono">{c.actualOutput.slice(0, 80) || "(nothing)"}</code>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {d.message && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-50 p-2 font-mono text-xs text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">{d.message}</pre>}
                                    {typeof code === "string" && d.status !== "empty" && (
                                        <details className="mt-3">
                                            <summary className="cursor-pointer text-xs font-medium text-neutral-600 dark:text-neutral-300">Your code ({d.language})</summary>
                                            <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-neutral-50 p-3 font-mono text-xs text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">{code}</pre>
                                        </details>
                                    )}
                                </li>
                            )
                        })}
                    </ol>
                )}

                            {breakdown && (
                                <ol aria-label="Your answers" className="space-y-3">
                                    {breakdown.map((b, i) => {
                                        const q = attempt.questions.find((x) => x.id === b.questionId)
                                        if (!q) return null
                                        return (
                                            <li key={b.questionId} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                                                <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                                    <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full", b.right ? "bg-emerald-600 text-white dark:bg-emerald-500" : "bg-rose-600 text-white dark:bg-rose-500")}>
                                                        {b.right ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                                    </span>
                                                    Question {i + 1} · {SECTION[q.section] ?? q.section}
                                                    {b.chosen === null && <span className="ml-1">· not answered</span>}
                                                </div>
                                                <PromptText text={q.prompt} className="text-sm" />
                                                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                                                    {q.options.map((o, oi) => {
                                                        const chosen = b.chosen === oi
                                                        const correct = b.correctIndex === oi
                                                        return (
                                                            <li key={oi} className={cn(
                                                                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                                                                correct ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200"
                                                                    : chosen ? "border-rose-600 bg-rose-50 text-rose-900 dark:border-rose-500 dark:bg-rose-950/40 dark:text-rose-200"
                                                                        : "border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-300",
                                                            )}>
                                                                <span className="font-medium">{LETTERS[oi]}</span>
                                                                <span className="min-w-0 flex-1">{o}</span>
                                                                {chosen && <span className="shrink-0 text-xs">Your answer</span>}
                                                                {correct && !chosen && <span className="shrink-0 text-xs">Correct</span>}
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                                {r.explanations?.[b.questionId] && <p className="mt-3 whitespace-pre-line text-sm text-neutral-600 dark:text-neutral-400">{r.explanations[b.questionId]}</p>}
                                            </li>
                                        )
                                    })}
                                </ol>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </Shell>
    )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
            <dd className="font-medium tabular-nums text-neutral-900 dark:text-white">{value}</dd>
        </div>
    )
}

/** Handed in but not scored yet (a timeout or a closed tab): score it now, then show the result. */
function Scoring({ attempt }: { attempt: RunnerAttempt }) {
    const router = useRouter()
    const [failed, setFailed] = useState(false)
    const alive = useRef(true)
    // Polls until the attempt leaves SUBMITTED: the judge and the design scorer
    // finish inside the first call; a voice round waits on its scoring job.
    const run = useCallback(async () => {
        setFailed(false)
        const until = Date.now() + 6 * 60_000
        while (alive.current && Date.now() < until) {
            const r = await finishScoring(attempt.id)
            if (!r.success) { setFailed(true); return }
            if (r.data.status !== "SUBMITTED") { router.refresh(); return }
            await new Promise((res) => setTimeout(res, 3000))
        }
        if (alive.current) setFailed(true)
    }, [attempt.id, router])
    useEffect(() => {
        alive.current = true
        void run()
        return () => { alive.current = false }
    }, [run])
    return (
        <Shell attempt={attempt} remaining={null} onExit={null}>
            <div className="flex flex-col items-center gap-3 px-4 py-24 text-center">
                {failed ? (
                    <>
                        <CircleAlert className="h-6 w-6 text-neutral-500" />
                        <p className="font-medium text-neutral-900 dark:text-white">Scoring didn&apos;t finish</p>
                        <Button onClick={() => void run()}>Try again</Button>
                    </>
                ) : (
                    <>
                        <InlineLoader size="md" />
                        <p className="font-medium text-neutral-900 dark:text-white">{attempt.roundType === "DSA" ? "Running every test on your code" : attempt.voice ? "Scoring your interview" : "Scoring your answer"}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{attempt.roundType === "DSA" ? "Hidden tests included. This takes a few seconds per problem." : attempt.voice ? "The transcript is read and scored against the rubric. Usually under a minute." : "Usually under 25 seconds."} If it can&apos;t be scored, your credits come back.</p>
                    </>
                )}
            </div>
        </Shell>
    )
}
