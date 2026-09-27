"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels"
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCheck, ExternalLink, GraduationCap, HelpCircle, Lock, Mic, Search, Sparkles } from "lucide-react"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { QuizRunner } from "@repo/ui/components/quiz/quiz-runner"
import { grade, type QuizQuestion, type QuizResult } from "@repo/ui/lib/quiz"
import { cn } from "@repo/ui/lib/utils"
import type { Chapter, ChapterBlock, SourceRef } from "@/content/incidents/types"
import { getIncidentCase } from "@/content/incidents/cases"
import { topicLabel, type IncidentTopicId } from "@/content/incidents"
import type { PlayerStep } from "@/lib/incidents/catalog"
import { setAutoTag } from "@/components/ai/context-tags"
import { CaseProgressProvider, useProgress, type Progress } from "../case-progress"
import { CaseProvider, IncidentStyles, Inline, Sources } from "../primitives"
import { Simulator } from "../simulator"
import { Closing, Checklist, Round } from "../checklist-round"
import { FlowChart } from "../flow-chart"
import { MockStep } from "./mock-step"
import { Narrator } from "./narrator"
import { speakQuestion } from "@/actions/(main)/incidents/narration.action"
import { useCase } from "../primitives"
import { useGate } from "../sign-in-gate"
import { useRouter } from "next/navigation"
import toast from "@repo/ui/components/ui/sonner"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { PATH_CASES } from "@/content/incidents/path-cases"
import { adoptIncidentPath } from "@/actions/(main)/pathfinder/explore.action"

/**
 * The case player (plan/incidents INC-14, INC-18 to INC-24). Inside the app shell, so the
 * sidebar and ShipItHQ AI are there (the AI gets the case and step as a page tag). Two
 * resizable panes like the project workspace: every step on the left, grouped by
 * chapter, and one step at a time on the right, each in the shared ScrollArea.
 *
 * A step is done only when the reader says so ("Got it, continue"), or when its quiz or
 * talk is finished; Next alone only moves. Checks run in the shared QuizRunner. The step
 * is in the URL (`?step=`), so a reload lands where the reader was.
 */

const ICON: Record<string, typeof BookOpen> = {
    chapter: BookOpen, check: HelpCircle, talk: Mic, "final-quiz": HelpCircle, round: Search, "closing-talk": Mic, closing: Sparkles,
}

export type PlayerCase = { slug: string; title: string; summary: string; topic: IncidentTopicId; minutes: number; steps: PlayerStep[] }

export function CasePlayer({ data, initial, signedIn, initialStep }: {
    data: PlayerCase
    initial?: Progress
    signedIn: boolean
    initialStep?: string
}) {
    // The case file holds code (the simulator), so it is imported here, on the client.
    const incident = getIncidentCase(data.slug)
    if (!incident) return null
    return (
        <CaseProvider value={incident}>
            <CaseProgressProvider incident={incident} initial={initial} signedIn={signedIn}>
                <IncidentStyles />
                <Player data={data} initialStep={initialStep} />
            </CaseProgressProvider>
        </CaseProvider>
    )
}

function Handle() {
    return (
        <PanelResizeHandle className="group relative w-px shrink-0 bg-neutral-200 outline-none dark:bg-neutral-800">
            <span className="absolute inset-y-0 -left-1.5 -right-1.5 cursor-col-resize" />
            <span className="absolute inset-y-0 left-0 w-px bg-transparent transition-colors group-hover:bg-neutral-400 group-data-[resize-handle-state=drag]:bg-neutral-900 dark:group-hover:bg-neutral-600 dark:group-data-[resize-handle-state=drag]:bg-white" />
        </PanelResizeHandle>
    )
}

