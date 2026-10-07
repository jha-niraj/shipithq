"use client"

import type { ReactNode } from "react"
import { Check, Mic, Lock } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { MONO } from "@/components/marketing/primitives"
import { ScrollStory, StoryPanel, type StoryStep } from "@/components/story/scroll-story"

/**
 * "How it works" on each feature page, told as ONE real item from start to finish
 * (plan/web/story ST-8; Niraj, 2026-10-07). Every label below is the app's own, checked in
 * apps/main on 2026-10-07:
 *
 *   practice  "Two Sum" (packages/db/src/seed/practice-dsa.ts, EASY, arrays and hashing, 3 hints);
 *             modes "With the mentor" / "On your own" (practice/_components/module-content.tsx);
 *             mentor stages (lib/practice/mentor-prompt.ts); "Run", "Submit", verdicts and
 *             "Hidden tests" (practice workspace cases-panel.tsx); "Mentor memory" (practice-tabs.tsx)
 *   projects  "URL Shortener with Click Analytics" (seed/blueprints/url-shortener-with-analytics.ts):
 *             4 sprints of 5 tasks; task brief labels (projects workspace task-brief.tsx); tasks are
 *             marked done by the learner, there is no approval step; sprint quiz and sprint mock
 *             with their gates (packages/db/src/project-gates.ts: quiz 50%, mock 75%)
 *   mock      create-mock-sheet.tsx (steps, fields; no job-description field), consent-card.tsx and
 *             live-interview.tsx (live labels), InterviewResultsClient.tsx (scores out of 100)
 *   ai        resume-hub.tsx ("Populate from"), import-sheet.tsx, resume-editor.tsx (tailor inputs,
 *             "Tailor This Resume", "ATS Score", "Missing keywords"), share at /r/<slug>
 *   jobs      seed listing "Backend Engineer, Trace Ingestion" at Lumen Labs (seed/data.ts); match
 *             and gap labels (jobs spark-panel.tsx, job-card.tsx, job-details-sheet.tsx); there is no
 *             Apply button: you take the rounds, then "Send your results" (rounds-overview.tsx)
 *
 * Prices are the app's (apps/main/lib/credits/pricing.ts); change them there first, then here.
 * Scores, answers and counts in the panels are an example session, labelled as one.
 */

type Story = { steps: (StoryStep & { panel: ReactNode })[] }

