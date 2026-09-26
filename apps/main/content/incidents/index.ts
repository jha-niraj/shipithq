/**
 * The Incidents catalogue (plan/incidents). Cases are typed files in this folder,
 * written by hand from real production failures; nothing here is generated.
 *
 * This file holds the topics and each case's meta; the bodies are in `cases.ts`,
 * typed by `types.ts`.
 */

/** The four topics (Niraj, 2026-09-26; plan/incidents/overview.md). */
export const INCIDENT_TOPICS = [
    { id: "serverless", label: "Serverless and edge", blurb: "Limits, lifetimes and what a platform quietly kills." },
    { id: "databases", label: "Databases", blurb: "Connections, transactions, migrations and the data you cannot get back." },
    { id: "queues", label: "Queues and background jobs", blurb: "Work that outlives the request, and how it fails without a word." },
    { id: "auth", label: "Auth and sessions", blurb: "Cookies, tokens, redirects and the user who is suddenly someone else." },
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

export function getIncidentMeta(slug: string): IncidentMeta | undefined {
    return INCIDENTS.find((c) => c.slug === slug)
}

export function topicLabel(id: IncidentTopicId): string {
    return INCIDENT_TOPICS.find((t) => t.id === id)?.label ?? id
}
