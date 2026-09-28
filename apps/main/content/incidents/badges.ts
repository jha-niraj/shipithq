import { INCIDENTS, INCIDENT_TOPICS } from "./index"

/**
 * Incidents badges (plan/incidents INC-5). Each is earned once, from facts about a
 * reader's saved progress, and kept even if later cases change what would earn it.
 * The streak counts days with at least one answer (overview.md, "Game").
 */

export type BadgeFacts = {
    completedCases: string[]
    perfectRounds: string[]
    /** Cases where every prediction was right first time. */
    flawlessCases: string[]
    streak: number
}

export type IncidentBadge = {
    key: string
    title: string
    description: string
    earned: (f: BadgeFacts) => boolean
    /** Where a locked badge stands, for its progress bar; none for all-or-nothing badges. */
    progress?: (f: BadgeFacts) => { value: number; max: number; label: string }
}

export const INCIDENT_BADGES: IncidentBadge[] = [
    { key: "first-case", title: "First responder", description: "Finish your first case.", earned: (f) => f.completedCases.length >= 1,
        progress: (f) => ({ value: Math.min(1, f.completedCases.length), max: 1, label: "No case finished yet" }) },
    { key: "called-it", title: "Called it", description: "Every prediction in a case right, first time.", earned: (f) => f.flawlessCases.length >= 1 },
    { key: "sharp-eye", title: "Sharp eye", description: "A perfect spot-the-failure round.", earned: (f) => f.perfectRounds.length >= 1 },
    { key: "on-call", title: "On call", description: "Answer something three days in a row.", earned: (f) => f.streak >= 3,
        progress: (f) => ({ value: Math.min(3, f.streak), max: 3, label: `${Math.min(3, f.streak)} of 3 days` }) },
    ...INCIDENT_TOPICS.map((t) => ({
        key: `topic-${t.id}`,
        title: `${t.label}, covered`,
        description: `Finish every ${t.label.toLowerCase()} case.`,
        earned: (f: BadgeFacts) => {
            const cases = INCIDENTS.filter((c) => c.topic === t.id)
            return cases.length > 0 && cases.every((c) => f.completedCases.includes(c.slug))
        },
        progress: (f: BadgeFacts) => {
            const cases = INCIDENTS.filter((c) => c.topic === t.id)
            const done = cases.filter((c) => f.completedCases.includes(c.slug)).length
            return { value: done, max: Math.max(1, cases.length), label: cases.length ? `${done} of ${cases.length} cases` : "No cases yet" }
        },
    })),
]
