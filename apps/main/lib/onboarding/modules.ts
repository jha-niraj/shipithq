// ─────────────────────────────────────────────────────────────────────────────
// Which sub-modules have an adaptive onboarding, and what each one's questions
// are trying to find out.
//
// This file is the source of truth for valid module keys: the database column is
// plain text so a new sub-module is one entry here and no migration, and the
// server actions reject any key not listed. Keep it free of server-only imports;
// the gate and the rail (client components) read it for labels and estimates.
//
// `focus` is the paragraph the question prompt is aimed with. It is the single
// biggest lever on question quality, which is why it is prose reviewed by a
// person and not a list of tags. Decisions in plan/module-onboarding/overview.md.
// ─────────────────────────────────────────────────────────────────────────────

export const ONBOARDING_MODULE_KEYS = [
    "practice:dsa",
    "practice:system-design",
    "practice:web-frontend",
    "practice:web-backend",
    "projects",
] as const

export type OnboardingModuleKey = (typeof ONBOARDING_MODULE_KEYS)[number]

export interface OnboardingModuleConfig {
    key: OnboardingModuleKey
    /** Short name used in headings: "DSA practice". */
    label: string
    /** The paragraph shown on the gate: why we ask, in the user's terms. */
    purpose: string
    /** What the questions are trying to learn. Read by the prompt, never shown. */
    focus: string
    /** Where the gate lives. Also where the dashboard is once the run completes. */
    gatePath: string
    /** Shown on the gate as "about N minutes". */
    estimateMinutes: number
}

export const ONBOARDING_MODULES: Record<OnboardingModuleKey, OnboardingModuleConfig> = {
    "practice:dsa": {
        key: "practice:dsa",
        label: "DSA practice",
        purpose:
            "A few questions about where you are with data structures and algorithms, so the mentor starts from what you already know instead of from zero.",
        focus:
            "Find out how much data structures and algorithms practice this person has actually done and where they stand. Roughly how many problems they have solved and on which platforms (LeetCode, takeUforward, Codeforces, GeeksforGeeks, college assignments, none). Which language they solve in. Which topics they are comfortable with (arrays, hashing, two pointers, sliding window, stacks, binary search, linked lists, trees, graphs, dynamic programming, recursion and backtracking, greedy, bit manipulation) and which one they avoid or fear most. Whether they can usually get a brute force working and where they get stuck after that (optimising, proving complexity, edge cases, writing code without bugs, understanding the question). Whether they have done any timed contests or mock interviews. What they are preparing for and by when (campus placements, a specific company, internships, general improvement) and how many hours a week they can give. Ask about the weakest area concretely once you know it.",
        gatePath: "/practice/dsa",
        estimateMinutes: 3,
    },
    "practice:system-design": {
        key: "practice:system-design",
        label: "System design practice",
        purpose:
            "A few questions about what you have designed and built at scale, so reviews start at your level.",
        focus:
            "Find out this person's real exposure to system design. Whether they have built and deployed anything that had more than one user, and what it ran on. Whether they have worked with or only read about load balancers, caches, message queues, relational versus document databases, sharding, replication, CDNs, rate limiting. Whether they can explain a trade-off they made themselves. Whether they know the vocabulary (latency, throughput, availability, consistency) from use or from videos. Whether they have done a system design interview or mock and how it went. What they are preparing for (an SDE-2 or senior loop, a startup role, general understanding) and when. Which classic design (URL shortener, chat, news feed, ride sharing, rate limiter) they could sketch today and which they could not.",
        gatePath: "/practice/system-design",
        estimateMinutes: 3,
    },
    "practice:web-frontend": {
        key: "practice:web-frontend",
        label: "Frontend practice",
        purpose:
            "A few questions about what you have built in the browser, so exercises match what you can already do.",
        focus:
            "Find out what this person has actually built on the frontend. Which of HTML, CSS, JavaScript, TypeScript, React, Next.js, Vue or others they have used in a real project versus a tutorial. Whether they have shipped something people used, and where it was deployed. Comfort with layout (flexbox, grid, responsive design), state management, fetching and caching data, forms and validation, accessibility, performance (bundle size, rendering, Core Web Vitals), testing. Whether they can build a component from a design without help. What they struggle with most. What they are aiming at (frontend role, full stack, a product of their own) and by when.",
        gatePath: "/practice/web-frontend",
        estimateMinutes: 3,
    },
    "practice:web-backend": {
        key: "practice:web-backend",
        label: "Backend practice",
        purpose:
            "A few questions about the servers and APIs you have built, so exercises start where you are.",
        focus:
            "Find out what this person has actually built on the backend. Which languages and frameworks (Node with Express or Nest, Python with Django or FastAPI, Java with Spring, Go, others) they have used in a real project versus a tutorial. Whether they have designed a REST or GraphQL API that a frontend or another team consumed. Comfort with databases (SQL versus NoSQL, schema design, indexes, migrations, ORMs), authentication and sessions, input validation and error handling, background jobs, caching, deployment (Docker, a cloud, a PaaS), logging and debugging in production. Whether they have handled a bug that only appeared in production. What they struggle with most. What they are aiming at and by when.",
        gatePath: "/practice/web-backend",
        estimateMinutes: 3,
    },
    projects: {
        key: "projects",
        label: "Projects",
        purpose:
            "A few questions about what you have built and shipped, so project ideas and plans fit the time and skills you actually have.",
        focus:
            "Find out this person's building history and capacity. How many projects they have finished versus started, and whether any was shipped to real users or deployed anywhere public (a URL, an app store, a GitHub repo people used). Whether they build alone or in a team, and whether they have used git with others. Which stack they reach for and which they want to learn. Whether they have taken a project from idea to a working version without a tutorial. What stopped their unfinished projects (scope, time, losing interest, getting stuck technically). How many hours a week they can give now. What they want to build next and why (portfolio, placements, a startup idea, learning a stack). Whether they want a plan they follow closely or freedom with light checkpoints.",
        gatePath: "/projects",
        estimateMinutes: 3,
    },
}

