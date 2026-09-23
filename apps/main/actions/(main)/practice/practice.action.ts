"use server";

import { db, users, practiceProblem, practiceUserSession, practiceModuleProgress, practiceLeaderboard, backgroundJobs } from "@repo/db";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@repo/auth";
import { headers } from "next/headers";
import type {
    PracticeProblemListItem, PracticeProblemDetail, PracticeCategory,
    PracticeProgressData, PracticeLeaderboardEntry, PracticeUserStats,
    PracticeRecentSession, PracticeSessionData, PracticeChatMessage,
} from "@/types/practice";
import { MODULE_CONFIG } from "@/types/practice";
import { clientSafeJudge } from "@repo/db";
import { withCredits } from "@/lib/credits/charge";
import { startBackgroundJob } from "@/actions/(main)/workers/jobs.action";

// Re-export the PracticeModule and PracticeSessionStatus types from db schema enums
// for backward compatibility with callers that import from this file
type PracticeModule = "DSA" | "SYSTEM_DESIGN" | "WEB_FRONTEND" | "WEB_BACKEND";
type PracticeSessionStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
type PracticeMode = "EXAM" | "ASSIST";

// ─────────────────────────────────────────────
// PROBLEMS
// ─────────────────────────────────────────────

export async function getProblemsForModule(
    module: PracticeModule,
    category?: string
): Promise<PracticeProblemListItem[]> {
    const session = await getSession(headers());
    const userId = session?.user?.id;

    const problems = await db.query.practiceProblem.findMany({
        where: and(
            eq(practiceProblem.module, module),
            eq(practiceProblem.isActive, true),
            ...(category ? [eq(practiceProblem.category, category)] : [])
        ),
        orderBy: (p, { asc }) => [asc(p.category), asc(p.sortOrder)],
        columns: {
            id: true,
            slug: true,
            title: true,
            module: true,
            category: true,
            difficulty: true,
            tags: true,
            sortOrder: true,
            judgeStatus: true,
        },
        with: userId ? {
            sessions: {
                where: eq(practiceUserSession.userId, userId),
                columns: { status: true, bestScore: true },
                // A problem can have an EXAM row and an ASSIST row. Without an order
                // the list showed whichever the database handed back, so a solved
                // problem could read as not started. Completed first, then newest.
                orderBy: (s, { asc, desc }) => [asc(s.status), desc(s.updatedAt)],
                limit: 1,
            },
        } : undefined,
    });

    // `with` above is conditional on `userId`, so Drizzle types the row WITHOUT
    // `sessions` - it cannot know which branch ran. The runtime guard below was
    // already correct; it was `: any` on the callback that let `p.sessions`
    // compile at all. This narrows the type to match the guard instead, and the
    // session shape is DERIVED from the table rather than hand-written, so it
    // cannot drift from the columns actually selected.
    type ProblemSession = Pick<typeof practiceUserSession.$inferSelect, 'status' | 'bestScore'>;

    return problems.map((p) => {
        const sessions = (p as typeof p & { sessions?: ProblemSession[] }).sessions;
        const userSession = sessions && sessions.length > 0 ? sessions[0] : null;
        return {
            id: p.id,
            slug: p.slug,
            title: p.title,
            module: p.module,
            category: p.category,
            difficulty: p.difficulty,
            tags: p.tags,
            sortOrder: p.sortOrder,
            judgeStatus: p.judgeStatus,
            userStatus: userSession?.status ?? undefined,
            userBestScore: userSession?.bestScore ?? undefined,
        };
    });
}

export async function getProblemBySlug(slug: string): Promise<PracticeProblemDetail | null> {
    // `referenceSolution` is deliberately NOT selected. `harness` and
    // `judgeTests` are, but only so `clientSafeJudge` can derive the flags and
    // the sample subset; neither is returned. This object goes straight into a
    // client component, so nothing hidden may be spread into it (PD-4).
    const problem = await db.query.practiceProblem.findFirst({
        where: eq(practiceProblem.slug, slug),
        columns: {
            id: true,
            slug: true,
            title: true,
            description: true,
            module: true,
            category: true,
            difficulty: true,
            requirements: true,
            hints: true,
            starterCode: true,
            starterCss: true,
            testCases: true,
            tags: true,
            functionSignature: true,
            judgeStatus: true,
            judgeTests: true,
            harness: true,
        },
    });

    if (!problem) return null;

    const { functionSignature, judgeStatus, judgeTests, harness, ...rest } = problem;
    return {
        ...rest,
        testCases: problem.testCases as PracticeProblemDetail["testCases"],
        judge: clientSafeJudge({ functionSignature, judgeStatus, judgeTests, harness }),
    };
}