const Box = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn("rounded-xl bg-white p-4 ring-1 ring-neutral-200", className)}>{children}</div>
)
const Cap = ({ children }: { children: ReactNode }) => (
    <p className={cn(MONO, "text-[10.5px] uppercase tracking-[0.14em] text-neutral-600")}>{children}</p>
)
const Example = ({ children }: { children: ReactNode }) => (
    <div><p className={cn(MONO, "mb-3 text-[10.5px] uppercase tracking-[0.14em] text-neutral-600")}>Example session</p>{children}</div>
)
const Btn = ({ children, dark = false }: { children: ReactNode; dark?: boolean }) => (
    <span className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium", dark ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-900")}>{children}</span>
)
const Chip = ({ children, on = false }: { children: ReactNode; on?: boolean }) => (
    <span className={cn("rounded-md px-2 py-1 text-[12px] font-medium", on ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700")}>{children}</span>
)
const Row = ({ k, v, strong = false }: { k: ReactNode; v: ReactNode; strong?: boolean }) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-[13.5px]">
        <span className="text-neutral-700">{k}</span>
        <span className={cn("shrink-0 tabular-nums", strong ? "font-semibold text-neutral-900" : "text-neutral-900")}>{v}</span>
    </div>
)
const Ok = ({ children }: { children: ReactNode }) => (
    <p className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-700"><Check className="size-4 shrink-0" aria-hidden />{children}</p>
)
const Bar = ({ label, v }: { label: string; v: number }) => (
    <div className="flex items-center gap-3 text-[12.5px]">
        <span className="w-28 shrink-0 text-neutral-700">{label}</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200"><span className="block h-full rounded-full bg-neutral-900" style={{ width: `${v}%` }} /></span>
        <span className={cn(MONO, "w-7 text-right text-neutral-900")}>{v}</span>
    </div>
)

// ── Practice: one problem, Two Sum ──────────────────────────────────────────────

const PRACTICE: Story = {
    steps: [
        {
            id: "pick", tag: "Two Sum · Easy", title: "Choose how you want to work",
            body: <>Every problem offers two ways in. With the mentor, it walks you through it step by step for 5 credits, once per problem. On your own, it is free.</>,
            panel: (
                <StoryPanel label="Two ways into a problem" takeaway="The mentor is a choice per problem, never a default you pay for.">
                    <Box>
                        <p className="text-[15px] font-semibold text-neutral-900">Two Sum</p>
                        <p className={cn(MONO, "text-[11px] text-neutral-600")}>Easy · Arrays and hashing</p>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-lg bg-neutral-900 p-3 text-white">
                                <p className="flex items-center justify-between text-[13.5px] font-semibold">With the mentor <span className="rounded bg-white/15 px-1.5 text-[10.5px] font-medium">Recommended</span></p>
                                <p className="mt-1 text-[12.5px] leading-5 text-neutral-300">Explain, plan, solve and optimise step by step. The mentor asks and checks; it never writes the solution.</p>
                            </div>
                            <div className="rounded-lg border border-neutral-200 p-3">
                                <p className="flex items-center justify-between text-[13.5px] font-semibold text-neutral-900">On your own <span className="rounded bg-neutral-100 px-1.5 text-[10.5px] font-medium text-neutral-700">Free</span></p>
                                <p className="mt-1 text-[12.5px] leading-5 text-neutral-700">No mentor, like a real interview. Your work is tested and reviewed when you submit.</p>
                            </div>
                        </div>
                    </Box>
                </StoryPanel>
            ),
        },
        {
            id: "mentor", tag: "With the mentor", title: "It asks before you type",
            body: <>Five stages: understand, approach, brute force, optimise, reflect. The mentor asks and checks your answer at each; hints are there when you ask for them, one at a time.</>,
            panel: (
                <StoryPanel label="The mentor at the Approach stage" takeaway="It checks your thinking; it never writes the solution.">
                    <Example>
                        <Box>
                            <div className="flex flex-wrap gap-1.5">{["Understand", "Approach", "Brute force", "Optimise", "Reflect"].map((s) => <Chip key={s} on={s === "Approach"}>{s}</Chip>)}</div>
                            <p className="mt-4 rounded-2xl rounded-tl-sm bg-neutral-100 px-3.5 py-2.5 text-[14px] leading-6 text-neutral-900">You said checking every pair works. How many pairs is that for n numbers, and what would let you look up the partner in one step?</p>
                            <p className="mt-3 inline-flex rounded-lg border border-dashed border-neutral-400 px-3 py-1.5 text-[13px] text-neutral-700">Reveal hint 1 of 3</p>
                        </Box>
                    </Example>
                </StoryPanel>
            ),
        },
        {
            id: "run", tag: "Run", title: "Run it on the samples",
            body: <>Write it in C++, Java, JavaScript, TypeScript or Python. Run executes it in a Linux container against the sample cases, so you see real output, not a guess.</>,
            panel: (
                <StoryPanel label="A run on the sample cases" takeaway="Run checks the samples; it decides nothing yet.">
                    <Example>
                        <div className="overflow-hidden rounded-xl ring-1 ring-neutral-200">
                            <div className="flex flex-wrap items-center gap-1.5 border-b border-neutral-100 bg-white px-3 py-2">{["C++", "Java", "JavaScript", "TypeScript", "Python"].map((l) => <Chip key={l} on={l === "Python"}>{l}</Chip>)}</div>
                            <pre className={cn(MONO, "overflow-x-auto bg-white px-4 py-3 text-[12.5px] leading-6 text-neutral-800")}>{"def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i"}</pre>
                            <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 bg-neutral-50 px-4 py-3"><Btn>Run</Btn><Ok>All 3 sample cases passed</Ok></div>
                        </div>
                    </Example>
                </StoryPanel>
            ),
        },
        {
            id: "submit", tag: "Submit", title: "Hidden tests decide",
            body: <>Submit runs it against tests you never saw. Accepted means every one of them passed; a compile error says so plainly.</>,
            panel: (
                <StoryPanel label="The verdict on submit" takeaway="Accepted only when the hidden tests pass too.">
                    <Example>
                        <Box>
                            <div className="flex items-center gap-3"><Btn dark>Submit</Btn></div>
                            <div className="mt-4 flex gap-1">{Array.from({ length: 14 }).map((_, i) => <span key={i} className="size-2.5 rounded-full bg-emerald-600" />)}</div>
                            <div className="mt-3 space-y-1"><Ok>Accepted: 14 of 14 tests passed</Ok><p className="text-[13px] text-neutral-700">Hidden tests: 10 of 10 passed</p></div>
                        </Box>
                    </Example>
                </StoryPanel>
            ),
        },
        {
            id: "memory", tag: "After", title: "The mentor remembers",
            body: <>What you understood, and where you got stuck, is kept under Mentor memory, problem to problem.</>,
            panel: (
                <StoryPanel label="Mentor memory" takeaway="What you understood is kept, problem to problem.">
                    <Example>
                        <Box>
                            <Cap>Mentor memory</Cap>
                            <ul className="mt-3 space-y-2 text-[13.5px] leading-5 text-neutral-800">
                                <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0" aria-hidden />Trades memory for time with a hash map</li>
                                <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0" aria-hidden />Counts pairs to reason about O(n²)</li>
                                <li className="flex gap-2 text-neutral-600"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-neutral-400" />Still checks for the duplicate-value case late</li>
                            </ul>
                        </Box>
                    </Example>
                </StoryPanel>
            ),
        },
    ],
}

// ── Projects: one blueprint, the URL shortener ──────────────────────────────────

const PROJECTS: Story = {
    steps: [
        {
            id: "blueprint", tag: "The blueprint", title: "A real brief, not a tutorial",
            body: <>Four sprints of five tasks, a week each, on Node.js, Redis and PostgreSQL. Sprint one: shorten a link and follow it.</>,
            panel: (
                <StoryPanel label="The URL shortener blueprint" takeaway="Twenty tasks in four sprints, each one a decision you will be asked about.">
                    <Box>
                        <p className="text-[15px] font-semibold text-neutral-900">URL Shortener with Click Analytics</p>
                        <p className={cn(MONO, "text-[11px] text-neutral-600")}>Node.js · Redis · PostgreSQL</p>
                        <ol className="mt-4 space-y-1.5">
                            {["Shorten a link and follow it", "Redirect without touching Postgres", "Count clicks off the hot path", "Show the numbers and hold the line"].map((s, i) => (
                                <li key={s} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px]", i === 0 ? "bg-neutral-900 text-white" : "bg-neutral-50 text-neutral-800")}>
                                    <span className={cn(MONO, "shrink-0 text-[11px]")}>S{i + 1}</span><span className="min-w-0">{s}</span>
                                    <span className={cn(MONO, "ml-auto shrink-0 text-[11px]", i === 0 ? "text-neutral-300" : "text-neutral-600")}>5 tasks</span>
                                </li>
                            ))}
                        </ol>
                    </Box>
                </StoryPanel>
            ),
        },
        {
            id: "task", tag: "Sprint 1 · Task 3", title: "One task, and when it is done",
            body: <>Each task says what to build, when it counts as done, and has hints for when you are stuck. Some can be checked by tests.</>,
            panel: (
                <StoryPanel label="A task brief" takeaway="The Done when line is the bar, written before you start.">
                    <Box>
                        <p className={cn(MONO, "text-[11px] text-neutral-600")}>Sprint 1 · Task 3 · 1 hour</p>
                        <p className="mt-1 text-[15px] font-semibold text-neutral-900">Generate a short code that does not collide</p>
                        <p className="mt-2 text-[13.5px] leading-6 text-neutral-700">Random with a uniqueness constraint, or a counter with an encoding: pick one and be able to say why.</p>
                        <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-900">Done when</p>
                        <ul className="mt-1.5 space-y-1.5 text-[13px] leading-5 text-neutral-800">
                            <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0" aria-hidden />One hundred thousand links produce no duplicate codes</li>
                            <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0" aria-hidden />A collision is retried a bounded number of times, then fails clearly</li>
                        </ul>
                        <p className="mt-3 text-[12.5px] text-neutral-600">Stuck? A hint · 2 hints</p>
                    </Box>
                </StoryPanel>
            ),
        },
        {
            id: "done", tag: "Done", title: "You mark it done, and say what you decided",
            body: <>You move a task from To do to In progress to Done yourself. Marking it done asks what you built or decided: the note your sprint mock will ask about.</>,
            panel: (
                <StoryPanel label="Marking a task done" takeaway="No one approves it; your note is what you will defend later.">
                    <Example>
                        <Box>
                            <div className="flex flex-wrap gap-1.5">{["To do", "In progress", "Done"].map((s) => <Chip key={s} on={s === "Done"}>{s}</Chip>)}</div>
                            <p className="mt-4 text-[13px] font-medium text-neutral-900">What did you build or decide?</p>
                            <p className="mt-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13.5px] leading-6 text-neutral-800">Random 7-character codes from 31 letters, a unique index, three retries, then a 500 with the reason.</p>
                            <div className="mt-3"><Btn dark>Mark done</Btn></div>
                        </Box>
                    </Example>
                </StoryPanel>
            ),
        },
        {
            id: "sprint-end", tag: "End of sprint", title: "A quiz and a mock, about your decisions",
            body: <>Each sprint ends with a ten-question quiz (25 credits, pass at 50%) and a ten-minute mock interview, typed or spoken (30 credits, pass at 75%). Retaking the quiz is free.</>,
            panel: (
                <StoryPanel label="The end of a sprint" takeaway="The sprint closes when you can explain it, not when the tasks are ticked.">
                    <Example>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Box><Cap>Sprint quiz</Cap><Row k="Score" v="80%" strong /><Row k="Correct" v="8 of 10" /><Row k="Pass mark" v="50%" /></Box>
                            <Box><Cap>Sprint mock interview</Cap><Row k="Score" v="78 of 100" strong /><Row k="Pass mark" v="75" /><p className="mt-1 text-[12.5px] text-neutral-700">What went well · What to work on</p></Box>
                        </div>
                    </Example>
                </StoryPanel>
            ),
        },
    ],
}

