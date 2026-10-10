'use server'

import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import {
    db,
    pathfinderGoals,
    pathfinderVerifications,
    pathfinderQuizAttempts,
    pathfinderCodingSubmissions,
    users,
    creditTransactions,
    mockVoiceSession,
    projectsV2,
    userProjectV2Progress,
    practiceProblem,
    harnessFor,
} from '@repo/db'
import { eq, and, or, sql, desc } from 'drizzle-orm'
import { revalidateGoal } from '@/lib/pathfinder/revalidate'
import { settleVerification } from '@/lib/pathfinder/settle'
import { gradeQuiz, withoutAnswers, codingProblemIdsOf, codingRequired } from '@/lib/pathfinder/verification-plan'
import { loadDsaProblems, runSamples } from '@/lib/hiring/dsa'
import { runAgainstTests, JUDGE_TIME_LIMIT_MESSAGE } from '@/lib/practice/judge-run'
import type { PracticeJudgeResult } from '@/types/practice'
import type { VerificationAIPlan } from '@/types/pathfinder'
import { PATHFINDER_CREDITS, PATHFINDER_XP } from '@/lib/constants/pricing'
import { addXpToUser } from '@/actions/(main)/user/level.action'
import { recordActivity, activityKey } from '@repo/db/activity'

// ================================================================================
// TYPES
// ================================================================================

export type VerificationSectionStatus = 'LOCKED' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

export interface VerificationQuizSubmission {
    goalId: string
    answers: {
        questionId: string
        selectedAnswer: number
        timeTaken: number
    }[]
    totalTime: number
}

export interface VerificationCodingSubmission {
    goalId: string
    problemId: string
    code: string
    language: string
}

// ================================================================================
// GET VERIFICATION STATUS
// ================================================================================

export async function getVerificationStatus(slugOrId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized', verification: null }
        }

        const goal = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.userId, session.user.id), or(eq(pathfinderGoals.slug, slugOrId), eq(pathfinderGoals.id, slugOrId))),
            with: { verification: true },
        })

        if (!goal) {
            return { success: false, error: 'Goal not found', verification: null }
        }

        const verification = withoutAnswers(goal.verification ?? null)
        return { success: true, verification }
    } catch (error) {
        console.error('Error fetching verification status:', error)
        return { success: false, error: 'Failed to fetch status', verification: null }
    }
}

// ================================================================================
// GENERATE VERIFICATION CONTENT - moved to the generation worker
// ================================================================================
//
// This ran the OpenAI Assistants API inline and polled it up to 90 times at one
// second apart - up to 90 seconds of blocking sleep in a server action, which
// Cloudflare kills long before it finishes, after the user has been charged.
//
// It now runs on a Durable Object with an Alarm:
//   dispatch/poll  actions/(main)/workers/verificationworker.action.ts
//   worker         apps/worker/src/jobs/verification-generation.ts
//
// Verified 2026-08-02 against the deployed worker: the client disconnected 45s
// in and never polled again; the run still completed and wrote a 22-question
// plan to the verification row. That is the behaviour this file could not have.

/**
 * Open the next section only if it is still LOCKED. Passing one section used to
 * set the next to PENDING outright, which reset it when it was already done
 * (plan/pathfinder PF-19). Decided in SQL, so a stale read cannot reset it either.
 */
function unlock(column: typeof pathfinderVerifications.codingStatus | typeof pathfinderVerifications.mockStatus) {
    return sql`CASE WHEN ${column} = 'LOCKED' THEN 'PENDING'::verification_section_status ELSE ${column} END`
}

// ================================================================================
// SUBMIT VERIFICATION QUIZ
// ================================================================================