// ─────────────────────────────────────────────
// CATEGORIES (derived from problems)
// ─────────────────────────────────────────────

export async function getCategoriesForModule(module: PracticeModule): Promise<PracticeCategory[]> {
    const session = await getSession(headers());
    const userId = session?.user?.id;

    const problems = await db.query.practiceProblem.findMany({
        where: and(
            eq(practiceProblem.module, module),
            eq(practiceProblem.isActive, true)
        ),
        columns: { category: true },
        with: userId ? {
            sessions: {
                where: eq(practiceUserSession.userId, userId),
                columns: { status: true },
                orderBy: (s, { asc, desc }) => [asc(s.status), desc(s.updatedAt)],
                limit: 1,
            },
        } : undefined,
    });

    const categoryMap = new Map<string, { total: number; completed: number; inProgress: number }>();

    for (const p of problems) {
        const cat = p.category;
        if (!categoryMap.has(cat)) {
            categoryMap.set(cat, { total: 0, completed: 0, inProgress: 0 });
        }
        const entry = categoryMap.get(cat)!;
        entry.total++;

        if ("sessions" in p && Array.isArray(p.sessions) && p.sessions.length > 0) {
            const status = p.sessions[0]?.status;
            if (status === "COMPLETED") entry.completed++;
            else if (status === "IN_PROGRESS") entry.inProgress++;
        }
    }

    const categories = MODULE_CONFIG[module]?.categories ?? {};

    return Array.from(categoryMap.entries()).map(([slug, data]) => ({
        slug,
        name: categories[slug]?.name ?? slug,
        icon: categories[slug]?.icon ?? "📁",
        problemCount: data.total,
        completedCount: data.completed,
        inProgressCount: data.inProgress,
    }));
}

// ─────────────────────────────────────────────
// SESSIONS
// ─────────────────────────────────────────────

function toSessionData(row: typeof practiceUserSession.$inferSelect): PracticeSessionData {
    return {
        id: row.id,
        userId: row.userId,
        problemId: row.problemId,
        module: row.module,
        mode: row.mode,
        status: row.status,
        code: row.code,
        cssCode: row.cssCode,
        canvasData: row.canvasData,
        language: row.language,
        attempts: row.attempts,
        bestScore: row.bestScore,
        lastFeedback: row.lastFeedback,
        requirementsMet: row.requirementsMet as Record<string, boolean> | null,
        totalTimeSeconds: row.totalTimeSeconds,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        voiceUsed: row.voiceUsed,
        chatHistory: row.chatHistory as PracticeChatMessage[] | null,
        xpAwarded: row.xpAwarded,
        stage: row.status === "COMPLETED" ? "done" : row.stage,
    };
}

/**
 * The guided (DSA, ASSIST) session for a problem, WITHOUT creating one.
 *
 * A guided session is created only by `startGuidedSession`, which charges
 * `practice_set` (PD-10). The page renders the start card when this is null.
 */
export async function getGuidedSession(problemSlug: string): Promise<PracticeSessionData | null> {
    const session = await getSession(headers());
    if (!session?.user?.id) return null;
    const problem = await db.query.practiceProblem.findFirst({
        where: eq(practiceProblem.slug, problemSlug),
        columns: { id: true },
    });
    if (!problem) return null;
    const row = await db.query.practiceUserSession.findFirst({
        where: and(
            eq(practiceUserSession.userId, session.user.id),
            eq(practiceUserSession.problemId, problem.id),
            eq(practiceUserSession.mode, "ASSIST"),
        ),
    });
    return row ? toSessionData(row) : null;
}

export type StartGuidedResult =
    | { success: true; session: PracticeSessionData; charged: number }
    | { success: false; error: string; code?: string; required?: number; available?: number };

/**
 * Open a guided DSA session, charging `practice_set` once (PD-10).
 *
 * Reopening is free: an existing row is returned before anything is reserved.
 * The row is inserted INSIDE the credit hold, so when two clicks race past the
 * existence check, the loser's insert hits the unique index, its hold is
 * released, and only one charge settles. The price comes from the pricing
 * table (`plan/practice-dsa/overview.md` records the decision).
 */
