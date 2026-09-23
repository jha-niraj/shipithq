"use server"

import {
    db, users, practiceProblem, practiceUserSession, emptyMentorState, harnessFor, sampleTests,
    type JudgeRunRecord, type PracticeStage,
} from "@repo/db"
import { and, asc, eq, inArray } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { startBackgroundJob, type StartJobResult } from "@/actions/(main)/workers/jobs.action"
import { runAgainstTests } from "@/lib/practice/judge-run"
import type { PracticeJudgeResult } from "@/types/practice"

// ─────────────────────────────────────────────────────────────────────────────
// Judge assets for a DSA problem: dispatching their generation.
//
// Generation is free (the
// session charge in PD-10 covers it) and idempotent on the worker side: a
// `ready` problem is left alone.
// ─────────────────────────────────────────────────────────────────────────────

export async function requestJudgeAssets(problemId: string): Promise<StartJobResult> {
    const session = await getSession(await headers())
    if (!session?.user?.id) return { success: false, error: "Not signed in." }

    const [problem] = await db
        .select({ id: practiceProblem.id, module: practiceProblem.module, judgeStatus: practiceProblem.judgeStatus })
        .from(practiceProblem)
        .where(eq(practiceProblem.id, problemId))
        .limit(1)
    if (!problem) return { success: false, error: "That problem does not exist." }
    if (problem.module !== "DSA") return { success: false, error: "Only DSA problems have judge tests." }
    if (problem.judgeStatus === "ready") return { success: false, error: "This problem already has tests." }
    // Already running: a second dispatch is a second Durable Object doing the same
    // six model calls and container runs, and both write the same row.
    if (problem.judgeStatus === "generating") return { success: false, error: "Tests for this problem are already being prepared." }

    return startBackgroundJob("practice_tests_generate", { problemId }, { cost: 0 })
}

// ─────────────────────────────────────────────────────────────────────────────
// Run and Submit (PD-4).
//
// Both load the problem THROUGH the session row, so a user can only ever run
// against a problem they have a session for, and both read the harness and
// the tests on the server. Run executes sample tests; Submit executes sample
// plus hidden. The code and language are saved on the session on every call,
// and the outcome is recorded on `mentorState` so the mentor can react to it.
// ─────────────────────────────────────────────────────────────────────────────

type JudgeKind = "run" | "submit"

async function judge(sessionId: string, code: string, language: string, kind: JudgeKind): Promise<PracticeJudgeResult> {
    const fail = (message: string): PracticeJudgeResult => ({ status: "unavailable", kind, language, message })

    const session = await getSession(await headers())
    if (!session?.user?.id) return fail("Sign in to run your code.")
    if (typeof code !== "string" || !code.trim()) return fail("Write some code first.")
    if (code.length > 50_000) return fail("That is too much code for one solution.")

    const row = await db.query.practiceUserSession.findFirst({
        where: and(eq(practiceUserSession.id, sessionId), eq(practiceUserSession.userId, session.user.id)),
        columns: { id: true, stage: true, status: true, mentorState: true },
        with: {
            problem: {
                columns: { module: true, judgeStatus: true, harness: true, judgeTests: true },
            },
        },
    })
    if (!row) return fail("That practice session no longer exists.")
    if (row.problem.module !== "DSA") return fail("Only DSA problems have tests.")
    if (row.problem.judgeStatus !== "ready") return fail("This problem's tests are still being prepared.")

    const harness = harnessFor(row.problem.harness, language)
    if (!harness) return fail(`There are no tests for ${language} yet.`)

    const tests = kind === "run" ? sampleTests(row.problem.judgeTests) : (row.problem.judgeTests ?? [])
    if (tests.length === 0) return fail("This problem has no tests yet.")

    const result = await runAgainstTests({ kind, language, harness, code, tests })

    // Record the attempt. Best effort: a failed write must not hide the result
    // the user is waiting for.
    try {
        const stage: PracticeStage = row.status === "COMPLETED" ? "done" : row.stage
        const state = row.mentorState ?? emptyMentorState()
        const record: JudgeRunRecord = {
            at: new Date().toISOString(),
            stage,
            language,
            kind,
            passed: result.status === "ok" && result.passed,
            failedIds: result.status === "ok" ? result.cases.filter((c) => !c.passed).map((c) => c.id) : [],
        }
        const next = {
            ...state,
            ...(kind === "run" ? { lastRun: record } : { lastSubmit: record }),
            // A full pass on Submit is the hard signal the brute-force and
            // optimise stages advance on (PD-6). Once per stage.
            testsPassedAt:
                kind === "submit" && record.passed && !state.testsPassedAt.some((t) => t.stage === stage)
                    ? [...state.testsPassedAt, { stage, at: record.at }]
                    : state.testsPassedAt,
        }
        await db
            .update(practiceUserSession)
            .set({ code, language, mentorState: next })
            .where(eq(practiceUserSession.id, row.id))
    } catch (error: unknown) {
        console.error("[judge] could not record the attempt:", error instanceof Error ? error.message : error)
    }

    return result
}

/** Run the sample tests. */
export async function runSampleTests(sessionId: string, code: string, language: string): Promise<PracticeJudgeResult> {
    return judge(sessionId, code, language, "run")
}

/** Run sample plus hidden tests. */
export async function submitSolution(sessionId: string, code: string, language: string): Promise<PracticeJudgeResult> {
    return judge(sessionId, code, language, "submit")
}

/**
 * Admin: dispatch test generation for DSA problems that have none yet, in
 * batches (PD-11). `offset` pages through the pending set so 75 jobs do not all
 * hit one OpenAI key and the five-instance executor pool at once.
 */
export async function requestJudgeAssetsForPending(offset = 0, batch = 10): Promise<{ success: boolean; dispatched: number; remaining: number; error?: string }> {
    const session = await getSession(await headers())
    if (!session?.user?.id) return { success: false, dispatched: 0, remaining: 0, error: "Not signed in." }
    const [me] = await db.select({ role: users.role }).from(users).where(eq(users.id, session.user.id)).limit(1)
    if (me?.role !== "Admin") return { success: false, dispatched: 0, remaining: 0, error: "Admins only." }

    const pending = await db
        .select({ id: practiceProblem.id })
        .from(practiceProblem)
        .where(and(eq(practiceProblem.module, "DSA"), inArray(practiceProblem.judgeStatus, ["none", "failed"])))
        .orderBy(asc(practiceProblem.sortOrder))
    const slice = pending.slice(offset, offset + batch)
    let dispatched = 0
    for (const p of slice) {
        const job = await startBackgroundJob("practice_tests_generate", { problemId: p.id }, { cost: 0 })
        if (job.success) dispatched++
    }
    return { success: true, dispatched, remaining: Math.max(0, pending.length - offset - slice.length) }
}
