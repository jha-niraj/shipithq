"use client"

import { useEffect, useState } from "react"
import { Check, Mic } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { MONO } from "@/components/marketing/primitives"

/**
 * The live product window in the student hero (plan/web/revamp REV-101). One app
 * window that cycles on its own through the four things the product does, with the
 * product's own labels (sources as in fragments.tsx):
 *
 *   Practice  cases-panel.tsx: "Accepted: {x} of {n} tests passed", "Hidden tests"
 *   Project   task-brief.tsx:  "{sprint} · Task {n} · {time}", "In progress", "Done when"
 *   Mock      InterviewResultsClient.tsx: "Overall Score", three scores out of 100
 *   Resume    resume-editor.tsx: "ATS Score", "{n}/100", "Missing keywords"
 *
 * Tabs under the window show which view is on and how long until the next; hovering or
 * focusing the window pauses it, and reduced motion stops the auto-advance entirely.
 * The numbers are an example session; the window is aria-hidden apart from its tabs.
 */

const VIEWS = ["Practice", "Project", "Mock", "Resume"] as const
const STEP_MS = 4800

function PracticeView() {
    const lines = [
        "def two_sum(nums, target):",
        "    seen = {}",
        "    for i, n in enumerate(nums):",
        "        if target - n in seen:",
        "            return [seen[target - n], i]",
        "        seen[n] = i",
    ]
    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-2.5">
                <span className={cn(MONO, "text-[12px] text-neutral-600")}>two_sum.py</span>
                <span className={cn(MONO, "text-[10px] uppercase tracking-[0.14em] text-neutral-500")}>Python · Linux container</span>
            </div>
            <pre className={cn(MONO, "flex-1 px-5 py-4 text-[12.5px] leading-6 text-neutral-800")}>
                {lines.map((l, i) => (
                    <span key={i} className="hw-type block" style={{ animationDelay: `${i * 0.18}s` }}>{l || " "}</span>
                ))}
            </pre>
            <div className="space-y-2 border-t border-neutral-100 bg-neutral-50 px-5 py-4">
                <div className="flex gap-1.5">
                    {Array.from({ length: 14 }).map((_, i) => (
                        <span key={i} className="hw-pop size-2.5 rounded-full bg-emerald-600" style={{ animationDelay: `${1.2 + i * 0.07}s` }} />
                    ))}
                </div>
                <p className="hw-in flex items-center gap-1.5 text-[13px] font-medium text-emerald-700" style={{ animationDelay: "2.3s" }}>
                    <Check className="size-4" /> Accepted: 14 of 14 tests passed
                </p>
                <p className="hw-in text-[12px] text-neutral-600" style={{ animationDelay: "2.5s" }}>Hidden tests: 10 of 10 passed</p>
            </div>
        </div>
    )
}

