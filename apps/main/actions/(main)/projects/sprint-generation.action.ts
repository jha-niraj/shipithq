'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from "@repo/auth";
import { headers } from "next/headers";
import {
    db,
    users,
    projectsV2,
    projectV2Sprints,
    projectV2Tasks,
    withTransaction
} from "@repo/db";
import { eq, and, sql } from "drizzle-orm";
import { startBackgroundJob } from '@/actions/(main)/workers/jobs.action'
import { requireProjectAccess } from '@/lib/projects/access'

// ============================================================================
// Helper Functions
// ============================================================================

async function getCurrentUser() {
    const session = await getSession(headers());
    if (!session?.user?.email) throw new Error('Not authenticated')
    const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
    if (!user) throw new Error('User not found')
    return user
}

// ============================================================================
// Types
// ============================================================================

interface ActionResult<T = void> {
    success: boolean
    data?: T
    error?: string
}

interface GeneratedTask {
    title: string
    description: string[]
    successCriteria: string[]
    hints: string[]
    estimatedMinutes: number
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
    category: string | null
    estimatedTime: string | null
    checkpoints: string[]
    relatedPages: string[]
    dependencies: string[]
    badges: string[]
    tags: string[]
    terminalCommand: string | null
    orderIndex: number
}

interface GeneratedSprint {
    name: string
    goal: string
    duration: string
    tasks: GeneratedTask[]
}

// ============================================================================
// Sprint Generation Actions
// ============================================================================

/**
 * Start sprint generation on the worker.
 *
 * This was a multi-thousand-token completion running inline: a whole sprint with
 * three to six fully specified tasks, on a request that Cloudflare kills first.
 * It now runs on a Durable Object alarm and the sheet polls the job.
 *
 * The generated sprint comes back as the job result and stays a preview - it is
 * only written to the project when the user accepts it via `addSprintToProject`,
 * exactly as before.
 */
export async function startSprintGeneration(
    projectId: string,
    sprintDescription: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
        const user = await getCurrentUser()

        /*
         * Whose project, and one at a time.
         *
         * This checked only that the project EXISTED: any signed-in user could
         * point it at any project id and run unbounded model completions on our
         * key, for free, in a loop. The creator may plan their own project; a
         * second dispatch while one is in flight returns the running job rather
         * than starting a second pipeline over the same rows.
         */
        const project = await db.query.projectsV2.findFirst({
            where: eq(projectsV2.id, projectId),
            columns: { id: true, createdBy: true },
        })
        if (!project) return { success: false, error: 'Project not found' }
        if (project.createdBy !== user.id) return { success: false, error: 'This is not your project.' }

        return await startBackgroundJob('sprint_generation', { projectId, sprintDescription }, {
            singleFlight: true,
            singleFlightKey: projectId,
        })
    } catch (error) {
        console.error('Error starting sprint generation:', error)
        return { success: false, error: 'Failed to start sprint generation' }
    }
}

/**
 * Add a generated sprint to the project
 */
/**
 * Accept a generated sprint into the project.
 *
 * `autoAccept` is gone: it let a caller who is NOT the creator write a sprint
 * into somebody else's project as approved and shared. Whether a sprint is the
 * project's or the person's own follows from who they are, which is not
 * something the browser gets to assert.
 */
/**
 * Is this a unique-constraint violation?
 *
 * Walking the CAUSE CHAIN, not testing `String(error)`. Drizzle wraps the driver
 * error in a `DrizzleQueryError` whose message is "Failed query: insert into ..."
 * - the Postgres code `23505` and the words "duplicate key" live on the cause,
 * so the obvious `/duplicate key/.test(String(error))` matches nothing and the
 * retry below silently gives up on the one error it exists to handle. Found by
 * `scripts/practice-checks/projects-money.ts`, which races three inserts: two
 * runs passed because the race did not collide, and the third failed.
 */
function isUniqueViolation(error: unknown): boolean {
    const seen = new Set<unknown>()
    let current: unknown = error
    while (current && typeof current === "object" && !seen.has(current)) {
        seen.add(current)
        const e = current as { code?: unknown; message?: unknown; cause?: unknown }
        if (e.code === "23505") return true
        if (typeof e.message === "string" && /duplicate key|unique constraint/i.test(e.message)) return true
        current = e.cause
    }
    return false
}

