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
} from '@repo/db'
import { eq, and, or, sql, desc } from 'drizzle-orm'
import { revalidateGoal } from '@/lib/pathfinder/revalidate'
import type { VerificationAIPlan } from '@/types/pathfinder'
import { PATHFINDER_CREDITS, PATHFINDER_XP } from '@/lib/constants/pricing'
import { addXpToUser } from '@/actions/(main)/user/level.action'

// ================================================================================
// TYPES
// ================================================================================

export type VerificationSectionStatus = 'LOCKED' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

export interface VerificationQuizSubmission {
    goalId: string
    answers: {
        questionId: string
        selectedAnswer: number
        isCorrect: boolean
        timeTaken: number
    }[]
    totalTime: number
}

export interface VerificationCodingSubmission {
    goalId: string
    problemId: string
    code: string
    language: string
    passed: boolean
    testsPassed: number
    totalTests: number
    testResults?: {
        testId: string
        passed: boolean
        input: string
        expected: string
        actual: string
        error?: string
    }[]
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

        const verification = goal.verification ?? null
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

        const correctCount = submission.answers.filter((a) => a.isCorrect).length
        const score = Math.round((correctCount / submission.answers.length) * 100)

        await db.insert(pathfinderQuizAttempts).values({
            goalId: submission.goalId,
            userId: session.user.id,
            quizType: 'VERIFICATION',
            score,
            correctCount,
            totalQuestions: submission.answers.length,
            timeTaken: submission.totalTime,
            answers: submission.answers,
            startedAt: new Date(Date.now() - submission.totalTime * 1000),
        })

        const passed = score >= 70
        const newStatus: VerificationSectionStatus = passed ? 'COMPLETED' : 'FAILED'

        await db.update(pathfinderVerifications)
            .set({
                quizStatus: newStatus,
                quizScore: score,
                quizAttempts: goal.verification.quizAttempts + 1,
                quizCompletedAt: passed ? new Date() : undefined,
                ...(passed ? { codingStatus: 'PENDING' as VerificationSectionStatus } : {}),
            })
            .where(eq(pathfinderVerifications.id, goal.verification.id))

        if (passed) {
            await checkVerificationCompletion(goal.verification.id)
        }

        await revalidateGoal(submission.goalId, { verify: true })
        return { success: true, score, passed }
    } catch (error) {
        console.error('Error submitting verification quiz:', error)
        return { success: false, error: 'Failed to submit quiz' }
    }
}

// ================================================================================
// SUBMIT VERIFICATION CODING
// ================================================================================

export async function submitVerificationCoding(submission: VerificationCodingSubmission) {
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

        await db.insert(pathfinderCodingSubmissions).values({
            goalId: submission.goalId,
            userId: session.user.id,
            submissionType: 'VERIFICATION',
            problemId: submission.problemId,
            code: submission.code,
            language: submission.language,
            passed: submission.passed,
            testsPassed: submission.testsPassed,
            totalTests: submission.totalTests,
            testResults: submission.testResults,
        })

        const allSubmissions = await db.query.pathfinderCodingSubmissions.findMany({
            where: and(
                eq(pathfinderCodingSubmissions.goalId, submission.goalId),
                eq(pathfinderCodingSubmissions.submissionType, 'VERIFICATION')
            ),
        })

        const passedProblems = new Set(
            allSubmissions.filter((s) => s.passed).map((s) => s.problemId)
        )

        const aiPlan = (goal.verification as { generatedPlan?: { codingQuestions?: unknown[] } } | null)?.generatedPlan as { codingQuestions?: unknown[] } | null
        const totalProblems = aiPlan?.codingQuestions?.length || 5

        const score = Math.round((passedProblems.size / totalProblems) * 100)
        const allPassed = passedProblems.size >= totalProblems

        await db.update(pathfinderVerifications)
            .set({
                codingScore: score,
                codingAttempts: goal.verification.codingAttempts + 1,
                ...(allPassed
                    ? {
                        codingStatus: 'COMPLETED' as VerificationSectionStatus,
                        codingCompletedAt: new Date(),
                        mockStatus: 'PENDING' as VerificationSectionStatus,
                    }
                    : {}),
            })
            .where(eq(pathfinderVerifications.id, goal.verification.id))

        if (allPassed) {
            await checkVerificationCompletion(goal.verification.id)
        }

        await revalidateGoal(submission.goalId, { verify: true })
        return { success: true, passed: submission.passed, overallPassed: allPassed }
    } catch (error) {
        console.error('Error submitting verification coding:', error)
        return { success: false, error: 'Failed to submit coding' }
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

    const quizComplete = verification.quizStatus === 'COMPLETED'
    const codingComplete = verification.codingStatus === 'COMPLETED'
    const mockComplete = verification.mockStatus === 'COMPLETED'
    const projectComplete = projectRequired
        ? verification.projectStatus === 'COMPLETED'
        : true

    if (quizComplete && codingComplete && mockComplete && projectComplete) {
        const w = PATHFINDER_CREDITS.verificationWeights
        const weightedScore = Math.round(
            (verification.quizScore || 0) * w.quiz +
            (verification.codingScore || 0) * w.coding +
            (verification.mockScore || 0) * w.mock
        )
        const overallScore = weightedScore

        const refundCredits = Math.floor(
            (verification.verificationCreditsCharged || 0) * (weightedScore / 100)
        )

        await db.update(pathfinderVerifications)
            .set({
                passed: true,
                overallScore,
                completedAt: new Date(),
            })
            .where(eq(pathfinderVerifications.id, verificationId))

        await db.update(pathfinderGoals)
            .set({
                status: 'COMPLETED',
                completedAt: new Date(),
                progressPercent: 100,
            })
            .where(eq(pathfinderGoals.id, verification.goalId))

        if (refundCredits > 0) {
            const goal = (verification as any).goal
            await db.update(users)
                .set({ credits: sql`${users.credits} + ${refundCredits}` })
                .where(eq(users.id, goal.userId))
            await db.insert(creditTransactions).values({
                userId: goal.userId,
                amount: refundCredits,
                type: 'REWARD',
                description: `Pathfinder Verification Refund: ${weightedScore}% score (${refundCredits} credits)`,
                currency: 'INR',
            })
        }

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
        }
    }
}
