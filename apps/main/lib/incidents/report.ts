import "server-only"
import { and, eq, inArray } from "drizzle-orm"
import { db, incidentProgress, incidentRuns, incidentRunEvents, incidentMockSessions, pathfinderGoals, pathfinderSubGoals, users, type IncidentRunReport } from "@repo/db"
import { getIncidentCase } from "@/content/incidents/cases"
import { INCIDENT_PATHS, PATH_OWNER } from "@/content/incidents/paths"
import { INCIDENT_XP } from "@/content/incidents"
import { addXpToUser } from "@/actions/(main)/user/level.action"
import { recordActivity, activityKey, setActivityXp } from "@repo/db/activity"

/**
 * A run's report, ready to render (plan/incidents INC-38, INC-39, INC-43): the report,
 * the case, how long the run took, and, for the owner, where each next step lives in
 * the path they adopted.
 */

export type ReportPageData = {
    runId: string
    slug: string
    caseTitle: string
    reader: string
    startedAt: string
    reportedAt: string | null
    minutes: number | null
    report: IncidentRunReport
    /** Owner only. */
    shareToken: string | null
    /** Owner only: path topic title -> a link into the reader's adopted path. */
    topicLinks: Record<string, string>
    /** Owner only: whether they have the path. */
    adoptedPath: boolean
}

async function shape(run: typeof incidentRuns.$inferSelect, owner: boolean): Promise<ReportPageData | null> {
    const c = getIncidentCase(run.caseSlug)
    if (!c || !run.report) return null
    const [u] = await db.select({ name: users.name, username: users.username }).from(users).where(eq(users.id, run.userId))
    const topicLinks: Record<string, string> = {}
    let adoptedPath = false
    const path = INCIDENT_PATHS[run.caseSlug]
    if (owner && path) {
        const [source] = await db.select({ id: pathfinderGoals.id }).from(pathfinderGoals).innerJoin(users, eq(users.id, pathfinderGoals.userId))
            .where(and(eq(users.email, PATH_OWNER.email), eq(pathfinderGoals.slug, path.slug)))
        const copy = source ? await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.userId, run.userId), eq(pathfinderGoals.forkedFromId, source.id)),
            columns: { id: true, slug: true },
        }) : undefined
        if (copy) {
            adoptedPath = true
            const topics = await db.select({ id: pathfinderSubGoals.id, title: pathfinderSubGoals.title }).from(pathfinderSubGoals).where(eq(pathfinderSubGoals.goalId, copy.id))
            for (const t of topics) topicLinks[t.title] = `/pathfinder/${copy.slug}?tab=plan&topic=${t.id}`
        }
    }
    return {
        runId: run.id,
        slug: run.caseSlug,
        caseTitle: c.title,
        reader: owner ? "You" : (u?.name || u?.username || "A learner"),
        startedAt: run.startedAt.toISOString(),
        reportedAt: run.reportedAt?.toISOString() ?? null,
        minutes: run.endedAt ? Math.max(1, Math.round((run.endedAt.getTime() - run.startedAt.getTime()) / 60000)) : null,
        report: run.report,
        shareToken: owner ? run.shareToken : null,
        topicLinks,
        adoptedPath,
    }
}

export async function loadOwnReport(userId: string, slug: string, runId: string) {
    const run = await db.query.incidentRuns.findFirst({ where: and(eq(incidentRuns.id, runId), eq(incidentRuns.userId, userId), eq(incidentRuns.caseSlug, slug)) })
    return run ? shape(run, true) : null
}

export async function loadSharedReport(token: string) {
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null
    const run = await db.query.incidentRuns.findFirst({ where: eq(incidentRuns.shareToken, token) })
    return run ? shape(run, false) : null
}

/** The first report on a case earns XP once (INC-42): the ledger's unique key makes it once. */
export async function awardReportXp(userId: string, slug: string, runId: string) {
    const c = getIncidentCase(slug)
    if (!c) return
    const [row] = await db.insert(incidentProgress).values({ userId, caseSlug: slug, kind: "report", itemId: "report" }).onConflictDoNothing().returning({ id: incidentProgress.id })
    if (!row) return
    const r = await addXpToUser(userId, INCIDENT_XP.report, `Incidents: ${c.title}, first report`, "EARN")
    if (r.success) await db.update(incidentProgress).set({ xpAwarded: INCIDENT_XP.report }).where(eq(incidentProgress.id, row.id))
    // The activity ledger (plan/progress PRG-3). The worker usually recorded this report
    // when it was ready (PRG-4), before this XP existed; then only its XP is filled in.
    const xp = r.success ? INCIDENT_XP.report : 0
    const recorded = await recordActivity(db, userId, {
        type: "INCIDENT_REPORT_READY",
        title: `Report ready: ${c.title}`,
        description: "Incidents - first report",
        xp,
        key: activityKey.incidentReport(runId),
        meta: { slug, runId },
    })
    if (!recorded && xp) await setActivityXp(db, userId, activityKey.incidentReport(runId), xp)
}

/** Delete a run with its events and the transcripts of its talks (INC-44). XP already earned stays. */
export async function deleteRunFor(userId: string, runId: string) {
    const run = await db.query.incidentRuns.findFirst({ where: and(eq(incidentRuns.id, runId), eq(incidentRuns.userId, userId)), columns: { id: true } })
    if (!run) return false
    const talks = await db.select({ payload: incidentRunEvents.payload }).from(incidentRunEvents).where(and(eq(incidentRunEvents.runId, runId), eq(incidentRunEvents.kind, "talk")))
    const sessionIds = talks.map((t) => String((t.payload as { sessionId?: string }).sessionId ?? "")).filter(Boolean)
    // Sessions first, then the run (its events cascade). Two independent statements in one batch.
    const dropRun = db.delete(incidentRuns).where(eq(incidentRuns.id, runId))
    if (sessionIds.length) await db.batch([db.delete(incidentMockSessions).where(and(inArray(incidentMockSessions.id, sessionIds), eq(incidentMockSessions.userId, userId))), dropRun])
    else await dropRun
    return true
}

