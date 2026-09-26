import type { Tone } from "@/components/marketing/primitives"

/**
 * The five modules, as the landing page's "Pick your module" cards, the
 * /features/<id> detail pages and the navbar all describe them
 * (plan/web/revamp REV-11, REV-12).
 *
 * ── Every line has a source ──
 * The site has sold a deleted module before (plan/web/polish 01-content-truth.md).
 * Each fact below carries `source`, the file in the product that proves it, checked
 * on 2026-09-25. Before changing a claim, open its source. Numbers are static counts
 * from seed files, never live queries and never rounded up.
 */

export type ModuleId = "projects" | "practice" | "ai" | "jobs" | "mock"

export interface Sourced {
    text: string
    source: string
}

export interface Module {
    id: ModuleId
    /** Card eyebrow: "BUILD PATH". */
    kind: string
    name: string
    /** Label on the front of the card art, lower-cased in mono. */
    artLabel: string
    tone: Tone
    /** One line, used in the navbar and on the index. */
    summary: string
    /** Three short "+" bullets on the card. */
    bullets: Sourced[]
    /** The mono meta line under the bullets. Only static counts. */
    meta: Sourced[]
    /** The detail page. */
    detail: {
        headline: string
        intro: string
        steps: Sourced[]
        different: Sourced[]
        limits: Sourced[]
        /** Where in the app the module lives. */
        appPath: string
        /** What it costs, from apps/main/lib/credits/pricing.ts. Only known prices. */
        costs?: { label: string; credits: number }[]
        /** Three short questions a visitor asks before trying it. */
        faqs: { question: string; answer: string }[]
    }
}

