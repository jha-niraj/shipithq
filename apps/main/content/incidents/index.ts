/**
 * The Incidents catalogue (plan/incidents). Cases are typed files in this folder,
 * written by hand from real production failures; nothing here is generated.
 *
 * This file holds the topics and each case's meta; the bodies are in `cases.ts`,
 * typed by `types.ts`.
 */

/**
 * The topics (Niraj, 2026-09-26; plan/incidents INC-13). The first four came with the
 * module; AI and LLMs, Frontend and Security arrived with the cases Niraj collected.
 */
export const INCIDENT_TOPICS = [
    { id: "serverless", label: "Serverless and edge", blurb: "Limits, lifetimes and what a platform quietly kills." },
    { id: "databases", label: "Databases", blurb: "Connections, transactions, migrations and the data you cannot get back." },
    { id: "queues", label: "Queues and background jobs", blurb: "Work that outlives the request, and how it fails without a word." },
    { id: "auth", label: "Auth and sessions", blurb: "Cookies, tokens, redirects and the user who is suddenly someone else." },
    { id: "ai", label: "AI and LLMs", blurb: "Model bills, caches, prompts and answers that go stale." },
    { id: "frontend", label: "Frontend", blurb: "What the user sees before the server has answered, and why it lies." },
    { id: "security", label: "Security", blurb: "The check that was in the wrong layer, and the one nobody wrote." },
] as const

export type IncidentTopicId = (typeof INCIDENT_TOPICS)[number]["id"]

export type IncidentMeta = {
    slug: string
    title: string
    /** One sentence: what happened, in plain words. */
    summary: string
    topic: IncidentTopicId
    minutes: number
}

export const INCIDENTS: IncidentMeta[] = [
    {
        slug: "the-demo-that-died-at-30-seconds",
        title: "The demo that died at 30 seconds",
        summary: "A two-minute job, a client on the call, and a Worker that stopped halfway without a single error.",
        topic: "serverless",
        minutes: 18,
    },
]

/**
 * XP per action (decisions in plan/incidents/overview.md, Niraj 2026-09-26). Each is
 * awarded once per user per item; replays earn nothing.
 */
export const INCIDENT_XP = {
    /** A prediction answered correctly on the first try. */
    prediction: 10,
    /** Finishing a case. */
    completion: 50,
    /** A spot-the-failure round with every answer right first time. */
    perfectRound: 25,
} as const

/**
 * Cases being written (INC-13), from Niraj's own production write-ups at
 * nirajjha.vercel.app. Shown as "Being written" so a topic is never an empty tab and
 * readers see what is coming; each becomes a case in INCIDENTS when it is written.
 */
export const INCIDENT_UPCOMING: { title: string; topic: IncidentTopicId; summary: string }[] = [
    { title: "The same question, four thousand ways", topic: "ai", summary: "A support bot answered ninety questions four thousand times. Exact-match caching hit 2.1 percent." },
    { title: "The like button that lied on purpose", topic: "frontend", summary: "The network was off, the count went up anyway. When an optimistic update is honest, and when it is not." },
    { title: "The login that allocated 32 MB", topic: "security", summary: "scrypt wants 32 MB per login. On a Worker, that is a problem." },
    { title: "Why the loading.tsx never showed up", topic: "frontend", summary: "The skeleton was in the right folder with the right name. Four separate things stopped it." },
    { title: "The pending flag that lags one frame", topic: "frontend", summary: "It deletes twice, sometimes. A button that looked dead for a moment." },
    { title: "Three layers people call a server action", topic: "security", summary: "The third delete button that month, written the third different way." },
    { title: "The prefetch that made the list page slower", topic: "frontend", summary: "An accessibility fix made navigation instant and the list four times worse." },
    { title: "A column on a 250 million row table", topic: "databases", summary: "Adding one column without anybody noticing, on a table that cannot stop." },
]

export function getIncidentMeta(slug: string): IncidentMeta | undefined {
    return INCIDENTS.find((c) => c.slug === slug)
}

export function topicLabel(id: IncidentTopicId): string {
    return INCIDENT_TOPICS.find((t) => t.id === id)?.label ?? id
}