export async function startGuidedSession(problemSlug: string): Promise<StartGuidedResult> {
    const session = await getSession(headers());
    if (!session?.user?.id) return { success: false, error: "Sign in to start practising." };
    const userId = session.user.id;

    const problem = await db.query.practiceProblem.findFirst({ where: eq(practiceProblem.slug, problemSlug) });
    if (!problem) return { success: false, error: "That problem does not exist." };
    if (problem.module !== "DSA") return { success: false, error: "Guided sessions are for DSA problems." };
    if (problem.judgeStatus !== "ready") return { success: false, error: "This problem's tests are still being prepared." };

    const findExisting = () => db.query.practiceUserSession.findFirst({
        where: and(
            eq(practiceUserSession.userId, userId),
            eq(practiceUserSession.problemId, problem.id),
            eq(practiceUserSession.mode, "ASSIST"),
        ),
    });
    const existing = await findExisting();
    if (existing) return { success: true, session: toSessionData(existing), charged: 0 };

    const opensInCpp = Boolean(problem.harness?.cpp);
    const result = await withCredits(
        { userId, operation: "practice_set", reason: `Guided DSA: ${problem.title}` },
        async () => {
            const [created] = await db.insert(practiceUserSession).values({
                userId,
                problemId: problem.id,
                module: problem.module,
                mode: "ASSIST",
                code: problem.starterCode ?? "",
                cssCode: problem.starterCss ?? "",
                language: opensInCpp ? "cpp" : "javascript",
                paidAt: new Date(),
            }).returning();
            if (!created) throw new Error("Could not start the session.");
            return created;
        },
    );

    if (!result.success) {
        // Lost a race: the other request created the row and paid. Use it.
        const raced = await findExisting();
        if (raced) return { success: true, session: toSessionData(raced), charged: 0 };
        return result;
    }
    return { success: true, session: toSessionData(result.data), charged: result.charged };
}

export async function getOrCreateSession(
    problemSlug: string,
    mode: "EXAM" | "ASSIST"
): Promise<PracticeSessionData | null> {
    const session = await getSession(headers());
    if (!session?.user?.id) return null;

    const userId = session.user.id;
    const problem = await db.query.practiceProblem.findFirst({ where: eq(practiceProblem.slug, problemSlug) });
    if (!problem) return null;

    const findExisting = () => db.query.practiceUserSession.findFirst({
        where: and(
            eq(practiceUserSession.userId, userId),
            eq(practiceUserSession.problemId, problem.id),
            eq(practiceUserSession.mode, mode)
        ),
    });

    const existing = await findExisting();
    if (existing) return toSessionData(existing);

    // A DSA problem with a C++ harness opens in C++ on its `class Solution`
    // starter: that is the language with tests (PD-5). Everything else keeps
    // the previous default.
    const opensInCpp = problem.module === "DSA" && problem.judgeStatus === "ready" && Boolean(problem.harness?.cpp);
    /*
     * ON CONFLICT DO NOTHING, then read the winner.
     *
     * Checking and then inserting is a race, and this one fired in practice: opening
     * a problem renders the page more than once (a prefetch, a dev double render, a
     * second tab), both renders saw no row, both inserted, and the loser crashed the
     * page on `uq_practice_user_session_user_id_problem_id_mode`. A reload then
     * worked, because by then the row existed - which is exactly what a race looks
     * like from the outside.
     *
     * The unique index is the real guard; this makes the loser fetch the winner's
     * row instead of throwing.
     */
    const [created] = await db.insert(practiceUserSession).values({
        userId,
        problemId: problem.id,
        module: problem.module,
        mode,
        code: problem.starterCode ?? "",
        cssCode: problem.starterCss ?? "",
        language: opensInCpp ? "cpp" : "javascript",
    })
        .onConflictDoNothing({
            target: [practiceUserSession.userId, practiceUserSession.problemId, practiceUserSession.mode],
        })
        .returning();
    if (created) return toSessionData(created);

    // Someone else inserted it between the check and the insert.
    const winner = await findExisting();
    return winner ? toSessionData(winner) : null;
}