// ── Mock interviews: one interview ──────────────────────────────────────────────

const MOCK: Story = {
    steps: [
        {
            id: "setup", tag: "Basic Info · Knowledge Base · Settings", title: "Set it up in three steps",
            body: <>A position and a description, then your study material or notes, then the level, length and number of questions. Add your resume as context for 5 more credits. The price is shown on the button before you create it.</>,
            panel: (
                <StoryPanel label="Creating a mock" takeaway="You decide what it asks about: your material, your level, your length.">
                    <Example>
                        <Box>
                            <div className="flex flex-wrap gap-1.5">{["Basic Info", "Knowledge Base", "Settings"].map((s) => <Chip key={s} on={s === "Knowledge Base"}>{s}</Chip>)}</div>
                            <Row k="Position" v="Backend engineer" />
                            <p className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-700">Paste your study materials, syllabus, or notes here...</p>
                            <label className="mt-3 flex items-center gap-2 text-[13px] text-neutral-800"><span className="flex size-4 items-center justify-center rounded border border-neutral-900 bg-neutral-900 text-white"><Check className="size-3" aria-hidden /></span>Include Resume Context</label>
                        </Box>
                    </Example>
                </StoryPanel>
            ),
        },
        {
            id: "start", tag: "Before you start", title: "Speak, or type",
            body: <>A live voice interviewer, no scheduling. If you cannot talk right now, type your answers instead.</>,
            panel: (
                <StoryPanel label="The start of a session" takeaway="Voice when you can, typing when you can't.">
                    <Box className="text-center">
                        <p className="text-[15px] font-semibold text-neutral-900">Before you start</p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2"><Btn dark><Mic className="size-3.5" aria-hidden />Start speaking</Btn><Btn>Type instead</Btn></div>
                    </Box>
                </StoryPanel>
            ),
        },
        {
            id: "live", tag: "Live", title: "It speaks, then listens",
            body: <>The interviewer speaks, then listens. You can see the time left, and you end it when you are done.</>,
            panel: (
                <StoryPanel label="A live session" takeaway="A real conversation, timed like one.">
                    <Example>
                        <div className="rounded-xl bg-neutral-950 p-4 text-white">
                            <div className="flex items-center justify-between text-[12.5px]"><span className="text-neutral-300">Listening</span><span className={cn(MONO, "text-neutral-300")}>Time left 11:42</span></div>
                            <div aria-hidden className="mt-3 flex h-10 items-center gap-1">{[30, 55, 80, 45, 70, 35, 60, 85, 50, 40, 65, 30, 55, 75, 45, 60, 38, 70].map((h, i) => <span key={i} className="w-1.5 rounded-full bg-white/80" style={{ height: `${h}%` }} />)}</div>
                            <div className="mt-4"><span className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-[13px] font-medium text-neutral-950">End and hand in</span></div>
                        </div>
                    </Example>
                </StoryPanel>
            ),
        },
        {
            id: "results", tag: "Interview Results", title: "Scored on three things",
            body: <>An overall score out of 100, then communication, technical skills and problem solving, each out of 100, with strengths, areas to improve, detailed feedback and the transcript.</>,
            panel: (
                <StoryPanel label="Interview results" takeaway="Three scores and the transcript behind them.">
                    <Example>
                        <Box>
                            <p className="text-[12.5px] text-neutral-600">Overall Score</p>
                            <p className="text-4xl font-semibold tabular-nums tracking-tight text-neutral-900">78<span className="text-lg text-neutral-500">/100</span></p>
                            <div className="mt-4 space-y-2.5"><Bar label="Communication" v={82} /><Bar label="Technical Skills" v={74} /><Bar label="Problem Solving" v={79} /></div>
                            <p className="mt-4 text-[12.5px] text-neutral-700">Strengths · Areas for Improvement · Detailed Feedback · Transcript</p>
                        </Box>
                    </Example>
                </StoryPanel>
            ),
        },
    ],
}

