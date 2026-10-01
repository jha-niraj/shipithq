"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, usePanelRef } from "react-resizable-panels"
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCheck, ExternalLink, GraduationCap, Hammer, HelpCircle, Lock, Flag, Mic, Pause, Play, Search, SlidersHorizontal, Sparkles } from "lucide-react"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { QuizRunner, type PickFigureProps } from "@repo/ui/components/quiz/quiz-runner"
import { grade, type QuizQuestion, type QuizResult } from "@repo/ui/lib/quiz"
import { cn } from "@repo/ui/lib/utils"
import type { Chapter, ChapterBlock, Flow, SourceRef, SystemMap as SystemMapData } from "@/content/incidents/types"
import { getIncidentCase } from "@/content/incidents/cases"
import { topicLabel, type IncidentTopicId } from "@/content/incidents"
import type { PlayerStep } from "@/lib/incidents/catalog"
import { setAutoTag } from "@/components/ai/context-tags"
import { useAIPanelStore } from "@/app/store/aiPanelStore"
import { CaseProgressProvider, useProgress, type Progress } from "../case-progress"
import { CaseProvider, IncidentStyles, Inline, Sources, type InlineTerm } from "../primitives"
import { CaseSimulator } from "../sim/case-simulator"
import { Closing, Checklist, Round } from "../checklist-round"
import { FlowChart } from "../flow-chart"
import { SystemStrip } from "../diagrams/system-map"
import { SequenceDiagram } from "../diagrams/sequence"
import { Timeline } from "../diagrams/timeline"
import { DashboardView } from "../diagrams/dashboard"
import { CausalChainView, StateDiagramView } from "../diagrams/causes"
import { MapChange, SystemMap } from "../diagrams/system-map"
import { DiagramFrame } from "../diagrams/kit"
import { ScrubProvider } from "../diagrams/scrub"
import { RolesView, RunbookView, StatusView } from "../diagrams/human"
import { CodeSample } from "@/components/code-sample/code-sample-viewer"
import { PostmortemStep } from "./postmortem-step"
import { MockStep } from "./mock-step"
import { useLead } from "../lead/store"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@repo/ui/components/ui/dropdown-menu"
import { speakQuestion } from "@/actions/(main)/incidents/narration.action"
import { useCase } from "../primitives"
import { useGate } from "../sign-in-gate"
import { RunProvider, useRun } from "./run-context"
import { RunBadge, StartScreen, type StartContent } from "./start-screen"
import { ReportCard, RunsList } from "./report-card"
import type { RunState } from "@/lib/incidents/run"
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
    start: Flag, chapter: BookOpen, check: HelpCircle, talk: Mic, "final-quiz": HelpCircle, round: Search, "closing-talk": Mic, closing: Sparkles, learn: GraduationCap,
}

export type PlayerCase = { slug: string; title: string; summary: string; topic: IncidentTopicId; minutes: number; steps: PlayerStep[] }

export function CasePlayer({ data, initial, signedIn, initialStep, run = null }: {
    data: PlayerCase
    initial?: Progress
    signedIn: boolean
    initialStep?: string
    /** The reader's recorded run, if signed in (INC-33, INC-34). */
    run?: RunState | null
}) {
    // The case file holds code (the simulator), so it is imported here, on the client.
    const incident = getIncidentCase(data.slug)
    if (!incident) return null
    return (
        <CaseProvider value={incident}>
            <RunProvider slug={data.slug} initial={run}>
                {/* Keyed by the run: starting or ending one re-reads that run's own answers. */}
                <CaseProgressProvider key={run?.active?.id ?? "no-run"} incident={incident} initial={initial} signedIn={signedIn}>
                    <IncidentStyles />
                    <Player data={data} initialStep={initialStep} />
                </CaseProgressProvider>
            </RunProvider>
        </CaseProvider>
    )
}

/** lg and up. Starts true so the server render is the desktop layout. */
function useIsDesktop() {
    const [desktop, setDesktop] = useState(true)
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 1024px)")
        const on = () => setDesktop(mq.matches)
        on()
        mq.addEventListener("change", on)
        return () => mq.removeEventListener("change", on)
    }, [])
    return desktop
}

function Handle() {
    return (
        <PanelResizeHandle className="group relative w-px shrink-0 bg-neutral-200 outline-none dark:bg-neutral-800">
            <span className="absolute inset-y-0 -left-1.5 -right-1.5 cursor-col-resize" />
            <span className="absolute inset-y-0 left-0 w-px bg-transparent transition-colors group-hover:bg-neutral-400 group-data-[resize-handle-state=drag]:bg-neutral-900 dark:group-hover:bg-neutral-600 dark:group-data-[resize-handle-state=drag]:bg-white" />
        </PanelResizeHandle>
    )
}

/** One page of the case (INC-75): a step, and the check that closes it when it is a chapter. */
type Page = { main: PlayerStep; check?: PlayerStep }

/** Chapter rows read "01" as a number; the rest of a part label is the chapter's title. */
const chapterNo = (part: string) => (part.includes(" · ") ? part.split(" · ")[0]! : null)

/** The steps pane's width, kept per reader (INC-76). */
const STEPS_W_KEY = "incidents:steps-w"
// Default narrow (Niraj, 2026-10-01: "Narrow, about 200px").
const STEPS_W = { def: 200, min: 180, max: 420 }
// A percentage of the group, worked out here: `resize("300px")` converted against a stale group
// size and landed on the max (seen 2026-10-01).
const toPct = (px: number, groupPx: number) => `${Math.min(100, (px / groupPx) * 100).toFixed(3)}%`

