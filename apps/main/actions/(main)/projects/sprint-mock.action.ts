'use server'

import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import {
    db, projectsV2, projectV2Sprints, projectV2SprintMockSessions, projectV2Tasks, userTaskV2Statuses,
    type SprintMockFeedback,
} from '@repo/db'
import { toErrorMessage } from '@/lib/errors'
import { priceOf } from '@/lib/credits/pricing'
import { releaseCredits, reserveCredits, settleCredits, toReleaseReason } from '@/lib/credits/hold'
import { isSetupSprint } from '@/lib/projects/sprints'
import { MOCK_UNLOCK_PERCENT, mockUnlocked } from '@/lib/projects/gates'
import { interviewerLine, mockContext, mockFeedback, type MockTurnRow } from '@/lib/projects/sprint-mock'

/*
 * Sprint mock interviews (plan/project-workspace WS-13, decided by Niraj
 * 2026-09-24): 30 credits a session, open when every task in the sprint is
 * done, answered by typing or dictation. Since WS-24 every step is inline: the
 * interviewer's line and the feedback are one model call each in the action
 * (lib/projects/sprint-mock.ts), never a worker job. The session's credits are
 * held when it opens, refunded if the first question never comes, and settled
 * once at feedback.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string; code?: 'ANSWER_BACK' }

const MAX_ANSWER_CHARS = 4000
const holdFor = (sessionId: string) => `sprint-mock:${sessionId}`

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
    tasksLeft: number
    price: number
    /** The final interview only: where it opens and where the learner is (share of all tasks). */
    gate?: { unlockAt: number; progress: number; open: boolean }
}

type SessionRow = typeof projectV2SprintMockSessions.$inferSelect

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

function toView(row: SessionRow): MockSessionView {
    return {
        id: row.id,
        status: (['opening', 'active', 'ended', 'failed'].includes(row.status) ? row.status : 'failed') as MockSessionView['status'],
        transcript: (row.transcript ?? []).map((t) => ({ role: t.role, text: t.text, at: t.at })),
        feedback: row.feedback ?? null,
        createdAt: row.createdAt.toISOString(),
    }
}

async function reload(sessionId: string): Promise<MockSessionView> {
    const row = await db.query.projectV2SprintMockSessions.findFirst({ where: eq(projectV2SprintMockSessions.id, sessionId) })
    return toView(row!)
}

/**
 * Append the interviewer's line, only if the transcript still ends where it did
 * when the question was asked: two requests at once can't both write a line.
 */
async function appendInterviewer(sessionId: string, text: string, expectLast: 'learner' | 'empty'): Promise<boolean> {
    const line = JSON.stringify([{ role: 'interviewer', text, at: new Date().toISOString() }])
    const guard = expectLast === 'empty'
        ? sql`jsonb_array_length(${projectV2SprintMockSessions.transcript}) = 0`
        : sql`${projectV2SprintMockSessions.transcript} -> -1 ->> 'role' = 'learner'`
    const rows = await db.update(projectV2SprintMockSessions)
        .set({ transcript: sql`${projectV2SprintMockSessions.transcript} || ${line}::jsonb`, status: 'active' })
        .where(and(eq(projectV2SprintMockSessions.id, sessionId), guard))
        .returning({ id: projectV2SprintMockSessions.id })
    return rows.length > 0
}

/** Write the feedback and end the session; the session's hold is settled here, once. */
async function finish(session: SessionRow, userId: string): Promise<void> {
    const context = await mockContext(session.sprintId, session.projectId, userId)
    const fresh = await db.query.projectV2SprintMockSessions.findFirst({ where: eq(projectV2SprintMockSessions.id, session.id) })
    const feedback = await mockFeedback(context, (fresh?.transcript ?? []) as MockTurnRow[])
    const ended = await db.update(projectV2SprintMockSessions)
        .set({ status: 'ended', feedback, endedAt: new Date() })
        .where(and(eq(projectV2SprintMockSessions.id, session.id), inArray(projectV2SprintMockSessions.status, ['opening', 'active'])))
        .returning({ id: projectV2SprintMockSessions.id })
    if (ended.length) await settleCredits(holdFor(session.id))
}

/**
 * A new session: hold its credits, then ask the first question inline. If the
 * question never comes, the session is marked failed and the hold released.
 */