/**
 * Insert a sprint, choosing its number at insert time.
 *
 * `sprint_number` is unique per project (`uq_project_v2_sprint_project_id_sprint_number`),
 * and the old code read "the last sprint" and added one. That is wrong twice
 * over: two people accepting a generated sprint at the same moment both read the
 * same last number, and a personal sprint occupies a number on the shared
 * project, so the next person - or the creator - computed a number that was
 * already taken and the insert threw "duplicate key", surfacing as a flat
 * "Failed to add sprint".
 *
 * Recomputing inside a retry is what makes it correct: whatever took the number,
 * the next attempt reads past it. Five attempts is far more than the number of
 * people who can realistically accept a sprint in the same instant.
 */
async function insertSprintWithNextNumber(
    projectId: string,
    values: Omit<typeof projectV2Sprints.$inferInsert, "projectId" | "sprintNumber" | "orderIndex">,
) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const [bounds] = await db
            .select({
                maxNumber: sql<number>`coalesce(max(${projectV2Sprints.sprintNumber}), 0)`,
                maxOrder: sql<number>`coalesce(max(${projectV2Sprints.orderIndex}), -1)`,
            })
            .from(projectV2Sprints)
            .where(eq(projectV2Sprints.projectId, projectId))

        try {
            const [sprint] = await db
                .insert(projectV2Sprints)
                .values({
                    ...values,
                    projectId,
                    sprintNumber: Number(bounds?.maxNumber ?? 0) + 1,
                    orderIndex: Number(bounds?.maxOrder ?? -1) + 1,
                })
                .returning()
            if (sprint) return sprint
        } catch (error: unknown) {
            if (!isUniqueViolation(error)) throw error
        }
    }
    throw new Error("Could not find a free sprint number for this project.")
}

export async function addSprintToProject(
    projectId: string,
    sprintData: GeneratedSprint,
): Promise<ActionResult<{ sprintId: string, isPersonal: boolean }>> {
    try {
        /*
         * It only checked that the project EXISTED, so any signed-in user could
         * write a sprint - with wholly browser-supplied content - into anybody's
         * project, and a personal sprint still consumes a sprint number on the
         * shared project (sweep 2026-09-23, finding 12).
         */
        const access = await requireProjectAccess(projectId)
        if (!access.ok) return { success: false, error: access.error }

        const user = await getCurrentUser()

        const project = await db.query.projectsV2.findFirst({
            where: eq(projectsV2.id, projectId),
            columns: { id: true, slug: true, createdBy: true },
        });

        if (!project) {
            return { success: false, error: 'Project not found' }
        }

        const isCreator = project.createdBy === user.id

        const sprint = await insertSprintWithNextNumber(projectId, {
            name: sprintData.name,
            goal: sprintData.goal,
            duration: sprintData.duration,
            createdBy: user.id,
            // The creator's sprint is part of the project; anybody else's is their
            // own until they accept it.
            isApproved: isCreator,
            isPersonal: !isCreator,
        })

        if (sprintData.tasks.length > 0) {
            await db.insert(projectV2Tasks).values(
                sprintData.tasks.map((task, idx) => ({
                    sprintId: sprint.id,
                    projectV2Id: projectId,
                    title: task.title,
                    description: task.description,
                    hints: task.hints,
                    estimatedMinutes: task.estimatedMinutes,
                    difficulty: task.difficulty,
                    orderIndex: idx,
                    category: task.category,
                    estimatedTime: task.estimatedTime,
                    checkpoints: task.checkpoints,
                    relatedPages: task.relatedPages,
                    dependencies: task.dependencies,
                    badges: task.badges,
                    tags: task.tags,
                    terminalCommand: task.terminalCommand,
                    criteria: task.successCriteria
                }))
            );
        }

        revalidatePath(`/projects/${project.slug}`)

        return { success: true, data: { sprintId: sprint.id, isPersonal: !isCreator } }
    } catch (error: unknown) {
        console.error('Error adding sprint to project:', error)
        return { success: false, error: 'Failed to add sprint' }
    }
}