export async function saveSessionProgress(
    sessionId: string,
    data: {
        code?: string;
        cssCode?: string;
        canvasData?: unknown;
        language?: string;
        chatHistory?: PracticeChatMessage[];
        totalTimeSeconds?: number;
        /**
         * The `updatedAt` the client last saw. A save whose base is older than the
         * row is refused rather than applied: a second tab, or the judge's own write
         * during a Run, used to be clobbered by whichever autosave fired last.
         * Omitted means "write anyway", which is what a first save after load does.
         */
        baseUpdatedAt?: string | number | Date;
    }
): Promise<boolean> {
    const session = await getSession(headers());
    if (!session?.user?.id) return false;

    try {
        const base = data.baseUpdatedAt ? new Date(data.baseUpdatedAt) : null;
        const rows = await db.update(practiceUserSession)
            .set({
                ...(data.code !== undefined ? { code: data.code } : {}),
                ...(data.cssCode !== undefined ? { cssCode: data.cssCode } : {}),
                ...(data.canvasData !== undefined ? { canvasData: data.canvasData as object } : {}),
                ...(data.language !== undefined ? { language: data.language } : {}),
                // Ephemeral lines (the "welcome back" message) are display only.
                ...(data.chatHistory !== undefined ? { chatHistory: data.chatHistory.filter((m) => !m.ephemeral) as object[] } : {}),
                ...(data.totalTimeSeconds !== undefined ? { totalTimeSeconds: data.totalTimeSeconds } : {}),
            })
            .where(and(
                eq(practiceUserSession.id, sessionId),
                eq(practiceUserSession.userId, session.user.id),
                // Conditional on the row not having moved since the client read it.
                ...(base && !Number.isNaN(base.getTime())
                    ? [sql`${practiceUserSession.updatedAt} <= ${base}`]
                    : []),
            ))
            .returning({ id: practiceUserSession.id });
        // No row means somebody else wrote first; the caller keeps its changes and
        // tries again on the next tick rather than overwriting newer work.
        return rows.length > 0;
    } catch (error: unknown) {
        console.error("[saveSessionProgress] failed:", error);
        return false;
    }
}

/** The most XP one assessment may add. The generous end of what `assess.action.ts`
 *  can compute, so an honest run is never capped and a forged one is. */
const MAX_ASSESS_XP = 120;

/**
 * How long ago this session was last assessed, in milliseconds, or null when it
 * never has been. Server only, like `persistAssessment` beside it.
 */
export async function recentAssessment(userId: string, problemSlug: string, mode: PracticeMode): Promise<number | null> {
    const problem = await db.query.practiceProblem.findFirst({
        where: eq(practiceProblem.slug, problemSlug),
        columns: { id: true },
    });
    if (!problem) return null;
    const row = await db.query.practiceUserSession.findFirst({
        where: and(
            eq(practiceUserSession.userId, userId),
            eq(practiceUserSession.problemId, problem.id),
            eq(practiceUserSession.mode, mode)
        ),
        columns: { attempts: true, updatedAt: true },
    });
    if (!row || row.attempts === 0 || !row.updatedAt) return null;
    return Date.now() - row.updatedAt.getTime();
}

/**
 * Write an assessment's result to the session (PD-18).
 *
 * Called by `assessPracticeWork`, which computed the score and the XP itself and
 * is the only caller that may. It is NOT a server action: there is no "use
 * server" export path to it, so the browser cannot reach it, which is the whole
 * point - the numbers used to be relayed through the client and a hand-made call
 * could mint XP.
 */
export async function persistAssessment(input: {
    userId: string;
    problemSlug: string;
    mode: PracticeMode;
    score: number;
    feedback: string;
    requirementsMet: Record<string, boolean>;
    xpAwarded: number;
}): Promise<boolean> {
    try {
        const problem = await db.query.practiceProblem.findFirst({
            where: eq(practiceProblem.slug, input.problemSlug),
            columns: { id: true, module: true },
        });
        if (!problem) return false;

        const current = await db.query.practiceUserSession.findFirst({
            where: and(
                eq(practiceUserSession.userId, input.userId),
                eq(practiceUserSession.problemId, problem.id),
                eq(practiceUserSession.mode, input.mode)
            ),
        });
        if (!current) return false;

        const score = Math.min(100, Math.max(0, Math.round(input.score)));
        const xp = Math.min(MAX_ASSESS_XP, Math.max(0, Math.round(input.xpAwarded)));
        const met = Object.values(input.requirementsMet ?? {});
        const allMet = met.length > 0 && met.every(Boolean);
        const newStatus: PracticeSessionStatus = allMet && score >= 80 ? "COMPLETED" : "IN_PROGRESS";

        await db.update(practiceUserSession)
            .set({
                attempts: sql`${practiceUserSession.attempts} + 1`,
                bestScore: Math.max(current.bestScore, score),
                lastFeedback: input.feedback,
                requirementsMet: input.requirementsMet,
                status: newStatus,
                xpAwarded: sql`${practiceUserSession.xpAwarded} + ${xp}`,
                ...(newStatus === "COMPLETED" ? { completedAt: new Date() } : {}),
            })
            .where(eq(practiceUserSession.id, current.id));

        if (newStatus === "COMPLETED" && current.status !== "COMPLETED") {
            await updateModuleProgress(input.userId, current.module, current.problemId);
        }
        return true;
    } catch (error: unknown) {
        console.error("[persistAssessment] failed:", error);
        return false;
    }
}