function Player({ data, initialStep }: { data: PlayerCase; initialStep?: string }) {
    const { progress, derived, dispatch } = useProgress()
    const run = useRun()
    const runMode = run.mode
    const leadReady = useLead((s) => s.chapter !== null && s.chapter.paragraphs.length > 0 && s.state !== "unavailable")
    const desktop = useIsDesktop()
    const reduced = useReducedMotion()
    const steps = data.steps

    // A chapter and the check right after it are one page (INC-75, Niraj 2026-10-01: "check
    // under its chapter"). Progress and XP stay per step; only navigation moves by page.
    const pages = useMemo(() => {
        const out: Page[] = []
        for (const s of steps) {
            const prev = out[out.length - 1]
            if (s.kind === "check" && prev && prev.main.kind === "chapter" && !prev.check && String(s.content.chapter) === String(prev.main.content.id)) prev.check = s
            else out.push({ main: s })
        }
        return out
    }, [steps])
    const chapterPages = useMemo(() => pages.filter((p) => p.main.kind === "chapter"), [pages])

    const [index, setIndex] = useState(() => Math.max(0, pages.findIndex((p) => p.main.key === initialStep || p.check?.key === initialStep)))
    const top = useRef<HTMLDivElement>(null)
    const checkRef = useRef<HTMLDivElement>(null)
    const page = pages[index]!
    const step = page.main

    const go = useCallback((i: number) => setIndex(Math.max(0, Math.min(pages.length - 1, i))), [pages.length])

    // An old link to a check (`?step=check-…`) opens its chapter at the check.
    const openedAtCheck = useRef(!!initialStep && pages[index]?.check?.key === initialStep)

    // The URL keeps the step; the AI rail learns what is being read.
    useEffect(() => {
        const url = new URL(window.location.href)
        url.searchParams.set("step", step.key)
        window.history.replaceState(null, "", url)
        if (openedAtCheck.current) {
            openedAtCheck.current = false
            setTimeout(() => checkRef.current?.scrollIntoView({ block: "start", behavior: "auto" }), 300)
        } else {
            top.current?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" })
        }
        setAutoTag({ id: `${data.slug}#${step.key}`.slice(0, 64), kind: "incident", title: `${data.title}: ${step.title}`.slice(0, 120) })
    }, [step.key, step.title, data.slug, data.title, reduced])
    useEffect(() => () => setAutoTag(null), [])

    // The lead in the rail (INC-47, INC-48): this case, its thread (the run's questions and
    // answers), and whether asking is open. Leaving the case stops the voice.
    const register = useLead((s) => s.register)
    const setChapter = useLead((s) => s.setChapter)
    useEffect(() => {
        register({
            slug: data.slug, title: data.title, canAsk: run.mode === "recording", requireRun: run.requireRun,
            thread: (run.state?.asks ?? []).flatMap((a) => [
                { id: `q-${a.id}`, who: "you" as const, text: a.question },
                { id: `a-${a.id}`, who: "lead" as const, text: a.answer, audio: null },
            ]),
        })
    }, [data.slug, data.title, run.mode, run.requireRun, run.state]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => () => useLead.getState().unregister(), [])
    useEffect(() => { if (step.kind !== "chapter") setChapter(null) }, [step.key, step.kind, setChapter])

    // The rail opens on every case, on desktop, signed in or not (Niraj, 2026-09-27: "always
    // open by default"; signed out it says how to sign in to ask), on the lead. It closes
    // again on leaving if this page opened it, so every other page keeps the rail closed.
    useEffect(() => {
        // Not when the reader turned it off (the panel's "Turn off"); "Ask the lead" still opens it.
        let off = false
        try { off = localStorage.getItem("incidents:rail-off") === "1" } catch { /* private window */ }
        if (!desktop || off) return
        const store = useAIPanelStore.getState()
        useLead.getState().setTab("lead")
        if (store.isOpen) return
        store.open()
        // `hide`, not `close`: leaving a case is not the reader turning the rail off.
        return () => { if (useAIPanelStore.getState().isOpen) useAIPanelStore.getState().hide() }
    }, [desktop])

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

    // Gating (round 5): reading is never blocked. A chapter's check or talk opens once every
    // earlier chapter's check and talk is passed; the final steps open after all of them.
    const chapterOrder = useMemo(() => steps.filter((s) => s.kind === "chapter").map((s) => String(s.content.id)), [steps])
    const gates = useMemo(() => steps.filter((s) => s.kind === "check" || s.kind === "talk"), [steps])
    const lockedBy = useCallback((s: PlayerStep): PlayerStep | null => {
        // Reading, the front page and what you'll learn are never locked.
        if (s.kind === "chapter" || s.kind === "start" || s.kind === "learn") return null
        const ci = s.kind === "check" || s.kind === "talk" ? chapterOrder.indexOf(String(s.content.chapter)) : Infinity
        return gates.find((g) => chapterOrder.indexOf(String(g.content.chapter)) < ci && !isDone(g)) ?? null
    }, [chapterOrder, gates, isDone])

    const pageDone = useCallback((p: Page) => isDone(p.main) && (!p.check || isDone(p.check)), [isDone])
    const done = pages.filter(pageDone).length

    // The sidebar (INC-77): acts, then one row per page. A chapter's later pages (its talk)
    // sit indented under it.
    const acts = useMemo(() => {
        const out: { act: string; rows: { p: Page; i: number; sub: boolean }[] }[] = []
        pages.forEach((p, i) => {
            const s = p.main
            const act = typeof s.content.act === "string" ? s.content.act : s.part === "Final" ? "Final" : "The case"
            let a = out[out.length - 1]
            if (!a || a.act !== act) { a = { act, rows: [] }; out.push(a) }
            const prev = a.rows[a.rows.length - 1]
            a.rows.push({ p, i, sub: !!prev && prev.p.main.part === s.part && !!chapterNo(s.part) })
        })
        return out
    }, [pages])

    const markAndNext = () => { dispatch({ type: "stepDone", stepKey: step.key }); go(index + 1) }
    // Steps the reader marks done by hand (the rest are done by answering).
    const markable = (step.kind === "chapter" || step.kind === "talk" || step.kind === "closing-talk" || step.kind === "closing" || step.kind === "learn") && !isDone(step) && !lockedBy(step)

    // Where a page sits, said once (INC-77): never the title again.
    const where = (p: Page) => {
        const s = p.main
        const act = typeof s.content.act === "string" ? s.content.act : null
        const ch = chapterPages.indexOf(p)
        if (ch >= 0) return `${act ? `${act} · ` : ""}Chapter ${ch + 1} of ${chapterPages.length}`
        const no = chapterNo(s.part)
        return [act ?? s.part, no ? `Chapter ${Number(no)}` : null].filter(Boolean).join(" · ")
    }

    const list = (
        <ScrollArea className="h-full" reflow>
            <nav aria-label="Steps" className="py-3">
                {acts.map((a) => (
                    <div key={a.act} className="mb-3">
                        <p className="px-4 pb-1 pt-2 text-[11.5px] font-medium text-neutral-500 dark:text-neutral-400">{a.act}</p>
                        <ol>
                            {a.rows.map(({ p, i, sub }) => {
                                const s = p.main
                                const Icon = ICON[s.kind] ?? BookOpen
                                const on = i === index
                                const ok = pageDone(p)
                                const locked = !!lockedBy(s)
                                const no = !sub ? chapterNo(s.part) : null
                                const xp = s.xp + (p.check?.xp ?? 0)
                                return (
                                    <li key={s.key}>
                                        <button type="button" onClick={() => go(i)} aria-current={on ? "step" : undefined} title={locked ? "Pass the earlier checks and talks to open this" : s.title}
                                            className={cn("relative flex w-full min-w-0 items-start gap-2.5 py-1.5 pr-3 text-left text-[13.5px] leading-5 transition-colors", sub ? "pl-10" : "pl-4",
                                                on ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-900 dark:text-white" : locked ? "text-neutral-400 dark:text-neutral-600" : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-900/60 dark:hover:text-white")}>
                                            {on && <span aria-hidden className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-neutral-900 dark:bg-white" />}
                                            <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md font-mono text-[10.5px] tabular-nums", ok ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-400 dark:text-neutral-500")}>
                                                {ok ? <Check className="size-3" aria-hidden /> : locked ? <Lock className="size-3" aria-hidden /> : no ?? <Icon className="size-3.5" aria-hidden />}
                                            </span>
                                            {/* Titles wrap to the pane's width, never cut off (Niraj, 2026-10-01). */}
                                            <span className="min-w-0 flex-1 break-words">{s.title}</span>
                                            {xp > 0 && !ok && <span className="shrink-0 font-mono text-[10px] tabular-nums text-neutral-400">+{xp}</span>}
                                        </button>
                                    </li>
                                )
                            })}
                        </ol>
                    </div>
                ))}
                <RunsList slug={data.slug} />
            </nav>
        </ScrollArea>
    )

    const checkLock = page.check ? lockedBy(page.check) : null
    const body = (
        <ScrollArea className="h-full">
            <div ref={top} />
            <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step.key}
                    initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? { opacity: 1 } : { opacity: 0 }} transition={{ duration: 0.22 }}
                    className="mx-auto max-w-4xl px-5 pb-16 pt-8 sm:px-8">
                    <p className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">{where(page)}</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">{step.title}</h1>
                    <div className="mt-6">
                        {runMode === "deciding" ? (
                            <StartScreen />
                        ) : lockedBy(step) ? (
                            <Locked by={lockedBy(step)!} onGo={() => goToStep(lockedBy(step)!)} />
                        ) : (
                            <StepView step={step} slug={data.slug} onDone={() => dispatch({ type: "stepDone", stepKey: step.key })} onNext={() => go(index + 1)} />
                        )}
                    </div>
                    {page.check && runMode !== "deciding" && (
                        // The chapter's check, under it (INC-75).
                        <section ref={checkRef} aria-label="Check yourself" className="mt-14 scroll-mt-6 border-t border-neutral-200 pt-10 dark:border-neutral-800">
                            {checkLock ? <Locked by={checkLock} onGo={() => goToStep(checkLock)} /> : <StepView step={page.check} slug={data.slug} onDone={() => dispatch({ type: "stepDone", stepKey: page.check!.key })} onNext={() => go(index + 1)} />}
                        </section>
                    )}
                </motion.div>
            </AnimatePresence>
        </ScrollArea>
    )

    // The steps pane keeps the width the reader dragged to (INC-76): sizes are in pixels and
    // re-applied when the page narrows or widens (the AI rail, a window resize), which a
    // percentage layout would otherwise scale.
    const stepsPanel = usePanelRef()
    const groupBox = useRef<HTMLDivElement>(null)
    const stepsW = useRef(STEPS_W.def)
    const quietUntil = useRef(0)
    const groupW = useRef(0)
    // The server renders both panes as flex 1 (50/50) until the library measures; until the
    // width is applied, CSS holds the steps pane at its default so nothing flashes.
    const [panesReady, setPanesReady] = useState(false)
    useEffect(() => {
        if (!desktop) return
        try { const v = Number(localStorage.getItem(STEPS_W_KEY)); if (v) stepsW.current = Math.min(STEPS_W.max, Math.max(STEPS_W.min, v)) } catch { /* private window */ }
        // Retried for a few frames: the first call can land before the group has its layout.
        const apply = (tries = 12) => {
            try {
                const api = stepsPanel.current
                const gw = box?.offsetWidth ?? 0
                // The layout's own percentage, not the element's width: CSS pins that until ready.
                const want = (stepsW.current / gw) * 100
                if (api && gw && Math.abs(api.getSize().asPercentage - want) > 0.2) api.resize(toPct(stepsW.current, gw))
                else if (api && gw) return setPanesReady(true)
            } catch { /* not mounted yet */ }
            if (tries > 0) requestAnimationFrame(() => apply(tries - 1))
            else setPanesReady(true)
        }
        const box = groupBox.current
        groupW.current = box?.offsetWidth ?? 0
        quietUntil.current = performance.now() + 300
        const raf = requestAnimationFrame(() => apply())
        const ro = new ResizeObserver(() => {
            const w = box?.offsetWidth ?? 0
            if (w === groupW.current) return
            groupW.current = w
            quietUntil.current = performance.now() + 300
            requestAnimationFrame(() => apply())
        })
        if (box) ro.observe(box)
        return () => { cancelAnimationFrame(raf); ro.disconnect() }
    }, [desktop, stepsPanel])
    const onStepsResize = (size: { inPixels: number }) => {
        if (!size.inPixels) return
        // A resize the page caused (the layout keeps percentages) is put back, not saved; only
        // a drag is the reader's choice. The library can report it before the observer above
        // sees the page change, so the page width is compared here too.
        const now = groupBox.current?.offsetWidth ?? 0
        if (now !== groupW.current) { groupW.current = now; quietUntil.current = performance.now() + 300 }
        if (performance.now() < quietUntil.current) {
            const gw = now
            if (gw && Math.abs(size.inPixels - stepsW.current) > 2) requestAnimationFrame(() => { try { stepsPanel.current?.resize(toPct(stepsW.current, gw)) } catch { /* not mounted */ } })
            return
        }
        stepsW.current = Math.round(size.inPixels)
        try { localStorage.setItem(STEPS_W_KEY, String(stepsW.current)) } catch { /* private window */ }
    }

    function goToStep(s: PlayerStep) {
        const i = pages.findIndex((p) => p.main.key === s.key || p.check?.key === s.key)
        if (i >= 0) go(i)
    }

    const next = pages[index + 1]
    return (
        <div className="flex h-screen min-h-0 flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
            <header className="flex h-14 shrink-0 items-center gap-4 border-b border-neutral-200 px-4 dark:border-neutral-800">
                <Link href="/incidents" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white">
                    <ArrowLeft className="size-4" aria-hidden /> <span className="hidden sm:inline">Incidents</span>
                </Link>
                <span aria-hidden className="h-5 w-px bg-neutral-200 dark:bg-neutral-800" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{data.title}</p>
                    <p className="truncate font-mono text-[10.5px] text-neutral-500 dark:text-neutral-400">{topicLabel(data.topic)} · {data.minutes} min</p>
                </div>
                <LeadButton />
                <RunBadge />
                <div className="hidden items-center gap-3 sm:flex">
                    <span className="font-mono text-[12px] tabular-nums text-neutral-500 dark:text-neutral-400">{done}/{pages.length}</span>
                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div className="h-full origin-left rounded-full bg-neutral-900 transition-transform duration-500 dark:bg-white" style={{ transform: `scaleX(${done / pages.length})` }} />
                    </div>
                </div>
            </header>

            <div ref={groupBox} data-panes={panesReady ? "ready" : "boot"} className="min-h-0 flex-1">
                <style>{`[data-panes="boot"] #steps{flex:0 0 ${STEPS_W.def}px !important}`}</style>
                {/* lg and up: resizable panes. Below: the step alone, with a picker in the footer.
                    The body is mounted ONCE: it holds the narrator and the live talk, and
                    rendering it in both layouts (one hidden by CSS) played every clip twice. */}
                {desktop ? (
                    <PanelGroup orientation="horizontal" id="incident-player" className="h-full">
                        <Panel id="steps" panelRef={stepsPanel} onResize={onStepsResize} defaultSize={`${STEPS_W.def}px`} minSize={`${STEPS_W.min}px`} maxSize={`${STEPS_W.max}px`} className="min-w-0 bg-neutral-50/60 dark:bg-neutral-950">{list}</Panel>
                        <Handle />
                        <Panel id="step" minSize="50%" className="min-w-0">{body}</Panel>
                    </PanelGroup>
                ) : (
                    <div className="h-full">{body}</div>
                )}
            </div>

            <footer className="flex h-16 shrink-0 items-center justify-between gap-3 border-t border-neutral-200 px-4 dark:border-neutral-800">
                <button type="button" onClick={() => go(index - 1)} disabled={index === 0}
                    className="inline-flex h-10 min-w-0 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-600">
                    <ArrowLeft className="size-4 shrink-0" aria-hidden />
                    <PageLabel page={pages[index - 1]} kind={pages[index - 1] ? kindOf(pages[index - 1]!, chapterPages) : ""} fallback="Previous" />
                </button>
                <select aria-label="Go to step" value={index} onChange={(e) => go(Number(e.target.value))}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm lg:hidden dark:border-neutral-800 dark:bg-neutral-950">
                    {pages.map((p, i) => <option key={p.main.key} value={i}>{i + 1}. {p.main.title}</option>)}
                </select>
                {step.kind === "chapter" && leadReady ? <FooterPlayer /> : <span className="hidden flex-1 lg:block" />}
                {/* "Got it, continue" lives here, not under the content (Niraj, 2026-09-27): on a
                    step that is marked by hand and not yet done, Next marks it and moves on. */}
                {markable ? (
                    <button type="button" onClick={markAndNext}
                        className="inline-flex h-10 min-w-0 items-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-2px_0_rgba(0,0,0,0.4)] transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                        <CheckCheck className="size-4 shrink-0" aria-hidden />
                        <span className="flex min-w-0 flex-col items-start text-left leading-tight">
                            {next && <span className="hidden max-w-[14rem] truncate font-mono text-[10px] opacity-70 sm:block">Next: {kindOf(next, chapterPages)}</span>}
                            <span className="truncate">{index === pages.length - 1 ? "Got it, finish" : "Got it, continue"}</span>
                        </span>
                    </button>
                ) : (
                    <button type="button" onClick={() => go(index + 1)} disabled={index === pages.length - 1}
                        className="inline-flex h-10 min-w-0 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-600">
                        <PageLabel page={next} kind={next ? kindOf(next, chapterPages) : ""} fallback="Next" />
                        <ArrowRight className="size-4 shrink-0" aria-hidden />
                    </button>
                )}
            </footer>
        </div>
    )
}

