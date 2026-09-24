'use server'

import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import {
    backgroundJobs, db, projectsV2, projectV2Sprints, projectV2SprintMockSessions, projectV2Tasks, userTaskV2Statuses,
    type SprintMockFeedback,
} from '@repo/db'
import { toErrorMessage } from '@/lib/errors'
import { priceOf } from '@/lib/credits/pricing'
import { isSetupSprint } from '@/lib/projects/sprints'
import { MOCK_UNLOCK_PERCENT, mockUnlocked } from '@/lib/projects/gates'
import { startBackgroundJob } from '@/actions/(main)/workers/jobs.action'

/*
 * Sprint mock interviews (plan/project-workspace WS-13, decided by Niraj
 * 2026-09-24): 30 credits a session, open when every task in the sprint is
 * done, answered by typing or dictation. The worker writes the interviewer's
 * lines and the feedback; this file writes the learner's lines and dispatches.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

const MAX_ANSWER_CHARS = 4000

export interface MockSessionView {
    id: string
    status: 'opening' | 'active' | 'ended' | 'failed'
    transcript: { role: 'interviewer' | 'learner'; text: string; at: string }[]
    feedback: SprintMockFeedback | null
    createdAt: string
}

export interface SprintMockState {
    /** Newest first. */
    sessions: MockSessionView[]
    /** The job writing the interviewer's next line or the feedback, if one is running. */
    pendingJobId: string | null
    tasksLeft: number
    price: number
    /** The final interview only: where it opens and where the learner is (share of all tasks). */
    gate?: { unlockAt: number; progress: number; open: boolean }
}

async function currentUserId() {
    const session = await getSession(headers())
    return session?.user?.id ?? null
}

async function ownedSprint(sprintId: string, userId: string) {
    const [row] = await db
        .select({ id: projectV2Sprints.id, number: projectV2Sprints.sprintNumber, name: projectV2Sprints.name, projectId: projectV2Sprints.projectId })
        .from(projectV2Sprints)
        .innerJoin(projectsV2, eq(projectsV2.id, projectV2Sprints.projectId))
        .where(and(eq(projectV2Sprints.id, sprintId), eq(projectsV2.createdBy, userId)))
        .limit(1)
    return row ?? null
}

async function tasksLeft(sprintId: string, userId: string): Promise<number> {
    const [row] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(projectV2Tasks)
        .leftJoin(userTaskV2Statuses, and(eq(userTaskV2Statuses.taskId, projectV2Tasks.id), eq(userTaskV2Statuses.userId, userId)))
        .where(and(eq(projectV2Tasks.sprintId, sprintId), sql`coalesce(${userTaskV2Statuses.status}::text, 'TO_DO') <> 'COMPLETED'`))
    return row?.n ?? 0
}

async function inFlightJob(userId: string, sessionIds: string[]): Promise<string | null> {
    if (sessionIds.length === 0) return null
    const [row] = await db.select({ jobId: backgroundJobs.jobId }).from(backgroundJobs).where(and(
        eq(backgroundJobs.userId, userId),
        eq(backgroundJobs.type, 'sprint_mock'),
        inArray(backgroundJobs.status, ['waiting', 'active']),
        inArray(sql`${backgroundJobs.input}->>'singleFlightKey'`, sessionIds),
    )).limit(1)
    return row?.jobId ?? null
}

function toView(row: typeof projectV2SprintMockSessions.$inferSelect): MockSessionView {
    return {
        id: row.id,
        status: (['opening', 'active', 'ended', 'failed'].includes(row.status) ? row.status : 'failed') as MockSessionView['status'],
        transcript: (row.transcript ?? []).map((t) => ({ role: t.role, text: t.text, at: t.at })),
        feedback: row.feedback ?? null,
        createdAt: row.createdAt.toISOString(),
    }
}

