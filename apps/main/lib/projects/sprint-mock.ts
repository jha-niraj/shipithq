import 'server-only'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db, projectsV2, projectV2Sprints, projectV2Tasks, userTaskV2Statuses } from '@repo/db'
import { modelFor } from '@repo/ai'
import {
    SPRINT_MOCK_FEEDBACK, SPRINT_MOCK_INTERVIEWER, mockContextBlock, mockTranscriptBlock, validateInterviewerTurn, validateMockFeedback,
    type MockContext, type MockFeedbackDraft,
} from '@repo/ai/sprint-mock'

/*
 * The sprint mock interviewer, inline (plan/project-workspace WS-24): each
 * question and the feedback are one model call in the action, with a 25-second
 * timeout (CLAUDE.md "Long-running work": chat is not a worker job). The
 * prompts and the checks on the model's reply live in @repo/ai/sprint-mock.
 */

const TIMEOUT_MS = 25_000

export type MockTurnRow = { role: 'interviewer' | 'learner'; text: string; at: string }

async function chatJSON(system: string, user: string, maxTokens: number, temperature: number): Promise<unknown> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
            model: modelFor('sprintMock'),
            temperature,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        }),
    })
    if (!res.ok) throw new Error(`The interviewer is unavailable right now (${res.status}).`)
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string | null } }> }
    return JSON.parse(body.choices?.[0]?.message?.content ?? 'null')
}

/** What the interviewer knows: one sprint's tasks, or (sprintId null, the final interview) every build sprint's. */
export async function mockContext(sprintId: string | null, projectId: string, userId: string): Promise<MockContext & { pct: number }> {
    const [project, sprints, statuses] = await Promise.all([
        db.query.projectsV2.findFirst({ where: and(eq(projectsV2.id, projectId), eq(projectsV2.createdBy, userId)), columns: { title: true, stacks: true, technologies: true } }),
        db.select({ id: projectV2Sprints.id, number: projectV2Sprints.sprintNumber, name: projectV2Sprints.name, goal: projectV2Sprints.goal })
            .from(projectV2Sprints).where(eq(projectV2Sprints.projectId, projectId)).orderBy(asc(projectV2Sprints.orderIndex)),
        db.select({ taskId: userTaskV2Statuses.taskId, status: userTaskV2Statuses.status, notes: userTaskV2Statuses.notes }).from(userTaskV2Statuses)
            .where(and(eq(userTaskV2Statuses.userId, userId), eq(userTaskV2Statuses.projectId, projectId))),
    ])
    if (!project) throw new Error('That project is not yours')
    const sprint = sprintId ? sprints.find((sp) => sp.id === sprintId) : null
    if (sprintId && !sprint) throw new Error('That sprint no longer exists')

    const allTasks = sprints.length
        ? await db.select({ id: projectV2Tasks.id, sprintId: projectV2Tasks.sprintId, title: projectV2Tasks.title, description: projectV2Tasks.description, criteria: projectV2Tasks.criteria })
            .from(projectV2Tasks).where(inArray(projectV2Tasks.sprintId, sprints.map((sp) => sp.id))).orderBy(asc(projectV2Tasks.orderIndex))
        : []
    const byTask = new Map(statuses.map((s) => [s.taskId, s]))
    const done = allTasks.filter((t) => byTask.get(t.id)?.status === 'COMPLETED').length
    const pct = allTasks.length ? Math.round((done / allTasks.length) * 100) : 0

    const inScope = new Set((sprint ? [sprint] : sprints.filter((sp) => sp.number > 0)).map((sp) => sp.id))
    const order = new Map(sprints.map((sp, i) => [sp.id, i]))
    const label = new Map(sprints.map((sp) => [sp.id, `Sprint ${sp.number}`]))
    const tasks = allTasks.filter((t) => inScope.has(t.sprintId)).sort((x, y) => order.get(x.sprintId)! - order.get(y.sprintId)!)

    const stacks = (project.stacks ?? {}) as Record<string, unknown>
    const stack = Object.entries(stacks)
        .filter(([, v]) => typeof v === 'string' && v.trim() && !/^none$/i.test(v.trim()))
        .map(([k, v]) => `${k}: ${v}`).join(', ') || (project.technologies ?? []).join(', ') || 'not stated'
    return {
        projectTitle: project.title,
        stack,
        scope: sprint ? `Sprint ${sprint.number}: ${sprint.name}\nGoal: ${sprint.goal}` : 'THE WHOLE PROJECT (the final interview), every sprint',
        tasks: tasks.map((t) => ({
            sprint: sprint ? undefined : label.get(t.sprintId),
            title: t.title,
            brief: (t.description ?? []).join(' '),
            criteria: t.criteria ?? [],
            note: byTask.get(t.id)?.notes ?? null,
        })),
        pct,
    }
}

/** The interviewer's next line. Throws when the model fails or says nothing usable. */
export async function interviewerLine(context: MockContext, transcript: MockTurnRow[]): Promise<{ message: string; done: boolean }> {
    const raw = await chatJSON(SPRINT_MOCK_INTERVIEWER, `${mockContextBlock(context)}\n\nThe interview so far:\n${mockTranscriptBlock(transcript)}\n\nYour next line.`, 600, 0.5)
    const turn = validateInterviewerTurn(raw, transcript.filter((t) => t.role === 'interviewer').length)
    if (!turn) throw new Error("The interviewer's reply was empty")
    return turn
}

/** The session's feedback. A session with no answers gets a fixed note, not a model call. */
export async function mockFeedback(context: MockContext, transcript: MockTurnRow[]): Promise<MockFeedbackDraft> {
    if (!transcript.some((t) => t.role === 'learner')) {
        return { score: 0, summary: 'The interview ended before you answered a question, so there is nothing to score yet.', strengths: [], gaps: [], nextSteps: ['Start a new session when you have twenty minutes to talk it through.'] }
    }
    const feedback = validateMockFeedback(await chatJSON(SPRINT_MOCK_FEEDBACK, `${mockContextBlock(context)}\n\nThe interview:\n${mockTranscriptBlock(transcript)}`, 1200, 0.3))
    if (!feedback) throw new Error('The feedback could not be written; try ending the interview again')
    return feedback
}
