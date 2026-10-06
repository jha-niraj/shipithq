"use client"

import { useId, type ReactNode } from "react"
import { Check, Mic } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { MONO } from "@/components/marketing/primitives"
import { ScrollStory, StoryPanel, type StoryStep } from "@/components/story/scroll-story"
import { QuizCard } from "@/components/story/kit"
import { PostingCard } from "./posting-card"

/**
 * The landing's product story (plan/web/story ST-7; Niraj, 2026-10-07: one pasted job carried
 * through). One posting, followed through the rounds the app builds from it, then the resume.
 *
 * Sources (apps/main, checked 2026-10-07):
 *   rounds and labels  lib/hiring/round-types.ts ("Aptitude", "Coding (DSA)", "System design",
 *                      "Behavioural interview"); the round runner's result panel
 *                      components/hiring/round-runner.tsx ("Your score", "Pass mark", "Cleared. The
 *                      next round is open.", "Tests passed", "Scored by: AI, against the rubric")
 *   how each runs      worker job-import-core.ts: aptitude a timed quiz, DSA judged on hidden tests
 *                      (lib/practice/judge-run.ts, five languages), system design a written answer
 *                      and a diagram, voice rounds briefed from the job description; AI-scored
 *                      rounds are always advisory
 *   resume             ai/resume resume-editor.tsx: the tailor takes a pasted job description and
 *                      shows "ATS Score" and "Missing keywords". It is NOT linked to an imported job,
 *                      so the copy says you paste the posting in. Nothing matches a project to a job,
 *                      so projects are not in this story.
 * Scores and answers in the panels are an example session, labelled as one.
 */

function Result({ score, pass, note }: { score: number; pass?: number; note: string }) {
    return (
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3 ring-1 ring-neutral-200">
            <div>
                <p className="text-[12px] text-neutral-600">Your score</p>
                <p className="text-3xl font-semibold tabular-nums tracking-tight text-neutral-900">{score}</p>
            </div>
            <div className="text-right">
                {pass !== undefined && <p className={cn(MONO, "text-[11px] text-neutral-600")}>Pass mark {pass}</p>}
                <p className="mt-0.5 flex items-center justify-end gap-1.5 text-[13px] font-medium text-neutral-900">
                    <Check className="size-3.5" aria-hidden /> {note}
                </p>
            </div>
        </div>
    )
}

function CodePanel() {
    const lines = ["def two_sum(nums, target):", "    seen = {}", "    for i, n in enumerate(nums):", "        if target - n in seen:", "            return [seen[target - n], i]", "        seen[n] = i"]
    return (
        <div className="overflow-hidden rounded-xl ring-1 ring-neutral-200">
            <div className="flex items-center justify-between gap-2 border-b border-neutral-100 bg-white px-4 py-2">
                <span className={cn(MONO, "text-[12px] text-neutral-700")}>two_sum.py</span>
                <span className={cn(MONO, "text-[10px] uppercase tracking-[0.12em] text-neutral-600")}>Linux container</span>
            </div>
            <pre className={cn(MONO, "overflow-x-auto bg-white px-4 py-3 text-[12.5px] leading-6 text-neutral-800")}>{lines.join("\n")}</pre>
            <div className="flex items-center gap-2 border-t border-neutral-100 bg-neutral-50 px-4 py-2.5">
                <span className="flex gap-1">{Array.from({ length: 14 }).map((_, i) => <span key={i} className="size-2 rounded-full bg-emerald-600" />)}</span>
                <span className="ml-auto text-[12.5px] font-medium text-neutral-900">Tests passed: 14 of 14</span>
            </div>
        </div>
    )
}