function Player({ data, initialStep }: { data: PlayerCase; initialStep?: string }) {
    const { progress, derived, dispatch } = useProgress()
    const reduced = useReducedMotion()
    const steps = data.steps
    const [index, setIndex] = useState(Math.max(0, steps.findIndex((s) => s.key === initialStep)))
    const top = useRef<HTMLDivElement>(null)
    const step = steps[index]!

    const go = useCallback((i: number) => setIndex(Math.max(0, Math.min(steps.length - 1, i))), [steps.length])

    // The URL keeps the step; the AI rail learns what is being read.
    useEffect(() => {
        const url = new URL(window.location.href)
        url.searchParams.set("step", step.key)
        window.history.replaceState(null, "", url)
        top.current?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" })
        setAutoTag({ id: `${data.slug}#${step.key}`.slice(0, 64), kind: "incident", title: `${data.title}: ${step.title}`.slice(0, 120) })
    }, [step.key, step.title, data.slug, data.title, reduced])
    useEffect(() => () => setAutoTag(null), [])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return
            const el = e.target as HTMLElement | null
            if (el?.closest("input, textarea, select, button, [contenteditable='true']")) return
            if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1) }
            if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1) }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [go, index])

    const isDone = useCallback((s: PlayerStep) => {
        if (s.kind === "check") {
            const ch = String(s.content.chapter)
            return (s.content.questions as QuizQuestion[]).every((q) => `${ch}:${q.id}` in progress.checks)
        }
        if (s.kind === "final-quiz") return derived.predictionsDone
        if (s.kind === "round") return derived.roundDone
        return progress.stepsDone.includes(s.key)
    }, [progress, derived])

    const acts = useMemo(() => {
        const out: { act: string; parts: { part: string; items: { s: PlayerStep; i: number }[] }[] }[] = []
        steps.forEach((s, i) => {
            const act = typeof s.content.act === "string" ? s.content.act : s.part === "Final" ? "Final" : "The case"
            let a = out[out.length - 1]
            if (!a || a.act !== act) { a = { act, parts: [] }; out.push(a) }
            const last = a.parts[a.parts.length - 1]
            if (last && last.part === s.part) last.items.push({ s, i })
            else a.parts.push({ part: s.part, items: [{ s, i }] })
        })
        return out
    }, [steps])

    // Gating (round 5): reading is never blocked. A chapter's check or talk opens once every
    // earlier chapter's check and talk is passed; the final steps open after all of them.
    const chapterOrder = useMemo(() => steps.filter((s) => s.kind === "chapter").map((s) => String(s.content.id)), [steps])
    const gates = useMemo(() => steps.filter((s) => s.kind === "check" || s.kind === "talk"), [steps])
    const lockedBy = useCallback((s: PlayerStep): PlayerStep | null => {
        if (s.kind === "chapter") return null
        const ci = s.kind === "check" || s.kind === "talk" ? chapterOrder.indexOf(String(s.content.chapter)) : Infinity
        return gates.find((g) => chapterOrder.indexOf(String(g.content.chapter)) < ci && !isDone(g)) ?? null
    }, [chapterOrder, gates, isDone])

    const done = steps.filter(isDone).length
    const markAndNext = () => { dispatch({ type: "stepDone", stepKey: step.key }); go(index + 1) }

    const list = (
        <ScrollArea className="h-full" reflow>
            <nav aria-label="Steps" className="py-3">
                {acts.map((a) => (
                    <div key={a.act} className="mb-5">
                        <p className="px-4 pb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-900 dark:text-white">{a.act}</p>
                        {a.parts.map((p) => {
                            const doneHere = p.items.filter(({ s }) => isDone(s)).length
                            return (
                                <div key={p.part} className="mb-2">
                                    <p className="flex min-w-0 items-center gap-2 px-4 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">
                                        <span className="min-w-0 flex-1 truncate">{p.part}</span>
                                        <span className="shrink-0 tabular-nums">{doneHere}/{p.items.length}</span>
                                    </p>
                                    <ol>
                                        {p.items.map(({ s, i }) => {
                                            const Icon = ICON[s.kind] ?? BookOpen
                                            const on = i === index
                                            const ok = isDone(s)
                                            const locked = !!lockedBy(s)
                                            return (
                                                <li key={s.key}>
                                                    <button type="button" onClick={() => go(i)} aria-current={on ? "step" : undefined} title={locked ? "Pass the earlier checks and talks to open this" : s.title}
                                                        className={cn("relative flex w-full min-w-0 items-center gap-2.5 py-1.5 pl-6 pr-3 text-left text-[13px] transition-colors",
                                                            on ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-900 dark:text-white" : locked ? "text-neutral-400 dark:text-neutral-600" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/60 dark:hover:text-white")}>
                                                        {on && <span aria-hidden className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-neutral-900 dark:bg-white" />}
                                                        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md", ok ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-400 dark:text-neutral-500")}>
                                                            {ok ? <Check className="size-3" aria-hidden /> : locked ? <Lock className="size-3" aria-hidden /> : <Icon className="size-3.5" aria-hidden />}
                                                        </span>
                                                        <span className="min-w-0 flex-1 truncate">{s.title}</span>
                                                        {s.xp > 0 && <span className="shrink-0 font-mono text-[10px] tabular-nums text-neutral-400">+{s.xp}</span>}
                                                    </button>
                                                </li>
                                            )
                                        })}
                                    </ol>
                                </div>
                            )
                        })}
                    </div>
                ))}
                <LearnList />
            </nav>
        </ScrollArea>
    )

    const body = (
        <ScrollArea className="h-full">
            <div ref={top} />
            <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step.key}
                    initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? { opacity: 1 } : { opacity: 0 }} transition={{ duration: 0.22 }}
                    className="mx-auto max-w-4xl px-5 pb-16 pt-8 sm:px-8">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">{step.part} · step {index + 1} of {steps.length}</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">{step.title}</h1>
                    <div className="mt-6">
                        {lockedBy(step) ? (
                            <Locked by={lockedBy(step)!} onGo={() => go(steps.indexOf(lockedBy(step)!))} />
                        ) : (
                            <StepView step={step} slug={data.slug} onDone={() => dispatch({ type: "stepDone", stepKey: step.key })} />
                        )}
                    </div>
                    {(step.kind === "chapter" || step.kind === "talk" || step.kind === "closing-talk" || step.kind === "closing") && (
                        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
                            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{isDone(step) ? "Marked as done." : "Done with this step?"}</p>
                            <button type="button" onClick={markAndNext}
                                className="inline-flex h-11 items-center gap-2 rounded-xl bg-neutral-900 px-5 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-2px_0_rgba(0,0,0,0.4)] transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                                <CheckCheck className="size-4" aria-hidden /> {index === steps.length - 1 ? "Got it, finish" : "Got it, continue"}
                            </button>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </ScrollArea>
    )

    return (
        <div className="flex h-screen min-h-0 flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
            <header className="flex h-14 shrink-0 items-center gap-4 border-b border-neutral-200 px-4 dark:border-neutral-800">
                <Link href="/incidents" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white">
                    <ArrowLeft className="size-4" aria-hidden /> Incidents
                </Link>
                <span aria-hidden className="h-5 w-px bg-neutral-200 dark:bg-neutral-800" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{data.title}</p>
                    <p className="truncate font-mono text-[10.5px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">{topicLabel(data.topic)} · {data.minutes} min</p>
                </div>
                <div className="hidden items-center gap-3 sm:flex">
                    <span className="font-mono text-[12px] tabular-nums text-neutral-500 dark:text-neutral-400">{done}/{steps.length}</span>
                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div className="h-full origin-left rounded-full bg-neutral-900 transition-transform duration-500 dark:bg-white" style={{ transform: `scaleX(${done / steps.length})` }} />
                    </div>
                </div>
            </header>

            <div className="min-h-0 flex-1">
                {/* lg and up: resizable panes. Below: the step alone, with a picker in the footer. */}
                <div className="hidden h-full lg:block">
                    <PanelGroup orientation="horizontal" id="incident-player" className="h-full">
                        <Panel id="steps" defaultSize="24%" minSize="16%" maxSize="38%" className="min-w-0 bg-neutral-50/60 dark:bg-neutral-950">{list}</Panel>
                        <Handle />
                        <Panel id="step" minSize="45%" className="min-w-0">{body}</Panel>
                    </PanelGroup>
                </div>
                <div className="h-full lg:hidden">{body}</div>
            </div>

            <footer className="flex h-16 shrink-0 items-center justify-between gap-3 border-t border-neutral-200 px-4 dark:border-neutral-800">
                <button type="button" onClick={() => go(index - 1)} disabled={index === 0}
                    className="inline-flex h-10 min-w-0 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-600">
                    <ArrowLeft className="size-4 shrink-0" aria-hidden />
                    <StepLabel step={steps[index - 1]} fallback="Previous" />
                </button>
                <select aria-label="Go to step" value={index} onChange={(e) => go(Number(e.target.value))}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm lg:hidden dark:border-neutral-800 dark:bg-neutral-950">
                    {steps.map((s, i) => <option key={s.key} value={i}>{i + 1}. {s.title}</option>)}
                </select>
                <span className="hidden font-mono text-[11px] text-neutral-400 lg:inline">Arrow keys move between steps</span>
                <button type="button" onClick={() => go(index + 1)} disabled={index === steps.length - 1}
                    className="inline-flex h-10 min-w-0 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-600">
                    <StepLabel step={steps[index + 1]} fallback="Next" />
                    <ArrowRight className="size-4 shrink-0" aria-hidden />
                </button>
            </footer>
        </div>
    )
}

