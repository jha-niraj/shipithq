"use server"

import { db, moduleOnboarding, users, type OnboardingTurn } from "@repo/db"
import { and, desc, eq, sql } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { isOnboardingModuleKey, type OnboardingModuleKey } from "@/lib/onboarding/modules"
import { checkAnswer, openCount } from "@/lib/onboarding/guards"
import type { OnboardingRunView, OnboardingState } from "@/types/onboarding"
import { toErrorMessage } from "@/lib/errors"

// ─────────────────────────────────────────────────────────────────────────────
// The lifecycle of an onboarding run: find the current one, start one, answer
// a turn, reopen an earlier turn. Generating the next question is NOT here; it
// is a route handler (`/api/onboarding/next`) because it calls a model and the
// user is watching the question slot. Decision in plan/module-onboarding.
//
// Every write is scoped to the signed-in user. A run id on its own must not let
// anyone read or answer someone else's onboarding.
// ─────────────────────────────────────────────────────────────────────────────

type Row = typeof moduleOnboarding.$inferSelect

export type OnboardingActionResult =
    | { success: true; run: OnboardingRunView }
    | { success: false; error: string }

function toView(row: Row): OnboardingRunView {
    return {
        id: row.id,
        moduleKey: row.moduleKey as OnboardingModuleKey,
        version: row.version,
        status: row.status === "completed" ? "completed" : "in_progress",
        turns: row.turns ?? [],
        openQuestionCount: row.openQuestionCount,
        profile: row.profile ?? null,
        level: (row.level as OnboardingRunView["level"]) ?? null,
        startedAt: row.startedAt.toISOString(),
        completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    }
}

async function currentUserId(): Promise<string | null> {
    const session = await getSession(await headers())
    return session?.user?.id ?? null
}

/**
 * The latest completed run and any in-progress run for this user and module.
 * Both the gate (is there a completed run?) and the widget (what does it say?)
 * read this, so it is one query ordered by version.
 */
export async function getCurrentOnboarding(moduleKey: string): Promise<OnboardingState> {
    const empty: OnboardingState = { completed: null, inProgress: null }
    if (!isOnboardingModuleKey(moduleKey)) return empty
    const userId = await currentUserId()
    if (!userId) return empty

    const rows = await db.query.moduleOnboarding.findMany({
        where: and(eq(moduleOnboarding.userId, userId), eq(moduleOnboarding.moduleKey, moduleKey)),
        orderBy: [desc(moduleOnboarding.version)],
        limit: 4,
    })

    const completed = rows.find((r) => r.status === "completed") ?? null
    const inProgress = rows.find((r) => r.status === "in_progress") ?? null
    return {
        completed: completed ? toView(completed) : null,
        inProgress: inProgress ? toView(inProgress) : null,
    }
}

export async function getOnboardingRun(runId: string): Promise<OnboardingActionResult> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Not signed in." }
    const row = await db.query.moduleOnboarding.findFirst({
        where: and(eq(moduleOnboarding.id, runId), eq(moduleOnboarding.userId, userId)),
    })
    if (!row) return { success: false, error: "That onboarding no longer exists." }
    return { success: true, run: toView(row) }
}

/**
 * Start a run, or hand back the one already in progress.
 *
 * A retake is the same call: with no in-progress run it creates version
 * max + 1, and the previous completed version stays the current profile until
 * this one finishes (MO-6). Two Start clicks race on the unique index; the
 * loser re-reads and returns the winner's row instead of failing.
 */
export async function startOnboardingRun(moduleKey: string): Promise<OnboardingActionResult> {
    if (!isOnboardingModuleKey(moduleKey)) return { success: false, error: "Unknown module." }
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Not signed in." }

    const existing = await db.query.moduleOnboarding.findFirst({
        where: and(
            eq(moduleOnboarding.userId, userId),
            eq(moduleOnboarding.moduleKey, moduleKey),
            eq(moduleOnboarding.status, "in_progress"),
        ),
    })
    if (existing) return { success: true, run: toView(existing) }

    const [latest] = await db
        .select({ version: moduleOnboarding.version })
        .from(moduleOnboarding)
        .where(and(eq(moduleOnboarding.userId, userId), eq(moduleOnboarding.moduleKey, moduleKey)))
        .orderBy(desc(moduleOnboarding.version))
        .limit(1)
    const version = (latest?.version ?? 0) + 1

    try {
        const [created] = await db
            .insert(moduleOnboarding)
            .values({ userId, moduleKey, version })
            .returning()
        if (!created) return { success: false, error: "Could not start the onboarding." }
        return { success: true, run: toView(created) }
    } catch (error: unknown) {
        // Unique index hit: another request created this version first.
        const again = await db.query.moduleOnboarding.findFirst({
            where: and(
                eq(moduleOnboarding.userId, userId),
                eq(moduleOnboarding.moduleKey, moduleKey),
                eq(moduleOnboarding.status, "in_progress"),
            ),
        })
        if (again) return { success: true, run: toView(again) }
        return { success: false, error: toErrorMessage(error) }
    }
}

