// The curated project catalogue (plan/projects, PJ-2 and PJ-11).
//
// TEN ideas, and every one of them opens a real project with sprints and tasks
// behind it. Niraj, 2026-09-23: "keep the 10 only on the platform and delete the
// rest, this list should be crisp."
//
// It used to be 30 ideas with nothing behind any of them, so every card led to
// the generation sheet and charged credits to reinvent what the card already
// described. Each entry now names the project it opens by slug; the seeder links
// the two and deletes any idea that is not in this list.
//
// Deliberately NOT what "Picked for you" uses: those are invented per person
// from their onboarding, because an idea shaped to the hours someone actually
// has beats the nearest row in a fixed list. This set is for the person who
// wants to look through something good rather than be told.

export interface CuratedIdea {
    /** The seeded project this idea opens. Must exist in `data.ts` PROJECTS. */
    projectSlug: string
    projectTitle: string
    projectDescription: string
    /** The catalogue's own scale, which the Ideas filters use. */
    difficulty: "EASY" | "MEDIUM" | "HARD"
    technologies: string[]
    categories: string[]
    primaryLanguageOrFramework: string
}

export const PROJECT_IDEAS: CuratedIdea[] = [
    {
        projectSlug: "habit-tracker-weekly-review",
        projectTitle: "Habit Tracker with a Weekly Review",
        projectDescription: "Track a handful of habits a day and get a weekly page that shows what actually held. The hard part is designing the roll-up so it stays honest when you miss days.",
        difficulty: "EASY",
        technologies: ["React", "TypeScript", "localStorage"],
        categories: ["web", "productivity"],
        primaryLanguageOrFramework: "React",
    },
    {
        projectSlug: "url-shortener-with-analytics",
        projectTitle: "URL Shortener with Click Analytics",
        projectDescription: "Shorten links and show where the clicks came from. The hard part is counting clicks without slowing the redirect down.",
        difficulty: "EASY",
        technologies: ["Node.js", "Redis", "PostgreSQL"],
        categories: ["backend", "api"],
        primaryLanguageOrFramework: "Node.js",
    },
    {
        projectSlug: "personal-finance-tracker",
        projectTitle: "Personal Finance Tracker",
        projectDescription: "Import a bank statement and see where the money actually goes. The hard part is categorising transactions from messy descriptions.",
        difficulty: "EASY",
        technologies: ["Next.js", "PostgreSQL", "Recharts"],
        categories: ["web", "fullstack"],
        primaryLanguageOrFramework: "Next.js",
    },
    {
        projectSlug: "expense-splitter",
        projectTitle: "Expense Splitter for a Shared House",
        projectDescription: "Record who paid for what and settle up with the fewest transfers. The hard part is the settle-up, which is a real graph problem.",
        difficulty: "MEDIUM",
        technologies: ["Next.js", "PostgreSQL", "Prisma"],
        categories: ["web", "fullstack"],
        primaryLanguageOrFramework: "Next.js",
    },
    {
        projectSlug: "markdown-notes-with-search",
        projectTitle: "Markdown Notes with Full-Text Search",
        projectDescription: "Write notes in markdown and find any of them in under a second. The hard part is search that ranks by relevance rather than by date.",
        difficulty: "MEDIUM",
        technologies: ["React", "IndexedDB", "TypeScript"],
        categories: ["web", "productivity"],
        primaryLanguageOrFramework: "React",
    },
    {
        projectSlug: "job-board-with-matching",
        projectTitle: "Job Board with Skill Matching",
        projectDescription: "Post jobs, take applications, and rank candidates by a match score they can actually read. The hard part is explaining the number.",
        difficulty: "MEDIUM",
        technologies: ["Next.js", "PostgreSQL", "Prisma", "TypeScript"],
        categories: ["web", "fullstack"],
        primaryLanguageOrFramework: "Next.js",
    },
    {
        projectSlug: "realtime-collaboration-board",
        projectTitle: "Realtime Collaboration Board",
        projectDescription: "A shared canvas with sticky notes, live cursors and comments. The hard part is two people dragging the same note on a bad connection.",
        difficulty: "HARD",
        technologies: ["Next.js", "WebSockets", "PostgreSQL", "Yjs"],
        categories: ["web", "realtime"],
        primaryLanguageOrFramework: "Next.js",
    },
    {
        projectSlug: "offline-first-delivery-app",
        projectTitle: "Offline-First Delivery App",
        projectDescription: "A courier app that keeps working in a lift. The hard part is syncing a queue of actions against a server that moved on without you.",
        difficulty: "HARD",
        technologies: ["React Native", "SQLite", "TypeScript"],
        categories: ["mobile", "offline"],
        primaryLanguageOrFramework: "React Native",
    },
    {
        projectSlug: "rate-limiter-service",
        projectTitle: "Rate Limiter as a Service",
        projectDescription: "An API that answers whether a caller is over their limit in under a millisecond. The hard part is the sliding window, and proving it under load.",
        difficulty: "HARD",
        technologies: ["Go", "Redis", "Docker"],
        categories: ["backend", "infrastructure"],
        primaryLanguageOrFramework: "Go",
    },
    {
        projectSlug: "observability-mini-stack",
        projectTitle: "Observability Mini Stack",
        projectDescription: "Ingest logs, metrics and traces from a demo app and query them back. The hard part is cardinality and retention: what you drop, and why.",
        difficulty: "HARD",
        technologies: ["Go", "ClickHouse", "Docker", "OpenTelemetry"],
        categories: ["backend", "infrastructure"],
        primaryLanguageOrFramework: "Go",
    },
]
