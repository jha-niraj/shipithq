"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowDown, ArrowRight, ArrowUp, Check, RotateCcw, Volume2, VolumeX, X } from "lucide-react"
import { cn } from "../../lib/utils"
import { grade, isAnswered, scrambled, type QuizQuestion, type QuizResponse, type QuizResult } from "../../lib/quiz"

/**
 * The shared quiz runner (plan/incidents INC-19). One question at a time on one page:
 * answer, Next, Next, and on the last page the score with every question's right
 * answer and explanation. Four kinds (lib/quiz.ts): single choice, true or false, sort
 * into buckets, put in order. No drag and drop is needed: buckets are chosen per item,
 * order moves with up and down, so it works by keyboard and on a phone.
 *
 * `speak`, when given, adds a "Read aloud" switch (off until the reader turns it on, and
 * remembered): each question is read out as it appears. It returns an audio URL.
 *
 * `onComplete` receives the results once, when the reader finishes; the caller saves
 * them. `initial` shows a finished attempt's results straight away. Monochrome with
 * `dark:` pairs; right is ink, wrong is rose.
 */

const READ_ALOUD_KEY = "quiz:read-aloud"

/** What a "pick" question's figure gets: the parts picked, a toggle, and (in the results) the answer to show. */
export type PickFigureProps = { q: Extract<QuizQuestion, { kind: "pick" }>; picked: string[]; toggle?: (id: string) => void; answer?: string[] }

export function QuizRunner({ questions, title, onComplete, initial, onRetake, retakeLabel = "Try again", className, speak, figure }: {
    questions: QuizQuestion[]
    title?: string
    onComplete?: (results: QuizResult[]) => void | Promise<void>
    /** A finished attempt to show as results. */
    initial?: QuizResult[] | null
    /** Called when the reader starts again; the quiz resets either way. */
    onRetake?: () => void
    retakeLabel?: string
    className?: string
    /** Audio for a question, for the opt-in read-aloud switch. */
    speak?: (questionId: string) => Promise<string | null>
    /** Draws a "pick" question's figure (the host's diagram), tappable (INC-71). */
    figure?: (props: PickFigureProps) => React.ReactNode
}) {
    const reduced = useReducedMotion()
    const [index, setIndex] = useState(0)
    const [responses, setResponses] = useState<Record<string, QuizResponse>>({})
    const [results, setResults] = useState<QuizResult[] | null>(initial ?? null)
    const [saving, setSaving] = useState(false)

    const q = questions[index]
    const answered = q ? isAnswered(q, responses[q.id]) : false

    // Read aloud: opt-in, remembered, one question at a time.
    const [aloud, setAloud] = useState(false)
    const player = useRef<HTMLAudioElement | null>(null)
    useEffect(() => { try { setAloud(localStorage.getItem(READ_ALOUD_KEY) === "1") } catch { /* private window */ } }, [])
    useEffect(() => {
        if (!aloud || !speak || !q || results) return
        let live = true
        void speak(q.id).then((url) => {
            if (!live || !url) return
            player.current?.pause()
            const a = new Audio(url)
            player.current = a
            void a.play().catch(() => undefined)
        })
        return () => { live = false; player.current?.pause() }
    }, [aloud, speak, q, results])
    const toggleAloud = () => setAloud((v) => {
        const next = !v
        try { localStorage.setItem(READ_ALOUD_KEY, next ? "1" : "0") } catch { /* ignore */ }
        if (!next) player.current?.pause()
        return next
    })
    const last = index === questions.length - 1

    const finish = async () => {
        const out = questions.map((qq) => ({ questionId: qq.id, response: responses[qq.id]!, correct: grade(qq, responses[qq.id]) }))
        setSaving(true)
        try { await onComplete?.(out) } finally { setSaving(false) }
        setResults(out)
    }

    if (results) {
        return <Results questions={questions} results={results} className={className} retakeLabel={retakeLabel} figure={figure} onRetake={() => { onRetake?.(); setResults(null); setResponses({}); setIndex(0) }} />
    }
    if (!q) return null

    return (
        <div className={cn("rounded-3xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950", className)}>
            <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
                <div className="flex min-w-0 items-center gap-3">
                    <p className="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">{title ?? "Check"} · {index + 1} of {questions.length}</p>
                    {speak && (
                        <button type="button" onClick={toggleAloud} aria-pressed={aloud} title={aloud ? "Stop reading questions aloud" : "Read questions aloud"}
                            className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors", aloud ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 text-neutral-500 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400")}>
                            {aloud ? <Volume2 className="size-3" aria-hidden /> : <VolumeX className="size-3" aria-hidden />} Read aloud
                        </button>
                    )}
                </div>
                <div className="flex gap-1" aria-hidden>
                    {questions.map((qq, i) => (
                        <span key={qq.id} className={cn("h-1.5 w-6 rounded-full transition-colors", i < index || (i === index && answered) ? "bg-neutral-900 dark:bg-white" : i === index ? "bg-neutral-400 dark:bg-neutral-600" : "bg-neutral-200 dark:bg-neutral-800")} />
                    ))}
                </div>
            </div>
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={q.id}
                    initial={reduced ? { opacity: 1 } : { opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduced ? { opacity: 1 } : { opacity: 0, x: -16 }}
                    transition={{ duration: 0.22 }}
                    className="p-5 sm:p-7"
                >
                    <p className="text-[18px] font-semibold leading-snug tracking-tight text-neutral-900 dark:text-white">{q.prompt}</p>
                    <div className="mt-5">
                        <Answer q={q} value={responses[q.id]} onChange={(v) => setResponses((r) => ({ ...r, [q.id]: v }))} figure={figure} />
                    </div>
                </motion.div>
            </AnimatePresence>
            <div className="flex items-center justify-between gap-3 border-t border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
                <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="h-10 rounded-xl px-3 text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-40 dark:text-neutral-400 dark:hover:text-white">
                    Back
                </button>
                <button
                    type="button"
                    disabled={!answered || saving}
                    onClick={() => (last ? void finish() : setIndex((i) => i + 1))}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-900 px-5 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-2px_0_rgba(0,0,0,0.4)] transition-colors hover:bg-neutral-800 disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                    {last ? "See results" : "Next"} <ArrowRight className="size-4" aria-hidden />
                </button>
            </div>
        </div>
    )
}

