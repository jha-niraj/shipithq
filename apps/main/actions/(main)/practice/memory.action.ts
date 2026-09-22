"use server"

import { and, eq } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import {
    db, practiceLearnerProfile, practiceUserSession,
    type DeletedConcept, type LearnerConcept, type LearnerMistake,
} from "@repo/db"
import { startBackgroundJob, type StartJobResult } from "@/actions/(main)/workers/jobs.action"

// ─────────────────────────────────────────────────────────────────────────────
// The mentor's memory, from the app's side (plan/practice-dsa PD-8, PD-9):
// asking for a consolidation, reading the learner profile, and letting the
// user delete what the mentor knows about them.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consolidate the saved transcript into memory. Called by the workspace AFTER
 * it has saved the chat, when a stage moves. Free, and single-flight per user:
 * a second request while one runs is returned the running job, and the next
 * stage change picks up whatever that one missed (the watermark makes it safe).
 */
export async function requestMemoryUpdate(sessionId: string): Promise<StartJobResult> {
    const session = await getSession(await headers())
    if (!session?.user?.id) return { success: false, error: "Not signed in." }
    const [row] = await db
        .select({ id: practiceUserSession.id })
        .from(practiceUserSession)
        .where(and(eq(practiceUserSession.id, sessionId), eq(practiceUserSession.userId, session.user.id)))
        .limit(1)
    if (!row) return { success: false, error: "That practice session no longer exists." }
    return startBackgroundJob("practice_memory_update", { sessionId }, { cost: 0, singleFlight: true })
}

export interface LearnerProfileView {
    concepts: LearnerConcept[]
    mistakes: LearnerMistake[]
}

export async function getLearnerProfile(): Promise<LearnerProfileView | null> {
    const session = await getSession(await headers())
    if (!session?.user?.id) return null
    const row = await db.query.practiceLearnerProfile.findFirst({
        where: and(eq(practiceLearnerProfile.userId, session.user.id), eq(practiceLearnerProfile.module, "DSA")),
        columns: { concepts: true, mistakes: true },
    })
    return { concepts: row?.concepts ?? [], mistakes: row?.mistakes ?? [] }
}

/**
 * Delete one concept or mistake from what the mentor knows. The slug is also
 * recorded in `deletedSlugs` with the time, so a consolidation of an older
 * window never brings it back (PD-8's merge rule).
 */
export async function deleteLearnerEntry(kind: "concept" | "mistake", slug: string): Promise<{ success: boolean; error?: string }> {
    const session = await getSession(await headers())
    if (!session?.user?.id) return { success: false, error: "Not signed in." }
    const row = await db.query.practiceLearnerProfile.findFirst({
        where: and(eq(practiceLearnerProfile.userId, session.user.id), eq(practiceLearnerProfile.module, "DSA")),
    })
    if (!row) return { success: false, error: "There is nothing to delete." }

    const deleted: DeletedConcept[] = [...row.deletedSlugs.filter((d) => d.slug !== slug), { slug, deletedAt: new Date().toISOString() }]
    await db
        .update(practiceLearnerProfile)
        .set(kind === "concept"
            ? { concepts: row.concepts.filter((c) => c.slug !== slug), deletedSlugs: deleted }
            : { mistakes: row.mistakes.filter((m) => m.slug !== slug), deletedSlugs: deleted })
        .where(eq(practiceLearnerProfile.id, row.id))
    return { success: true }
}
