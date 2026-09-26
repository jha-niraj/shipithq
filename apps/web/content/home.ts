import type { Step } from "@/components/marketing/sections"
import type { TourTab } from "@/components/marketing/product-tour"

/**
 * Copy for the student landing's new sections (plan/web/revamp REV-79). Every line is
 * a restatement of a sourced fact in content/modules.ts; check there before changing.
 */

export const HOME_STEPS: Step[] = [
    { title: "Sign up free", body: "Every new account gets credits to try the product, with no subscription.", art: "pricing" },
    { title: "Pick where to start", body: "Practice, a project, a mock, your resume or jobs: one account, one balance.", art: "projects" },
    { title: "Practise and build", body: "Code runs in a real Linux container; projects end each sprint with a quiz and a mock.", art: "practice" },
    { title: "Apply with proof", body: "A resume and a public profile that say what you built, and jobs matched to your skills.", art: "jobs" },
]

export const HOME_TOUR: TourTab[] = [
    {
        id: "practice", label: "Practice", art: "practice", tone: "sage",
        title: "Code that actually runs",
        points: ["JavaScript, TypeScript, Python, Java and C++ in a Linux container", "Hidden tests decide when a problem is accepted", "A mentor that remembers what you understood"],
        href: "/features/practice", cta: "How practice works",
    },
    {
        id: "projects", label: "Projects", art: "projects", tone: "ink",
        title: "Projects you are interviewed about",
        points: ["Hand-written briefs, four sprints of five tasks", "A Done when line and hints on every task", "A quiz and a mock at the end of each sprint"],
        href: "/features/projects", cta: "How projects work",
    },
    {
        id: "mock", label: "Mock", art: "mock", tone: "blush",
        title: "Rehearse out loud",
        points: ["A live voice interviewer, no scheduling", "Built on the material you give it", "Scored on communication, technical skills and problem solving"],
        href: "/features/mock", cta: "How mocks work",
    },
    {
        id: "resume", label: "Resume", art: "ai", tone: "butter",
        title: "A resume that says what you built",
        points: ["Import from LinkedIn and GitHub, or upload", "Tailor it to a job and check the ATS score", "Export a PDF or share a public link"],
        href: "/features/ai", cta: "How the AI tools work",
    },
]
