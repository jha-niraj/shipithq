"use server"

import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import { and, desc, eq, gte, inArray, isNotNull } from "drizzle-orm"
import { db, backgroundJobs, incidentMockSessions, incidentRunEvents, incidentRuns, isTerminalJobStatus } from "@repo/db"
import { startBackgroundJob } from "@/actions/(main)/workers/jobs.action"
import { randomBytes } from "node:crypto"
import { deleteRunFor } from "@/lib/incidents/report"
import { getIncidentCase } from "@/content/incidents/cases"
import { endRunFor, runStateFor, startRunFor, type RunState } from "@/lib/incidents/run"

/** Recorded runs from the player (plan/incidents INC-33, INC-34, INC-40). */

async function me() {
    const session = await getSession(await headers())
    return session?.user?.id ?? null
}

type Result<T> = { success: true; data: T } | { success: false; error: string; code?: string }

/** "Start and build my report": open a recorded run, with the consent stored verbatim. */
export async function startRun(slug: string): Promise<Result<RunState>> {
    const uid = await me()
    if (!uid) return { success: false, error: "Sign in to start a recorded run.", code: "AUTH" }
    if (!getIncidentCase(slug)) return { success: false, error: "Unknown case." }
    await startRunFor(uid, slug)
    return { success: true, data: await runStateFor(uid, slug) }
}

/** Stop recording (no report), or end this run before starting a new one. */
export async function endRun(slug: string): Promise<Result<RunState>> {
    const uid = await me()
    if (!uid) return { success: false, error: "Sign in first.", code: "AUTH" }
    await endRunFor(uid, slug)
    return { success: true, data: await runStateFor(uid, slug) }
}

export async function getRunState(slug: string): Promise<Result<RunState>> {
    const uid = await me()
    if (!uid) return { success: false, error: "Sign in first.", code: "AUTH" }
    return { success: true, data: await runStateFor(uid, slug) }
}

// ── The report (INC-37) ─────────────────────────────────────────────────────

/** Free, capped (plan/incidents overview, "Runs and the run report"). */
const REPORTS_PER_DAY = 2

export type ReportStatus =
    | { state: "not_ready"; reason: string }
    | { state: "reporting"; runId: string; jobId: string }
    | { state: "reported"; runId: string }
    | { state: "failed"; runId: string; error: string }
    | { state: "capped"; runId: string; error: string }

/**
 * Start the report for the open run: once its closing talk is finished. Safe to call
 * again (returns the job already running). Called by the player when the closing talk
 * is handed in, and by the report card on the last steps.
 */
export async function requestRunReport(slug: string): Promise<Result<ReportStatus>> {
    const uid = await me()
    if (!uid) return { success: false, error: "Sign in first.", code: "AUTH" }
    const run = await db.query.incidentRuns.findFirst({
        where: and(eq(incidentRuns.userId, uid), eq(incidentRuns.caseSlug, slug), inArray(incidentRuns.status, ["ACTIVE", "REPORTING", "FAILED"])),
        orderBy: [desc(incidentRuns.startedAt)],
    })
    if (!run) return { success: true, data: { state: "not_ready", reason: "Start a recorded run to get a report." } }
    if (run.status === "REPORTING" && run.reportJobId) return { success: true, data: { state: "reporting", runId: run.id, jobId: run.reportJobId } }
    return dispatchReport(uid, run.id, run.status)
}

/** Try again after a failed report. */
export async function retryRunReport(runId: string): Promise<Result<ReportStatus>> {
    const uid = await me()
    if (!uid) return { success: false, error: "Sign in first.", code: "AUTH" }
    const run = await db.query.incidentRuns.findFirst({ where: and(eq(incidentRuns.id, runId), eq(incidentRuns.userId, uid)) })
    if (!run || run.status !== "FAILED") return { success: false, error: "That report can't be retried." }
    return dispatchReport(uid, run.id, run.status)
}