// ── Answer inputs ─────────────────────────────────────────────────────────

const choice = (on: boolean) => cn(
    "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-[15px] leading-6 transition-colors",
    on ? "border-neutral-900 bg-neutral-100 text-neutral-900 dark:border-white dark:bg-neutral-900 dark:text-white" : "border-neutral-200 text-neutral-800 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-600",
)

function Answer({ q, value, onChange, figure }: { q: QuizQuestion; value: QuizResponse | undefined; onChange: (v: QuizResponse) => void; figure?: (props: PickFigureProps) => React.ReactNode }) {
    if (q.kind === "pick") {
        const picked = (value as string[] | undefined) ?? []
        const many = q.answer.length > 1
        // One answer: a tap replaces the pick. Several: a tap adds or removes it.
        const toggle = (id: string) => onChange(many ? (picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]) : [id])
        return (
            <div className="space-y-3">
                {figure && <div>{figure({ q, picked, toggle })}</div>}
                {many && <p className="text-[13px] text-neutral-600 dark:text-neutral-400">Pick every one that applies.</p>}
                <div role={many ? "group" : "radiogroup"} aria-label={q.prompt} className="flex flex-wrap gap-2">
                    {q.parts.map((p) => {
                        const on = picked.includes(p.id)
                        return (
                            <button key={p.id} type="button" role={many ? "checkbox" : "radio"} aria-checked={on} onClick={() => toggle(p.id)}
                                className={cn("inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors", on ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 text-neutral-800 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200")}>
                                {on && <Check className="size-3.5" aria-hidden />}{p.label}
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }
    if (q.kind === "single") {
        return (
            <div role="radiogroup" aria-label={q.prompt} className="grid gap-2">
                {q.options.map((o) => (
                    <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={choice(value === o.id)}>
                        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", value === o.id ? "border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white" : "border-neutral-300 dark:border-neutral-700")}>
                            {value === o.id && <span className="size-1.5 rounded-full bg-white dark:bg-neutral-900" />}
                        </span>
                        {o.label}
                    </button>
                ))}
            </div>
        )
    }
    if (q.kind === "truefalse") {
        return (
            <div role="radiogroup" aria-label={q.prompt} className="grid grid-cols-2 gap-2">
                {[true, false].map((b) => (
                    <button key={String(b)} type="button" role="radio" aria-checked={value === b} onClick={() => onChange(b)} className={cn(choice(value === b), "justify-center font-medium")}>
                        {b ? "True" : "False"}
                    </button>
                ))}
            </div>
        )
    }
    if (q.kind === "buckets") {
        const v = (value as Record<string, string> | undefined) ?? {}
        return (
            <ul className="space-y-2.5">
                {q.items.map((it) => (
                    <li key={it.id} className="rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
                        <p className="text-[14.5px] leading-6 text-neutral-900 dark:text-neutral-100">{it.label}</p>
                        <div role="radiogroup" aria-label={it.label} className="mt-2 flex flex-wrap gap-1.5">
                            {q.buckets.map((b) => {
                                const on = v[it.id] === b.id
                                return (
                                    <button key={b.id} type="button" role="radio" aria-checked={on} onClick={() => onChange({ ...v, [it.id]: b.id })}
                                        className={cn("rounded-full border px-3 py-1 text-[12.5px] transition-colors", on ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300")}>
                                        {b.label}
                                    </button>
                                )
                            })}
                        </div>
                    </li>
                ))}
            </ul>
        )
    }
    return <OrderInput q={q} value={value as string[] | undefined} onChange={onChange} />
}

function OrderInput({ q, value, onChange }: { q: Extract<QuizQuestion, { kind: "order" }>; value: string[] | undefined; onChange: (v: string[]) => void }) {
    const start = useMemo(() => scrambled(q.items, q.id).map((i) => i.id), [q])
    const order = value ?? start
    const label = (id: string) => q.items.find((i) => i.id === id)?.label ?? id
    const move = (i: number, d: -1 | 1) => {
        const j = i + d
        if (j < 0 || j >= order.length) return
        const next = [...order]
        ;[next[i], next[j]] = [next[j]!, next[i]!]
        onChange(next)
    }
    return (
        <div>
            <ol className="space-y-2">
                {order.map((id, i) => (
                    <motion.li layout key={id} className="flex items-center gap-3 rounded-2xl border border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
                        <span className="w-5 shrink-0 text-center font-mono text-[12px] text-neutral-500">{i + 1}</span>
                        <span className="min-w-0 flex-1 text-[14.5px] leading-6 text-neutral-900 dark:text-neutral-100">{label(id)}</span>
                        <span className="flex shrink-0 gap-1">
                            <button type="button" aria-label={`Move "${label(id)}" up`} disabled={i === 0} onClick={() => move(i, -1)} className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:border-neutral-400 disabled:opacity-30 dark:border-neutral-700 dark:text-neutral-300"><ArrowUp className="size-3.5" /></button>
                            <button type="button" aria-label={`Move "${label(id)}" down`} disabled={i === order.length - 1} onClick={() => move(i, 1)} className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:border-neutral-400 disabled:opacity-30 dark:border-neutral-700 dark:text-neutral-300"><ArrowDown className="size-3.5" /></button>
                        </span>
                    </motion.li>
                ))}
            </ol>
            {!value && (
                <button type="button" onClick={() => onChange(order)} className="mt-3 text-[13px] font-medium text-neutral-600 underline-offset-4 hover:underline dark:text-neutral-400">
                    This order is right
                </button>
            )}
        </div>
    )
}

// ── Results ───────────────────────────────────────────────────────────────

function describe(q: QuizQuestion, r: QuizResponse | undefined): { yours: string; right: string } {
    switch (q.kind) {
        case "single": return { yours: q.options.find((o) => o.id === r)?.label ?? "No answer", right: q.options.find((o) => o.id === q.answer)?.label ?? "" }
        case "truefalse": return { yours: r === undefined ? "No answer" : r ? "True" : "False", right: q.answer ? "True" : "False" }
        case "buckets": {
            const v = (r as Record<string, string>) ?? {}
            const b = (id?: string) => q.buckets.find((x) => x.id === id)?.label ?? "?"
            return { yours: q.items.map((i) => `${i.label} -> ${b(v[i.id])}`).join("\n"), right: q.items.map((i) => `${i.label} -> ${b(i.bucket)}`).join("\n") }
        }
        case "order": {
            const label = (id: string) => q.items.find((i) => i.id === id)?.label ?? id
            return { yours: ((r as string[]) ?? []).map((id, i) => `${i + 1}. ${label(id)}`).join("\n"), right: q.items.map((i, n) => `${n + 1}. ${i.label}`).join("\n") }
        }
        case "pick": {
            const label = (id: string) => q.parts.find((p) => p.id === id)?.label ?? id
            return { yours: ((r as string[]) ?? []).map(label).join(", ") || "No answer", right: q.answer.map(label).join(", ") }
        }
    }
}

function Results({ questions, results, onRetake, retakeLabel, className, figure }: { questions: QuizQuestion[]; results: QuizResult[]; onRetake: () => void; retakeLabel: string; className?: string; figure?: (props: PickFigureProps) => React.ReactNode }) {
    const right = results.filter((r) => r.correct).length
    return (
        <div className={cn("rounded-3xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950", className)}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
                <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Results</p>
                    <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-white">{right} of {questions.length}</p>
                </div>
                <button type="button" onClick={onRetake} className="inline-flex h-9 items-center gap-2 rounded-xl border border-neutral-200 px-3.5 text-sm font-medium text-neutral-800 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200">
                    <RotateCcw className="size-4" aria-hidden /> {retakeLabel}
                </button>
            </div>
            <ol className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {questions.map((q, i) => {
                    const r = results.find((x) => x.questionId === q.id)
                    const d = describe(q, r?.response)
                    const ok = !!r?.correct
                    return (
                        <li key={q.id} className="p-5">
                            <div className="flex items-start gap-3">
                                <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", ok ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-rose-600 text-white")}>
                                    {ok ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-semibold leading-snug text-neutral-900 dark:text-white">{i + 1}. {q.prompt}</p>
                                    {!ok && <p className="mt-2 whitespace-pre-line text-[13.5px] leading-6 text-rose-700 dark:text-rose-400"><span className="font-medium">You said:</span> {d.yours}</p>}
                                    <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-6 text-neutral-700 dark:text-neutral-300"><span className="font-medium text-neutral-900 dark:text-white">Answer:</span> {d.right}</p>
                                    <p className="mt-2 text-[14px] leading-6 text-neutral-600 dark:text-neutral-400">{q.explanation}</p>
                                    {q.kind === "pick" && figure && <div className="mt-3">{figure({ q, picked: (r?.response as string[] | undefined) ?? [], answer: q.answer })}</div>}
                                </div>
                            </div>
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}