export const MODULES: Module[] = [
    {
        id: "projects",
        kind: "Build path",
        name: "Projects",
        artLabel: "projects",
        tone: "ink",
        summary: "Hand-written projects in four sprints, with a quiz and a mock at the end of each",
        bullets: [
            { text: "Hand-written briefs, not generated", source: "packages/db/src/seed/blueprints/types.ts" },
            { text: "Four sprints of five tasks, each with Done when", source: "packages/db/src/seed/blueprints/index.ts" },
            { text: "A sprint quiz and mock about your own work", source: "apps/main/app/(main)/projects/[slug]/workspace/_components/sprint-mock.tsx" },
        ],
        meta: [
            { text: "10 projects", source: "packages/db/src/seed/blueprints/index.ts" },
            { text: "200 tasks", source: "10 projects x 4 sprints x 5 tasks" },
        ],
        detail: {
            headline: "Build something you can be interviewed about",
            intro: "Every project was written by a person who decided what its four sprints should teach. You work through it task by task, and at the end of each sprint you are quizzed and interviewed about what you built.",
            steps: [
                { text: "Pick one of the curated projects. Enrolling in a platform project is free.", source: "apps/main/actions/(main)/projects/project.action.ts" },
                { text: "Work the sprint board: four sprints, five tasks each, every task with a Done when line and hints.", source: "packages/db/src/seed/blueprints/index.ts" },
                { text: "Code in the workspace with a live preview, and check a task against its tests where the project runs in the browser.", source: "apps/main/app/(main)/projects/[slug]/workspace/_components/tests-panel.tsx" },
                { text: "Finish a sprint, then take its quiz and a mock interview that has read your task notes. Answer by typing or by voice.", source: "apps/main/app/(main)/projects/[slug]/workspace/_components/sprint-mock.tsx" },
            ],
            different: [
                { text: "The briefs are written by people, not generated on demand, so each sprint builds on the last.", source: "packages/db/src/seed/blueprints/types.ts" },
                { text: "The interview at the end of a sprint is about your own build, not a generic question bank.", source: "apps/main/app/(main)/projects/[slug]/workspace/_components/sprint-mock.tsx" },
                { text: "Public projects are frozen when published; enrolling gives you your own copy to extend.", source: "git: feat Projects round three (PJ-17, PJ-18)" },
            ],
            limits: [
                { text: "Project code runs in your browser, not in a server container. Only some projects can run their tests in the browser today.", source: "apps/main/app/(main)/projects/[slug]/workspace/_components/tests-panel.tsx" },
                { text: "Sprint quizzes and mocks cost credits.", source: "apps/main/lib/credits/pricing.ts" },
            ],
            appPath: "/projects",
            costs: [
                { label: "Enrol in a platform project", credits: 0 },
                { label: "AI help writing a task", credits: 5 },
                { label: "Sprint quiz", credits: 25 },
                { label: "Sprint mock interview", credits: 30 },
            ],
            faqs: [
                { question: "Do I need to know the stack before I start?", answer: "No. Each project has a numbered setup guide and every task has a Done when line and hints, so you learn the stack while you build." },
                { question: "Where does my code run?", answer: "In the workspace in your browser, with a live preview. Some projects can also run their task tests in the browser; the rest are checked by the Done when criteria." },
                { question: "What is the sprint mock about?", answer: "Your own build. It reads your task notes and asks about the decisions you made, and you can answer by typing or by voice." },
            ],
        },
    },
    {
        id: "practice",
        kind: "Practice path",
        name: "Practice",
        artLabel: "practice",
        tone: "sage",
        summary: "DSA, system design, frontend and backend, with code run in a real Linux container",
        bullets: [
            { text: "Code runs in a real Linux container", source: "apps/shipitworker/README.md" },
            { text: "Graded on hidden tests, checked against a reference", source: "packages/db/src/practice-judge.ts" },
            { text: "A mentor that remembers what you understood", source: "apps/main/app/(main)/practice/memory" },
        ],
        meta: [
            { text: "4 tracks", source: "apps/main/app/(main)/practice/_components/practice-tabs.tsx" },
            { text: "76 DSA problems", source: "packages/db/src/seed/practice-dsa.ts" },
            { text: "5 languages", source: "packages/db/src/practice-types.ts" },
        ],
        detail: {
            headline: "Practice where the code actually runs",
            intro: "Four tracks: DSA, system design, frontend and backend. Your code runs in a Linux container, not in a browser sandbox, and a problem is only accepted when it passes tests you cannot see.",
            steps: [
                { text: "Start a track with a short onboarding at the start of each sub-module.", source: "apps/main/lib/credits/pricing.ts (module_onboarding: 0)" },
                { text: "Pick a problem, or add your own from a link or a name.", source: "apps/main/app/(main)/practice/_components/add-problem-sheet.tsx" },
                { text: "Write it in the editor and run it against the sample cases.", source: "apps/main/app/(main)/practice/_components/workspace/cases-panel.tsx" },
                { text: "Submit against the hidden tests. The mentor records what you understood.", source: "apps/main/app/(main)/practice/memory" },
            ],
            different: [
                { text: "JavaScript, TypeScript, Python, Java and C++, executed in a real Linux container.", source: "packages/db/src/practice-types.ts, apps/shipitworker/README.md" },
                { text: "Every seeded problem's tests are validated against a reference solution.", source: "packages/db/src/seed/practice-dsa.ts" },
                { text: "System design on a drawing canvas, and backend problems with an API tester.", source: "apps/main/app/(main)/practice/_components/workspace/excalidraw-canvas.tsx, api-tester.tsx" },
            ],
            limits: [
                { text: "DSA has the seeded catalogue (76 problems across 16 categories). The other tracks start from problems you generate or add.", source: "packages/db/src/seed/practice-dsa.ts" },
            ],
            appPath: "/practice",
            costs: [
                { label: "Module onboarding", credits: 0 },
                { label: "Generate a practice set", credits: 5 },
                { label: "Generate an exam set", credits: 10 },
            ],
            faqs: [
                { question: "Which languages can I use?", answer: "JavaScript, TypeScript, Python, Java and C++. Your code runs in a Linux container, the same way it would on a server." },
                { question: "How is a solution judged?", answer: "Against the sample cases while you work, then against hidden tests when you submit. A problem is accepted only when every hidden test passes." },
                { question: "Can I practise problems from elsewhere?", answer: "Yes. Add a problem from a link or by its name, and practise it in the same editor." },
            ],
        },
    },
    {
        id: "ai",
        kind: "Apply path",
        name: "AI tools",
        artLabel: "ai tools",
        tone: "ink",
        summary: "A resume builder with an ATS check, tailoring to a job, and cover letters",
        bullets: [
            { text: "Import from LinkedIn and GitHub", source: "apps/main/app/(main)/ai/resume/_components/import-sheet.tsx" },
            { text: "Tailor to a job and check the ATS score", source: "apps/main/app/(main)/ai/resume/_components/resume-editor.tsx" },
            { text: "Cover letters from your own resume", source: "apps/main/app/(main)/ai/coverletter" },
        ],
        meta: [
            { text: "3 tools", source: "apps/main/app/(main)/ai/_components/AIHubClient.tsx" },
            { text: "5 templates", source: "apps/main/types/resume-draft.ts" },
        ],
        detail: {
            headline: "A resume that says what you built",
            intro: "Start from an upload or from your LinkedIn and GitHub, pick a template, then tailor it to a job description and see what a screener would miss.",
            steps: [
                { text: "Upload a resume (parsing is free) or import from LinkedIn and GitHub.", source: "apps/main/lib/credits/pricing.ts" },
                { text: "Pick one of five templates and edit the draft.", source: "apps/main/types/resume-draft.ts" },
                { text: "Paste a job description to tailor it, and get an ATS score out of 100 with missing keywords and suggestions.", source: "apps/main/app/(main)/ai/resume/_components/resume-editor.tsx" },
                { text: "Write a cover letter, export a PDF, or share a public link.", source: "apps/main/lib/resume-pdf/index.ts, apps/main/app/(public)/r/[slug]" },
            ],
            different: [
                { text: "It starts from your real profile and projects, not a blank form.", source: "apps/main/app/(main)/ai/resume/_components/import-sheet.tsx" },
                { text: "Every tool's price is listed before you run it.", source: "apps/main/lib/credits/pricing.ts" },
                { text: "A public resume link you can send instead of an attachment.", source: "apps/main/app/(public)/r/[slug]" },
            ],
            limits: [
                { text: "The ATS score is a model's reading of your resume against the job, not a real applicant tracking system.", source: "apps/main/app/(main)/ai/resume/_components/resume-editor.tsx" },
                { text: "Five templates share two PDF layouts today.", source: "apps/main/lib/resume-pdf/index.ts" },
            ],
            appPath: "/ai",
            costs: [
                { label: "Parse an uploaded resume", credits: 0 },
                { label: "ATS score", credits: 5 },
                { label: "Tailor to a job description", credits: 20 },
                { label: "Import from LinkedIn and GitHub", credits: 20 },
                { label: "Cover letter", credits: 15 },
            ],
            faqs: [
                { question: "Is the ATS score from a real ATS?", answer: "No. It is a model's reading of your resume against the job description, with the keywords it found missing and suggestions. Treat it as a second pair of eyes." },
                { question: "Can I export my resume?", answer: "Yes, as a PDF, or share it with a public link instead of an attachment." },
                { question: "Does it make things up?", answer: "It works from what you give it: your upload, your LinkedIn and GitHub, and your profile. Review every line before you send it." },
            ],
        },
    },
    {
        id: "jobs",
        kind: "Hiring path",
        name: "Jobs",
        artLabel: "jobs",
        tone: "sand",
        summary: "Roles with a match score, and interview rounds you work through on the platform",
        bullets: [
            { text: "A match score from the skills you have", source: "apps/main/actions/jobs/tabs.ts" },
            { text: "Spark: one job at a time, with what you miss", source: "apps/main/app/(jobs)/jobs/spark/page.tsx" },
            { text: "A company's interview rounds, taken right here", source: "apps/main/app/(jobs)/jobs/[slug]/rounds" },
        ],
        meta: [
            { text: "3 interview pipelines", source: "packages/db/src/seed/hiring-pipelines.ts" },
            { text: "12 design prompts", source: "packages/db/src/seed/design-prompts.ts" },
        ],
        detail: {
            headline: "Take the rounds, then choose who sees them",
            intro: "Browse roles or take them one at a time in Spark, see how your skills match, work through a company's interview rounds on the platform, and send your results only when you choose to.",
            steps: [
                { text: "Browse jobs, or use Spark to see one at a time with your match and the skills you are missing.", source: "apps/main/app/(jobs)/jobs/components/spark-panel.tsx" },
                { text: "Save jobs and follow companies.", source: "apps/main/app/(jobs)/jobs/saved, following" },
                { text: "Work through the rounds: aptitude, DSA, system design and voice.", source: "packages/db/src/seed/hiring-pipelines.ts" },
                { text: "Send your results to the company, seeing exactly what it will get first, and follow every send in My rounds.", source: "apps/main/lib/hiring/send.ts" },
            ],
            different: [
                { text: "The match score is the share of a job's required skills you already have, shown with the ones you miss.", source: "apps/main/actions/jobs/tabs.ts" },
                { text: "Nothing reaches a company until you press Send, and you can withdraw it until the company decides.", source: "apps/main/actions/hiring/send.action.ts" },
                { text: "Companies can publish a mock of their process for you to try first.", source: "apps/main/app/(jobs)/companies/[slug]/mock" },
            ],
            limits: [
                { text: "Matching compares skill names; it does not yet understand that two differently named skills are related.", source: "apps/main/actions/jobs/tabs.ts" },
            ],
            appPath: "/jobs",
            faqs: [
                { question: "How is the match score worked out?", answer: "It is the share of the job's required skills that you already have, shown next to the ones you are missing." },
                { question: "What is Spark?", answer: "One job at a time, with your match, the skills you have and miss, and the hiring process, so you can decide quickly." },
                { question: "Does a company see my rounds as I take them?", answer: "No. Your attempts stay with you until you send them, and you choose which attempt of each round goes." },
            ],
        },
    },
    {
        id: "mock",
        kind: "Interview path",
        name: "Mock interviews",
        artLabel: "mock",
        tone: "ink",
        summary: "Voice mock interviews on your own material, scored with feedback",
        bullets: [
            { text: "A live voice interviewer, no scheduling", source: "apps/main/app/(main)/mock/voice/interview/[sessionId]/_components/InterviewSessionClient.tsx" },
            { text: "Built on the material you give it", source: "apps/main/app/(main)/mock/_components/create-mock-sheet.tsx" },
            { text: "Scored on communication, technical, problem solving", source: "apps/main/app/(main)/mock/voice/results/[sessionId]/_components/InterviewResultsClient.tsx" },
        ],
        meta: [
            { text: "Voice", source: "Sarvam voice agent, apps/main/components/voice/live-interview.tsx" },
            { text: "3 scores out of 100", source: "InterviewResultsClient.tsx" },
        ],
        detail: {
            headline: "Rehearse out loud, before it counts",
            intro: "Set up a mock from a role and your own study material, talk it through with a voice interviewer, and read a scored breakdown of how it went.",
            steps: [
                { text: "Create a mock in three steps: the role, a knowledge base you paste in, and settings.", source: "apps/main/app/(main)/mock/_components/create-mock-sheet.tsx" },
                { text: "Start a live voice session.", source: "apps/main/app/(main)/mock/voice/interview/[sessionId]" },
                { text: "Read your results: an overall score, a breakdown, strengths and areas to improve.", source: "apps/main/app/(main)/mock/voice/results/[sessionId]/_components/InterviewResultsClient.tsx" },
                { text: "Retake it and compare.", source: "apps/main/actions/(main)/mockvoice/session.action.ts" },
            ],
            different: [
                { text: "It interviews you on the material you chose, not a fixed question list.", source: "apps/main/app/(main)/mock/_components/create-mock-sheet.tsx" },
                { text: "No one to schedule with, and no favour to owe.", source: "apps/main/app/(main)/mock/voice" },
                { text: "Each result scores communication, technical skills and problem solving out of 100.", source: "InterviewResultsClient.tsx" },
            ],
            limits: [
                { text: "Voice only, no video.", source: "apps/main/app/(main)/mock/voice" },
                { text: "Each session costs credits.", source: "packages/db/src/schema/mock.ts" },
            ],
            appPath: "/mock",
            costs: [
                { label: "A voice mock session", credits: 15 },
            ],
            faqs: [
                { question: "Is there video?", answer: "No. The mock is voice only: you talk it through, like a phone screen." },
                { question: "What can it interview me on?", answer: "The role you describe and the study material you paste in when you set the mock up." },
                { question: "What do I get at the end?", answer: "An overall score, scores for communication, technical skills and problem solving out of 100, your strengths, and areas to improve." },
            ],
        },
    },
]

export function moduleById(id: string): Module | undefined {
    return MODULES.find((m) => m.id === id)
}