/** A footer label: the step and which chapter it belongs to, so two "Check yourself" never look alike. */
function StepLabel({ step, fallback }: { step?: PlayerStep; fallback: string }) {
    if (!step) return <span className="hidden sm:inline">{fallback}</span>
    return (
        <span className="hidden min-w-0 flex-col items-start text-left leading-tight sm:flex">
            <span className="max-w-[14rem] truncate font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">{step.part}</span>
            <span className="max-w-[14rem] truncate">{step.title}</span>
        </span>
    )
}

/** A step that opens once an earlier check or talk is passed. */
function Locked({ by, onGo }: { by: PlayerStep; onGo: () => void }) {
    return (
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-dashed border-neutral-300 p-8 dark:border-neutral-700">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-900"><Lock className="size-5" aria-hidden /></span>
            <div>
                <p className="text-lg font-semibold text-neutral-900 dark:text-white">This opens after the earlier check</p>
                <p className="mt-1 text-[15px] leading-7 text-neutral-600 dark:text-neutral-400">Reading is always open. Checks and talks go in order: pass &ldquo;{by.title}&rdquo; in {by.part} first.</p>
            </div>
            <button type="button" onClick={onGo} className="inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                Go to it <ArrowRight className="size-4" aria-hidden />
            </button>
        </div>
    )
}