/**
 * Record the answer to the last turn. Only the last turn may be answered, and
 * only once; anything else is a stale client and gets the current run back as
 * the error path so it can resync.
 */
export async function answerOnboardingTurn(
    runId: string,
    index: number,
    values: string[],
    viaVoice: boolean,
): Promise<OnboardingActionResult> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Not signed in." }

    const row = await db.query.moduleOnboarding.findFirst({
        where: and(eq(moduleOnboarding.id, runId), eq(moduleOnboarding.userId, userId)),
    })
    if (!row) return { success: false, error: "That onboarding no longer exists." }
    if (row.status !== "in_progress") return { success: false, error: "This onboarding is already complete." }

    const turns = row.turns ?? []
    const last = turns[turns.length - 1]
    if (!last || last.index !== index) return { success: false, error: "That question is no longer current." }
    if (last.answer) return { success: true, run: toView(row) }

    const checked = checkAnswer(last, values)
    if (!checked.ok) return { success: false, error: checked.error }

    const answered: OnboardingTurn = {
        ...last,
        answer: { values: checked.values, viaVoice: Boolean(viaVoice) },
        answeredAt: new Date().toISOString(),
    }
    const nextTurns = [...turns.slice(0, -1), answered]

    // Conditional on the length we read: a concurrent reopen or append means the
    // row moved under us, and this answer belongs to a turn that no longer exists.
    const [updated] = await db
        .update(moduleOnboarding)
        .set({ turns: nextTurns, openQuestionCount: openCount(nextTurns) })
        .where(and(
            eq(moduleOnboarding.id, runId),
            sql`jsonb_array_length(${moduleOnboarding.turns}) = ${turns.length}`,
        ))
        .returning()
    if (!updated) return { success: false, error: "That question is no longer current." }
    return { success: true, run: toView(updated) }
}

/**
 * Go back to an earlier question. Everything after it was generated from its
 * answer, so it is discarded, not kept (MO-8). The turn keeps its question and
 * loses its answer; the client preselects the old answer from what it had.
 */
export async function reopenOnboardingTurn(runId: string, index: number): Promise<OnboardingActionResult> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Not signed in." }

    const row = await db.query.moduleOnboarding.findFirst({
        where: and(eq(moduleOnboarding.id, runId), eq(moduleOnboarding.userId, userId)),
    })
    if (!row) return { success: false, error: "That onboarding no longer exists." }
    if (row.status !== "in_progress") return { success: false, error: "Finished onboardings cannot be edited. Retake it instead." }

    const turns = row.turns ?? []
    const target = turns[index]
    if (!target) return { success: false, error: "That question does not exist." }
    if (index === turns.length - 1 && !target.answer) return { success: true, run: toView(row) }

    const reopened: OnboardingTurn = { ...target, answer: null, answeredAt: null }
    const nextTurns = [...turns.slice(0, index), reopened]

    const [updated] = await db
        .update(moduleOnboarding)
        .set({ turns: nextTurns, openQuestionCount: openCount(nextTurns) })
        .where(and(
            eq(moduleOnboarding.id, runId),
            sql`jsonb_array_length(${moduleOnboarding.turns}) = ${turns.length}`,
        ))
        .returning()
    if (!updated) return { success: false, error: "The onboarding changed. Reload and try again." }
    return { success: true, run: toView(updated) }
}

/** The stored profile columns the question prompt is seeded with. Server only. */
export async function getOnboardingPromptUser(userId: string) {
    const [u] = await db
        .select({
            name: users.name,
            university: users.university,
            semester: users.semester,
            learningPreferences: users.learningPreferences,
            interests: users.interests,
            careerGoals: users.careerGoals,
            targetCompanies: users.targetCompanies,
            occupation: users.occupation,
            workExperience: users.workExperience,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
    return u ?? null
}