/** Everything the Mock interview tab needs for one sprint. */
export async function getSprintMock(sprintId: string): Promise<Result<SprintMockState>> {
    try {
        const userId = await currentUserId()
        if (!userId) return { success: false, error: 'Not signed in' }
        const sprint = await ownedSprint(sprintId, userId)
        if (!sprint) return { success: false, error: 'Sprint not found' }
        if (isSetupSprint(sprint.number)) return { success: false, error: 'Setup has no mock interview' }

        const [rows, left] = await Promise.all([
            db.query.projectV2SprintMockSessions.findMany({
                where: and(eq(projectV2SprintMockSessions.sprintId, sprint.id), eq(projectV2SprintMockSessions.userId, userId)),
                orderBy: [desc(projectV2SprintMockSessions.createdAt)],
                limit: 10,
            }),
            tasksLeft(sprint.id, userId),
        ])
        const live = rows.filter((r) => r.status === 'opening' || r.status === 'active').map((r) => r.id)
        return {
            success: true,
            data: { sessions: rows.map(toView), pendingJobId: await inFlightJob(userId, live), tasksLeft: left, price: priceOf('sprint_mock') },
        }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

/** A new session; the 30 credits are held on the job that asks the first question. */
export async function startSprintMock(sprintId: string): Promise<Result<{ sessionId: string; jobId: string }> & { requiredCredits?: number }> {
    try {
        const userId = await currentUserId()
        if (!userId) return { success: false, error: 'Not signed in' }
        const sprint = await ownedSprint(sprintId, userId)
        if (!sprint) return { success: false, error: 'Sprint not found' }
        if (isSetupSprint(sprint.number)) return { success: false, error: 'Setup has no mock interview' }
        const left = await tasksLeft(sprint.id, userId)
        if (left > 0) return { success: false, error: `Finish the sprint first: ${left} task${left === 1 ? '' : 's'} left.` }

        // A session still "opening" with no job running is one whose first
        // question never came (its job failed and was refunded): it is dead,
        // and must not block a new one.
        const opening = await db.select({ id: projectV2SprintMockSessions.id }).from(projectV2SprintMockSessions).where(and(
            eq(projectV2SprintMockSessions.sprintId, sprint.id),
            eq(projectV2SprintMockSessions.userId, userId),
            eq(projectV2SprintMockSessions.status, 'opening'),
        ))
        for (const o of opening) {
            if (!(await inFlightJob(userId, [o.id]))) {
                await db.update(projectV2SprintMockSessions).set({ status: 'failed' }).where(eq(projectV2SprintMockSessions.id, o.id))
            }
        }

        // One live session per sprint: a second Start while one runs would charge twice.
        const live = await db.query.projectV2SprintMockSessions.findFirst({
            where: and(
                eq(projectV2SprintMockSessions.sprintId, sprint.id),
                eq(projectV2SprintMockSessions.userId, userId),
                inArray(projectV2SprintMockSessions.status, ['opening', 'active']),
            ),
            columns: { id: true },
        })
        if (live) return { success: false, error: 'You already have an interview open for this sprint.' }

        const [session] = await db.insert(projectV2SprintMockSessions)
            .values({ projectId: sprint.projectId, sprintId: sprint.id, userId, status: 'opening' })
            .returning({ id: projectV2SprintMockSessions.id })
        const cost = priceOf('sprint_mock')
        const started = await startBackgroundJob('sprint_mock', { sessionId: session!.id, step: 'open' }, {
            cost,
            reason: `Sprint ${sprint.number} mock interview: ${sprint.name}`.slice(0, 250),
            singleFlight: true,
            singleFlightKey: session!.id,
        })
        if (!started.success || !started.jobId) {
            // Not dispatched, not charged: no session to show for it.
            await db.delete(projectV2SprintMockSessions).where(eq(projectV2SprintMockSessions.id, session!.id))
            return { success: false, error: started.error ?? 'Could not start the interview', requiredCredits: started.required ?? cost }
        }
        return { success: true, data: { sessionId: session!.id, jobId: started.jobId } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

async function ownedSession(sessionId: string, userId: string) {
    return db.query.projectV2SprintMockSessions.findFirst({
        where: and(eq(projectV2SprintMockSessions.id, sessionId), eq(projectV2SprintMockSessions.userId, userId)),
    })
}

/** The learner's answer, appended only while the interviewer is waiting for one; then the next line. */
export async function answerSprintMock(sessionId: string, answer: string): Promise<Result<{ jobId: string }>> {
    try {
        const userId = await currentUserId()
        if (!userId) return { success: false, error: 'Not signed in' }
        const text = answer.trim().slice(0, MAX_ANSWER_CHARS)
        if (!text) return { success: false, error: 'Type or say an answer first.' }
        const session = await ownedSession(sessionId, userId)
        if (!session) return { success: false, error: 'Interview not found' }

        // Appended in SQL, guarded on the last line being the interviewer's: a
        // double send, or a send while the next question is being written,
        // changes nothing.
        const turn = JSON.stringify([{ role: 'learner', text, at: new Date().toISOString() }])
        const appended = await db.update(projectV2SprintMockSessions)
            .set({ transcript: sql`${projectV2SprintMockSessions.transcript} || ${turn}::jsonb` })
            .where(and(
                eq(projectV2SprintMockSessions.id, session.id),
                eq(projectV2SprintMockSessions.status, 'active'),
                sql`${projectV2SprintMockSessions.transcript} -> -1 ->> 'role' = 'interviewer'`,
            ))
            .returning({ id: projectV2SprintMockSessions.id })
        if (appended.length === 0) return { success: false, error: 'The interviewer is not waiting for an answer right now.' }

        const started = await startBackgroundJob('sprint_mock', { sessionId: session.id, step: 'turn' }, { singleFlight: true, singleFlightKey: session.id })
        if (!started.success || !started.jobId) return { success: false, error: started.error ?? 'Could not reach the interviewer' }
        return { success: true, data: { jobId: started.jobId } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

/** End now and get feedback on what was said so far. */
export async function endSprintMock(sessionId: string): Promise<Result<{ jobId: string | null }>> {
    try {
        const userId = await currentUserId()
        if (!userId) return { success: false, error: 'Not signed in' }
        const session = await ownedSession(sessionId, userId)
        if (!session) return { success: false, error: 'Interview not found' }
        if (session.status === 'ended') return { success: true, data: { jobId: null } }
        if (session.status !== 'active') return { success: false, error: 'This interview has not started yet.' }
        const started = await startBackgroundJob('sprint_mock', { sessionId: session.id, step: 'feedback' }, { singleFlight: true, singleFlightKey: session.id })
        if (!started.success || !started.jobId) return { success: false, error: started.error ?? 'Could not end the interview' }
        return { success: true, data: { jobId: started.jobId } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

/** After a failed turn the transcript ends on the learner's line; this asks the interviewer again. */
export async function retrySprintMockTurn(sessionId: string): Promise<Result<{ jobId: string }>> {
    try {
        const userId = await currentUserId()
        if (!userId) return { success: false, error: 'Not signed in' }
        const session = await ownedSession(sessionId, userId)
        if (!session) return { success: false, error: 'Interview not found' }
        if (session.status !== 'active' || session.transcript.at(-1)?.role !== 'learner') {
            return { success: false, error: 'Nothing to retry.' }
        }
        const started = await startBackgroundJob('sprint_mock', { sessionId: session.id, step: 'turn' }, { singleFlight: true, singleFlightKey: session.id })
        if (!started.success || !started.jobId) return { success: false, error: started.error ?? 'Could not reach the interviewer' }
        return { success: true, data: { jobId: started.jobId } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

// ─── The final mock interview (plan/project-workspace WS-14) ──────────────────
// The same interviewer with the whole project as scope (sprint_id null), open at
// MOCK_UNLOCK_PERCENT of all tasks, the existing `project_mock` price (30).

async function ownedProjectFor(projectId: string, userId: string) {
    return db.query.projectsV2.findFirst({
        where: and(eq(projectsV2.id, projectId), eq(projectsV2.createdBy, userId)),
        columns: { id: true, title: true },
    })
}

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

const finalScope = (projectId: string, userId: string) => and(
    eq(projectV2SprintMockSessions.projectId, projectId),
    isNull(projectV2SprintMockSessions.sprintId),
    eq(projectV2SprintMockSessions.userId, userId),
)

export async function getFinalMock(projectId: string): Promise<Result<SprintMockState>> {
    try {
        const userId = await currentUserId()
        if (!userId) return { success: false, error: 'Not signed in' }
        const project = await ownedProjectFor(projectId, userId)
        if (!project) return { success: false, error: 'Project not found' }
        const [rows, progress] = await Promise.all([
            db.query.projectV2SprintMockSessions.findMany({ where: finalScope(project.id, userId), orderBy: [desc(projectV2SprintMockSessions.createdAt)], limit: 10 }),
            progressOf(project.id, userId),
        ])
        const live = rows.filter((r) => r.status === 'opening' || r.status === 'active').map((r) => r.id)
        return {
            success: true,
            data: {
                sessions: rows.map(toView),
                pendingJobId: await inFlightJob(userId, live),
                tasksLeft: 0,
                price: priceOf('project_mock'),
                gate: { unlockAt: MOCK_UNLOCK_PERCENT, progress, open: mockUnlocked(progress) },
            },
        }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

export async function startFinalMock(projectId: string): Promise<Result<{ sessionId: string; jobId: string }> & { requiredCredits?: number }> {
    try {
        const userId = await currentUserId()
        if (!userId) return { success: false, error: 'Not signed in' }
        const project = await ownedProjectFor(projectId, userId)
        if (!project) return { success: false, error: 'Project not found' }
        const progress = await progressOf(project.id, userId)
        if (!mockUnlocked(progress)) return { success: false, error: `The final mock interview opens at ${MOCK_UNLOCK_PERCENT}% of tasks; you are at ${progress}%.` }

        const opening = await db.select({ id: projectV2SprintMockSessions.id }).from(projectV2SprintMockSessions)
            .where(and(finalScope(project.id, userId), eq(projectV2SprintMockSessions.status, 'opening')))
        for (const o of opening) {
            if (!(await inFlightJob(userId, [o.id]))) {
                await db.update(projectV2SprintMockSessions).set({ status: 'failed' }).where(eq(projectV2SprintMockSessions.id, o.id))
            }
        }
        const live = await db.query.projectV2SprintMockSessions.findFirst({
            where: and(finalScope(project.id, userId), inArray(projectV2SprintMockSessions.status, ['opening', 'active'])),
            columns: { id: true },
        })
        if (live) return { success: false, error: 'You already have a final interview open.' }

        const [session] = await db.insert(projectV2SprintMockSessions)
            .values({ projectId: project.id, sprintId: null, userId, status: 'opening' })
            .returning({ id: projectV2SprintMockSessions.id })
        const cost = priceOf('project_mock')
        const started = await startBackgroundJob('sprint_mock', { sessionId: session!.id, step: 'open' }, {
            cost,
            reason: `Final mock interview: ${project.title}`.slice(0, 250),
            singleFlight: true,
            singleFlightKey: session!.id,
        })
        if (!started.success || !started.jobId) {
            await db.delete(projectV2SprintMockSessions).where(eq(projectV2SprintMockSessions.id, session!.id))
            return { success: false, error: started.error ?? 'Could not start the interview', requiredCredits: started.required ?? cost }
        }
        return { success: true, data: { sessionId: session!.id, jobId: started.jobId } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}