function ProjectView() {
    const col = (title: string, cards: string[], moving?: boolean) => (
        <div className="flex-1 rounded-xl bg-neutral-100 p-2.5">
            <p className={cn(MONO, "px-1 pb-2 text-[10px] uppercase tracking-[0.14em] text-neutral-600")}>{title}</p>
            <div className="space-y-2">
                {cards.map((c) => <div key={c} className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[12px] text-neutral-800">{c}</div>)}
                {moving && <div className="hw-land rounded-lg bg-neutral-900 px-2.5 py-2 text-[12px] font-medium text-white">Search notes as you type</div>}
            </div>
        </div>
    )
    return (
        <div className="flex h-full flex-col p-5">
            <p className={cn(MONO, "text-[10px] uppercase tracking-[0.14em] text-neutral-500")}>Sprint 2 · Task 3 · 45 min</p>
            <p className="mt-1 text-[15px] font-semibold text-neutral-900">Markdown notes with search</p>
            <div className="mt-4 flex flex-1 gap-2.5">
                {col("To do", ["Tag filter", "Export to .md"])}
                {col("In progress", ["Keyboard shortcuts"])}
                {col("Done", ["Editor", "Local storage"], true)}
            </div>
            <p className="hw-in mt-3 flex items-center gap-1.5 text-[12px] font-medium text-neutral-900" style={{ animationDelay: "1.6s" }}>
                <Check className="size-3.5" /> Done when: typing filters the list within 100ms. All 6 tests pass.
            </p>
        </div>
    )
}

function MockView() {
    const bars = [30, 55, 80, 45, 70, 35, 60, 85, 50, 40, 65, 30, 55, 75, 45]
    const scores = [["Communication", 82], ["Technical Skills", 74], ["Problem Solving", 79]] as const
    return (
        <div className="flex h-full flex-col bg-neutral-950 p-5 text-white">
            <div className="flex items-center gap-3">
                <span className="relative flex size-10 items-center justify-center rounded-full bg-white text-neutral-950">
                    <span className="hw-ping absolute inset-0 rounded-full border border-white" />
                    <Mic className="size-4" />
                </span>
                <div className="flex h-10 flex-1 items-center gap-1">
                    {bars.map((h, i) => <span key={i} className="hw-wave w-1.5 rounded-full bg-white" style={{ height: `${h}%`, animationDelay: `${i * 0.07}s` }} />)}
                </div>
            </div>
            <p className="mt-5 text-[12px] text-neutral-400">Overall Score</p>
            <p className="hw-in text-4xl font-semibold tracking-tight" style={{ animationDelay: "0.8s" }}>78<span className="text-lg text-neutral-400">/100</span></p>
            <div className="mt-4 space-y-2.5">
                {scores.map(([label, v], i) => (
                    <div key={label} className="flex items-center gap-3 text-[12px]">
                        <span className="w-28 shrink-0 text-neutral-300">{label}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                            <span className="hw-grow block h-full rounded-full bg-white" style={{ width: `${v}%`, animationDelay: `${1 + i * 0.2}s` }} />
                        </span>
                        <span className={cn(MONO, "w-6 text-right text-neutral-300")}>{v}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function ResumeView() {
    return (
        <div className="grid h-full grid-cols-[1.2fr_1fr] gap-4 p-5">
            <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-full bg-neutral-200" />
                    <div className="space-y-1.5"><div className="h-2 w-24 rounded bg-neutral-800" /><div className="h-1.5 w-16 rounded bg-neutral-300" /></div>
                </div>
                <div className="mt-4 space-y-2">
                    {[90, 75, 85, 60, 80, 70, 88, 55].map((w, i) => <div key={i} className="h-1.5 rounded bg-neutral-200" style={{ width: `${w}%` }} />)}
                </div>
                <span className="hw-scan absolute inset-x-0 top-0 h-8 bg-neutral-900/5" />
            </div>
            <div className="flex flex-col justify-center">
                <p className="text-[13px] font-medium text-neutral-900">ATS Score</p>
                <div className="relative mt-2 size-28">
                    <svg viewBox="0 0 100 100" className="size-28 -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e5e5" strokeWidth="9" />
                        <circle className="hw-ring" cx="50" cy="50" r="42" fill="none" stroke="#171717" strokeWidth="9" strokeLinecap="round" strokeDasharray="264" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-neutral-900">86</span>
                </div>
                <p className="mt-3 text-[12px] font-medium text-neutral-900">Missing keywords</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {["Redis", "CI/CD", "Docker"].map((k, i) => (
                        <span key={k} className={cn(MONO, "hw-in rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] text-neutral-700")} style={{ animationDelay: `${1.4 + i * 0.2}s` }}>{k}</span>
                    ))}
                </div>
            </div>
        </div>
    )
}

const STYLES = `
@keyframes hw-type { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes hw-pop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes hw-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes hw-land { 0% { opacity: 0; transform: translate(-160%, -10px) rotate(-4deg); } 60% { opacity: 1; } 100% { opacity: 1; transform: none; } }
@keyframes hw-wave { 0%,100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
@keyframes hw-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes hw-ping { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.8); opacity: 0; } }
@keyframes hw-scan { 0% { transform: translateY(0); } 100% { transform: translateY(220px); } }
@keyframes hw-ring { from { stroke-dashoffset: 264; } to { stroke-dashoffset: 37; } }
@keyframes hw-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.hw-type { animation: hw-type 0.5s steps(24) both; }
.hw-pop { animation: hw-pop 0.3s cubic-bezier(.3,1.6,.5,1) both; }
.hw-in { animation: hw-in 0.4s ease both; }
.hw-land { animation: hw-land 1s cubic-bezier(.3,1.1,.4,1) 0.6s both; }
.hw-wave { transform-origin: center; animation: hw-wave 1s ease-in-out infinite; }
.hw-grow { transform-origin: left; animation: hw-grow 0.8s cubic-bezier(.2,.7,.2,1) both; }
.hw-ping { animation: hw-ping 1.6s ease-out infinite; }
.hw-scan { animation: hw-scan 2.4s ease-in-out infinite alternate; }
.hw-ring { animation: hw-ring 1.6s cubic-bezier(.2,.7,.2,1) 0.3s both; }
.hw-bar { transform-origin: left; animation: hw-bar linear both; }
@media (prefers-reduced-motion: reduce) {
  .hw-type, .hw-pop, .hw-in, .hw-land, .hw-wave, .hw-grow, .hw-ping, .hw-scan, .hw-ring, .hw-bar { animation: none !important; }
  .hw-ring { stroke-dashoffset: 37; }
}
`

export function HeroWindow() {
    const [active, setActive] = useState(0)
    const [paused, setPaused] = useState(false)
    const [reduced, setReduced] = useState(false)

    useEffect(() => {
        setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    }, [])

    useEffect(() => {
        if (paused || reduced) return
        const t = setTimeout(() => setActive((a) => (a + 1) % VIEWS.length), STEP_MS)
        return () => clearTimeout(t)
    }, [active, paused, reduced])

    const View = [PracticeView, ProjectView, MockView, ResumeView][active]!

    return (
        <div
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            <style>{STYLES}</style>
            {/* A soft pastel wash behind the window. */}
            <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(60%_60%_at_30%_30%,#BFE3D0_0%,transparent_70%),radial-gradient(50%_50%_at_80%_70%,#F2C9C4_0%,transparent_70%)] opacity-70 blur-2xl" />
            <div aria-hidden className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.04),0_32px_64px_-24px_rgba(0,0,0,0.35)]">
                <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-4 py-2.5">
                    <span className="size-2.5 rounded-full bg-neutral-300" />
                    <span className="size-2.5 rounded-full bg-neutral-300" />
                    <span className="size-2.5 rounded-full bg-neutral-300" />
                    <span className={cn(MONO, "ml-3 truncate rounded-md bg-white px-3 py-0.5 text-[11px] text-neutral-500")}>app.shipithq.com/{VIEWS[active]!.toLowerCase()}</span>
                </div>
                <div key={active} className="h-[21rem] animate-in fade-in-0 duration-300">
                    <View />
                </div>
            </div>
            <div role="tablist" aria-label="What ShipItHQ does" className="mt-4 grid grid-cols-4 gap-2">
                {VIEWS.map((v, i) => (
                    <button
                        key={v}
                        role="tab"
                        type="button"
                        aria-selected={i === active}
                        onClick={() => setActive(i)}
                        className="group cursor-pointer text-left"
                    >
                        <span className="block h-1 overflow-hidden rounded-full bg-neutral-200">
                            {i === active && (
                                <span
                                    key={`${active}-${paused}`}
                                    className={cn("block h-full rounded-full bg-neutral-900", !paused && !reduced && "hw-bar")}
                                    style={{ animationDuration: `${STEP_MS}ms`, width: "100%" }}
                                />
                            )}
                        </span>
                        <span className={cn("mt-2 block text-[13px] font-medium transition-colors", i === active ? "text-neutral-900" : "text-neutral-500 group-hover:text-neutral-800")}>{v}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
