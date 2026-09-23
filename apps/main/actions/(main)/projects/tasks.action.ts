'use server'

import { getSession } from "@repo/auth";
import { headers } from "next/headers";
import {
    db,
    projectV2Sprints,
    projectV2Tasks,
} from "@repo/db";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from 'next/cache'

type ActionResult = {
    success: boolean
    error?: string
    data?: any
}

/*
 * `updateTaskStatus` used to live here as well.
 *
 * Two copies existed, one here and one in `project.action.ts`, and different
 * pages called different ones. Only the other copy recalculated
 * `user_project_v2_progress` afterwards, so ticking a task off on the sprints
 * page moved the checkbox and left the project's progress where it was - and
 * progress is what gates the quiz at 50% and the mock at 75%. The single
 * remaining copy is `project.action.ts:updateTaskStatus`.
 */

export async function addTaskToSprint(
    projectId: string,
    sprintId: string,
    data: {
        title: string
        description: string
        difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
        estimatedTime?: string
        category?: string
    },
    path?: string
): Promise<ActionResult> {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        /*
         * Whose project, and whose sprint.
         *
         * There was no check of either: any signed-in user could write tasks into
         * any project, and nothing tied `sprintId` to `projectId`, so a task could
         * be filed under a sprint of a different project entirely.
         */
        const sprint = await db.query.projectV2Sprints.findFirst({
            where: and(eq(projectV2Sprints.id, sprintId), eq(projectV2Sprints.projectId, projectId)),
            columns: { id: true, createdBy: true },
            with: { project: { columns: { createdBy: true } } },
        });
        if (!sprint) return { success: false, error: 'That sprint does not belong to this project.' }
        const mayWrite = sprint.project?.createdBy === session.user.id || sprint.createdBy === session.user.id
        if (!mayWrite) return { success: false, error: 'This is not your project.' }

        // Get max order index
        const lastTask = await db.query.projectV2Tasks.findFirst({
            where: eq(projectV2Tasks.sprintId, sprintId),
            orderBy: (tasks, { desc }) => [desc(tasks.orderIndex)],
            columns: { orderIndex: true }
        });
        const newOrderIndex = (lastTask?.orderIndex ?? -1) + 1;

        await db.insert(projectV2Tasks).values({
            sprintId,
            projectV2Id: projectId,
            title: data.title,
            description: [data.description],
            difficulty: data.difficulty,
            orderIndex: newOrderIndex,
            estimatedTime: data.estimatedTime,
            category: data.category
        });

        if (path) revalidatePath(path)
        return { success: true }
    } catch (error) {
        console.error('Error adding task:', error)
        return { success: false, error: 'Failed to add task' }
    }
}