export function isOnboardingModuleKey(value: unknown): value is OnboardingModuleKey {
    return typeof value === "string" && (ONBOARDING_MODULE_KEYS as readonly string[]).includes(value)
}

export function onboardingModule(key: OnboardingModuleKey): OnboardingModuleConfig {
    return ONBOARDING_MODULES[key]
}

/**
 * The URL param a page carries while it shows the onboarding (gate or flow)
 * instead of its dashboard (MO-10). The server page keeps it in step with what
 * it renders, so the URL always says which of the two is on screen: a refresh
 * keeps the onboarding, a layout can hide chrome that does not belong to it
 * (the practice tabs), and a stale link cannot force the flow open.
 */
export const ONBOARDING_PARAM = "onboarding"

/** Where a module's onboarding lives. `retake` also skips the gate for someone
 *  who already has a completed profile. */
export function onboardingHref(key: OnboardingModuleKey, opts: { retake?: boolean } = {}): string {
    const params = new URLSearchParams({ [ONBOARDING_PARAM]: "1" })
    if (opts.retake) params.set("resume", "1")
    return `${ONBOARDING_MODULES[key].gatePath}?${params.toString()}`
}

/** A module's dashboard URL, keeping a topic filter if there was one. */
export function dashboardHref(key: OnboardingModuleKey, topic?: string | null): string {
    const path = ONBOARDING_MODULES[key].gatePath
    return topic ? `${path}?${new URLSearchParams({ topic }).toString()}` : path
}

/**
 * The practice module behind each onboarding, where there is one. Projects has
 * no problem catalogue, so it has no entry. Used to start the recommended list
 * as soon as an onboarding finishes (plan/practice-dsa, PD-15).
 */
export const PRACTICE_MODULE_OF: Partial<Record<OnboardingModuleKey, "DSA" | "SYSTEM_DESIGN" | "WEB_FRONTEND" | "WEB_BACKEND">> = {
    "practice:dsa": "DSA",
    "practice:system-design": "SYSTEM_DESIGN",
    "practice:web-frontend": "WEB_FRONTEND",
    "practice:web-backend": "WEB_BACKEND",
}