async function openSession(input: { projectId: string; sprintId: string | null; userId: string; cost: number; reason: string }): Promise<Result<{ session: MockSessionView }> & { requiredCredits?: number }> {
    const [session] = await db.insert(projectV2SprintMockSessions)
        .values({ projectId: input.projectId, sprintId: input.sprintId, userId: input.userId, status: 'opening' })
        .returning()
    const hold = await reserveCredits({ userId: input.userId, amount: input.cost, reason: input.reason, holdId: holdFor(session!.id) })
    if (!hold.ok) {
        await db.delete(projectV2SprintMockSessions).where(eq(projectV2SprintMockSessions.id, session!.id))
        return { success: false, error: hold.error, requiredCredits: input.cost }
    }
    try {
        const context = await mockContext(input.sprintId, input.projectId, input.userId)
        // The final interview's gate, re-checked where the credits are at stake.
        if (!input.sprintId && !mockUnlocked(context.pct)) throw new Error(`The final mock interview opens at ${MOCK_UNLOCK_PERCENT}% of tasks; you are at ${context.pct}%`)
        const first = await interviewerLine(context, [])
        if (!(await appendInterviewer(session!.id, first.message, 'empty'))) throw new Error('The interview already started')
        return { success: true, data: { session: await reload(session!.id) } }
    } catch (error: unknown) {
        await db.update(projectV2SprintMockSessions).set({ status: 'failed' }).where(eq(projectV2SprintMockSessions.id, session!.id))
        await releaseCredits(holdFor(session!.id), toReleaseReason(error))
        return { success: false, error: `${toErrorMessage(error)} Your credits were refunded.` }
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
        return { success: true, data: { sessions: rows.map(toView), tasksLeft: left, price: priceOf('sprint_mock') } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

/** A session still "opening" never got its first question (it failed before WS-24, or mid-request): it is dead. */
async function clearDeadOpenings(where: ReturnType<typeof and>) {
    await db.update(projectV2SprintMockSessions).set({ status: 'failed' })
        .where(and(where, eq(projectV2SprintMockSessions.status, 'opening'), sql`${projectV2SprintMockSessions.createdAt} < now() - interval '2 minutes'`))
}

export async function startSprintMock(sprintId: string): Promise<Result<{ session: MockSessionView }> & { requiredCredits?: number }> {
    try {
        const userId = await currentUserId()
        if (!userId) return { success: false, error: 'Not signed in' }
        const sprint = await ownedSprint(sprintId, userId)
        if (!sprint) return { success: false, error: 'Sprint not found' }
        if (isSetupSprint(sprint.number)) return { success: false, error: 'Setup has no mock interview' }
        const left = await tasksLeft(sprint.id, userId)
        if (left > 0) return { success: false, error: `Finish the sprint first: ${left} task${left === 1 ? '' : 's'} left.` }
        const scope = and(eq(projectV2SprintMockSessions.sprintId, sprint.id), eq(projectV2SprintMockSessions.userId, userId))
        await clearDeadOpenings(scope)
        // One live session per sprint: a second Start while one runs would charge twice.
        const live = await db.query.projectV2SprintMockSessions.findFirst({ where: and(scope, inArray(projectV2SprintMockSessions.status, ['opening', 'active'])), columns: { id: true } })
        if (live) return { success: false, error: 'You already have an interview open for this sprint.' }
        return openSession({ projectId: sprint.projectId, sprintId: sprint.id, userId, cost: priceOf('sprint_mock'), reason: `Sprint ${sprint.number} mock interview: ${sprint.name}`.slice(0, 250) })
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

async function ownedSession(sessionId: string, userId: string) {
    return db.query.projectV2SprintMockSessions.findFirst({
        where: and(eq(projectV2SprintMockSessions.id, sessionId), eq(projectV2SprintMockSessions.userId, userId)),
    })
}

/**
 * The learner's answer, then the interviewer's next line, inline. The answer is
 * appended only while the interviewer is waiting for one, so a double send
 * changes nothing. If the interviewer fails, the answer is taken back out and
 * the error says so (code ANSWER_BACK), so the learner can send it again.
 */
export async function answerSprintMock(sessionId: string, answer: string): Promise<Result<{ session: MockSessionView }>> {
    try {
        const userId = await currentUserId()
        if (!userId) return { success: false, error: 'Not signed in' }
        const text = answer.trim().slice(0, MAX_ANSWER_CHARS)
        if (!text) return { success: false, error: 'Type or say an answer first.' }
        const session = await ownedSession(sessionId, userId)
        if (!session) return { success: false, error: 'Interview not found' }

        const turn = JSON.stringify([{ role: 'learner', text, at: new Date().toISOString() }])
        const appended = await db.update(projectV2SprintMockSessions)
            .set({ transcript: sql`${projectV2SprintMockSessions.transcript} || ${turn}::jsonb` })
            .where(and(
                eq(projectV2SprintMockSessions.id, session.id),
                eq(projectV2SprintMockSessions.status, 'active'),
                sql`${projectV2SprintMockSessions.transcript} -> -1 ->> 'role' = 'interviewer'`,
            ))
            .returning({ transcript: projectV2SprintMockSessions.transcript })
        if (appended.length === 0) return { success: false, error: 'The interviewer is not waiting for an answer right now.' }

        let next: { message: string; done: boolean }
        try {
            const context = await mockContext(session.sprintId, session.projectId, userId)
            next = await interviewerLine(context, appended[0]!.transcript as MockTurnRow[])
        } catch (error: unknown) {
            // Taken back out, only if it is still the last line: the learner resends it.
            await db.update(projectV2SprintMockSessions)
                .set({ transcript: sql`${projectV2SprintMockSessions.transcript} - -1` })
                .where(and(eq(projectV2SprintMockSessions.id, session.id), sql`${projectV2SprintMockSessions.transcript} -> -1 ->> 'role' = 'learner'`))
            return { success: false, error: `The interviewer couldn't answer (${toErrorMessage(error)}). Your answer is back in the box; send it again.`, code: 'ANSWER_BACK' }
        }
        if (!(await appendInterviewer(session.id, next.message, 'learner'))) return { success: true, data: { session: await reload(session.id) } }
        if (next.done) {
            // Feedback right away; if it fails, "End interview" writes it later.
            await finish(session, userId).catch((e: unknown) => console.error('[sprint-mock] feedback after closing failed:', e))
        }
        return { success: true, data: { session: await reload(session.id) } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

/** End now and get feedback on what was said so far. */
export async function endSprintMock(sessionId: string): Promise<Result<{ session: MockSessionView }>> {
    try {
        const userId = await currentUserId()
        if (!userId) return { success: false, error: 'Not signed in' }
        const session = await ownedSession(sessionId, userId)
        if (!session) return { success: false, error: 'Interview not found' }
        if (session.status === 'ended') return { success: true, data: { session: toView(session) } }
        if (session.status !== 'active') return { success: false, error: 'This interview has not started yet.' }
        await finish(session, userId)
        return { success: true, data: { session: await reload(session.id) } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

/** A transcript that ends on the learner's line (a request cut off mid-turn) asks the interviewer again. */
export async function retrySprintMockTurn(sessionId: string): Promise<Result<{ session: MockSessionView }>> {
    try {
        const userId = await currentUserId()
        if (!userId) return { success: false, error: 'Not signed in' }
        const session = await ownedSession(sessionId, userId)
        if (!session) return { success: false, error: 'Interview not found' }
        if (session.status !== 'active' || session.transcript.at(-1)?.role !== 'learner') return { success: false, error: 'Nothing to retry.' }
        const context = await mockContext(session.sprintId, session.projectId, userId)
        const next = await interviewerLine(context, session.transcript as MockTurnRow[])
        if (await appendInterviewer(session.id, next.message, 'learner') && next.done) {
            await finish(session, userId).catch((e: unknown) => console.error('[sprint-mock] feedback after closing failed:', e))
        }
        return { success: true, data: { session: await reload(session.id) } }
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
        return {
            success: true,
            data: {
                sessions: rows.map(toView),
                tasksLeft: 0,
                price: priceOf('project_mock'),
                gate: { unlockAt: MOCK_UNLOCK_PERCENT, progress, open: mockUnlocked(progress) },
            },
        }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

export async function startFinalMock(projectId: string): Promise<Result<{ session: MockSessionView }> & { requiredCredits?: number }> {
    try {
        const userId = await currentUserId()
        if (!userId) return { success: false, error: 'Not signed in' }
        const project = await ownedProjectFor(projectId, userId)
        if (!project) return { success: false, error: 'Project not found' }
        const progress = await progressOf(project.id, userId)
        if (!mockUnlocked(progress)) return { success: false, error: `The final mock interview opens at ${MOCK_UNLOCK_PERCENT}% of tasks; you are at ${progress}%.` }
        await clearDeadOpenings(finalScope(project.id, userId))
        const live = await db.query.projectV2SprintMockSessions.findFirst({
            where: and(finalScope(project.id, userId), inArray(projectV2SprintMockSessions.status, ['opening', 'active'])),
            columns: { id: true },
        })
        if (live) return { success: false, error: 'You already have a final interview open.' }
        return openSession({ projectId: project.id, sprintId: null, userId, cost: priceOf('project_mock'), reason: `Final mock interview: ${project.title}`.slice(0, 250) })
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}