export async function submitVerificationQuiz(submission: VerificationQuizSubmission) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const goal = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.id, submission.goalId), eq(pathfinderGoals.userId, session.user.id)),
            with: { verification: true },
        })

        if (!goal || !goal.verification) {
            return { success: false, error: 'Goal not found' }
        }

        // Graded here against the stored plan, never from anything the browser
        // says about correctness (plan/pathfinder PF-16). A failed attempt sees
        // which questions were wrong but not the answers, so a retry is a retry.
        const plan = goal.verification.generatedPlan
        const graded = gradeQuiz(plan, submission.answers, { reveal: false })
        if (!graded.total) {
            return { success: false, error: 'Generate the verification questions first' }
        }
        const { correctCount, score } = graded
        const answers = submission.answers.map((a) => ({
            ...a,
            isCorrect: graded.review.find((r) => r.questionId === a.questionId)?.correct ?? false,
        }))

        const [attempt] = await db.insert(pathfinderQuizAttempts).values({
            goalId: submission.goalId,
            userId: session.user.id,
            quizType: 'VERIFICATION',
            score,
            correctCount,
            totalQuestions: graded.total,
            timeTaken: submission.totalTime,
            answers,
            startedAt: new Date(Date.now() - submission.totalTime * 1000),
        }).returning({ id: pathfinderQuizAttempts.id })

        // The activity ledger (plan/progress PRG-3). Every attempt is its own event.
        if (attempt) {
            await recordActivity(db, session.user.id, {
                type: 'PATHFINDER_QUIZ_COMPLETED',
                title: `Scored ${score} on the ${goal.title} verification quiz`,
                description: `${correctCount} of ${graded.total} correct - ${score >= 70 ? 'passed' : 'not passed'}`,
                xp: 0,
                minutes: submission.totalTime / 60,
                key: activityKey.pathfinderQuiz(attempt.id),
                meta: { attemptId: attempt.id, goalId: submission.goalId, score },
            })
        }

        const passed = score >= 70
        const newStatus: VerificationSectionStatus = passed ? 'COMPLETED' : 'FAILED'

        await db.update(pathfinderVerifications)
            .set({
                quizStatus: newStatus,
                quizScore: score,
                quizAttempts: goal.verification.quizAttempts + 1,
                quizCompletedAt: passed ? new Date() : undefined,
                // Unlock coding only if it is still LOCKED and the goal has it (PF-19).
                ...(passed && codingRequired(plan) ? { codingStatus: unlock(pathfinderVerifications.codingStatus) } : {}),
            })
            .where(eq(pathfinderVerifications.id, goal.verification.id))

        if (passed) {
            await checkVerificationCompletion(goal.verification.id)
        }

        await revalidateGoal(submission.goalId, { verify: true })
        const review = passed ? gradeQuiz(plan, submission.answers, { reveal: true }).review : graded.review
        return { success: true, score, passed, review }
    } catch (error) {
        console.error('Error submitting verification quiz:', error)
        return { success: false, error: 'Failed to submit quiz' }
    }
}

// ================================================================================
// SUBMIT VERIFICATION CODING
// ================================================================================

// Coding is judged Practice problems (plan/pathfinder PF-17): the server runs
// the code, and nothing the browser says about passing counts. Runs check the
// sample tests; a submit runs every test. Both are counted against the
// verification's limits, because the executor pool is shared.

const RUN = 'VERIFICATION_RUN'
const SUBMIT = 'VERIFICATION'

type CodingGoal = NonNullable<Awaited<ReturnType<typeof loadGoalWithVerification>>>
type CodingContext =
    | { error: string }
    | { userId: string; goal: CodingGoal; v: NonNullable<CodingGoal['verification']>; problemIds: string[] }

function loadGoalWithVerification(goalId: string, userId: string) {
    return db.query.pathfinderGoals.findFirst({
        where: and(eq(pathfinderGoals.id, goalId), eq(pathfinderGoals.userId, userId)),
        with: { verification: true },
    })
}

/** The owner's goal, its verification, and the problem ids that verify it. */
async function codingContext(goalId: string): Promise<CodingContext> {
    const session = await getSession(headers())
    const userId = session?.user?.id
    if (!userId) return { error: 'Unauthorized' }
    const goal = await loadGoalWithVerification(goalId, userId)
    const v = goal?.verification
    if (!goal || !v) return { error: 'Goal not found' }
    const problemIds = codingProblemIdsOf(v.generatedPlan)
    if (problemIds === null) return { error: 'These coding problems are from an older version. Refresh the verification to get judged ones.' }
    return { userId, goal, v, problemIds }
}

async function judgeCalls(goalId: string, type: string) {
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(pathfinderCodingSubmissions)
        .where(and(eq(pathfinderCodingSubmissions.goalId, goalId), eq(pathfinderCodingSubmissions.submissionType, type)))
    return row?.n ?? 0
}

