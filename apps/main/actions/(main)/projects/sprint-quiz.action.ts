'use server'

import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import {
    backgroundJobs, db, projectsV2, projectV2Sprints, projectV2SprintMockSessions, projectV2SprintQuizAttempts, projectV2SprintQuizzes, projectV2Tasks, userTaskV2Statuses,
} from '@repo/db'
import { toErrorMessage } from '@/lib/errors'
import { priceOf } from '@/lib/credits/pricing'
import { isSetupSprint } from '@/lib/projects/sprints'
import { QUIZ_UNLOCK_PERCENT, quizUnlocked } from '@/lib/projects/gates'
import { startBackgroundJob } from '@/actions/(main)/workers/jobs.action'

/*
 * Sprint quizzes (plan/project-workspace WS-12, decided by Niraj 2026-09-24):
 * generated once per sprint of the learner's own project when every task in it
 * is done, for 25 credits; taken one question at a time with the explanation
 * after each; every attempt kept; retakes free.
 *
 * The correct answers never reach the browser before the learner answers: the
 * quiz is sent without them, each answer is checked here, and the score is
 * recomputed here on submit.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

export interface SprintQuizView {
    id: string
    questions: { prompt: string; options: string[] }[]
}

export interface SprintQuizAttemptView {
    id: string
    correct: number
    total: number
    score: number
    createdAt: string
}

export interface SprintQuizState {
    quiz: SprintQuizView | null
    attempts: SprintQuizAttemptView[]
    /** A generation still running, so a reload can wait for it instead of paying again. */
    pendingJobId: string | null
    /** Tasks in the sprint not yet done; the quiz opens at zero. For the final quiz, always 0. */
    tasksLeft: number
    price: number
    /** The final quiz only: where it opens and where the learner is (share of all tasks). */
    gate?: { unlockAt: number; progress: number; open: boolean }
}

/** The sprint, if it belongs to a project the signed-in user owns. */
async function ownedSprint(sprintId: string) {
    const session = await getSession(headers())
    const userId = session?.user?.id
    if (!userId) return null
    const [row] = await db
        .select({ id: projectV2Sprints.id, number: projectV2Sprints.sprintNumber, name: projectV2Sprints.name, projectId: projectV2Sprints.projectId })
        .from(projectV2Sprints)
        .innerJoin(projectsV2, eq(projectsV2.id, projectV2Sprints.projectId))
        .where(and(eq(projectV2Sprints.id, sprintId), eq(projectsV2.createdBy, userId)))
        .limit(1)
    return row ? { ...row, userId } : null
}

async function tasksLeft(sprintId: string, userId: string): Promise<number> {
    const [row] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(projectV2Tasks)
        .leftJoin(userTaskV2Statuses, and(eq(userTaskV2Statuses.taskId, projectV2Tasks.id), eq(userTaskV2Statuses.userId, userId)))
        .where(and(eq(projectV2Tasks.sprintId, sprintId), sql`coalesce(${userTaskV2Statuses.status}::text, 'TO_DO') <> 'COMPLETED'`))
    return row?.n ?? 0
}