// ─────────────────────────────────────────────
// GUIDED COMPLETION (DSA, ASSIST; plan/practice-dsa PD-13)
// ─────────────────────────────────────────────

/**
 * Finish a guided session: move it to `done` and dispatch `practice_reflect`,
 * which writes the closing feedback. Allowed once every test has passed at
 * least once, so a user stuck before the optimal solution can still close the
 * problem (at a lower score). Returns the job to await.
 */
export async function finishGuidedSession(sessionId: string): Promise<{ success: true; jobId: string } | { success: false; error: string }> {
    const session = await getSession(headers());
    if (!session?.user?.id) return { success: false, error: "Not signed in." };
    const row = await db.query.practiceUserSession.findFirst({
        where: and(eq(practiceUserSession.id, sessionId), eq(practiceUserSession.userId, session.user.id)),
        columns: { id: true, module: true, mode: true, mentorState: true, status: true },
    });
    if (!row || row.module !== "DSA" || row.mode !== "ASSIST") return { success: false, error: "That guided session does not exist." };
    const state = row.mentorState;
    const passed = Boolean(state && (state.testsPassedAt.length > 0 || state.lastSubmit?.passed));
    if (!passed) return { success: false, error: "Get every test passing first, then you can finish." };

    /*
     * The stage is NOT moved here.
     *
     * It used to be written to "done" before the reflect job ran, so a job that
     * failed, or a tab closed while it ran, left a session reading "done" with
     * status still IN_PROGRESS: the Finish button was gone (it needs optimise or
     * reflect), no XP had been awarded, and there was no way back. The stage now
     * moves in `applyGuidedCompletion`, which runs when the job has actually
     * produced the closing feedback.
     */
    const job = await startBackgroundJob("practice_reflect", { sessionId }, { cost: 0 });
    if (!job.success || !job.jobId) return { success: false, error: job.error ?? "Could not finish the session." };
    return { success: true, jobId: job.jobId };
}

/**
 * Apply a finished `practice_reflect` job: mark the session completed, record
 * the score and feedback, and award XP through the one existing path. The
 * result is read from the job row on the server, never taken from the client,
 * and the completion is conditional on the session not being completed yet,
 * so XP is awarded once however often this is called.
 */
export async function applyGuidedCompletion(sessionId: string, jobId: string): Promise<
    { success: true; score: number; feedback: string; firstCompletion: boolean } | { success: false; error: string }
> {
    const session = await getSession(headers());
    if (!session?.user?.id) return { success: false, error: "Not signed in." };
    const userId = session.user.id;

    const [job] = await db
        .select({ status: backgroundJobs.status, type: backgroundJobs.type, input: backgroundJobs.input, result: backgroundJobs.result })
        .from(backgroundJobs)
        .where(and(eq(backgroundJobs.jobId, jobId), eq(backgroundJobs.userId, userId)))
        .limit(1);
    const input = job?.input as { sessionId?: string } | undefined;
    if (!job || job.type !== "practice_reflect" || input?.sessionId !== sessionId) return { success: false, error: "That review does not belong to this session." };
    if (job.status !== "completed") return { success: false, error: "The review has not finished yet." };
    const result = job.result as { score?: number; feedback?: string; requirementsMet?: Record<string, boolean> } | null;
    if (!result || typeof result.score !== "number" || typeof result.feedback !== "string") return { success: false, error: "The review came back incomplete." };

    const current = await db.query.practiceUserSession.findFirst({
        where: and(eq(practiceUserSession.id, sessionId), eq(practiceUserSession.userId, userId)),
        columns: { id: true, module: true, problemId: true, bestScore: true },
    });
    if (!current) return { success: false, error: "That session no longer exists." };

    const [updated] = await db
        .update(practiceUserSession)
        .set({
            status: "COMPLETED",
            stage: "done",
            completedAt: new Date(),
            bestScore: Math.max(current.bestScore, result.score),
            lastFeedback: result.feedback,
            requirementsMet: result.requirementsMet ?? {},
            attempts: sql`${practiceUserSession.attempts} + 1`,
        })
        .where(and(eq(practiceUserSession.id, sessionId), sql`${practiceUserSession.status} <> 'COMPLETED'`))
        .returning({ id: practiceUserSession.id });

    if (updated) await updateModuleProgress(userId, current.module, current.problemId);
    return { success: true, score: result.score, feedback: result.feedback, firstCompletion: Boolean(updated) };
}

