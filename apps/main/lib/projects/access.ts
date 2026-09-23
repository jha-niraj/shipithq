import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { and, eq } from "drizzle-orm"
import { db, projectsV2, projectV2Sprints, projectV2Tasks, userProjectV2Progress } from "@repo/db"

// ─────────────────────────────────────────────────────────────────────────────
// Who may read and write a project's contents.
//
// The rule is the one the sprints page already enforces: you created this
// project, or you started it, and starting it is what writes the progress row.
// Everything else - a task id, a sprint id - resolves up to a project and asks
// the same question.
//
// This exists because the assessment, resource and sprint actions took an id
// from the browser and used it. `prepareSprintMockKnowledge` had no session
// lookup at all and returned every sprint goal, task description and success
// criterion of any project id it was handed, including a private one somebody
// paid 25 credits for; three assessment actions ran gpt-4o-mini on any task id,
// free and unbounded; `addSprintToProject` wrote attacker-supplied sprints into
// anyone's project (sweep 2026-09-23, findings 10-13).
//
// NOT a "use server" file, so nothing in here is reachable from the browser.
// ─────────────────────────────────────────────────────────────────────────────

export type AccessResult =
    | { ok: true; userId: string; projectId: string; isCreator: boolean }
    | { ok: false; error: string }

/** The error every refusal gives, whatever the reason. */
const DENIED = "That project is not available." as const

export async function requireProjectAccess(projectId: string): Promise<AccessResult> {
    const session = await getSession(await headers())
    const userId = session?.user?.id
    if (!userId) return { ok: false, error: "Not signed in." }

    const [project] = await db
        .select({ id: projectsV2.id, createdBy: projectsV2.createdBy })
        .from(projectsV2)
        .where(eq(projectsV2.id, projectId))
        .limit(1)
    // "Not available" rather than "not found": whether a private project exists
    // is itself something only the people on it should learn.
    if (!project) return { ok: false, error: DENIED }

    if (project.createdBy === userId) {
        return { ok: true, userId, projectId: project.id, isCreator: true }
    }

    const [enrolled] = await db
        .select({ id: userProjectV2Progress.id })
        .from(userProjectV2Progress)
        .where(and(
            eq(userProjectV2Progress.projectId, project.id),
            eq(userProjectV2Progress.userId, userId),
        ))
        .limit(1)
    if (!enrolled) return { ok: false, error: DENIED }

    return { ok: true, userId, projectId: project.id, isCreator: false }
}

/** The same question, asked of a sprint. */
export async function requireSprintAccess(sprintId: string): Promise<AccessResult> {
    const [sprint] = await db
        .select({ projectId: projectV2Sprints.projectId })
        .from(projectV2Sprints)
        .where(eq(projectV2Sprints.id, sprintId))
        .limit(1)
    if (!sprint) return { ok: false, error: DENIED }
    return requireProjectAccess(sprint.projectId)
}

/** The same question, asked of a task. */
export async function requireTaskAccess(taskId: string): Promise<AccessResult> {
    const [row] = await db
        .select({ projectId: projectV2Sprints.projectId })
        .from(projectV2Tasks)
        .innerJoin(projectV2Sprints, eq(projectV2Sprints.id, projectV2Tasks.sprintId))
        .where(eq(projectV2Tasks.id, taskId))
        .limit(1)
    if (!row) return { ok: false, error: DENIED }
    return requireProjectAccess(row.projectId)
}
