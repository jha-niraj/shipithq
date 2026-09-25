'use server'

import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import { and, desc, eq, max, sql } from 'drizzle-orm'
import {
    creditTransactions, db, projectAiMessages, projectsV2, projectV2Sprints, projectV2Tasks, userProjectV2Progress,
    userTaskV2Statuses, users, withTransaction,
} from '@repo/db'
import { toErrorMessage } from '@/lib/errors'
import { priceOf } from '@/lib/credits/pricing'
import { loadWorkspacePlan, type WorkspacePlanSprint } from '@/lib/projects/workspace-plan'
import { writeProjectAiReply } from '@/lib/projects/project-ai-reply'
import { isSetupSprint } from '@/lib/projects/sprints'

/*
 * The workspace's Project AI (plan/project-workspace WS-15).
 *
 * Asking is free and answered inline (WS-22; it was the worker's `project_ai`
 * job until 2026-09-24). The reply may carry a
 * PROPOSED task or sprint; nothing is written until the owner presses Add,
 * which is where the 5 credits are taken - in the same transaction that writes
 * the rows, so a charge without the task, or a task without the charge, cannot
 * happen. Cancel writes nothing and charges nothing.
 */

export interface AiMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    proposal: AiProposal | null
    proposalStatus: 'pending' | 'added' | 'discarded' | null
    createdAt: string
}

type TaskDraft = { title: string; description: string[]; criteria: string[]; hints: string[]; estimatedTime: string }
export type AiProposal =
    | ({ kind: 'task'; sprintNumber: number } & TaskDraft)
    | { kind: 'sprint'; name: string; goal: string; duration: string; tasks: TaskDraft[] }

type Result<T> = { success: true; data: T } | { success: false; error: string }

/** A message longer than this is cut. */
const MAX_MESSAGE_CHARS = 2000
const HISTORY_SHOWN = 60
/** Longer than the reply's timeout: an older unanswered question was a crash, not a reply in flight. */
const IN_FLIGHT_MS = 40_000

async function ownedProject(projectId: string) {
    const session = await getSession(headers())
    const userId = session?.user?.id
    if (!userId) return null
    const project = await db.query.projectsV2.findFirst({
        where: and(eq(projectsV2.id, projectId), eq(projectsV2.createdBy, userId)),
        columns: { id: true, slug: true },
    })
    return project ? { ...project, userId } : null
}

function toMessage(row: typeof projectAiMessages.$inferSelect): AiMessage {
    return {
        id: row.id,
        role: row.role === 'assistant' ? 'assistant' : 'user',
        content: row.content,
        proposal: (row.proposal as AiProposal | null) ?? null,
        proposalStatus: (row.proposalStatus as AiMessage['proposalStatus']) ?? null,
        createdAt: row.createdAt.toISOString(),
    }
}