/** Best share of tests passed per problem, from the submits so far. */
async function codingProgress(goalId: string, problemIds: string[]) {
    const subs = await db.select({
        problemId: pathfinderCodingSubmissions.problemId,
        passed: pathfinderCodingSubmissions.passed,
        testsPassed: pathfinderCodingSubmissions.testsPassed,
        totalTests: pathfinderCodingSubmissions.totalTests,
    }).from(pathfinderCodingSubmissions)
        .where(and(eq(pathfinderCodingSubmissions.goalId, goalId), eq(pathfinderCodingSubmissions.submissionType, SUBMIT)))
    const best = Object.fromEntries(problemIds.map((id) => {
        const mine = subs.filter((x) => x.problemId === id)
        const share = Math.max(0, ...mine.map((x) => (x.totalTests ? (x.testsPassed ?? 0) / x.totalTests : 0)))
        return [id, { share, solved: mine.some((x) => x.passed) }]
    }))
    const score = problemIds.length
        ? Math.round((problemIds.reduce((t, id) => t + best[id]!.share, 0) / problemIds.length) * 100)
        : 0
    return { best, score, allSolved: problemIds.length > 0 && problemIds.every((id) => best[id]!.solved) }
}

/** Hidden cases as pass/fail only, so a retry can't learn them. */
function withoutHidden(r: PracticeJudgeResult): PracticeJudgeResult {
    return r.status === 'ok'
        ? { ...r, cases: r.cases.map((c) => (c.hidden ? { ...c, input: '', expectedOutput: '', actualOutput: '' } : c)) }
        : r
}

/** The coding section for the page: the problems (no hidden tests), progress and limits. */
export async function getVerificationCoding(goalId: string) {
    try {
        const ctx = await codingContext(goalId)
        if ('error' in ctx) return { success: false as const, error: ctx.error }
        const [problems, progress, runs, submits] = await Promise.all([
            loadDsaProblems(ctx.problemIds),
            codingProgress(goalId, ctx.problemIds),
            judgeCalls(goalId, RUN),
            judgeCalls(goalId, SUBMIT),
        ])
        return {
            success: true as const,
            problems,
            solved: ctx.problemIds.filter((id) => progress.best[id]!.solved),
            score: progress.score,
            runsLeft: Math.max(0, PATHFINDER_CREDITS.verificationCodingRuns - runs),
            submitsLeft: Math.max(0, PATHFINDER_CREDITS.verificationCodingSubmits - submits),
        }
    } catch (error: unknown) {
        console.error('Error loading verification coding:', error)
        return { success: false as const, error: 'Could not load the coding problems' }
    }
}

/** Run one problem's sample tests. */
export async function runVerificationSamples(input: VerificationCodingSubmission): Promise<PracticeJudgeResult> {
    const fail = (message: string): PracticeJudgeResult => ({ status: 'unavailable', kind: 'run', language: input.language, message })
    try {
        const ctx = await codingContext(input.goalId)
        if ('error' in ctx) return fail(ctx.error)
        if (!ctx.problemIds.includes(input.problemId)) return fail('That problem is not part of this verification.')
        if (await judgeCalls(input.goalId, RUN) >= PATHFINDER_CREDITS.verificationCodingRuns) {
            return fail("You've used all the test runs for this verification. Submit to be judged.")
        }
        const code = input.code.slice(0, 50_000)
        const r = await runSamples(input.problemId, input.language, code)
        // Counted when the judge answered, or the code ran out of time; an
        // outage is ours, not a run.
        const timedOut = r.status === 'unavailable' && r.message === JUDGE_TIME_LIMIT_MESSAGE
        if (r.status !== 'unavailable' || timedOut) {
            await db.insert(pathfinderCodingSubmissions).values({
                goalId: input.goalId, userId: ctx.userId, submissionType: RUN, problemId: input.problemId,
                code, language: input.language, passed: r.status === 'ok' && r.passed,
                testsPassed: r.status === 'ok' ? r.samplePassed : 0, totalTests: r.status === 'ok' ? r.sampleTotal : 0,
            })
        }
        return r
    } catch (error: unknown) {
        console.error('Error running verification samples:', error)
        return fail('Could not run the tests. Try again.')
    }
}

