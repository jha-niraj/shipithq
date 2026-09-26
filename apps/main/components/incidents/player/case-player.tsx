"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels"
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCheck, ExternalLink, HelpCircle, Mic, Search, Sparkles } from "lucide-react"
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

    const parts = useMemo(() => {
        const out: { part: string; items: { s: PlayerStep; i: number }[] }[] = []
        steps.forEach((s, i) => {
            const last = out[out.length - 1]
            if (last && last.part === s.part) last.items.push({ s, i })
            else out.push({ part: s.part, items: [{ s, i }] })
        })
        return out
    }, [steps])

    const done = steps.filter(isDone).length
    const markAndNext = () => { dispatch({ type: "stepDone", stepKey: step.key }); go(index + 1) }

    const list = (
        <ScrollArea className="h-full">
            <nav aria-label="Steps" className="py-4">
                {parts.map((p) => (
                    <div key={p.part} className="mb-4">
                        <p className="truncate px-4 pb-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">{p.part}</p>
                        <ol>
                            {p.items.map(({ s, i }) => {
                                const Icon = ICON[s.kind] ?? BookOpen
                                const on = i === index
                                const ok = isDone(s)
                                return (
                                    <li key={s.key}>
                                        <button type="button" onClick={() => go(i)} aria-current={on ? "step" : undefined}
                                            className={cn("relative flex w-full items-center gap-2.5 py-1.5 pl-4 pr-3 text-left text-[13px] transition-colors",
                                                on ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-900 dark:text-white" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/60 dark:hover:text-white")}>
                                            {on && <span aria-hidden className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-neutral-900 dark:bg-white" />}
                                            <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md", ok ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-400 dark:text-neutral-500")}>
                                                {ok ? <Check className="size-3" aria-hidden /> : <Icon className="size-3.5" aria-hidden />}
                                            </span>
                                            <span className="min-w-0 flex-1 truncate">{s.title}</span>
                                            {s.xp > 0 && <span className="shrink-0 font-mono text-[10px] text-neutral-400">+{s.xp}</span>}
                                        </button>
                                    </li>
                                )
                            })}
                        </ol>
                    </div>
                ))}
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
                        <StepView step={step} slug={data.slug} onDone={() => dispatch({ type: "stepDone", stepKey: step.key })} />
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
                    <span className="hidden max-w-[14rem] truncate sm:inline">{steps[index - 1]?.title ?? "Previous"}</span>
                </button>
                <select aria-label="Go to step" value={index} onChange={(e) => go(Number(e.target.value))}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm lg:hidden dark:border-neutral-800 dark:bg-neutral-950">
                    {steps.map((s, i) => <option key={s.key} value={i}>{i + 1}. {s.title}</option>)}
                </select>
                <span className="hidden font-mono text-[11px] text-neutral-400 lg:inline">Arrow keys move between steps</span>
                <button type="button" onClick={() => go(index + 1)} disabled={index === steps.length - 1}
                    className="inline-flex h-10 min-w-0 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-600">
                    <span className="hidden max-w-[14rem] truncate sm:inline">{steps[index + 1]?.title ?? "Next"}</span>
                    <ArrowRight className="size-4 shrink-0" aria-hidden />
                </button>
            </footer>
        </div>
    )
}

/** One step, by kind. */
function StepView({ step, slug, onDone }: { step: PlayerStep; slug: string; onDone: () => void }) {
    const { progress, dispatch } = useProgress()
    const c = step.content
    switch (step.kind) {
        case "chapter":
            return <ChapterView slug={slug} chapter={c as unknown as Chapter & { glossary?: { term: string; definition: string }[] }} />
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

/** A chapter: the narrator, then its blocks, with the paragraph being read highlighted. */
function ChapterView({ slug, chapter }: { slug: string; chapter: Chapter & { glossary?: { term: string; definition: string }[] } }) {
    const [reading, setReading] = useState<number | null>(null)
    const says = chapter.blocks.filter((b) => b.kind === "say").length
    let sayIndex = -1
    return (
        <div className="space-y-6">
            <p className="text-[17px] leading-8 text-neutral-600 dark:text-neutral-400">{chapter.lead}</p>
            <Narrator slug={slug} chapterId={chapter.id} count={says} onParagraph={setReading} />
            <div className="space-y-6">
                {chapter.blocks.map((b, i) => {
                    if (b.kind === "say") sayIndex += 1
                    return <Block key={i} block={b} active={b.kind === "say" && sayIndex === reading} />
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

function Block({ block, active }: { block: ChapterBlock; active: boolean }) {
    switch (block.kind) {
        case "say":
            return (
                <p className={cn("-mx-4 rounded-2xl px-4 py-2 text-[17px] leading-8 transition-colors duration-300", active ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-white" : "text-neutral-800 dark:text-neutral-200")}>
                    <Inline text={block.text} />
                </p>
            )
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
