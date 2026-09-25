import { and, asc, desc, eq } from 'drizzle-orm'
import { db, projectAiMessages, projectsV2, projectV2Sprints, userTaskV2Statuses } from '@repo/db'
import { modelFor } from '@repo/ai'
import { PROJECT_AI_SYSTEM, validateProposal, type Proposal } from '@repo/ai/project-ai'

/*
 * One Project AI reply, written inline by the server action (plan/project-workspace
 * WS-22, Niraj 2026-09-24). It used to be the worker's `project_ai` job; a reply
 * is one short, free completion, so the job round trip only added a way to fail.
 *
 * It reads the plan, the learner's notes, the current task and the recent
 * conversation, asks the model, and checks the proposal before returning it.
 * Nothing is written here - the caller stores the reply.
 */

const HISTORY = 12
/** Under a Worker request's budget, with room left to store the reply. */
const TIMEOUT_MS = 25_000
/** Longer than this beside a proposal card, the reply is repeating the card. */
const REPLY_WITH_CARD_MAX = 320

export interface Reply {
    content: string
    proposal: Proposal | null
}

export async function writeProjectAiReply(input: {
    projectId: string
    userId: string
    question: { id: string; content: string; taskId: string | null }
}): Promise<Reply> {
    const project = await db.query.projectsV2.findFirst({
        where: and(eq(projectsV2.id, input.projectId), eq(projectsV2.createdBy, input.userId)),
        columns: { id: true, title: true, description: true, technologies: true, stacks: true },
        with: {
            sprints: {
                orderBy: [asc(projectV2Sprints.orderIndex)],
                columns: { id: true, sprintNumber: true, name: true, goal: true },
                with: { tasks: { orderBy: (t, { asc: a }) => [a(t.orderIndex)], columns: { id: true, title: true, description: true, criteria: true } } },
            },
        },
    })
    if (!project) throw new Error('That project is not yours')

    const [statuses, earlier] = await Promise.all([
        db.select({ taskId: userTaskV2Statuses.taskId, status: userTaskV2Statuses.status, notes: userTaskV2Statuses.notes })
            .from(userTaskV2Statuses)
            .where(and(eq(userTaskV2Statuses.userId, input.userId), eq(userTaskV2Statuses.projectId, project.id))),
        db.query.projectAiMessages.findMany({
            where: eq(projectAiMessages.projectId, project.id),
            orderBy: [desc(projectAiMessages.createdAt)],
            limit: HISTORY + 1,
            columns: { id: true, role: true, content: true },
        }),
    ])
    const done = new Set(statuses.filter((s) => s.status === 'COMPLETED').map((s) => s.taskId))
    const notes = new Map(statuses.filter((s) => s.notes?.trim()).map((s) => [s.taskId, s.notes!.trim().slice(0, 400)]))

    const plan = project.sprints.map((sp) =>
        `${sp.sprintNumber === 0 ? 'Setup' : `Sprint ${sp.sprintNumber}`}: ${sp.name} - ${sp.goal}\n` +
        sp.tasks.map((t, i) => `  ${i + 1}. [${done.has(t.id) ? 'done' : 'open'}] ${t.title}${notes.has(t.id) ? `\n     learner's note: ${notes.get(t.id)}` : ''}`).join('\n'),
    ).join('\n')

    const current = project.sprints.flatMap((sp) => sp.tasks.map((t) => ({ sp, t }))).find((x) => x.t.id === input.question.taskId)
    const currentBlock = current
        ? `The learner is on ${current.sp.sprintNumber === 0 ? 'Setup' : `Sprint ${current.sp.sprintNumber}`}, task "${current.t.title}".\nBrief: ${(current.t.description ?? []).join(' ')}\nDone when: ${(current.t.criteria ?? []).join('; ')}`
        : 'No task is selected.'

    // Said in the request itself, not only in the system prompt: the model
    // otherwise copies its own earlier replies, Setup included (WS-22 check).
    const numbered = project.sprints.filter((sp) => sp.sprintNumber > 0)
    const rules = numbered.length
        ? `Sprints a task may go in: ${numbered.map((sp) => `Sprint ${sp.sprintNumber} (${sp.name})`).join(', ')}. Never Setup. A new sprint becomes Sprint ${Math.max(...numbered.map((sp) => sp.sprintNumber)) + 1}.`
        : 'There are no numbered sprints yet: a task cannot be added until a sprint exists. A new sprint becomes Sprint 1.'

    const history = earlier.reverse().filter((m) => m.id !== input.question.id)
        .map((m) => `${m.role === 'user' ? 'LEARNER' : 'YOU'}: ${m.content.slice(0, 1500)}`).join('\n\n')

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
            model: modelFor('projectAi'),
            temperature: 0.4,
            max_tokens: 1800,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: PROJECT_AI_SYSTEM },
                {
                    role: 'user',
                    content: `Project: ${project.title}\n${project.description}\nStack: ${stackLine(project.stacks, project.technologies)}\n\nThe plan:\n${plan || '(no sprints yet)'}\n\n${currentBlock}\n\nEarlier in this conversation (your earlier replies are not a pattern to follow):\n${history || '(nothing yet)'}\n\n${rules}\n\nLEARNER: ${input.question.content}`,
                },
            ],
        }),
    })
    if (!res.ok) throw new Error(`The AI is unavailable right now (${res.status}).`)
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string | null } }> }

    let parsed: { reply?: unknown; proposal?: unknown }
    try {
        parsed = JSON.parse(body.choices?.[0]?.message?.content ?? '') as { reply?: unknown; proposal?: unknown }
    } catch {
        throw new Error('The AI returned something unreadable. Ask again.')
    }
    const content = typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim().slice(0, 4000) : null
    if (!content) throw new Error('The AI returned an empty reply. Ask again.')
    // Never into Setup (sprint 0, plan/project-repos RP-3).
    const proposal = validateProposal(parsed.proposal, project.sprints.map((sp) => sp.sprintNumber).filter((n) => n > 0))
    if (!proposal) return { content, proposal }
    // The card shows the proposal; a reply that also lists it says everything
    // twice. The model does that despite the prompt, so a long one is replaced.
    const nextSprint = Math.max(0, ...project.sprints.map((sp) => sp.sprintNumber)) + 1
    const short = content.length <= REPLY_WITH_CARD_MAX ? content
        : proposal.kind === 'task'
            ? `Here is a task for Sprint ${proposal.sprintNumber}: "${proposal.title}". Add it, or cancel and tell me what to change.`
            : `Here is Sprint ${nextSprint}, "${proposal.name}", with ${proposal.tasks.length} tasks. Add it, or cancel and tell me what to change.`
    return { content: short, proposal }
}

/** "frontend: React, backend: Hono" from the project's stacks, else its technologies. */
function stackLine(stacks: unknown, technologies: string[] | null): string {
    const parts = stacks && typeof stacks === 'object' && !Array.isArray(stacks)
        ? Object.entries(stacks as Record<string, unknown>).filter(([, v]) => typeof v === 'string' && v.trim() && !/^none$/i.test(v.trim())).map(([k, v]) => `${k}: ${v}`)
        : []
    return parts.join(', ') || (technologies ?? []).join(', ') || 'not stated'
}