/** The conversation, oldest first. */
export async function listAiMessages(projectId: string): Promise<Result<{ messages: AiMessage[] }>> {
    try {
        const project = await ownedProject(projectId)
        if (!project) return { success: false, error: 'Project not found' }
        const rows = await db.query.projectAiMessages.findMany({
            where: eq(projectAiMessages.projectId, project.id),
            orderBy: [desc(projectAiMessages.createdAt)],
            limit: HISTORY_SHOWN,
        })
        return { success: true, data: { messages: rows.reverse().map(toMessage) } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

/**
 * Stores the learner's message and writes the reply inline (WS-22): one short,
 * free completion with a 25-second timeout. When the reply fails the question
 * is removed again, so the conversation never holds a message nobody answered
 * and the learner can simply send it again.
 */
export async function sendAiMessage(
    projectId: string,
    content: string,
    taskId: string | null,
): Promise<Result<{ question: AiMessage; reply: AiMessage }>> {
    try {
        const text = content.trim().slice(0, MAX_MESSAGE_CHARS)
        if (!text) return { success: false, error: 'Write a message first.' }
        const project = await ownedProject(projectId)
        if (!project) return { success: false, error: 'Project not found' }

        // One reply at a time: a question newer than any reply is still being answered.
        const [last] = await db.select({ role: projectAiMessages.role, createdAt: projectAiMessages.createdAt })
            .from(projectAiMessages).where(eq(projectAiMessages.projectId, project.id))
            .orderBy(desc(projectAiMessages.createdAt)).limit(1)
        if (last?.role === 'user' && Date.now() - last.createdAt.getTime() < IN_FLIGHT_MS) {
            return { success: false, error: 'The AI is still answering your last message.' }
        }

        const [question] = await db.insert(projectAiMessages).values({
            projectId: project.id, userId: project.userId, role: 'user', content: text, taskId,
        }).returning()

        let reply: Awaited<ReturnType<typeof writeProjectAiReply>>
        try {
            reply = await writeProjectAiReply({ projectId: project.id, userId: project.userId, question: { id: question!.id, content: text, taskId } })
        } catch (error: unknown) {
            await db.delete(projectAiMessages).where(eq(projectAiMessages.id, question!.id))
            const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
            return { success: false, error: timedOut ? 'The AI took too long. Send it again.' : toErrorMessage(error) }
        }

        const [answer] = await db.insert(projectAiMessages).values({
            projectId: project.id,
            userId: project.userId,
            role: 'assistant',
            content: reply.content,
            taskId,
            proposal: reply.proposal ?? null,
            proposalStatus: reply.proposal ? 'pending' : null,
        }).returning()
        return { success: true, data: { question: toMessage(question!), reply: toMessage(answer!) } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const cleanList = (v: unknown, n: number, max: number) =>
    Array.isArray(v) ? v.map((x) => clean(x, max)).filter(Boolean).slice(0, n) : []

/* The stored proposal is checked again before anything is written: it came from a model. */
function sanitizeTask(t: TaskDraft): TaskDraft | null {
    const out = {
        title: clean(t.title, 140),
        description: cleanList(t.description, 3, 800),
        criteria: cleanList(t.criteria, 5, 300),
        hints: cleanList(t.hints, 3, 300),
        estimatedTime: clean(t.estimatedTime, 40) || '1 hour',
    }
    return out.title && out.description.length && out.criteria.length ? out : null
}

/**
 * Adds what the AI proposed, charging 5 credits, all in one transaction:
 * the debit is guarded in SQL, the rows are inserted, the owner's progress is
 * recounted (a new task lowers the percentage; a finished project reopens),
 * and the proposal is marked added so it cannot be applied twice.
 */
export async function applyAiProposal(projectId: string, messageId: string): Promise<Result<{ plan: WorkspacePlanSprint[]; added: string }>> {
    try {
        const project = await ownedProject(projectId)
        if (!project) return { success: false, error: 'Project not found' }
        const message = await db.query.projectAiMessages.findFirst({
            where: and(eq(projectAiMessages.id, messageId), eq(projectAiMessages.projectId, project.id), eq(projectAiMessages.role, 'assistant')),
        })
        if (!message?.proposal) return { success: false, error: 'There is nothing to add in that reply.' }
        if (message.proposalStatus !== 'pending') return { success: false, error: 'That proposal was already handled.' }

        const proposal = message.proposal as AiProposal
        const cost = priceOf('project_ai_write')
        const { userId } = project

        const added = await withTransaction(async (tx) => {
            // Claimed first, so a double click cannot add twice.
            const claimed = await tx.update(projectAiMessages)
                .set({ proposalStatus: 'added' })
                .where(and(eq(projectAiMessages.id, message.id), eq(projectAiMessages.proposalStatus, 'pending')))
                .returning({ id: projectAiMessages.id })
            if (claimed.length === 0) throw new Error('That proposal was already handled.')

            const debited = await tx.update(users)
                .set({ credits: sql`${users.credits} - ${cost}` })
                .where(and(eq(users.id, userId), sql`${users.credits} >= ${cost}`))
                .returning({ id: users.id })
            if (debited.length === 0) throw new Error(`You need ${cost} credits to add this.`)

            let label: string
            if (proposal.kind === 'task') {
                const task = sanitizeTask(proposal)
                if (!task) throw new Error('That proposal is incomplete.')
                // Setup is fixed (plan/project-repos RP-3); the worker never proposes into it.
                if (isSetupSprint(Number(proposal.sprintNumber))) throw new Error('Tasks cannot be added to Setup.')
                const sprint = await tx.query.projectV2Sprints.findFirst({
                    where: and(eq(projectV2Sprints.projectId, project.id), eq(projectV2Sprints.sprintNumber, Number(proposal.sprintNumber))),
                    columns: { id: true, sprintNumber: true },
                })
                if (!sprint) throw new Error('The sprint it was meant for no longer exists.')
                const [{ last } = { last: null }] = await tx.select({ last: max(projectV2Tasks.orderIndex) }).from(projectV2Tasks).where(eq(projectV2Tasks.sprintId, sprint.id))
                await tx.insert(projectV2Tasks).values({
                    ...task, sprintId: sprint.id, projectV2Id: project.id, createdBy: userId,
                    difficulty: 'BEGINNER', assessmentType: 'NONE', orderIndex: (last ?? -1) + 1,
                })
                label = `"${task.title}" to Sprint ${sprint.sprintNumber}`
            } else {
                const tasks = (proposal.tasks ?? []).map(sanitizeTask).filter((t): t is TaskDraft => !!t)
                const name = clean(proposal.name, 80)
                if (!name || tasks.length < 2) throw new Error('That proposal is incomplete.')
                const [agg] = await tx.select({ lastNumber: max(projectV2Sprints.sprintNumber), lastOrder: max(projectV2Sprints.orderIndex) })
                    .from(projectV2Sprints).where(eq(projectV2Sprints.projectId, project.id))
                const number = (agg?.lastNumber ?? 0) + 1
                const [sprint] = await tx.insert(projectV2Sprints).values({
                    projectId: project.id, sprintNumber: number, name, goal: clean(proposal.goal, 300),
                    duration: clean(proposal.duration, 40) || '1 week', orderIndex: (agg?.lastOrder ?? -1) + 1,
                    createdBy: userId, isApproved: true, isPersonal: false,
                }).returning({ id: projectV2Sprints.id })
                await tx.insert(projectV2Tasks).values(tasks.map((t, i) => ({
                    ...t, sprintId: sprint!.id, projectV2Id: project.id, createdBy: userId,
                    difficulty: 'BEGINNER' as const, assessmentType: 'NONE' as const, orderIndex: i,
                })))
                label = `Sprint ${number}, "${name}", with ${tasks.length} tasks`
            }

            await tx.insert(creditTransactions).values({
                userId, amount: -cost, type: 'SPEND', currency: 'INR', description: `Project AI added ${label}`.slice(0, 250),
            })

            // Recount the owner's progress against the new total.
            const progress = await tx.query.userProjectV2Progress.findFirst({
                where: and(eq(userProjectV2Progress.userId, userId), eq(userProjectV2Progress.projectId, project.id)),
                columns: { id: true },
            })
            if (progress) {
                const [totals] = await tx.select({ total: sql<number>`count(*)::int` }).from(projectV2Tasks)
                    .innerJoin(projectV2Sprints, eq(projectV2Sprints.id, projectV2Tasks.sprintId))
                    .where(eq(projectV2Sprints.projectId, project.id))
                const [doneRow] = await tx.select({ done: sql<number>`count(*)::int` }).from(userTaskV2Statuses)
                    .where(and(eq(userTaskV2Statuses.userId, userId), eq(userTaskV2Statuses.projectId, project.id), eq(userTaskV2Statuses.status, 'COMPLETED')))
                const total = totals?.total ?? 0
                const done = doneRow?.done ?? 0
                await tx.update(userProjectV2Progress).set({
                    totalTasks: total,
                    tasksCompleted: done,
                    progressPercentage: total > 0 ? (done / total) * 100 : 0,
                    status: total > 0 && done === total ? 'COMPLETED' : 'IN_PROGRESS',
                    completedAt: total > 0 && done === total ? new Date() : null,
                }).where(eq(userProjectV2Progress.id, progress.id))
            }
            return label
        })

        return { success: true, data: { plan: await loadWorkspacePlan(project.id, userId), added } }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

export async function discardAiProposal(projectId: string, messageId: string): Promise<Result<null>> {
    try {
        const project = await ownedProject(projectId)
        if (!project) return { success: false, error: 'Project not found' }
        await db.update(projectAiMessages).set({ proposalStatus: 'discarded' }).where(and(
            eq(projectAiMessages.id, messageId), eq(projectAiMessages.projectId, project.id), eq(projectAiMessages.proposalStatus, 'pending'),
        ))
        return { success: true, data: null }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}

/** Kept for the workspace: the plan after any change, in its own shape. */
export async function getWorkspacePlan(projectId: string): Promise<Result<WorkspacePlanSprint[]>> {
    try {
        const project = await ownedProject(projectId)
        if (!project) return { success: false, error: 'Project not found' }
        return { success: true, data: await loadWorkspacePlan(project.id, project.userId) }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) }
    }
}
