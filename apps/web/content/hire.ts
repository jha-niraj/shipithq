import { HIRING_AI_LIMITS } from "@repo/pricing"
import type { ModuleCardData } from "@/components/home/modules"
import type { FaqItem } from "@/components/faq-accordion"

/**
 * What shipithq.com/hire says (plan/web/revamp REV-21). Sources are apps/hiring
 * paths, checked 2026-09-25.
 *
 * ── The one forward-looking claim ──
 * Candidates taking a company's rounds before the company sees them is the product's
 * promise, and it is being built (plan/hiring-rounds HR-12 to HR-18: the runners, the
 * send, applicants by round). Niraj, 2026-09-25: keep it as the headline, since the
 * rest of hiring is being built in parallel. Everything else below is what the app
 * does today. When HR-18 ships, re-read this file against it.
 */

export const HIRE_MODULES: ModuleCardData[] = [
    {
        // apps/hiring/app/(main)/interview-config, types/pipeline.ts (V1_ROUND_TYPES)
        id: "hire-pipelines",
        href: "/hire/pipelines",
        kind: "Design",
        name: "Pipelines",
        tone: "ink",
        bullets: [
            "Aptitude, coding, system design, voice rounds",
            "Hard gates and pass marks per round",
            "Draft a whole pipeline with AI",
        ],
        meta: ["5 round types", "3 starter pipelines"],
    },
    {
        // packages/db/src/seed (aptitude pool, design-prompts.ts); pipeline-builder.action.ts
        id: "hire-questions",
        href: "/hire/questions",
        kind: "Question bank",
        name: "Questions",
        tone: "blush",
        bullets: [
            "A pool of aptitude questions to draw from",
            "System design prompts, or add your own",
            "Generate aptitude sets with AI",
        ],
        meta: ["320 aptitude questions", "12 design prompts"],
    },
    {
        // apps/hiring/actions/jobs/job-crud.ts, job-status.ts; jobs/new/job-form-content.tsx
        id: "hire-jobs",
        href: "/hire/jobs",
        kind: "Publish",
        name: "Jobs",
        tone: "ink",
        bullets: [
            "Post, publish, pause and duplicate roles",
            "Attach an interview pipeline to each job",
            "A company page with your media",
        ],
        meta: ["Pause or close any time"],
    },
    {
        // apps/hiring/app/(main)/{candidates,results}, actions/sends; the shared send view
        // packages/ui/src/components/hiring/send-view.tsx (checked 2026-10-07, plan/web/story ST-9:
        // there is no board, no stages, no notes, no shortlist and no take-home UI)
        id: "hire-candidates",
        href: "/hire/candidates",
        kind: "Review",
        name: "Candidates",
        tone: "mint",
        bullets: [
            "Results from candidates who cleared your rounds",
            "Their code, answers and transcripts, round by round",
            "Invite or decline, then record the outcome",
        ],
        meta: ["Compare up to 3"],
    },
    {
        // apps/hiring/actions/team/*; packages/auth/src/work-email.ts
        id: "hire-team",
        href: "/hire/team",
        kind: "Collaborate",
        name: "Team",
        tone: "ink",
        bullets: [
            "Invite your team by email",
            "Custom roles and permissions",
            "Company email addresses only",
        ],
        meta: ["Work email only"],
    },
]

export const HIRE_FAQS: FaqItem[] = [
    {
        question: "Who can create a company workspace?",
        answer: "Anyone with a company email address. Free and temporary email providers are turned away at sign-up and for team invites, so every account on a company workspace belongs to that company. Whoever creates the workspace becomes its Owner.",
    },
    {
        question: "What kinds of interview rounds can we set up?",
        answer: "Five: aptitude, coding (DSA), system design, a voice behavioural interview and a voice culture conversation. Each round has a pass mark, a time limit and a retake cool-down, and is either a hard gate (below the pass mark, the next round stays locked) or advisory.",
    },
    {
        question: "Can we use our own questions?",
        answer: `Yes. Aptitude rounds draw from a shared pool, or you can generate a set with AI (up to ${HIRING_AI_LIMITS.aptitudeGenerationsPerDay} generations a day, ${HIRING_AI_LIMITS.aptitudeQuestionsPerGeneration.min} to ${HIRING_AI_LIMITS.aptitudeQuestionsPerGeneration.max} questions each). For system design you can pick from the prompt library or add your own.`,
    },
    {
        question: "Where do candidates come from?",
        answer: "From ShipItHQ: developers practising, building projects and preparing for interviews on the platform see your public jobs in their feed, take your rounds, and choose to send you their results.",
    },
    {
        question: "Can my whole team work in it?",
        answer: "Yes. Invite teammates by email and give them roles; you can create custom roles and choose what each one can do.",
    },
    {
        question: "What does it cost?",
        answer: "There is a free plan to start, a Pro plan billed monthly, and custom pricing for large teams. The plans and prices are listed above, in rupees or dollars.",
    },
]

