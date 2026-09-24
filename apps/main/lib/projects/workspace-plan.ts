import 'server-only'
import { and, asc, eq } from 'drizzle-orm'
import { db, projectV2Sprints, userTaskV2Statuses } from '@repo/db'

/**
 * The plan as the workspace shows it: sprints in order, each task numbered by
 * its place in the sprint, with this user's status (plan/project-workspace).
 * One definition, used by the page and by anything that changes the plan
 * (the Project AI's Add), so the task list after an Add is exactly what a
 * reload would show.
 */
export interface WorkspacePlanTask {
    id: string
    number: number
    title: string
    description: string[]
    criteria: string[]
    hints: string[]
    estimatedTime: string | null
    difficulty: string
    testPath: string | null
    status: string
    /** What the learner wrote on finishing it (RP-6). */
    note: string | null
}

export interface WorkspacePlanSprint {
    id: string
    number: number
    name: string
    goal: string
    tasks: WorkspacePlanTask[]
}

export async function loadWorkspacePlan(projectId: string, userId: string): Promise<WorkspacePlanSprint[]> {
    const [sprints, statuses] = await Promise.all([
        db.query.projectV2Sprints.findMany({
            where: eq(projectV2Sprints.projectId, projectId),
            orderBy: [asc(projectV2Sprints.orderIndex)],
            with: { tasks: { orderBy: (t, { asc: a }) => [a(t.orderIndex)] } },
        }),
        db.select({ taskId: userTaskV2Statuses.taskId, status: userTaskV2Statuses.status, notes: userTaskV2Statuses.notes })
            .from(userTaskV2Statuses)
            .where(and(eq(userTaskV2Statuses.projectId, projectId), eq(userTaskV2Statuses.userId, userId))),
    ])
    const status = new Map(statuses.map((s) => [s.taskId, s.status]))
    const notes = new Map(statuses.map((s) => [s.taskId, s.notes]))
    return sprints.map((sp) => ({
        id: sp.id,
        number: sp.sprintNumber,
        name: sp.name,
        goal: sp.goal,
        tasks: sp.tasks.map((t, i) => ({
            id: t.id,
            number: i + 1,
            title: t.title,
            description: t.description ?? [],
            criteria: t.criteria ?? [],
            hints: t.hints ?? [],
            estimatedTime: t.estimatedTime,
            difficulty: t.difficulty,
            testPath: t.testPath ?? null,
            status: status.get(t.id) ?? 'TO_DO',
            note: notes.get(t.id) ?? null,
        })),
    }))
}