/** Judge one problem against every test, and move the section on. */
export async function submitVerificationCoding(input: VerificationCodingSubmission) {
    try {
        const ctx = await codingContext(input.goalId)
        if ('error' in ctx) return { success: false as const, error: ctx.error }
        if (!ctx.problemIds.includes(input.problemId)) return { success: false as const, error: 'That problem is not part of this verification.' }
        if (ctx.v.codingStatus === 'COMPLETED') return { success: false as const, error: 'You already passed the coding section.' }
        if (await judgeCalls(input.goalId, SUBMIT) >= PATHFINDER_CREDITS.verificationCodingSubmits) {
            return { success: false as const, error: "You've used all the submits for this verification." }
        }

        const [row] = await db.select({ harness: practiceProblem.harness, judgeTests: practiceProblem.judgeTests, judgeStatus: practiceProblem.judgeStatus })
            .from(practiceProblem).where(eq(practiceProblem.id, input.problemId))
        const harness = row?.judgeStatus === 'ready' ? harnessFor(row.harness, input.language) : null
        if (!row || !harness) return { success: false as const, error: `There are no tests for ${input.language} on this problem.` }

        const code = input.code.slice(0, 50_000)
        const result = await runAgainstTests({ kind: 'submit', language: input.language, harness, code, tests: row.judgeTests ?? [] })
        // The judge being down is ours: nothing is recorded or counted. Running
        // out of time is the code's: a failed submit, counted like any other.
        const timedOut = result.status === 'unavailable' && result.message === JUDGE_TIME_LIMIT_MESSAGE
        if (result.status === 'unavailable' && !timedOut) return { success: false as const, error: result.message }

        const total = (row.judgeTests ?? []).length
        const passedCount = result.status === 'ok' ? result.cases.filter((c) => c.passed).length : 0
        await db.insert(pathfinderCodingSubmissions).values({
            goalId: input.goalId, userId: ctx.userId, submissionType: SUBMIT, problemId: input.problemId,
            code, language: input.language, passed: result.status === 'ok' && result.passed,
            testsPassed: passedCount, totalTests: total,
            testResults: result.status === 'ok'
                ? result.cases.map((c) => ({ testId: c.id, passed: c.passed, input: c.hidden ? '' : c.input, expected: c.hidden ? '' : c.expectedOutput, actual: c.hidden ? '' : c.actualOutput }))
                : undefined,
        })

        const progress = await codingProgress(input.goalId, ctx.problemIds)
        await db.update(pathfinderVerifications)
            .set({
                codingScore: progress.score,
                codingAttempts: ctx.v.codingAttempts + 1,
                ...(progress.allSolved
                    ? {
                        codingStatus: 'COMPLETED' as VerificationSectionStatus,
                        codingCompletedAt: new Date(),
                        mockStatus: unlock(pathfinderVerifications.mockStatus),
                    }
                    : {}),
            })
            .where(eq(pathfinderVerifications.id, ctx.v.id))

        if (progress.allSolved) {
            await checkVerificationCompletion(ctx.v.id)
        }

        await revalidateGoal(input.goalId, { verify: true })
        return {
            success: true as const,
            result: withoutHidden(result),
            score: progress.score,
            solved: ctx.problemIds.filter((id) => progress.best[id]!.solved),
            overallPassed: progress.allSolved,
        }
    } catch (error: unknown) {
        console.error('Error submitting verification coding:', error)
        return { success: false as const, error: 'Failed to submit coding' }
    }
}

// ================================================================================
// MOCK INTERVIEW (plan/pathfinder PF-10)
// ================================================================================

const LIVE = ['SCHEDULED', 'IN_PROGRESS']

/**
 * Start (or resume) the verification mock: a real voice session on the mock the
 * verification job wrote for this goal. Returns the SESSION id, which is what
 * `/mock/voice/interview/[sessionId]` takes. The old link passed the mock's id and
 * 404'd, and nothing ever completed the section.
 */