/**
 * The five /hire/<slug> pages (plan/web/revamp REV-82). Sources as on the cards above;
 * the only forward-looking line is the round runner (HR-12 to HR-18), per Niraj.
 */
export interface HireFeature {
    slug: "pipelines" | "questions" | "jobs" | "candidates" | "team"
    headline: string
    intro: string
    steps: string[]
    different: string[]
    limits: string[]
    faqs: { question: string; answer: string }[]
}

export const HIRE_FEATURES: HireFeature[] = [
    {
        slug: "pipelines",
        headline: "Design the interview once",
        intro: "Build a pipeline of rounds (aptitude, coding, system design and voice) with a pass mark, a time limit and a gate on each, then attach it to any job.",
        steps: [
            "Start from one of three starter pipelines, draft one with AI, or build it round by round.",
            "Pick each round's type, pass mark, time limit and retake cool-down.",
            "Make a round a hard gate, so the next stays locked below the pass mark, or advisory.",
            "Attach the pipeline to a job; candidates take it on ShipItHQ before they send you results.",
        ],
        different: [
            "Rounds are built for engineers: aptitude, DSA, system design and voice, not a generic form.",
            "Hard and advisory gates let you decide which rounds screen and which only inform.",
            "An AI draft gives you a sensible starting pipeline in seconds, which you then edit.",
        ],
        limits: [
            `AI drafting is capped at ${HIRING_AI_LIMITS.pipelineDraftsPerDay} drafts a day per company.`,
            "Five round types today; custom round types are not available yet.",
        ],
        faqs: [
            { question: "What does a hard gate do?", answer: "Below the round's pass mark, the next round stays locked, so only candidates who clear it move on." },
            { question: "Can I reuse a pipeline?", answer: "Yes. Save it once and attach it to as many jobs as you like." },
            { question: "Where do candidates take the rounds?", answer: "On ShipItHQ, where they already practise, so you are not sending links to a separate test platform." },
        ],
    },
    {
        slug: "questions",
        headline: "A question bank you do not have to write",
        intro: "Aptitude rounds draw from a shared pool of 320 questions, system design rounds from a prompt library of 12, and you can generate or add your own.",
        steps: [
            "Choose how many aptitude questions a round draws, and in how long.",
            "Pick system design prompts from the library, or add your own.",
            `Generate an aptitude set with AI: ${HIRING_AI_LIMITS.aptitudeQuestionsPerGeneration.min} to ${HIRING_AI_LIMITS.aptitudeQuestionsPerGeneration.max} questions at a time.`,
            "Review what the round will draw before you publish.",
        ],
        different: [
            "A pool spread across quantitative, logical and verbal reasoning.",
            "Draws are randomised per candidate, so answers do not travel.",
            "Your own prompts sit beside the library in one place.",
        ],
        limits: [
            `AI generation is capped at ${HIRING_AI_LIMITS.aptitudeGenerationsPerDay} generations a day per company.`,
        ],
        faqs: [
            { question: "How big is the question pool?", answer: "320 aptitude questions across quantitative, logical and verbal reasoning, and 12 system design prompts." },
            { question: "Can I write my own questions?", answer: "You can add your own system design prompts and generate aptitude sets with AI." },
            { question: "Do all candidates see the same questions?", answer: "Each attempt draws from the pool, so two candidates rarely see the same set." },
        ],
    },
    {
        slug: "jobs",
        headline: "Post a role, attach the interview",
        intro: "Create a job in one form, attach a pipeline, and publish it to the jobs feed developers use on ShipItHQ. Pause, close or duplicate it any time.",
        steps: [
            "Write the role in one form: title, skills, location and details.",
            "Attach an interview pipeline.",
            "Publish it; public jobs appear in the ShipItHQ jobs feed.",
            "Pause, close or duplicate it whenever hiring changes.",
        ],
        different: [
            "Your job reaches developers who are already practising on the platform.",
            "The interview travels with the job, instead of living in a separate tool.",
            "A company page with your logo, cover and media gives candidates context.",
        ],
        limits: [
            "Job boards outside ShipItHQ are not syndicated yet.",
        ],
        faqs: [
            { question: "Who sees my job?", answer: "Public, active jobs appear in the jobs feed developers use on ShipItHQ." },
            { question: "Can I pause a job?", answer: "Yes. Pause, close or duplicate a job at any time." },
            { question: "Do I need a company page?", answer: "It is optional, but a logo, cover and media help candidates decide." },
        ],
    },
    {
        slug: "candidates",
        headline: "Results you can read, not CVs",
        intro: "Candidates who clear your rounds send you their results: the code, the written answers, the transcripts and the diagrams, round by round. You invite or decline, and record what happened.",
        steps: [
            "See the results sent for each role, or every candidate across roles.",
            "Open one: an overview, then a tab per round with the attempt they chose and its integrity counts.",
            "Compare up to three side by side, then decide one at a time or together.",
            "Invite or decline with a message drafted from your note, then record the outcome: Interviewing, Offer, Hired or Not selected.",
        ],
        different: [
            "You read what the candidate did in your rounds, not what they wrote about themselves.",
            "The candidate chooses which attempt to send and agrees to share exactly that.",
            "A candidate's email stays private until you invite them.",
        ],
        limits: [
            "There is no applicant board or take-home assignments: you see results candidates send, after your rounds.",
        ],
        faqs: [
            { question: "Can my team see the same results?", answer: "Yes. Everyone invited to the workspace works on the same results, with the permissions their role allows." },
            { question: "What do I see for each round?", answer: "The attempt the candidate chose and how many they made, the pass mark, the code with its language, written answers, transcripts, diagrams, rubric scores, and how often they pasted or left the tab." },
            { question: "Is there reporting?", answer: "An analytics page shows the results received, those waiting on a decision, and those you invited." },
        ],
    },
    {
        slug: "team",
        headline: "Hire as a team",
        intro: "Invite your hiring team by company email, give each person a role, and create custom roles with exactly the permissions they need.",
        steps: [
            "Create the workspace with your company email; you become its Owner.",
            "Invite teammates by email; invites can be resent or revoked.",
            "Assign roles, or create custom roles with their own permissions.",
            "Everyone works from the same jobs, pipelines and candidates.",
        ],
        different: [
            "Company email only: free and temporary addresses cannot create or join a company.",
            "Custom roles, not just admin and member.",
            "One workspace per company, owned by the person who created it.",
        ],
        limits: [
            "Single sign-on is not available yet.",
        ],
        faqs: [
            { question: "Why only company email?", answer: "So every account on a company workspace belongs to that company. Free and disposable addresses are turned away at sign-up and for invites." },
            { question: "Can I control what each person can do?", answer: "Yes. Create custom roles and choose their permissions." },
            { question: "Can I change what someone can do later?", answer: "Yes. Change their role, or edit the custom role itself, from the team pages." },
        ],
    },
]