// ── AI tools: one resume ────────────────────────────────────────────────────────

const AI: Story = {
    steps: [
        {
            id: "populate", tag: "Populate from", title: "Start from what you have",
            body: <>Your profile, an upload (PDF or DOCX), an import, or a blank page.</>,
            panel: (
                <StoryPanel label="Where a resume starts" takeaway="Four ways in; nothing has to be retyped.">
                    <Box><Cap>Populate from</Cap><div className="mt-3 grid grid-cols-2 gap-2">{["My Profile", "Upload", "Import", "Blank"].map((s) => <span key={s} className={cn("rounded-lg px-3 py-3 text-center text-[13.5px] font-medium", s === "Import" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800")}>{s}</span>)}</div></Box>
                </StoryPanel>
            ),
        },
        {
            id: "import", tag: "Import with AI", title: "From LinkedIn and GitHub",
            body: <>Give it your LinkedIn profile and your GitHub, and it drafts the resume from them, for 20 credits.</>,
            panel: (
                <StoryPanel label="Importing a resume" takeaway="Your profiles become a first draft.">
                    <Box><Cap>Import with AI</Cap><Row k="LinkedIn profile" v={<span className={MONO}>linkedin.com/in/…</span>} /><Row k="GitHub" v={<span className={MONO}>github.com/…</span>} /></Box>
                </StoryPanel>
            ),
        },
        {
            id: "tailor", tag: "Tailor", title: "Point it at one job",
            body: <>Paste the job title, company and description. Tailor This Resume rewrites it for that job (20 credits); ATS Score checks it the way a screener reads it (5 credits).</>,
            panel: (
                <StoryPanel label="Tailoring to a job" takeaway="One job description, two actions: tailor it, or just score it.">
                    <Example><Box><Row k="Job title" v="Backend engineer" /><Row k="Company" v="Lumen Labs" /><p className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-700">Job Description: You will own trace ingestion…</p><div className="mt-3 flex flex-wrap gap-2"><Btn dark>Tailor This Resume</Btn><Btn>ATS Score</Btn></div></Box></Example>
                </StoryPanel>
            ),
        },
        {
            id: "score", tag: "ATS Score", title: "See what a screener would miss",
            body: <>A score out of 100, the keywords the description wants that your resume lacks, suggestions, and the keywords tailoring added or emphasised.</>,
            panel: (
                <StoryPanel label="The ATS score" takeaway="The gap between the posting and your resume, as a list.">
                    <Example><Box><p className="text-[13px] font-medium text-neutral-900">ATS Score</p><p className="text-4xl font-semibold tabular-nums tracking-tight text-neutral-900">86<span className="text-base text-neutral-500">/100</span></p><p className="mt-3 text-[12px] font-medium text-neutral-900">Missing keywords</p><div className="mt-1.5 flex flex-wrap gap-1.5">{["Kafka", "OpenTelemetry", "gRPC"].map((k) => <span key={k} className={cn(MONO, "rounded-md border border-neutral-900 px-1.5 py-0.5 text-[10.5px] text-neutral-900")}>{k}</span>)}</div></Box></Example>
                </StoryPanel>
            ),
        },
        {
            id: "share", tag: "Share", title: "A PDF, or one link",
            body: <>Download a PDF, or make it public and copy its share link.</>,
            panel: (
                <StoryPanel label="Sharing a resume" takeaway="Send a file, or send one link.">
                    <Box><div className="flex flex-wrap gap-2"><Btn>Download PDF</Btn><Btn dark>Make public</Btn><Btn>Copy share link</Btn></div><p className={cn(MONO, "mt-3 text-[12px] text-neutral-700")}>app.shipithq.com/r/your-name</p></Box>
                </StoryPanel>
            ),
        },
    ],
}

// ── Jobs: one listing ───────────────────────────────────────────────────────────

const JOBS: Story = {
    steps: [
        {
            id: "match", tag: "The listing", title: "A match from your skills",
            body: <>Every role shows how well it fits the skills on your profile, as a percentage, before you open it.</>,
            panel: (
                <StoryPanel label="A job card" takeaway="The fit is worked out from your skills, not from keywords you typed.">
                    <Example><Box><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[15px] font-semibold text-neutral-900">Backend Engineer, Trace Ingestion</p><p className="text-[13px] text-neutral-700">Lumen Labs</p></div><span className="rounded-md bg-neutral-900 px-2 py-1 text-[12px] font-medium text-white">72% match</span></div><p className="mt-3 text-[12.5px] text-neutral-700">Good Match</p></Box></Example>
                </StoryPanel>
            ),
        },
        {
            id: "gap", tag: "Should you apply?", title: "What you have, and what to build",
            body: <>The details say how strong a fit it is, the skills you already have, the ones it needs, and which to build to raise the match.</>,
            panel: (
                <StoryPanel label="The fit, in detail" takeaway="A gap you can close, named skill by skill.">
                    <Example><Box><Cap>Should you apply?</Cap><p className="mt-1 text-[15px] font-semibold text-neutral-900">A good fit</p><div className="mt-3 grid grid-cols-2 gap-3 text-[13px]"><div><p className="font-medium text-neutral-900">You have (4)</p><p className="mt-1 text-neutral-700">Go, PostgreSQL, Docker, REST</p></div><div><p className="font-medium text-neutral-900">You need (2)</p><p className="mt-1 text-neutral-700">Kafka, OpenTelemetry</p></div></div><p className="mt-3 border-t border-neutral-100 pt-2 text-[13px] font-medium text-neutral-900">Build these to reach 90%</p></Box></Example>
                </StoryPanel>
            ),
        },
        {
            id: "rounds", tag: "Take the rounds", title: "Apply by doing the rounds",
            body: <>There is no one-click apply. You take the role&apos;s rounds, the same kinds you practise, and your attempts are what the company sees.</>,
            panel: (
                <StoryPanel label="The role's rounds" takeaway="Your application is your work, not a form.">
                    <Example><Box><Cap>Take the rounds</Cap><ol className="mt-3 space-y-2">{[["Coding (DSA)", true], ["System design", true], ["Behavioural interview", false]].map(([r, done], i) => <li key={String(r)} className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-[13.5px]"><span className={cn(MONO, "text-[11px] text-neutral-600")}>{i + 1}</span><span className="text-neutral-900">{r}</span><span className="ml-auto">{done ? <Check className="size-4 text-emerald-700" aria-label="Taken" /> : <Lock className="size-3.5 text-neutral-500" aria-label="Not taken yet" />}</span></li>)}</ol></Box></Example>
                </StoryPanel>
            ),
        },
        {
            id: "send", tag: "Send your results", title: "You choose what they see",
            body: <>Pick which attempt of each round to send, check your profile and links, and give consent. Then the role shows as Applied.</>,
            panel: (
                <StoryPanel label="Sending your results" takeaway="Nothing reaches the company until you send it.">
                    <Box><Cap>Send your results</Cap><ul className="mt-3 space-y-1.5 text-[13.5px] text-neutral-800">{["Which attempt per round", "Your profile", "Links", "Consent"].map((s) => <li key={s} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0" aria-hidden />{s}</li>)}</ul><p className="mt-3 inline-flex rounded-md bg-neutral-900 px-2 py-1 text-[12px] font-medium text-white">Applied</p></Box>
                </StoryPanel>
            ),
        },
    ],
}

const STORIES: Record<string, Story> = { practice: PRACTICE, projects: PROJECTS, mock: MOCK, ai: AI, jobs: JOBS }

export function FeatureStory({ id }: { id: string }) {
    const story = STORIES[id]
    if (!story) return null
    return <ScrollStory steps={story.steps} panel={(i) => story.steps[i]?.panel ?? null} />
}