export async function startVerificationMock(goalId: string) {
    try {
        const session = await getSession(headers())
        const userId = session?.user?.id
        if (!userId) return { success: false as const, error: 'Unauthorized' }
        const goal = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.id, goalId), eq(pathfinderGoals.userId, userId)),
            with: { verification: true },
        })
        const v = goal?.verification
        if (!v) return { success: false as const, error: 'Goal not found' }
        if (v.mockStatus === 'LOCKED') return { success: false as const, error: 'Pass the coding section first' }
        if (v.mockStatus === 'COMPLETED') return { success: false as const, error: 'You already passed the mock' }
        if (!v.mockInterviewId) return { success: false as const, error: 'Generate the verification questions first' }

        if (v.mockSessionId) {
            const open = await db.query.mockVoiceSession.findFirst({
                where: and(eq(mockVoiceSession.id, v.mockSessionId), eq(mockVoiceSession.userId, userId)),
                columns: { id: true, status: true, endsAt: true },
            })
            if (open && LIVE.includes(open.status) && (!open.endsAt || open.endsAt.getTime() > Date.now())) {
                return { success: true as const, sessionId: open.id }
            }
        }

        const { createMockVoiceSession } = await import('@/actions/(main)/mockvoice/session.action')
        const created = await createMockVoiceSession({ mockId: v.mockInterviewId, mockType: 'custom' })
        if (!created.success || !created.sessionId) return { success: false as const, error: created.error ?? 'Could not start the interview' }

        await db.update(pathfinderVerifications)
            .set({ mockSessionId: created.sessionId, mockStatus: 'IN_PROGRESS' })
            .where(eq(pathfinderVerifications.id, v.id))
        await revalidateGoal(goalId, { verify: true })
        return { success: true as const, sessionId: created.sessionId }
    } catch (error: unknown) {
        console.error('Error starting verification mock:', error)
        return { success: false as const, error: 'Could not start the interview' }
    }
}

/**
 * Bring the mock section up to date with its session, on every Verify render. A
 * scored session completes the section at the session's own score (70 to pass),
 * never at a number the browser sends; a session that ended unscored puts the
 * section back to "start again". Idempotent.
 */
export async function refreshVerificationMock(slugOrId: string) {
    try {
        const session = await getSession(headers())
        const userId = session?.user?.id
        if (!userId) return
        const goal = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.userId, userId), or(eq(pathfinderGoals.slug, slugOrId), eq(pathfinderGoals.id, slugOrId))),
            with: { verification: true },
        })
        const v = goal?.verification
        if (!v?.mockSessionId || v.mockStatus === 'COMPLETED' || v.mockStatus === 'LOCKED') return

        const { progressVoiceMock } = await import('@/lib/voice/score')
        const row = await db.query.mockVoiceSession.findFirst({
            where: and(eq(mockVoiceSession.id, v.mockSessionId), eq(mockVoiceSession.userId, userId)),
            columns: { status: true, endsAt: true },
        })
        if (!row) return
        // A handed-in interview is scored by polling; do the poll here so leaving the
        // results page early does not leave the section waiting forever.
        const outcome = row.status === 'SUBMITTED' || row.status === 'COMPLETED' || row.status === 'FAILED'
            ? await progressVoiceMock(userId, v.mockSessionId)
            : null
        const expired = LIVE.includes(row.status) && row.endsAt && row.endsAt.getTime() < Date.now()

        if (outcome?.state === 'scored') {
            const score = Math.round(outcome.analysis.overallScore)
            const passed = score >= 70
            const aiPlan = v.generatedPlan as { minorProject?: unknown; majorProject?: unknown } | null
            const hasProject = !!(aiPlan?.minorProject || aiPlan?.majorProject)
            const [moved] = await db.update(pathfinderVerifications)
                .set({
                    mockStatus: passed ? 'COMPLETED' : 'FAILED',
                    mockScore: score,
                    mockAttempts: v.mockAttempts + 1,
                    mockSessionId: passed ? v.mockSessionId : null,
                    mockCompletedAt: passed ? new Date() : undefined,
                    ...(passed && hasProject && v.projectStatus === 'LOCKED' ? { projectStatus: 'PENDING' as VerificationSectionStatus } : {}),
                })
                // Guarded on the session id so two renders cannot count one interview twice.
                .where(and(eq(pathfinderVerifications.id, v.id), eq(pathfinderVerifications.mockSessionId, v.mockSessionId)))
                .returning({ id: pathfinderVerifications.id })
            if (moved && passed) await checkVerificationCompletion(v.id)
            return
        }
        if (outcome?.state === 'not_scored' || expired) {
            await db.update(pathfinderVerifications)
                .set({ mockStatus: 'PENDING', mockSessionId: null })
                .where(and(eq(pathfinderVerifications.id, v.id), eq(pathfinderVerifications.mockSessionId, v.mockSessionId)))
        }
    } catch (error: unknown) {
        console.error('Error refreshing verification mock:', error)
    }
}

// ================================================================================
// PROJECT (plan/pathfinder PF-11)
// ================================================================================

