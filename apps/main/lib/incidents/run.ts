import "server-only"
import { and, asc, desc, eq } from "drizzle-orm"
import { db, incidentRuns, incidentRunEvents } from "@repo/db"
import type { Progress } from "@/components/incidents/case-progress"

/**
 * Recorded runs (plan/incidents INC-33). A run exists only when the reader agreed at the
 * start; every helper here is a no-op without one, so "Just read" stores nothing.
 */

/** The words the reader agrees to, stored verbatim on the run. */
export const RUN_CONSENT =
    "Keep my check and quiz answers, the questions I ask the lead with its answers, and the transcripts of my talks in this case, to build my report. I can delete the run and its report at any time."

export type RunEventKind = "check" | "quiz" | "ask" | "talk" | "step"

export async function activeRun(userId: string, slug: string) {
    return db.query.incidentRuns.findFirst({
        where: and(eq(incidentRuns.userId, userId), eq(incidentRuns.caseSlug, slug), eq(incidentRuns.status, "ACTIVE")),
        orderBy: [desc(incidentRuns.startedAt)],
    })
}

/** Append to the active run, if there is one. Never throws: a lost event must not fail the action. */
export async function addRunEvent(userId: string, slug: string, kind: RunEventKind, itemId: string, payload: Record<string, unknown>) {
    try {
        const run = await activeRun(userId, slug)
        if (!run) return null
        const [row] = await db.insert(incidentRunEvents).values({ runId: run.id, kind, itemId, payload }).returning({ id: incidentRunEvents.id })
        return row?.id ?? null
    } catch (error: unknown) {
        console.error("[incidents] run event not saved:", error instanceof Error ? error.message : error)
        return null
    }
}

/** Open a recorded run; returns the existing one if the reader already has it open. */
export async function startRunFor(userId: string, slug: string) {
    const open = await activeRun(userId, slug)
    if (open) return open
    try {
        const [row] = await db.insert(incidentRuns).values({ userId, caseSlug: slug, consentText: RUN_CONSENT }).returning()
        return row!
    } catch {
        // Two tabs raced past the check; the partial unique index let only one in.
        return (await activeRun(userId, slug))!
    }
}

/** Close the active run without a report (a retake, or the reader stopping recording). */
export async function endRunFor(userId: string, slug: string) {
    await db.update(incidentRuns).set({ status: "ENDED", endedAt: new Date() })
        .where(and(eq(incidentRuns.userId, userId), eq(incidentRuns.caseSlug, slug), eq(incidentRuns.status, "ACTIVE")))
}

/** What the player needs: the open run and what it already holds, and past runs. */
export async function runStateFor(userId: string, slug: string) {
    const runs = await db.query.incidentRuns.findMany({
        where: and(eq(incidentRuns.userId, userId), eq(incidentRuns.caseSlug, slug)),
        orderBy: [desc(incidentRuns.startedAt)],
        columns: { id: true, status: true, startedAt: true, endedAt: true, reportedAt: true, report: true },
    })
    const active = runs.find((r) => r.status === "ACTIVE") ?? null
    const events = active
        ? await db.select({ id: incidentRunEvents.id, kind: incidentRunEvents.kind, itemId: incidentRunEvents.itemId, payload: incidentRunEvents.payload })
            .from(incidentRunEvents).where(eq(incidentRunEvents.runId, active.id)).orderBy(asc(incidentRunEvents.createdAt))
        : []
    return {
        active: active ? { id: active.id, startedAt: active.startedAt.toISOString() } : null,
        /** Answers given in this run, in the ledger's terms, so a retake starts blank. */
        answers: events.filter((e) => e.kind === "check" || e.kind === "quiz" || e.kind === "step")
            .map((e) => ({ ledger: String(e.payload.ledger ?? e.kind), itemId: e.itemId, value: (e.payload.value as string | null) ?? null })),
        /** The lead thread (INC-48): questions and answers in this run, oldest first. */
        asks: events.filter((e) => e.kind === "ask").map((e) => ({ id: e.id, question: String(e.payload.question ?? ""), answer: String(e.payload.answer ?? "") })),
        past: runs.filter((r) => r.status !== "ACTIVE").map((r) => ({
            id: r.id, status: r.status, startedAt: r.startedAt.toISOString(), reportedAt: r.reportedAt?.toISOString() ?? null,
            bands: r.report?.bands.map((b) => ({ skill: b.skill, band: b.band })) ?? null,
        })),
    }
}
export type RunState = Awaited<ReturnType<typeof runStateFor>>

/**
 * The player's progress during a run: everything read or explored stays (the ledger),
 * but answers and steps are this run's alone, so a retake is answered afresh.
 */
export function withRun(base: Progress, state: RunState): Progress {
    if (!state.active) return base
    const p: Progress = { ...base, predictions: {}, round: {}, checks: {}, stepsDone: [] }
    for (const a of state.answers) {
        if (a.ledger === "prediction" && a.value) p.predictions[a.itemId] = a.value
        else if (a.ledger === "round" && a.value) p.round[a.itemId] = a.value
        else if (a.ledger === "step") p.stepsDone.push(a.itemId)
        else if (a.ledger === "check" && a.value) {
            try { p.checks[a.itemId] = JSON.parse(a.value) } catch { /* skipped */ }
        }
    }
    return p
}
