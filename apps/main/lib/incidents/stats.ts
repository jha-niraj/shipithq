import "server-only"
import { eq } from "drizzle-orm"
import { db, incidentBadges, incidentProgress } from "@repo/db"
import { INCIDENTS, INCIDENT_TOPICS, type IncidentTopicId } from "@/content/incidents"
import { INCIDENT_CASES } from "@/content/incidents/cases"
import type { BadgeFacts } from "@/content/incidents/badges"

/**
 * A reader's Incidents record (plan/incidents INC-5): XP earned here, cases done, the
 * streak, badges, readiness per topic and each case's status.
 */

export type CaseStatus = { answered: number; total: number; complete: boolean }

export type IncidentStats = {
    xp: number
    completed: number
    streak: number
    badges: string[]
    /** Per topic: right answers over all questions in the topic's cases; null when nothing is answered there. */
    readiness: Record<IncidentTopicId, number | null>
    cases: Record<string, CaseStatus>
    facts: BadgeFacts
}

type Row = { caseSlug: string; kind: string; itemId: string; correct: boolean | null; xpAwarded: number; createdAt: Date }

const day = (d: Date) => d.toISOString().slice(0, 10)

/** Days in a row, ending today or yesterday (UTC), with at least one row. */
export function streakFrom(dates: Date[], now = new Date()): number {
    const days = new Set(dates.map(day))
    const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    if (!days.has(day(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1)
    let n = 0
    while (days.has(day(cursor))) {
        n++
        cursor.setUTCDate(cursor.getUTCDate() - 1)
    }
    return n
}

export function factsFrom(rows: Row[]): BadgeFacts {
    const completedCases = [...new Set(rows.filter((r) => r.kind === "completion").map((r) => r.caseSlug))]
    const perfectRounds = [...new Set(rows.filter((r) => r.kind === "perfect_round").map((r) => r.caseSlug))]
    const flawlessCases = Object.values(INCIDENT_CASES)
        .filter((c) => c.predict.every((q) => rows.some((r) => r.caseSlug === c.slug && r.kind === "prediction" && r.itemId === q.id && r.correct)))
        .map((c) => c.slug)
    return { completedCases, perfectRounds, flawlessCases, streak: streakFrom(rows.map((r) => r.createdAt)) }
}

export async function progressRows(userId: string): Promise<Row[]> {
    return db
        .select({
            caseSlug: incidentProgress.caseSlug, kind: incidentProgress.kind, itemId: incidentProgress.itemId,
            correct: incidentProgress.correct, xpAwarded: incidentProgress.xpAwarded, createdAt: incidentProgress.createdAt,
        })
        .from(incidentProgress)
        .where(eq(incidentProgress.userId, userId))
}

export async function loadIncidentStats(userId: string): Promise<IncidentStats> {
    const [rows, badges] = await Promise.all([
        progressRows(userId),
        db.select({ key: incidentBadges.badgeKey }).from(incidentBadges).where(eq(incidentBadges.userId, userId)),
    ])
    const facts = factsFrom(rows)
    const answers = rows.filter((r) => r.kind === "prediction" || r.kind === "round")

    const cases: Record<string, CaseStatus> = {}
    for (const meta of INCIDENTS) {
        const c = INCIDENT_CASES[meta.slug]
        const total = c ? c.predict.length + c.round.length : 0
        cases[meta.slug] = { answered: answers.filter((a) => a.caseSlug === meta.slug).length, total, complete: facts.completedCases.includes(meta.slug) }
    }

    const readiness = {} as Record<IncidentTopicId, number | null>
    for (const t of INCIDENT_TOPICS) {
        const slugs = INCIDENTS.filter((m) => m.topic === t.id).map((m) => m.slug)
        const inTopic = answers.filter((a) => slugs.includes(a.caseSlug))
        const total = slugs.reduce((s, slug) => s + (cases[slug]?.total ?? 0), 0)
        readiness[t.id] = inTopic.length && total ? Math.round((inTopic.filter((a) => a.correct).length / total) * 100) : null
    }

    return {
        xp: rows.reduce((s, r) => s + r.xpAwarded, 0),
        completed: facts.completedCases.length,
        streak: facts.streak,
        badges: badges.map((b) => b.key),
        readiness,
        cases,
        facts,
    }
}