// ─────────────────────────────────────────────
// PROGRESS
// ─────────────────────────────────────────────

async function updateModuleProgress(userId: string, module: PracticeModule, completedProblemId: string) {
    const problem = await db.query.practiceProblem.findFirst({ where: eq(practiceProblem.id, completedProblemId) });
    if (!problem) return;

    const difficultyXP: Record<string, number> = { EASY: 25, MEDIUM: 50, HARD: 100 };
    const xp = difficultyXP[problem.difficulty] ?? 25;

    const diffKey = `${problem.difficulty.toLowerCase()}Completed` as keyof typeof practiceModuleProgress;

    /*
     * ON CONFLICT, not check-then-insert.
     *
     * Two completions landing together on a user with no progress row both saw
     * "no row" and both inserted, and the loser threw on
     * `uq_practice_module_progress_user_id_module` - after the session had already
     * been marked complete, so the user lost the XP and saw an error. The unique
     * index is the guard; the upsert increments whichever way it lands.
     */
    await db.insert(practiceModuleProgress)
        .values({
            userId,
            module,
            completed: 1,
            totalXP: xp,
            lastPracticedAt: new Date(),
            currentStreak: 1,
            longestStreak: 1,
            [diffKey]: 1,
        })
        .onConflictDoUpdate({
            target: [practiceModuleProgress.userId, practiceModuleProgress.module],
            set: {
                completed: sql`${practiceModuleProgress.completed} + 1`,
                totalXP: sql`${practiceModuleProgress.totalXP} + ${xp}`,
                lastPracticedAt: new Date(),
                [diffKey]: sql`${(practiceModuleProgress as unknown as Record<string, unknown>)[diffKey]} + 1`,
            },
        });

    // Calculate streak
    const streakProgress = await db.query.practiceModuleProgress.findFirst({
        where: and(
            eq(practiceModuleProgress.userId, userId),
            eq(practiceModuleProgress.module, module)
        ),
    });
    if (streakProgress) {
        const lastPracticed = streakProgress.lastPracticedAt;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let newStreak = streakProgress.currentStreak;
        if (lastPracticed) {
            const lastDate = new Date(lastPracticed.getFullYear(), lastPracticed.getMonth(), lastPracticed.getDate());
            const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                newStreak = streakProgress.currentStreak + 1;
            } else if (diffDays > 1) {
                newStreak = 1;
            }
        } else {
            newStreak = 1;
        }

        const newLongest = Math.max(streakProgress.longestStreak, newStreak);

        await db.update(practiceModuleProgress)
            .set({ currentStreak: newStreak, longestStreak: newLongest })
            .where(eq(practiceModuleProgress.id, streakProgress.id));
    }

    // Update leaderboard
    const progress = await db.query.practiceModuleProgress.findFirst({
        where: and(
            eq(practiceModuleProgress.userId, userId),
            eq(practiceModuleProgress.module, module)
        ),
    });
    if (progress) {
        // Same shape as the progress upsert above, and for the same reason.
        await db.insert(practiceLeaderboard)
            .values({
                userId,
                module,
                totalXP: progress.totalXP,
                completed: progress.completed,
                averageScore: progress.averageScore,
                streak: progress.currentStreak,
            })
            .onConflictDoUpdate({
                target: [practiceLeaderboard.userId, practiceLeaderboard.module],
                set: {
                    totalXP: progress.totalXP,
                    completed: progress.completed,
                    averageScore: progress.averageScore,
                    streak: progress.currentStreak,
                },
            });
    }

    // Award XP to user
    await db.update(users)
        .set({
            currentXp: sql`${users.currentXp} + ${xp}`,
            totalXp: sql`${users.totalXp} + ${xp}`,
        })
        .where(eq(users.id, userId));
}