function DesignPanel() {
    // The panel can render twice (inline on phones, sticky from md), so the marker id must be unique.
    const arrowId = `js-arrow-${useId().replace(/:/g, "")}`
    const box = (x: number, y: number, label: string, lit = false) => (
        <g>
            <rect x={x} y={y} width={92} height={34} rx={8} className={lit ? "fill-neutral-900" : "fill-white stroke-neutral-300"} strokeWidth={1} />
            <text x={x + 46} y={y + 21} textAnchor="middle" className={cn("text-[12px] font-medium", lit ? "fill-white" : "fill-neutral-800")}>{label}</text>
        </g>
    )
    const arrow = (x1: number, y1: number, x2: number, y2: number) => <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-neutral-400" strokeWidth={1.25} markerEnd={`url(#${arrowId})`} />
    return (
        <div className="rounded-xl bg-white p-3 ring-1 ring-neutral-200">
            <svg viewBox="0 0 340 130" className="h-auto w-full" role="img" aria-label="A drawn design: client, API, queue, worker and database">
                <defs><marker id={arrowId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" className="fill-neutral-400" /></marker></defs>
                {box(4, 10, "Client")}{box(124, 10, "API")}{box(244, 10, "Queue", true)}
                {box(244, 86, "Worker")}{box(124, 86, "Database")}
                {arrow(96, 27, 122, 27)}{arrow(216, 27, 242, 27)}{arrow(290, 44, 290, 84)}{arrow(244, 103, 218, 103)}
            </svg>
            <p className="mt-2 border-t border-neutral-100 pt-2 text-[13px] leading-5 text-neutral-700">
                &ldquo;Uploads go on a queue so the API answers at once; a worker resizes them and writes the row.&rdquo;
            </p>
        </div>
    )
}

function VoicePanel() {
    const bars = [30, 55, 80, 45, 70, 35, 60, 85, 50, 40, 65, 30, 55, 75, 45, 60, 38]
    return (
        <div className="rounded-xl bg-neutral-950 p-4 text-white">
            <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-neutral-950"><Mic className="size-4" aria-hidden /></span>
                <span aria-hidden className="flex h-9 flex-1 items-center gap-1">{bars.map((h, i) => <span key={i} className="w-1.5 rounded-full bg-white/80" style={{ height: `${h}%` }} />)}</span>
            </div>
            <p className="mt-4 text-[14px] leading-6 text-neutral-100">&ldquo;This role owns the upload pipeline. Tell me about a time something you shipped broke, and what you changed after.&rdquo;</p>
            <p className={cn(MONO, "mt-2 text-[10.5px] uppercase tracking-[0.14em] text-neutral-400")}>Briefed from the job description</p>
        </div>
    )
}

function ResumePanel() {
    return (
        <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4 rounded-xl bg-white p-4 ring-1 ring-neutral-200">
            <div aria-hidden className="space-y-2 rounded-lg border border-neutral-200 p-3">
                <div className="h-2 w-24 rounded bg-neutral-800" />
                <div className="h-1.5 w-16 rounded bg-neutral-300" />
                {[90, 75, 85, 60, 80, 70, 88, 55].map((w, i) => <div key={i} className="h-1.5 rounded bg-neutral-200" style={{ width: `${w}%` }} />)}
            </div>
            <div>
                <p className="text-[13px] font-medium text-neutral-900">ATS Score</p>
                <p className="text-4xl font-semibold tabular-nums tracking-tight text-neutral-900">86<span className="text-base text-neutral-500">/100</span></p>
                <p className="mt-3 text-[12px] font-medium text-neutral-900">Missing keywords</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {["Redis", "CI/CD", "Docker"].map((k) => <span key={k} className={cn(MONO, "rounded-md border border-neutral-900 px-1.5 py-0.5 text-[10.5px] text-neutral-900")}>{k}</span>)}
                </div>
            </div>
        </div>
    )
}

const Example = ({ children }: { children: ReactNode }) => (
    <div>
        <p className={cn(MONO, "mb-3 text-[10.5px] uppercase tracking-[0.14em] text-neutral-600")}>Example session</p>
        {children}
    </div>
)

const STEPS: (StoryStep & { panel: ReactNode })[] = [
    {
        id: "paste", tag: "The posting",
        title: "Paste the job you want",
        body: <>A link from LinkedIn or a careers page, or the text itself. ShipItHQ reads the posting and builds that job&apos;s rounds, in order, with pass marks. A public import is free, three a day.</>,
        panel: <StoryPanel label="The rounds built from one posting" takeaway="One posting becomes four rounds you take in order; what can't be practised is shown, not hidden."><PostingCard detail /></StoryPanel>,
    },
    {
        id: "aptitude", tag: "Round 1 · Aptitude",
        title: "Aptitude, against the clock",
        body: <>A timed quiz of quantitative, logical and verbal questions. Clear the pass mark and the next round opens.</>,
        panel: (
            <StoryPanel label="The aptitude round" takeaway="A gate: below the mark, the next round stays shut until you retake it.">
                <Example>
                    <QuizCard label="A question from the round" prompt="A train covers 120 km in 1.5 hours. What is its average speed?" options={[{ id: "a", label: "60 km/h" }, { id: "b", label: "80 km/h" }, { id: "c", label: "90 km/h" }]} answer="b" />
                    <Result score={72} pass={60} note="Cleared. The next round is open." />
                </Example>
            </StoryPanel>
        ),
    },
    {
        id: "coding", tag: "Round 2 · Coding (DSA)",
        title: "Code that actually runs",
        body: <>Write it in C++, Java, JavaScript, TypeScript or Python. It runs in a Linux container and hidden tests decide, not a guess about whether it would compile.</>,
        panel: (
            <StoryPanel label="The coding round" takeaway="Judged by running it: the tests pass or they don't.">
                <Example><CodePanel /><Result score={100} pass={60} note="Cleared. The next round is open." /></Example>
            </StoryPanel>
        ),
    },
    {
        id: "design", tag: "Round 3 · System design",
        title: "Draw the design, then defend it",
        body: <>A diagram and a written answer to a design problem planned from this posting. It is scored by AI against a rubric, so it is advisory: it tells you where you stand and never blocks you.</>,
        panel: (
            <StoryPanel label="The system design round" takeaway="Scored by AI, against the rubric. Advisory, so it never blocks the next round.">
                <Example><DesignPanel /><Result score={68} note="Scored by AI, against the rubric" /></Example>
            </StoryPanel>
        ),
    },
    {
        id: "voice", tag: "Round 4 · Behavioural interview",
        title: "Say it out loud",
        body: <>A live voice interviewer, briefed from this job&apos;s description, asks about this role. No scheduling: you take it when you are ready.</>,
        panel: (
            <StoryPanel label="The behavioural interview" takeaway="Asked about this job, out loud, before the real one.">
                <Example><VoicePanel /><Result score={74} note="Scored by AI, against the rubric" /></Example>
            </StoryPanel>
        ),
    },
    {
        id: "resume", tag: "Then · Your resume",
        title: "Point your resume at the same job",
        body: <>Paste the same posting into the resume tailor. It scores your resume against it, lists the keywords it is missing, and tailors it; then export a PDF or share a link.</>,
        panel: (
            <StoryPanel label="The resume, checked against the posting" takeaway="The same posting, read the way a screening system reads it.">
                <Example><ResumePanel /></Example>
            </StoryPanel>
        ),
    },
]

export function JobStory() {
    return <ScrollStory steps={STEPS} panel={(i) => STEPS[i]?.panel ?? null} />
}