/** The projects you have started, for picking one to verify a goal with. */
export async function listMyProjectsForVerification() {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) return { success: false as const, projects: [] }
        const rows = await db.select({
            id: projectsV2.id,
            title: projectsV2.title,
            slug: projectsV2.slug,
            status: userProjectV2Progress.status,
            progress: userProjectV2Progress.progressPercentage,
        })
            .from(userProjectV2Progress)
            .innerJoin(projectsV2, eq(projectsV2.id, userProjectV2Progress.projectId))
            .where(eq(userProjectV2Progress.userId, session.user.id))
            .orderBy(desc(userProjectV2Progress.updatedAt))
        return { success: true as const, projects: rows }
    } catch (error: unknown) {
        console.error('Error listing projects for verification:', error)
        return { success: false as const, projects: [] }
    }
}

/**
 * Verify a goal with one of your own Projects. The section passes when that
 * project is COMPLETED under the project's own review, now or later: nothing typed
 * here is taken on trust. The old form threw away everything it asked for and
 * marked the section complete.
 */
export async function linkVerificationProject(goalId: string, projectId: string) {
    try {
        const session = await getSession(headers())
        const userId = session?.user?.id
        if (!userId) return { success: false as const, error: 'Unauthorized' }
        const goal = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.id, goalId), eq(pathfinderGoals.userId, userId)),
            with: { verification: true },
        })
        const v = goal?.verification
        if (!v) return { success: false as const, error: 'Goal not found' }
        if (v.projectStatus === 'LOCKED') return { success: false as const, error: 'Pass the mock interview first' }
        if (v.projectStatus === 'COMPLETED') return { success: false as const, error: 'The project section is already passed' }

        const progress = await db.query.userProjectV2Progress.findFirst({
            where: and(eq(userProjectV2Progress.userId, userId), eq(userProjectV2Progress.projectId, projectId)),
            columns: { status: true },
        })
        if (!progress) return { success: false as const, error: 'That is not one of your projects' }

        const done = progress.status === 'COMPLETED'
        await db.update(pathfinderVerifications)
            .set({
                projectId,
                projectType: 'SHIPITHQ',
                projectStatus: done ? 'COMPLETED' : 'IN_PROGRESS',
                projectComplete: done,
                projectCompletedAt: done ? new Date() : null,
            })
            .where(eq(pathfinderVerifications.id, v.id))
        if (done) await checkVerificationCompletion(v.id)
        await revalidateGoal(goalId, { verify: true })
        return { success: true as const, passed: done }
    } catch (error: unknown) {
        console.error('Error linking verification project:', error)
        return { success: false as const, error: 'Could not link the project' }
    }
}

/** Bring the project section up to date with its project, on every Verify render. */
export async function refreshVerificationProject(slugOrId: string) {
    try {
        const session = await getSession(headers())
        const userId = session?.user?.id
        if (!userId) return
        const goal = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.userId, userId), or(eq(pathfinderGoals.slug, slugOrId), eq(pathfinderGoals.id, slugOrId))),
            with: { verification: true },
        })
        const v = goal?.verification
        if (!v?.projectId || v.projectStatus !== 'IN_PROGRESS') return
        const progress = await db.query.userProjectV2Progress.findFirst({
            where: and(eq(userProjectV2Progress.userId, userId), eq(userProjectV2Progress.projectId, v.projectId)),
            columns: { status: true },
        })
        if (!progress) {
            // The project was deleted: back to picking one.
            await db.update(pathfinderVerifications).set({ projectId: null, projectStatus: 'PENDING' }).where(eq(pathfinderVerifications.id, v.id))
            return
        }
        if (progress.status !== 'COMPLETED') return
        const [moved] = await db.update(pathfinderVerifications)
            .set({ projectStatus: 'COMPLETED', projectComplete: true, projectCompletedAt: new Date() })
            .where(and(eq(pathfinderVerifications.id, v.id), eq(pathfinderVerifications.projectStatus, 'IN_PROGRESS')))
            .returning({ id: pathfinderVerifications.id })
        if (moved) await checkVerificationCompletion(v.id)
    } catch (error: unknown) {
        console.error('Error refreshing verification project:', error)
    }
}