/** Everything the Quiz tab needs for one sprint. */
export async function getSprintQuiz(sprintId: string): Promise<Result<SprintQuizState>> {
    try {
        const sprint = await ownedSprint(sprintId)
        if (!sprint) return { success: false, error: 'Sprint not found' }
        if (isSetupSprint(sprint.number)) return { success: false, error: 'Setup has no quiz' }

        const [quiz, [inFlight], left] = await Promise.all([
            db.query.projectV2SprintQuizzes.findFirst({ where: eq(projectV2SprintQuizzes.sprintId, sprint.id) }),
            db.select({ jobId: backgroundJobs.jobId }).from(backgroundJobs).where(and(
                eq(backgroundJobs.userId, sprint.userId),
                eq(backgroundJobs.type, 'sprint_quiz'),
                inArray(backgroundJobs.status, ['waiting', 'active']),
                sql`${backgroundJobs.input}->>'singleFlightKey' = ${sprint.id}`,
            )).limit(1),
            tasksLeft(sprint.id, sprint.userId),
        ])
        const attempts = quiz
            ? await db.query.projectV2SprintQuizAttempts.findMany({
                where: and(eq(projectV2SprintQuizAttempts.quizId, quiz.id), eq(projectV2SprintQuizAttempts.userId, sprint.userId)),
                orderBy: [desc(projectV2SprintQuizAttempts.createdAt)],
                limit: 20,
            })
            : []
        return {
            success: true,
            data: {
                quiz: quiz ? { id: quiz.id, questions: quiz.questions.map((q) => ({ prompt: q.prompt, options: q.options })) } : null,
                attempts: attempts.map((a) => ({ id: a.id, correct: a.correct, total: a.total, score: a.score, createdAt: a.createdAt.toISOString() })),
                pendingJobId: quiz ? null : inFlight?.jobId ?? null,
                tasksLeft: left,
                price: priceOf('sprint_quiz'),
            },
        }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

/** Starts generation: the gate and the "already has one" check here, again in the worker. */
export async function startSprintQuiz(sprintId: string): Promise<Result<{ jobId: string }> & { requiredCredits?: number }> {
    try {
        const sprint = await ownedSprint(sprintId)
        if (!sprint) return { success: false, error: 'Sprint not found' }
        if (isSetupSprint(sprint.number)) return { success: false, error: 'Setup has no quiz' }
        const left = await tasksLeft(sprint.id, sprint.userId)
        if (left > 0) return { success: false, error: `Finish the sprint first: ${left} task${left === 1 ? '' : 's'} left.` }
        const existing = await db.query.projectV2SprintQuizzes.findFirst({ where: eq(projectV2SprintQuizzes.sprintId, sprint.id), columns: { id: true } })
        if (existing) return { success: false, error: 'This sprint already has a quiz.' }

        const cost = priceOf('sprint_quiz')
        const started = await startBackgroundJob('sprint_quiz', { sprintId: sprint.id }, {
            cost,
            reason: `Sprint ${sprint.number} quiz: ${sprint.name}`.slice(0, 250),
            // Two tabs, or a double click, get the same job and one hold.
            singleFlight: true,
            singleFlightKey: sprint.id,
        })
        if (!started.success || !started.jobId) {
            return { success: false, error: started.error ?? 'Could not start the quiz', requiredCredits: started.required ?? cost }
        }
        return { success: true, data: { jobId: started.jobId } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

async function ownedQuiz(quizId: string) {
    const session = await getSession(headers())
    const userId = session?.user?.id
    if (!userId) return null
    const [row] = await db
        .select({ quiz: projectV2SprintQuizzes })
        .from(projectV2SprintQuizzes)
        .innerJoin(projectsV2, eq(projectsV2.id, projectV2SprintQuizzes.projectId))
        .where(and(eq(projectV2SprintQuizzes.id, quizId), eq(projectsV2.createdBy, userId)))
        .limit(1)
    return row ? { ...row.quiz, userId } : null
}

/** One answer, checked: whether it was right, which one was, and why. */
export async function checkSprintQuizAnswer(quizId: string, index: number, choice: number): Promise<Result<{ correct: boolean; correctAnswer: number; explanation: string }>> {
    try {
        const quiz = await ownedQuiz(quizId)
        if (!quiz) return { success: false, error: 'Quiz not found' }
        const q = quiz.questions[index]
        if (!q || !Number.isInteger(choice) || choice < 0 || choice > 3) return { success: false, error: 'No such question' }
        return { success: true, data: { correct: choice === q.correctAnswer, correctAnswer: q.correctAnswer, explanation: q.explanation } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

/** A finished attempt, scored here from the stored answers - never from the browser's count. */
export async function submitSprintQuizAttempt(quizId: string, answers: number[]): Promise<Result<SprintQuizAttemptView>> {
    try {
        const quiz = await ownedQuiz(quizId)
        if (!quiz) return { success: false, error: 'Quiz not found' }
        const total = quiz.questions.length
        const picked = quiz.questions.map((_, i) => (Number.isInteger(answers[i]) && answers[i]! >= 0 && answers[i]! <= 3 ? answers[i]! : -1))
        const correct = quiz.questions.filter((q, i) => picked[i] === q.correctAnswer).length
        const score = total > 0 ? Math.round((correct / total) * 100) : 0
        const [row] = await db.insert(projectV2SprintQuizAttempts)
            .values({ quizId: quiz.id, userId: quiz.userId, answers: picked, correct, total, score })
            .returning()
        return { success: true, data: { id: row!.id, correct, total, score, createdAt: row!.createdAt.toISOString() } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

/** The questions with answers and the learner's picks, for reviewing a finished attempt. */
export async function reviewSprintQuizAttempt(attemptId: string): Promise<Result<{ questions: { prompt: string; options: string[]; correctAnswer: number; explanation: string; picked: number }[] }>> {
    try {
        const session = await getSession(headers())
        const userId = session?.user?.id
        if (!userId) return { success: false, error: 'Not signed in' }
        const attempt = await db.query.projectV2SprintQuizAttempts.findFirst({
            where: and(eq(projectV2SprintQuizAttempts.id, attemptId), eq(projectV2SprintQuizAttempts.userId, userId)),
        })
        if (!attempt) return { success: false, error: 'Attempt not found' }
        const quiz = await db.query.projectV2SprintQuizzes.findFirst({ where: eq(projectV2SprintQuizzes.id, attempt.quizId) })
        if (!quiz) return { success: false, error: 'Quiz not found' }
        return {
            success: true,
            data: {
                questions: quiz.questions.map((q, i) => ({ prompt: q.prompt, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation, picked: attempt.answers[i] ?? -1 })),
            },
        }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}


// ─── The final quiz (plan/project-workspace WS-14) ────────────────────────────
// The same machinery with the whole project as scope: one per project
// (sprint_id null), open at QUIZ_UNLOCK_PERCENT of all tasks, the existing
// `project_quiz` price (25).

async function ownedProject(projectId: string) {
    const session = await getSession(headers())
    const userId = session?.user?.id
    if (!userId) return null
    const project = await db.query.projectsV2.findFirst({
        where: and(eq(projectsV2.id, projectId), eq(projectsV2.createdBy, userId)),
        columns: { id: true, title: true },
    })
    return project ? { ...project, userId } : null
}

/** The share of ALL tasks done, Setup included - the same figure as the progress bar. */
async function progressOf(projectId: string, userId: string): Promise<number> {
    const [row] = await db
        .select({
            total: sql<number>`count(*)::int`,
            done: sql<number>`count(*) filter (where ${userTaskV2Statuses.status} = 'COMPLETED')::int`,
        })
        .from(projectV2Tasks)
        .innerJoin(projectV2Sprints, eq(projectV2Sprints.id, projectV2Tasks.sprintId))
        .leftJoin(userTaskV2Statuses, and(eq(userTaskV2Statuses.taskId, projectV2Tasks.id), eq(userTaskV2Statuses.userId, userId)))
        .where(eq(projectV2Sprints.projectId, projectId))
    return row && row.total > 0 ? Math.round((row.done / row.total) * 100) : 0
}

export async function getFinalQuiz(projectId: string): Promise<Result<SprintQuizState>> {
    try {
        const project = await ownedProject(projectId)
        if (!project) return { success: false, error: 'Project not found' }
        const [quiz, [inFlight], progress] = await Promise.all([
            db.query.projectV2SprintQuizzes.findFirst({ where: and(eq(projectV2SprintQuizzes.projectId, project.id), isNull(projectV2SprintQuizzes.sprintId)) }),
            db.select({ jobId: backgroundJobs.jobId }).from(backgroundJobs).where(and(
                eq(backgroundJobs.userId, project.userId),
                eq(backgroundJobs.type, 'sprint_quiz'),
                inArray(backgroundJobs.status, ['waiting', 'active']),
                sql`${backgroundJobs.input}->>'singleFlightKey' = ${`final:${project.id}`}`,
            )).limit(1),
            progressOf(project.id, project.userId),
        ])
        const attempts = quiz
            ? await db.query.projectV2SprintQuizAttempts.findMany({
                where: and(eq(projectV2SprintQuizAttempts.quizId, quiz.id), eq(projectV2SprintQuizAttempts.userId, project.userId)),
                orderBy: [desc(projectV2SprintQuizAttempts.createdAt)],
                limit: 20,
            })
            : []
        return {
            success: true,
            data: {
                quiz: quiz ? { id: quiz.id, questions: quiz.questions.map((q) => ({ prompt: q.prompt, options: q.options })) } : null,
                attempts: attempts.map((a) => ({ id: a.id, correct: a.correct, total: a.total, score: a.score, createdAt: a.createdAt.toISOString() })),
                pendingJobId: quiz ? null : inFlight?.jobId ?? null,
                tasksLeft: 0,
                price: priceOf('project_quiz'),
                gate: { unlockAt: QUIZ_UNLOCK_PERCENT, progress, open: quizUnlocked(progress) },
            },
        }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

export async function startFinalQuiz(projectId: string): Promise<Result<{ jobId: string }> & { requiredCredits?: number }> {
    try {
        const project = await ownedProject(projectId)
        if (!project) return { success: false, error: 'Project not found' }
        const progress = await progressOf(project.id, project.userId)
        if (!quizUnlocked(progress)) return { success: false, error: `The final quiz opens at ${QUIZ_UNLOCK_PERCENT}% of tasks; you are at ${progress}%.` }
        const existing = await db.query.projectV2SprintQuizzes.findFirst({
            where: and(eq(projectV2SprintQuizzes.projectId, project.id), isNull(projectV2SprintQuizzes.sprintId)),
            columns: { id: true },
        })
        if (existing) return { success: false, error: 'This project already has a final quiz.' }
        const cost = priceOf('project_quiz')
        const started = await startBackgroundJob('sprint_quiz', { projectId: project.id }, {
            cost,
            reason: `Final quiz: ${project.title}`.slice(0, 250),
            singleFlight: true,
            singleFlightKey: `final:${project.id}`,
        })
        if (!started.success || !started.jobId) {
            return { success: false, error: started.error ?? 'Could not start the quiz', requiredCredits: started.required ?? cost }
        }
        return { success: true, data: { jobId: started.jobId } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

/**
 * The build sprints whose quiz you have taken, and whose mock interview you have
 * finished (plan/project-workspace WS-23), so the rail's Sprint quiz and Sprint
 * mock buttons can open the first one still to do.
 */
export async function getSprintGatesDone(projectId: string): Promise<Result<{ quiz: string[]; mock: string[] }>> {
    try {
        const session = await getSession(headers())
        const userId = session?.user?.id
        if (!userId) return { success: false, error: 'Please sign in' }
        const [quiz, mock] = await Promise.all([
            db.selectDistinct({ sprintId: projectV2SprintQuizzes.sprintId }).from(projectV2SprintQuizAttempts)
                .innerJoin(projectV2SprintQuizzes, eq(projectV2SprintQuizzes.id, projectV2SprintQuizAttempts.quizId))
                .where(and(eq(projectV2SprintQuizzes.projectId, projectId), eq(projectV2SprintQuizAttempts.userId, userId), sql`${projectV2SprintQuizzes.sprintId} is not null`)),
            db.selectDistinct({ sprintId: projectV2SprintMockSessions.sprintId }).from(projectV2SprintMockSessions)
                .where(and(eq(projectV2SprintMockSessions.projectId, projectId), eq(projectV2SprintMockSessions.userId, userId), eq(projectV2SprintMockSessions.status, 'ended'), sql`${projectV2SprintMockSessions.sprintId} is not null`)),
        ])
        return { success: true, data: { quiz: quiz.map((r) => r.sprintId!), mock: mock.map((r) => r.sprintId!) } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}