export const hireFeatureBySlug = (slug: string) => HIRE_FEATURES.find((f) => f.slug === slug)

/**
 * The wedge from the company's side (plan/competition/skillmeet CMP-5; Niraj,
 * 2026-09-26). Each point is something that ships:
 *   1. plan/job-import JI-1 to JI-8: students paste a posting and practise rounds
 *      ShipItHQ designs from it (and from what students reported, JI-11).
 *   2. JI-9: a verified company sees those imports under its pipelines (private ones
 *      anonymised) and adopts, edits or replaces them; students then practise its version.
 *   3. CMP-1, CMP-2: students report real interviews; only totals are shown ("reported
 *      N times"), once a role has 3 reports from the last year.
 */
export const HIRE_WEDGE = {
    eyebrow: "Already happening",
    title: "Students are already practising your interview",
    sub: "They paste your job posts into ShipItHQ and rehearse the rounds we design from them. Claim your page and make those rounds yours.",
    points: [
        { t: "See the jobs they imported", b: "Every job students pasted from your postings, with the rounds ShipItHQ built for it. Private imports never say who made them." },
        { t: "Adopt, edit or replace", b: "Make a pipeline yours and edit it like any other, or point it at one you already run. From then on, students practise your version." },
        { t: "What candidates report", b: "Students report the rounds they actually took. Only totals are ever shown, once a role has three reports from the last year." },
    ],
    cta: "Claim your company page",
} as const