/**
 * Accept a personal sprint
 */
export async function acceptPersonalSprint(
    sprintId: string
): Promise<ActionResult> {
    try {
        const user = await getCurrentUser()

        const sprint = await db.query.projectV2Sprints.findFirst({
            where: eq(projectV2Sprints.id, sprintId),
            with: { project: true }
        });

        if (!sprint) {
            return { success: false, error: 'Sprint not found' }
        }

        if (sprint.createdBy !== user.id) {
            return { success: false, error: 'You can only accept your own sprints' }
        }

        await db.update(projectV2Sprints).set({ isApproved: true }).where(eq(projectV2Sprints.id, sprintId));

        revalidatePath(`/projects/${sprint.project.slug}`)

        return { success: true }
    } catch (error) {
        console.error('Error accepting sprint:', error)
        return { success: false, error: 'Failed to accept sprint' }
    }
}

/**
 * Reject/delete a personal sprint
 */
export async function rejectPersonalSprint(
    sprintId: string
): Promise<ActionResult> {
    try {
        const user = await getCurrentUser()

        const sprint = await db.query.projectV2Sprints.findFirst({
            where: eq(projectV2Sprints.id, sprintId),
            with: { project: true }
        });

        if (!sprint) {
            return { success: false, error: 'Sprint not found' }
        }

        if (sprint.createdBy !== user.id) {
            return { success: false, error: 'You can only reject your own sprints' }
        }

        await withTransaction(async (tx) => {
            await tx.delete(projectV2Tasks).where(eq(projectV2Tasks.sprintId, sprintId));
            await tx.delete(projectV2Sprints).where(eq(projectV2Sprints.id, sprintId));
        });

        revalidatePath(`/projects/${sprint.project.slug}`)

        return { success: true }
    } catch (error) {
        console.error('Error rejecting sprint:', error)
        return { success: false, error: 'Failed to reject sprint' }
    }
}

/**
 * Get user's sprints for a project
 */
export async function getUserSprintsForProject(
    projectId: string
): Promise<ActionResult<{
    approvedSprints: Array<{
        id: string
        sprintNumber: number
        name: string
        goal: string
        duration: string
        tasksCount: number
    }>
    personalSprints: Array<{
        id: string
        sprintNumber: number
        name: string
        goal: string
        duration: string
        tasksCount: number
        isApproved: boolean
    }>
}>> {
    try {
        const user = await getCurrentUser()

        const approvedSprints = await db.query.projectV2Sprints.findMany({
            where: and(
                eq(projectV2Sprints.projectId, projectId),
                eq(projectV2Sprints.isApproved, true),
                eq(projectV2Sprints.isPersonal, false)
            ),
            with: { tasks: true },
            orderBy: (sprints, { asc }) => [asc(sprints.orderIndex)]
        });

        const personalSprints = await db.query.projectV2Sprints.findMany({
            where: and(
                eq(projectV2Sprints.projectId, projectId),
                eq(projectV2Sprints.createdBy, user.id),
                eq(projectV2Sprints.isPersonal, true)
            ),
            with: { tasks: true },
            orderBy: (sprints, { asc }) => [asc(sprints.orderIndex)]
        });

        return {
            success: true,
            data: {
                approvedSprints: approvedSprints.map((s) => ({
                    id: s.id,
                    sprintNumber: s.sprintNumber,
                    name: s.name,
                    goal: s.goal,
                    duration: s.duration,
                    tasksCount: s.tasks.length
                })),
                personalSprints: personalSprints.map((s) => ({
                    id: s.id,
                    sprintNumber: s.sprintNumber,
                    name: s.name,
                    goal: s.goal,
                    duration: s.duration,
                    tasksCount: s.tasks.length,
                    isApproved: s.isApproved
                }))
            }
        }
    } catch (error) {
        console.error('Error getting user sprints:', error)
        return { success: false, error: 'Failed to get sprints' }
    }
}
