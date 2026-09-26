import "server-only"
import { asc, eq } from "drizzle-orm"
import { db, incidentCases, incidentSteps } from "@repo/db"
import type { IncidentTopicId } from "@/content/incidents"

/**
 * Cases and their steps as the app reads them: from `incident_case` / `incident_step`
 * (plan/incidents INC-11), written by `pnpm script incidents-seed` from the content files.
 */

export type CaseSummary = { slug: string; title: string; summary: string; topic: IncidentTopicId; minutes: number; steps: number; quizzes: number }

export async function listLiveCases(): Promise<CaseSummary[]> {
    const cases = await db.select().from(incidentCases).where(eq(incidentCases.status, "LIVE")).orderBy(asc(incidentCases.publishedAt))
    const steps = await db.select({ caseId: incidentSteps.caseId, kind: incidentSteps.kind }).from(incidentSteps)
    return cases.map((c) => {
        const mine = steps.filter((s) => s.caseId === c.id)
        return { slug: c.slug, title: c.title, summary: c.summary, topic: c.topic as IncidentTopicId, minutes: c.minutes, steps: mine.length, quizzes: mine.filter((s) => s.kind === "check" || s.kind === "final-quiz").length }
    })
}

export type PlayerStep = { key: string; ordinal: number; part: string; kind: string; title: string; content: Record<string, unknown>; xp: number }

export async function loadCaseForPlayer(slug: string) {
    const [c] = await db.select().from(incidentCases).where(eq(incidentCases.slug, slug)).limit(1)
    if (!c || c.status !== "LIVE") return null
    const steps = await db.select().from(incidentSteps).where(eq(incidentSteps.caseId, c.id)).orderBy(asc(incidentSteps.ordinal))
    return {
        slug: c.slug, title: c.title, summary: c.summary, topic: c.topic as IncidentTopicId, minutes: c.minutes, meta: c.meta,
        steps: steps.map((s): PlayerStep => ({ key: s.key, ordinal: s.ordinal, part: s.part, kind: s.kind, title: s.title, content: s.content, xp: s.xp })),
    }
}