export async function getModuleProgress(module: PracticeModule): Promise<PracticeProgressData | null> {
    const session = await getSession(headers());
    if (!session?.user?.id) return null;

    const progress = await db.query.practiceModuleProgress.findFirst({
        where: and(
            eq(practiceModuleProgress.userId, session.user.id),
            eq(practiceModuleProgress.module, module)
        ),
    });

    const totalProblemsArr = await db.select({ count: sql<number>`count(*)` })
        .from(practiceProblem)
        .where(and(eq(practiceProblem.module, module), eq(practiceProblem.isActive, true)));
    const totalProblems = Number(totalProblemsArr[0]?.count ?? 0);

    if (!progress) {
        return {
            module,
            totalProblems,
            completed: 0,
            inProgress: 0,
            totalXP: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastPracticedAt: null,
            easyCompleted: 0,
            mediumCompleted: 0,
            hardCompleted: 0,
            averageScore: 0,
        };
    }

    const inProgressArr = await db.select({ count: sql<number>`count(*)` })
        .from(practiceUserSession)
        .where(and(
            eq(practiceUserSession.userId, session.user.id),
            eq(practiceUserSession.module, module),
            eq(practiceUserSession.status, "IN_PROGRESS")
        ));
    const inProgress = Number(inProgressArr[0]?.count ?? 0);

    return {
        module,
        totalProblems,
        completed: progress.completed,
        inProgress,
        totalXP: progress.totalXP,
        currentStreak: progress.currentStreak,
        longestStreak: progress.longestStreak,
        lastPracticedAt: progress.lastPracticedAt,
        easyCompleted: progress.easyCompleted,
        mediumCompleted: progress.mediumCompleted,
        hardCompleted: progress.hardCompleted,
        averageScore: progress.averageScore,
    };
}

// ─────────────────────────────────────────────
// DAILY CHALLENGE
// ─────────────────────────────────────────────

export async function getDailyChallenge(): Promise<{
    problem: {
        slug: string;
        title: string;
        module: PracticeModule;
        difficulty: "EASY" | "MEDIUM" | "HARD";
        category: string;
    } | null;
}> {
    try {
        const today = new Date();
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

        const problems = await db.query.practiceProblem.findMany({
            where: eq(practiceProblem.isActive, true),
            columns: { slug: true, title: true, module: true, difficulty: true, category: true },
        });

        if (problems.length === 0) return { problem: null };

        const index = seed % problems.length;
        const p = problems[index]!;
        return {
            problem: {
                slug: p.slug,
                title: p.title,
                module: p.module as PracticeModule,
                difficulty: p.difficulty as "EASY" | "MEDIUM" | "HARD",
                category: p.category,
            },
        };
    } catch {
        return { problem: null };
    }
}

// ─────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────

export async function getLeaderboard(
    module: PracticeModule,
    limit: number = 25
): Promise<PracticeLeaderboardEntry[]> {
    const entries = await db.query.practiceLeaderboard.findMany({
        where: eq(practiceLeaderboard.module, module),
        orderBy: (lb, { desc }) => [desc(lb.totalXP)],
        limit,
        with: {
            user: {
                columns: { name: true, image: true },
            },
        },
    });

    return entries.map((e, i) => ({
        rank: i + 1,
        userId: e.userId,
        userName: e.user.name,
        userImage: e.user.image,
        totalXP: e.totalXP,
        completed: e.completed,
        averageScore: e.averageScore,
        streak: e.streak,
    }));
}

// ─────────────────────────────────────────────
// USER STATS (Dashboard)
// ─────────────────────────────────────────────