async function dispatchReport(uid: string, runId: string, status: string): Promise<Result<ReportStatus>> {
    // The closing talk must be done: it is where the whole case comes together.
    const talks = await db.select({ payload: incidentRunEvents.payload }).from(incidentRunEvents)
        .where(and(eq(incidentRunEvents.runId, runId), eq(incidentRunEvents.kind, "talk"), eq(incidentRunEvents.itemId, "closing-talk")))
    const sessionIds = talks.map((t) => String((t.payload as { sessionId?: string }).sessionId ?? "")).filter(Boolean)
    const finished = sessionIds.length
        ? await db.select({ id: incidentMockSessions.id }).from(incidentMockSessions)
            .where(and(inArray(incidentMockSessions.id, sessionIds), eq(incidentMockSessions.status, "COMPLETED")))
        : []
    if (!finished.length) return { success: true, data: { state: "not_ready", reason: "Finish the closing talk to get your report." } }

    const day = new Date(); day.setUTCHours(0, 0, 0, 0)
    const today = await db.select({ id: incidentRuns.id }).from(incidentRuns)
        .where(and(eq(incidentRuns.userId, uid), isNotNull(incidentRuns.reportJobId), gte(incidentRuns.endedAt, day)))
    if (today.filter((r) => r.id !== runId).length >= REPORTS_PER_DAY) {
        return { success: true, data: { state: "capped", runId, error: `That's ${REPORTS_PER_DAY} reports today. This run is saved: get its report tomorrow.` } }
    }

    const started = await startBackgroundJob("incident_report", { runId }, { singleFlight: true, singleFlightKey: runId })
    if (!started.success || !started.jobId) return { success: false, error: started.error ?? "Could not start your report." }
    await db.update(incidentRuns).set({ status: "REPORTING", reportJobId: started.jobId, endedAt: new Date() })
        .where(and(eq(incidentRuns.id, runId), eq(incidentRuns.status, status as "ACTIVE" | "FAILED")))
    return { success: true, data: { state: "reporting", runId, jobId: started.jobId } }
}

/** Where a run's report stands. A failed job marks the run FAILED, so it can be retried. */
export async function followRunReport(runId: string): Promise<Result<ReportStatus>> {
    const uid = await me()
    if (!uid) return { success: false, error: "Sign in first.", code: "AUTH" }
    const run = await db.query.incidentRuns.findFirst({ where: and(eq(incidentRuns.id, runId), eq(incidentRuns.userId, uid)) })
    if (!run) return { success: false, error: "That run doesn't exist." }
    if (run.status === "REPORTED") return { success: true, data: { state: "reported", runId } }
    if (run.status === "FAILED") return { success: true, data: { state: "failed", runId, error: "The report didn't finish." } }
    if (run.status !== "REPORTING" || !run.reportJobId) return { success: true, data: { state: "not_ready", reason: "No report yet." } }
    const [job] = await db.select({ status: backgroundJobs.status, error: backgroundJobs.error }).from(backgroundJobs)
        .where(and(eq(backgroundJobs.jobId, run.reportJobId), eq(backgroundJobs.userId, uid)))
    if (job && isTerminalJobStatus(job.status) && job.status !== "completed") {
        await db.update(incidentRuns).set({ status: "FAILED" }).where(and(eq(incidentRuns.id, runId), eq(incidentRuns.status, "REPORTING")))
        return { success: true, data: { state: "failed", runId, error: job.error ?? "The report didn't finish." } }
    }
    return { success: true, data: { state: "reporting", runId, jobId: run.reportJobId } }
}

// ── Share and delete (INC-39, INC-44) ───────────────────────────────────────

/** Turn the public link on (a fresh random token) or off (the token is cleared, so the old link 404s). */
export async function setRunShared(runId: string, on: boolean): Promise<Result<{ token: string | null }>> {
    const uid = await me()
    if (!uid) return { success: false, error: "Sign in first.", code: "AUTH" }
    const token = on ? randomBytes(18).toString("base64url") : null
    const [row] = await db.update(incidentRuns).set({ shareToken: token, sharedAt: on ? new Date() : null })
        .where(and(eq(incidentRuns.id, runId), eq(incidentRuns.userId, uid), eq(incidentRuns.status, "REPORTED")))
        .returning({ id: incidentRuns.id })
    if (!row) return { success: false, error: "Only a finished report can be shared." }
    return { success: true, data: { token } }
}

/** Delete a run, its events and its talk transcripts. */
export async function deleteRun(runId: string): Promise<Result<{ slug: string }>> {
    const uid = await me()
    if (!uid) return { success: false, error: "Sign in first.", code: "AUTH" }
    const run = await db.query.incidentRuns.findFirst({ where: and(eq(incidentRuns.id, runId), eq(incidentRuns.userId, uid)), columns: { caseSlug: true } })
    if (!run || !(await deleteRunFor(uid, runId))) return { success: false, error: "That run doesn't exist." }
    return { success: true, data: { slug: run.caseSlug } }
}