/** What kind of page this is, for the footer's small line (INC-77): "Chapter 2", "Talk", "Final". */
function kindOf(p: Page, chapterPages: Page[]) {
    const ch = chapterPages.indexOf(p)
    if (ch >= 0) return `Chapter ${ch + 1}`
    if (p.main.kind === "talk") return "Talk"
    if (p.main.kind === "learn") return "Keep learning"
    return p.main.part === "Final" ? "Final" : p.main.part.replace(/^\d+ · /, "")
}

/** A footer label (INC-77): the kind of page, then its title. Never the same words twice. */
function PageLabel({ page, kind, fallback }: { page?: Page; kind: string; fallback: string }) {
    if (!page) return <span className="hidden sm:inline">{fallback}</span>
    const title = page.main.title
    return (
        <span className="hidden min-w-0 flex-col items-start text-left leading-tight sm:flex">
            {kind && kind !== title && <span className="max-w-[14rem] truncate font-mono text-[10px] text-neutral-500 dark:text-neutral-400">{kind}</span>}
            <span className="max-w-[14rem] truncate">{title}</span>
        </span>
    )
}

/** A step that opens once an earlier check or talk is passed. */
function Locked({ by, onGo }: { by: PlayerStep; onGo: () => void }) {
    return (
        <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-neutral-300 p-8 dark:border-neutral-700">
            <span className="flex size-11 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-900"><Lock className="size-5" aria-hidden /></span>
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

/**
 * "What you'll learn" as the case's last step (Niraj, 2026-09-28: a step like the others,
 * not a box in the sidebar): the topics, and the hand-written Pathfinder path to adopt.
 */
function LearnStep() {
    const c = useCase()
    const router = useRouter()
    const { gate } = useGate()
    const [adopting, setAdopting] = useState(false)
    if (!c.learn?.length) return null
    const hasPath = PATH_CASES.includes(c.slug)
    const adopt = () => gate(async () => {
        setAdopting(true)
        const r = await adoptIncidentPath(c.slug)
        if (!r.success) { toast.error(r.error); setAdopting(false); return }
        toast.success(r.existing ? "You already have this path. Opening it." : "Added to your Pathfinder goals")
        router.push(`/pathfinder/${r.slug}`)
    }, "learn")
    return (
        <div className="space-y-6">
            <p className="text-[17px] leading-8 text-neutral-600 dark:text-neutral-400">
                The case showed you what broke. These are the topics underneath it, each with notes, in a Pathfinder path you can follow a day at a time.
            </p>
            <ol className="grid gap-3 sm:grid-cols-2">
                {c.learn.map((l, i) => (
                    <li key={l.title} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                        <p className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">{String(i + 1).padStart(2, "0")}</p>
                        <p className="mt-1 text-[15px] font-semibold leading-snug text-neutral-900 dark:text-white">{l.title}</p>
                        <p className="mt-1 text-[13.5px] leading-6 text-neutral-600 dark:text-neutral-400">{l.summary}</p>
                    </li>
                ))}
            </ol>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <GraduationCap className="size-5 shrink-0 text-neutral-700 dark:text-neutral-300" aria-hidden />
                <p className="min-w-0 flex-1 text-[14px] leading-6 text-neutral-700 dark:text-neutral-300">
                    {hasPath ? "Free. It becomes one of your Pathfinder goals, with notes for every topic." : "The learning path for this case is being written."}
                </p>
                {hasPath && (
                    <button type="button" onClick={adopt} disabled={adopting}
                        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                        {adopting ? <InlineLoader size="sm" /> : <ArrowRight className="size-4" aria-hidden />} Adopt this path
                    </button>
                )}
            </div>
            {c.build && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                    <Hammer className="size-5 shrink-0 text-neutral-700 dark:text-neutral-300" aria-hidden />
                    <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-neutral-900 dark:text-white">Build it: {c.build.title}</p>
                        <p className="mt-0.5 text-[14px] leading-6 text-neutral-700 dark:text-neutral-300">{c.build.summary}</p>
                    </div>
                    <Link href={`/projects/${c.build.project}`}
                        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-neutral-300 px-4 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-500 dark:border-neutral-700 dark:text-white dark:hover:border-neutral-500">
                        Open the project <ArrowRight className="size-4" aria-hidden />
                    </Link>
                </div>
            )}
        </div>
    )
}

/** One step, by kind. */
function StepView({ step, slug, onDone, onNext }: { step: PlayerStep; slug: string; onDone: () => void; onNext: () => void }) {
    const { progress, dispatch } = useProgress()
    const [reportTick, setReportTick] = useState(0)
    const c = step.content
    switch (step.kind) {
        case "start":
            return <StartScreen variant="step" content={c as StartContent} onDone={() => { onDone(); onNext() }} />
        case "learn":
            return <LearnStep />
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
                <QuizRunner key={step.key} title="Check yourself" questions={questions} initial={initial} retakeLabel="Practise again" figure={(p) => <PickFigure slug={slug} {...p} />}
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
                    <QuizRunner key={step.key} title="Make the call" questions={questions} initial={initial} retakeLabel="Practise again" figure={(p) => <PickFigure slug={slug} {...p} />}
                        speak={async (qid) => { const r = await speakQuestion(slug, "final", qid); return r.success ? r.url : null }}
                        onComplete={(results) => { for (const r of results) dispatch({ type: "predict", question: r.questionId, option: String(r.response) }) }} />
                </div>
            )
        }
        case "round":
            return <Round />
        case "postmortem":
            return <PostmortemStep real={c.real as Parameters<typeof PostmortemStep>[0]["real"]} points={c.points as Parameters<typeof PostmortemStep>[0]["points"]} xp={step.xp} />
        case "talk":
            return <MockStep slug={slug} stepKey={step.key} content={c as { opening: string; probe: string[]; minutes: number; intro?: string }} onFinished={onDone} />
        case "closing-talk":
            // Handing in the closing talk starts the run's report (INC-37).
            return (
                <div className="space-y-8">
                    <MockStep slug={slug} stepKey={step.key} capped content={c as { opening: string; probe: string[]; minutes: number; intro?: string }} onFinished={() => { onDone(); setReportTick((n) => n + 1) }} />
                    <ReportCard slug={slug} trigger={reportTick} />
                </div>
            )
        case "closing":
            return (
                <div className="space-y-12">
                    <ReportCard slug={slug} />
                    <Closing />
                    <Checklist />
                </div>
            )
        default:
            return null
    }
}