export async function getUserPracticeStats(): Promise<PracticeUserStats | null> {
    const session = await getSession(headers());
    if (!session?.user?.id) return null;

    const userId = session.user.id;

    const [modules, sessions, attemptedRows] = await Promise.all([
        db.query.practiceModuleProgress.findMany({ where: eq(practiceModuleProgress.userId, userId) }),
        db.query.practiceUserSession.findMany({
            where: eq(practiceUserSession.userId, userId),
            orderBy: (s, { desc }) => [desc(s.updatedAt)],
            limit: 10,
            with: {
                problem: {
                    columns: { title: true, slug: true, category: true, difficulty: true, module: true },
                },
            },
        }),
        // How many problems this user has actually attempted. The list above is the
        // recent ten, and counting it said "10 attempted" forever.
        db.select({ n: sql<number>`count(*)::int` })
            .from(practiceUserSession)
            .where(eq(practiceUserSession.userId, userId)),
    ]);

    const totalSolved = modules.reduce((acc, m) => acc + m.completed, 0);
    const totalXP = modules.reduce((acc, m) => acc + m.totalXP, 0);
    const longestStreak = Math.max(0, ...modules.map((m) => m.longestStreak));
    const currentStreak = Math.max(0, ...modules.map((m) => m.currentStreak));
    const avgScore = modules.length > 0
        ? Math.round(modules.reduce((acc, m) => acc + m.averageScore, 0) / modules.length)
        : 0;

    const [easyTotalArr, mediumTotalArr, hardTotalArr] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(practiceProblem).where(and(eq(practiceProblem.isActive, true), eq(practiceProblem.difficulty, "EASY"))),
        db.select({ count: sql<number>`count(*)` }).from(practiceProblem).where(and(eq(practiceProblem.isActive, true), eq(practiceProblem.difficulty, "MEDIUM"))),
        db.select({ count: sql<number>`count(*)` }).from(practiceProblem).where(and(eq(practiceProblem.isActive, true), eq(practiceProblem.difficulty, "HARD"))),
    ]);

    const easyTotal = Number(easyTotalArr[0]?.count ?? 0);
    const mediumTotal = Number(mediumTotalArr[0]?.count ?? 0);
    const hardTotal = Number(hardTotalArr[0]?.count ?? 0);
    const easyCompleted = modules.reduce((acc, m) => acc + m.easyCompleted, 0);
    const mediumCompleted = modules.reduce((acc, m) => acc + m.mediumCompleted, 0);
    const hardCompleted = modules.reduce((acc, m) => acc + m.hardCompleted, 0);

    const [dsaCountArr, sdCountArr, wfCountArr, wbCountArr] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(practiceProblem).where(and(eq(practiceProblem.module, "DSA"), eq(practiceProblem.isActive, true))),
        db.select({ count: sql<number>`count(*)` }).from(practiceProblem).where(and(eq(practiceProblem.module, "SYSTEM_DESIGN"), eq(practiceProblem.isActive, true))),
        db.select({ count: sql<number>`count(*)` }).from(practiceProblem).where(and(eq(practiceProblem.module, "WEB_FRONTEND"), eq(practiceProblem.isActive, true))),
        db.select({ count: sql<number>`count(*)` }).from(practiceProblem).where(and(eq(practiceProblem.module, "WEB_BACKEND"), eq(practiceProblem.isActive, true))),
    ]);

    const moduleProblemCounts: Record<string, number> = {
        DSA: Number(dsaCountArr[0]?.count ?? 0),
        SYSTEM_DESIGN: Number(sdCountArr[0]?.count ?? 0),
        WEB_FRONTEND: Number(wfCountArr[0]?.count ?? 0),
        WEB_BACKEND: Number(wbCountArr[0]?.count ?? 0),
    };

    const moduleBreakdown: PracticeProgressData[] = (["DSA", "SYSTEM_DESIGN", "WEB_FRONTEND", "WEB_BACKEND"] as PracticeModule[]).map((mod) => {
        const m = modules.find((mp) => mp.module === mod);
        return {
            module: mod,
            totalProblems: moduleProblemCounts[mod] ?? 0,
            completed: m?.completed ?? 0,
            inProgress: m?.inProgress ?? 0,
            totalXP: m?.totalXP ?? 0,
            currentStreak: m?.currentStreak ?? 0,
            longestStreak: m?.longestStreak ?? 0,
            lastPracticedAt: m?.lastPracticedAt ?? null,
            easyCompleted: m?.easyCompleted ?? 0,
            mediumCompleted: m?.mediumCompleted ?? 0,
            hardCompleted: m?.hardCompleted ?? 0,
            averageScore: m?.averageScore ?? 0,
        };
    });

    const recentSessions: PracticeRecentSession[] = sessions.map((s) => ({
        problemTitle: s.problem.title,
        problemSlug: s.problem.slug,
        module: s.problem.module,
        category: s.problem.category,
        difficulty: s.problem.difficulty,
        bestScore: s.bestScore,
        status: s.status,
        updatedAt: s.updatedAt,
    }));

    return {
        totalSolved,
        totalAttempted: attemptedRows[0]?.n ?? 0,
        totalXP,
        currentStreak,
        longestStreak,
        averageScore: avgScore,
        moduleBreakdown,
        recentSessions,
        difficultyBreakdown: {
            easy: { total: easyTotal, completed: easyCompleted },
            medium: { total: mediumTotal, completed: mediumCompleted },
            hard: { total: hardTotal, completed: hardCompleted },
        },
    };
}