/** What the case teaches (INC-26), and the hand-written Pathfinder path to learn it all (INC-32, PF-13). */
function LearnList() {
    const c = useCase()
    const router = useRouter()
    const { gate } = useGate()
    const [adopting, setAdopting] = useState(false)
    if (!c.learn?.length) return null
    const adopt = () => gate(async () => {
        setAdopting(true)
        const r = await adoptIncidentPath(c.slug)
        if (!r.success) { toast.error(r.error); setAdopting(false); return }
        toast.success(r.existing ? "You already have this path. Opening it." : "Added to your Pathfinder goals")
        router.push(`/pathfinder/${r.slug}`)
    }, "learn")
    return (
        <div className="mx-3 mt-2 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
            <p className="flex items-center gap-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-900 dark:text-white">
                <GraduationCap className="size-4" aria-hidden /> What you&apos;ll learn
            </p>
            <ul className="mt-2 space-y-2">
                {c.learn.map((l) => (
                    <li key={l.title} className="rounded-xl px-1 py-1">
                        <p className="text-[13px] font-medium leading-snug text-neutral-800 dark:text-neutral-200">{l.title}</p>
                        <p className="text-[12px] leading-5 text-neutral-500 dark:text-neutral-400">{l.summary}</p>
                    </li>
                ))}
            </ul>
            {PATH_CASES.includes(c.slug) && (
                <button type="button" onClick={adopt} disabled={adopting}
                    className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                    {adopting ? <InlineLoader size="sm" /> : <ArrowRight className="size-4" aria-hidden />} Adopt this path
                </button>
            )}
            <p className="mt-2 px-1 text-[11.5px] leading-5 text-neutral-500 dark:text-neutral-400">
                {PATH_CASES.includes(c.slug) ? "A Pathfinder goal with notes for each topic, free. It becomes yours to follow day by day." : "The full learning path is being written."}
            </p>
        </div>
    )
}