export async function retryVerificationSection(
    goalId: string,
    section: 'quiz' | 'coding' | 'mock' | 'project'
) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const goal = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.id, goalId), eq(pathfinderGoals.userId, session.user.id)),
            with: { verification: true },
        })

        if (!goal || !goal.verification) {
            return { success: false, error: 'Goal not found' }
        }

        const statusField = `${section}Status` as const
        await db.update(pathfinderVerifications)
            .set({ [statusField]: 'PENDING' as VerificationSectionStatus })
            .where(eq(pathfinderVerifications.id, goal.verification.id))

        await revalidateGoal(goalId, { verify: true })
        return { success: true }
    } catch (error) {
        console.error('Error retrying section:', error)
        return { success: false, error: 'Failed to retry section' }
    }
}

// ================================================================================
// HELPER: CHECK VERIFICATION COMPLETION
// ================================================================================

async function checkVerificationCompletion(verificationId: string) {
    const verification = await db.query.pathfinderVerifications.findFirst({
        where: eq(pathfinderVerifications.id, verificationId),
        with: { goal: true },
    })

    if (!verification) return

    // Already completed. This helper runs after every section submission, so
    // once the fourth section lands it will be re-entered by any later submit
    // or retry - and everything below it pays the user (credits, and now XP).
    // Bail before any of that can happen twice.
    if (verification.passed) return

    const aiPlan = verification.generatedPlan as {
        minorProject?: unknown
        majorProject?: unknown
    } | null
    const projectRequired = !!(aiPlan?.minorProject || aiPlan?.majorProject)

    const hasCoding = codingRequired(verification.generatedPlan)
    const quizComplete = verification.quizStatus === 'COMPLETED'
    const codingComplete = !hasCoding || verification.codingStatus === 'COMPLETED'
    const mockComplete = verification.mockStatus === 'COMPLETED'
    const projectComplete = projectRequired
        ? verification.projectStatus === 'COMPLETED'
        : true

    if (quizComplete && codingComplete && mockComplete && projectComplete) {
        // A goal with no coding section spreads coding's weight over the other
        // two, so its score is still out of 100 (PF-17).
        const w = PATHFINDER_CREDITS.verificationWeights
        const wCoding = hasCoding ? w.coding : 0
        const wTotal = w.quiz + wCoding + w.mock
        const weightedScore = Math.round((
            (verification.quizScore || 0) * w.quiz +
            (verification.codingScore || 0) * wCoding +
            (verification.mockScore || 0) * w.mock
        ) / wTotal)
        const overallScore = weightedScore

        const refundCredits = Math.floor(
            (verification.verificationCreditsCharged || 0) * (weightedScore / 100)
        )

        // Pays once, even when two submits land together (plan/pathfinder PF-15).
        const flipped = await settleVerification({
            verificationId,
            goalId: verification.goalId,
            userId: verification.goal?.userId ?? null,
            overallScore,
            refundCredits,
            refundDescription: `Pathfinder Verification Refund: ${weightedScore}% score (${refundCredits} credits)`,
        })
        if (!flipped) return

        // Verification is the module's payoff - a multi-week goal, four sections
        // passed. Until now it granted nothing; the reward half of the feature was
        // this comment.
        //
        // Scaled by the same `weightedScore` the performance refund uses rather
        // than inventing a second notion of "how well did they do", so the credits
        // returned and the XP granted can never tell different stories.
        const goalForXp = verification.goal
        if (goalForXp) {
            const xpAward = Math.max(
                PATHFINDER_XP.verificationMinimum,
                Math.round(PATHFINDER_XP.verificationBase * (weightedScore / 100)),
            )
            // addXpToUser owns the level recalculation and runs in its own
            // transaction; it logs and swallows its own failures, so a reward
            // problem cannot roll back a verification the user genuinely passed.
            await addXpToUser(
                goalForXp.userId,
                xpAward,
                `Pathfinder goal verified: ${goalForXp.title} (${weightedScore}%)`,
                'REWARD',
            )
            // The activity ledger (plan/progress PRG-3).
            await recordActivity(db, goalForXp.userId, {
                type: 'PATHFINDER_GOAL_COMPLETED',
                title: `Completed goal: ${goalForXp.title}`,
                description: `Verified with ${weightedScore}%`,
                xp: xpAward,
                key: activityKey.goalCompleted(goalForXp.id),
                meta: { goalId: goalForXp.id, verificationId, score: weightedScore },
            })
        }
    }
}