/**
 * A chapter, read as an article (INC-74, Niraj 2026-10-01: "article first"): the story is
 * always on the page with each diagram after the paragraph about it. Listen is optional;
 * while it plays, the paragraph being read is highlighted and the page follows it.
 */
function ChapterView({ slug, chapter, stepTitle }: { slug: string; chapter: Chapter & { glossary?: { key?: string; term: string; definition: string }[] }; stepTitle: string }) {
    const refs = useRef<Record<string, HTMLElement | null>>({})
    const says = chapter.blocks.filter((b): b is Extract<ChapterBlock, { kind: "say" }> => b.kind === "say")
    const paragraphs = says.map((b) => b.text)
    const setChapter = useLead((s) => s.setChapter)
    const reading = useLead((s) => (s.chapter?.chapterId === chapter.id ? s.index : null))
    const playing = useLead((s) => s.state === "playing")
    const explain = useLead((s) => s.explain)
    const terms: InlineTerm[] = (chapter.glossary ?? []).filter((g) => g.key).map((g) => ({ key: g.key!, term: g.term }))
    const onTerm = (t: InlineTerm) => { openLeadRail(); void explain(t.key, t.term) }

    // The voice lives in the rail (INC-47); this chapter tells it what to read.
    useEffect(() => { setChapter({ chapterId: chapter.id, stepTitle, paragraphs }) }, [chapter.id]) // eslint-disable-line react-hooks/exhaustive-deps

    // What the paragraph being read is about (INC-49): that part lights, the page follows it.
    const focus = reading !== null ? parseFocus(says[reading]?.focus) : null
    // Only while it plays, and once per paragraph: a reader who scrolls away keeps their place.
    useEffect(() => {
        if (reading === null || !playing) return
        const target = (focus && refs.current[focus.block]) ?? refs.current[`say-${reading}`]
        target?.scrollIntoView({ block: "center", behavior: "smooth" })
    }, [reading]) // eslint-disable-line react-hooks/exhaustive-deps

    // Diagrams build as the lead reaches their parts (INC-51): the highest order named so far.
    const upToFor = (blockId: string | undefined, flow: Flow): number | undefined => {
        if (reading === null || !blockId || !flow.nodes.some((n) => n.order !== undefined)) return undefined
        let top = 0
        says.slice(0, reading + 1).forEach((s) => {
            const f = parseFocus(s.focus)
            const n = f && f.block === blockId ? flow.nodes.find((x) => x.id === f.part) : undefined
            if (n?.order !== undefined) top = Math.max(top, n.order)
        })
        return top
    }

    // The case's system, pinned above the chapter (INC-63); `map:<part>` lights a part of it.
    const system = getIncidentCase(slug)?.system

    // A sequence builds the same way: up to the furthest message the narration has named.
    const upToSeq = (blockId: string | undefined, messageIds: string[]): number | undefined => {
        if (reading === null || !blockId) return undefined
        const named = says.map((s) => parseFocus(s.focus)).filter((f) => f?.block === blockId && f.part && messageIds.includes(f.part))
        if (!named.length) return undefined
        let top = -1
        says.slice(0, reading + 1).forEach((s) => {
            const f = parseFocus(s.focus)
            if (f?.block === blockId && f.part) top = Math.max(top, messageIds.indexOf(f.part))
        })
        return top
    }

    let sayIndex = -1
    return (
        <div className="space-y-6">
            {system && <div className="sticky top-0 z-30 -mx-1 bg-white/90 px-1 pb-1 backdrop-blur dark:bg-neutral-950/90"><SystemStrip map={system} chapterId={chapter.id} lit={focus?.block === "map" ? focus.part : null} /></div>}
            <p className="max-w-[44rem] text-[19px] leading-8 text-neutral-600 dark:text-neutral-400">{chapter.lead}</p>
            {/* One moment shared by the chapter's timeline and dashboard (INC-65, INC-66). */}
            <ScrubProvider>
            <div className="space-y-6">
                {chapter.blocks.map((b, i) => {
                    if (b.kind === "say") {
                        sayIndex += 1
                        const at = sayIndex
                        return (
                            <p key={i} ref={(el) => { refs.current[`say-${at}`] = el }}
                                className={cn("-mx-3 max-w-[calc(44rem+1.5rem)] rounded-lg px-3 py-1 text-[17px] leading-8 transition-colors duration-300", at === reading && playing ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-white" : "text-neutral-800 dark:text-neutral-200")}>
                                <Inline text={b.text} terms={terms} onTerm={onTerm} />
                            </p>
                        )
                    }
                    const id = b.id ?? `b${i}`
                    const lit = focus?.block === id
                    const dim = !!focus && !lit
                    return (
                        <div key={i} ref={(el) => { refs.current[id] = el }} className={cn("scroll-mt-24 transition-opacity duration-300", dim && "opacity-40")}>
                            <Block block={b} part={lit ? focus!.part : null} upTo={b.kind === "flow" ? upToFor(b.id, b.flow) : b.kind === "sequence" ? upToSeq(b.id, b.sequence.messages.map((m) => m.id)) : undefined} terms={terms} onTerm={onTerm} system={system} />
                        </div>
                    )
                })}
            </div>
            </ScrubProvider>
            {chapter.glossary && chapter.glossary.length > 0 && <Glossary terms={chapter.glossary} onAsk={(g) => g.key && onTerm({ key: g.key, term: g.term })} />}
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

/**
 * A "pick" check's figure (INC-71): the case's system map, tappable, with the incident's
 * marks hidden so the picture doesn't give the answer away.
 */
function PickFigure({ slug, q, picked, toggle, answer }: PickFigureProps & { slug: string }) {
    const system = getIncidentCase(slug)?.system
    if (q.figure !== "map" || !system) return null
    return (
        <DiagramFrame compact>
            <SystemMap map={system} showIncident={false} pick={{ picked, toggle, answer }} />
        </DiagramFrame>
    )
}

/** "block" or "block:part". */
function parseFocus(f?: string): { block: string; part: string | null } | null {
    if (!f) return null
    const [block, ...rest] = f.split(":")
    return { block: block!, part: rest.length ? rest.join(":") : null }
}

/** The header's way to the lead in the right panel, always there (Niraj, 2026-09-27). */
function LeadButton() {
    const open = useAIPanelStore((s) => s.isOpen)
    const tab = useLead((s) => s.tab)
    if (open && tab === "lead") return null
    return (
        <button type="button" onClick={openLeadRail}
            className="inline-flex h-8 items-center gap-2 rounded-full bg-neutral-900 px-3 text-[12.5px] font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
            <Mic className="size-3.5" aria-hidden /> <span className="hidden sm:inline">Ask the lead</span>
        </button>
    )
}

/** Open the rail on the lead tab (it may have been closed). */
function openLeadRail() {
    useLead.getState().setTab("lead")
    useAIPanelStore.getState().open()
}

/**
 * Listening lives in the page's bottom bar (Niraj, 2026-09-27: "put this to the bottom bar
 * so it doesn't block the words"): play, and speed and Auto in one menu. The words are on the
 * page already (INC-74). Nothing floats over the content. The rail is for talking.
 */
function FooterPlayer() {
    const { state, answering, toggle, speed, setSpeed, autoplay, setAutoplay } = useLead()
    const playing = state === "playing" && !answering
    // Two controls (Niraj, 2026-09-27): play, and one menu for speed and Auto. The text is always on the page (INC-74).
    return (
        // On phones it sits beside the step picker, so it takes only its own width.
        <div className="flex min-w-0 shrink-0 items-center justify-center gap-2 sm:flex-1">
            <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Listen to the lead"}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                {state === "loading" ? <InlineLoader size="sm" /> : playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                <span className="hidden sm:inline">{playing ? "Pause" : state === "paused" ? "Resume" : state === "done" ? "Listen again" : "Listen"}</span>
                {playing && <SpeakingBars />}
            </button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button type="button" aria-label="Listening options"
                        className="hidden h-10 shrink-0 items-center sm:inline-flex gap-1.5 rounded-full border border-neutral-200 px-3 font-mono text-[12px] text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300">
                        <SlidersHorizontal className="size-3.5" aria-hidden /> {speed}x
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="center" className="w-56">
                    <DropdownMenuLabel className="text-[12px] text-neutral-500">Speed</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={String(speed)} onValueChange={(v) => setSpeed(Number(v))}>
                        {SPEEDS.map((s) => <DropdownMenuRadioItem key={s} value={String(s)}>{s}x</DropdownMenuRadioItem>)}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem checked={autoplay} onCheckedChange={(v) => setAutoplay(!!v)}>Play when a chapter opens</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

const SPEEDS = [1, 1.25, 1.5]

/** Three bars that move while the lead reads: a glanceable "the voice is on". */
function SpeakingBars() {
    return (
        <span className="inline-flex h-4 items-end gap-[3px]" aria-label="Speaking">
            {[0, 1, 2].map((i) => (
                <span key={i} className="h-full w-[3px] origin-bottom rounded-full bg-neutral-900 motion-safe:animate-[incident-eq_0.9s_ease-in-out_infinite] dark:bg-white" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
            <style>{`@keyframes incident-eq { 0%, 100% { transform: scaleY(0.35) } 50% { transform: scaleY(1) } }`}</style>
        </span>
    )
}

function Block({ block, part = null, upTo, terms, onTerm, system }: { block: ChapterBlock; part?: string | null; upTo?: number; terms?: InlineTerm[]; onTerm?: (t: InlineTerm) => void; system?: SystemMapData }) {
    switch (block.kind) {
        case "say":
            return null
        case "flow":
            return <FlowChart flow={block.flow} lit={part} upTo={upTo} />
        case "sequence":
            return <SequenceDiagram sequence={block.sequence} lit={part} upTo={upTo} />
        case "timeline":
            return <Timeline timeline={block.timeline} lit={part} />
        case "dashboard":
            return <DashboardView dashboard={block.dashboard} lit={part} />
        case "causes":
            return <CausalChainView causes={block.causes} lit={part} />
        case "states":
            return <StateDiagramView states={block.states} lit={part} />
        case "map-change":
            return system ? <MapChange map={system} lit={part} caption={block.caption} /> : null
        case "roles":
            return <RolesView roles={block.roles} lit={part} />
        case "status":
            return <StatusView status={block.status} lit={part} />
        case "runbook":
            return <RunbookView title={block.title} steps={block.steps} lit={part} />
        case "code":
            // Narration lights lines: "code:L12-20".
            return <CodeSample sample={block.sample} stage={block.stage} file={block.file} compare={block.compare} highlight={part?.startsWith("L") ? part.slice(1) : block.highlight} />
        case "note":
            // The chapter's takeaway as a pull quote (INC-78): a rule, no box.
            return <p className="max-w-[44rem] border-l-2 border-neutral-900 py-1 pl-5 text-[19px] font-medium leading-8 tracking-tight text-neutral-900 dark:border-white dark:text-white"><Inline text={block.text} terms={terms} onTerm={onTerm} /></p>
        case "see":
            return (
                <div className="overflow-hidden rounded-xl bg-neutral-950 ring-1 ring-white/10">
                    <p className="border-b border-white/10 px-4 py-2.5 font-mono text-[11px] text-neutral-400">{block.title}</p>
                    <ol className="space-y-2 p-4 font-mono text-[13px] leading-6">
                        {block.lines.map((l, i) => (
                            <li key={i} className={cn("flex gap-3 rounded-md transition-colors", part === String(i) && "-mx-2 bg-white/10 px-2")}>
                                {l.t && <span className="min-w-10 shrink-0 tabular-nums text-neutral-500">{l.t}</span>}
                                {l.who && <span className="w-24 shrink-0 text-neutral-400">{l.who}</span>}
                                <span className={cn(l.tone === "bad" ? "text-rose-400" : l.tone === "muted" ? "text-neutral-400" : "text-neutral-100")}>{l.text}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )
        case "compare":
            return (
                <ScrollArea orientation="horizontal" className="rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <table className="w-full min-w-[40rem] text-left text-[14px]">
                        <thead>
                            <tr className="border-b border-neutral-200 dark:border-neutral-800">
                                <th className="p-4" />
                                {block.columns.map((col) => <th key={col} className="p-4 font-mono text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{col}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {block.rows.map((r) => (
                                <tr key={r.label} className={cn("transition-colors duration-300", part === r.label && "bg-neutral-100 dark:bg-neutral-900", part && part !== r.label && "opacity-40")}>
                                    <td className="p-4 font-semibold text-neutral-900 dark:text-white">{r.label}</td>
                                    {r.cells.map((cell, i) => <td key={i} className="p-4 leading-6 text-neutral-700 dark:text-neutral-300"><Inline text={cell} terms={terms} onTerm={onTerm} /></td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </ScrollArea>
            )
        case "simulator":
            return <CaseSimulator preset={block.preset} />
    }
}

function Glossary({ terms, onAsk }: { terms: { key?: string; term: string; definition: string }[]; onAsk: (t: { key?: string; term: string }) => void }) {
    const [open, setOpen] = useState<string | null>(null)
    return (
        // Flat (INC-78): a label and the words, no box.
        <div>
            <p className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">Words in this chapter</p>
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
                        <span className="font-semibold text-neutral-900 dark:text-white">{open}:</span> {terms.find((t) => t.term === open)?.definition}{" "}
                        <button type="button" onClick={() => { const t = terms.find((x) => x.term === open); if (t) onAsk(t) }} className="font-medium text-neutral-900 underline underline-offset-4 dark:text-white">Ask the lead to explain</button>
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    )
}