/** One step, by kind. */
function StepView({ step, slug, onDone }: { step: PlayerStep; slug: string; onDone: () => void }) {
    const { progress, dispatch } = useProgress()
    const c = step.content
    switch (step.kind) {
        case "chapter":
            return <ChapterView slug={slug} stepTitle={step.title} chapter={c as unknown as Chapter & { glossary?: { term: string; definition: string }[] }} />
        case "check": {
            const chapter = String(c.chapter)
            const questions = c.questions as QuizQuestion[]
            const answered = questions.every((q) => `${chapter}:${q.id}` in progress.checks)
            const initial: QuizResult[] | null = answered ? questions.map((q) => {
                const response = progress.checks[`${chapter}:${q.id}`]!
                return { questionId: q.id, response, correct: grade(q, response) }
            }) : null
            return (
                <QuizRunner key={step.key} title="Check yourself" questions={questions} initial={initial} retakeLabel="Practise again"
                    speak={async (qid) => { const r = await speakQuestion(slug, chapter, qid); return r.success ? r.url : null }}
                    onComplete={(results) => { for (const r of results) dispatch({ type: "quiz", chapter, questionId: r.questionId, response: r.response }) }} />
            )
        }
        case "final-quiz": {
            const questions = c.questions as QuizQuestion[]
            const answered = questions.every((q) => q.id in progress.predictions)
            const initial: QuizResult[] | null = answered ? questions.map((q) => ({ questionId: q.id, response: progress.predictions[q.id]!, correct: grade(q, progress.predictions[q.id]!) })) : null
            return (
                <div className="space-y-4">
                    <p className="text-[16px] leading-7 text-neutral-700 dark:text-neutral-300">Eight situations from the whole case. Answer them all, then see how you did. Your first try earns XP.</p>
                    <QuizRunner key={step.key} title="Make the call" questions={questions} initial={initial} retakeLabel="Practise again"
                        speak={async (qid) => { const r = await speakQuestion(slug, "final", qid); return r.success ? r.url : null }}
                        onComplete={(results) => { for (const r of results) dispatch({ type: "predict", question: r.questionId, option: String(r.response) }) }} />
                </div>
            )
        }
        case "round":
            return <Round />
        case "talk":
        case "closing-talk":
            return <MockStep slug={slug} stepKey={step.key} capped={step.kind === "closing-talk"} content={c as { opening: string; probe: string[]; minutes: number; intro?: string }} onFinished={onDone} />
        case "closing":
            return (
                <div className="space-y-12">
                    <Closing />
                    <Checklist />
                </div>
            )
        default:
            return null
    }
}

const TRANSCRIPT_KEY = "incidents:transcript"

/**
 * A chapter (INC-30): visuals first. The narrated script is behind a remembered "Show
 * transcript" toggle; the paragraph being read shows as a caption under the orb, and with
 * the transcript on, the page follows it. Without a voice, the transcript is always shown.
 */
function ChapterView({ slug, chapter, stepTitle }: { slug: string; chapter: Chapter & { glossary?: { term: string; definition: string }[] }; stepTitle: string }) {
    const [reading, setReading] = useState<number | null>(null)
    const [voice, setVoice] = useState(true)
    const [transcript, setTranscript] = useState(false)
    const refs = useRef<Array<HTMLParagraphElement | null>>([])
    const paragraphs = chapter.blocks.filter((b): b is { kind: "say"; text: string } => b.kind === "say").map((b) => b.text)
    const showScript = transcript || !voice

    useEffect(() => { try { setTranscript(localStorage.getItem(TRANSCRIPT_KEY) === "1") } catch { /* private window */ } }, [])
    useEffect(() => {
        if (reading === null || !showScript) return
        refs.current[reading]?.scrollIntoView({ block: "center", behavior: "smooth" })
    }, [reading, showScript])

    const toggleTranscript = () => setTranscript((v) => {
        try { localStorage.setItem(TRANSCRIPT_KEY, v ? "0" : "1") } catch { /* ignore */ }
        return !v
    })

    let sayIndex = -1
    return (
        <div className="space-y-6">
            <p className="text-[17px] leading-8 text-neutral-600 dark:text-neutral-400">{chapter.lead}</p>
            <Narrator slug={slug} chapterId={chapter.id} paragraphs={paragraphs} stepTitle={stepTitle} onParagraph={setReading} onAvailable={setVoice} />
            {voice && paragraphs.length > 0 && (
                <button type="button" onClick={toggleTranscript} aria-pressed={transcript} className="text-[13px] font-medium text-neutral-600 underline-offset-4 hover:underline dark:text-neutral-400">
                    {transcript ? "Hide the transcript" : "Show the transcript"}
                </button>
            )}
            <div className="space-y-6">
                {chapter.blocks.map((b, i) => {
                    if (b.kind === "say") {
                        sayIndex += 1
                        const at = sayIndex
                        if (!showScript) return null
                        return (
                            <p key={i} ref={(el) => { refs.current[at] = el }}
                                className={cn("-mx-4 rounded-2xl px-4 py-2 text-[17px] leading-8 transition-colors duration-300", at === reading ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-white" : "text-neutral-800 dark:text-neutral-200")}>
                                <Inline text={b.text} />
                            </p>
                        )
                    }
                    return <Block key={i} block={b} />
                })}
            </div>
            {chapter.glossary && chapter.glossary.length > 0 && <Glossary terms={chapter.glossary} />}
            {chapter.links && chapter.links.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                    {chapter.links.map((l) => (
                        <li key={l.href}>
                            <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-[12.5px] text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300">
                                {l.label} <ExternalLink className="size-3" aria-hidden />
                            </a>
                        </li>
                    ))}
                </ul>
            )}
            <Sources refs={(chapter.sources ?? []) as SourceRef[]} />
        </div>
    )
}

function Block({ block }: { block: ChapterBlock }) {
    switch (block.kind) {
        case "say":
            return null
        case "flow":
            return <FlowChart flow={block.flow} />
        case "note":
            return <p className="rounded-2xl border-l-4 border-neutral-900 bg-neutral-50 px-5 py-4 text-[16px] font-medium leading-7 text-neutral-900 dark:border-white dark:bg-neutral-900 dark:text-white"><Inline text={block.text} /></p>
        case "see":
            return (
                <div className="overflow-hidden rounded-2xl bg-neutral-950 ring-1 ring-white/10">
                    <p className="border-b border-white/10 px-4 py-2.5 font-mono text-[11px] text-neutral-400">{block.title}</p>
                    <ol className="space-y-2 p-4 font-mono text-[13px] leading-6">
                        {block.lines.map((l, i) => (
                            <li key={i} className="flex gap-3">
                                {l.t && <span className="w-10 shrink-0 text-neutral-500">{l.t}</span>}
                                {l.who && <span className="w-24 shrink-0 text-neutral-400">{l.who}</span>}
                                <span className={cn(l.tone === "bad" ? "text-rose-400" : l.tone === "muted" ? "text-neutral-400" : "text-neutral-100")}>{l.text}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )
        case "compare":
            return (
                <ScrollArea orientation="horizontal" className="rounded-2xl border border-neutral-200 dark:border-neutral-800">
                    <table className="w-full min-w-[40rem] text-left text-[14px]">
                        <thead>
                            <tr className="border-b border-neutral-200 dark:border-neutral-800">
                                <th className="p-4" />
                                {block.columns.map((col) => <th key={col} className="p-4 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">{col}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {block.rows.map((r) => (
                                <tr key={r.label}>
                                    <td className="p-4 font-semibold text-neutral-900 dark:text-white">{r.label}</td>
                                    {r.cells.map((cell, i) => <td key={i} className="p-4 leading-6 text-neutral-700 dark:text-neutral-300"><Inline text={cell} /></td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </ScrollArea>
            )
        case "simulator":
            return <Simulator />
    }
}

function Glossary({ terms }: { terms: { term: string; definition: string }[] }) {
    const [open, setOpen] = useState<string | null>(null)
    return (
        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">Words in this chapter</p>
            <div className="mt-3 flex flex-wrap gap-2">
                {terms.map((t) => (
                    <button key={t.term} type="button" aria-expanded={open === t.term} onClick={() => setOpen((o) => (o === t.term ? null : t.term))}
                        className={cn("rounded-full border px-3 py-1 text-[13px] transition-colors", open === t.term ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300")}>
                        {t.term}
                    </button>
                ))}
            </div>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.p key={open} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden pt-3 text-[14.5px] leading-6 text-neutral-700 dark:text-neutral-300">
                        <span className="font-semibold text-neutral-900 dark:text-white">{open}:</span> {terms.find((t) => t.term === open)?.definition}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    )
}
