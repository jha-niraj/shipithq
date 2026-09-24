"use server";

/**
 * What the signed-in user has actually done in the projects module.
 *
 * Every number here is computed from that user's own rows. That is the whole
 * point of the file: `/projects` used to lead with `getProjectsPageStats`, which
 * is platform-wide, and pad it out with a hardcoded "94% Success Rate" because
 * with zero completed tasks there is nothing to compute a rate from. A hub about
 * your own work should not open with a count of everyone else's, and should
 * never open with a number nobody measured. See PRJ-7.
 */

import { getSession } from "@repo/auth";
import { headers } from "next/headers";
import {
    db,
    projectsV2,
    projectV2Sprints,
    projectV2Tasks,
    userProjectV2Progress,
    userTaskV2Statuses,
} from "@repo/db";
import { and, asc, count, desc, eq, notInArray } from "drizzle-orm";
import { catalogueWhere } from '@/lib/projects/catalogue'
import { toErrorMessage } from "@/lib/errors";

export interface MyProjectSummary {
    id: string;
    slug: string;
    title: string;
    shortDescription: string | null;
    difficulty: string;
    technologies: string[];
    status: string;
    progressPercentage: number;
    tasksCompleted: number;
    totalTasks: number;
    startedAt: Date | null;
    updatedAt: Date;
}

export interface MyProjectsOverview {
    /** In-progress first, most recently touched first. */
    active: MyProjectSummary[];
    /** Finished or submitted, most recent first. */
    finished: MyProjectSummary[];
    /** The single next thing to do, or null when there is nothing to pick up. */
    nextTask: {
        id: string;
        title: string;
        projectSlug: string;
        projectTitle: string;
        sprintTitle: string | null;
    } | null;
    totals: {
        projects: number;
        active: number;
        finished: number;
        tasksCompleted: number;
        totalTasks: number;
    };
}

/** Statuses that mean "still working on it". */
const ACTIVE_STATUSES = ["NOT_STARTED", "IN_PROGRESS"] as const;

export async function getMyProjectsOverview(): Promise<
    { success: true; data: MyProjectsOverview } | { success: false; error: string }
> {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" };
        }
        const userId = session.user.id;

        // Progress rows are the source of truth for "mine", not `createdBy`.
        // A user can enrol in a platform-catalogue project they did not create,
        // and that is just as much their work in progress.
        const rows = await db
            .select({
                id: projectsV2.id,
                slug: projectsV2.slug,
                title: projectsV2.title,
                shortDescription: projectsV2.shortDescription,
                difficulty: projectsV2.difficulty,
                technologies: projectsV2.technologies,
                status: userProjectV2Progress.status,
                progressPercentage: userProjectV2Progress.progressPercentage,
                tasksCompleted: userProjectV2Progress.tasksCompleted,
                totalTasks: userProjectV2Progress.totalTasks,
                startedAt: userProjectV2Progress.startedAt,
                updatedAt: userProjectV2Progress.updatedAt,
            })
            .from(userProjectV2Progress)
            .innerJoin(projectsV2, eq(projectsV2.id, userProjectV2Progress.projectId))
            .where(eq(userProjectV2Progress.userId, userId))
            .orderBy(desc(userProjectV2Progress.updatedAt));

        const summaries: MyProjectSummary[] = rows.map((r) => ({
            id: r.id,
            slug: r.slug,
            title: r.title,
            shortDescription: r.shortDescription,
            difficulty: r.difficulty,
            technologies: r.technologies ?? [],
            status: r.status,
            progressPercentage: r.progressPercentage,
            tasksCompleted: r.tasksCompleted,
            totalTasks: r.totalTasks,
            startedAt: r.startedAt,
            updatedAt: r.updatedAt,
        }));

        const active = summaries.filter((s) =>
            (ACTIVE_STATUSES as readonly string[]).includes(s.status),
        );
        const finished = summaries.filter(
            (s) => !(ACTIVE_STATUSES as readonly string[]).includes(s.status),
        );

        const totals = {
            projects: summaries.length,
            active: active.length,
            finished: finished.length,
            tasksCompleted: summaries.reduce((n, s) => n + s.tasksCompleted, 0),
            totalTasks: summaries.reduce((n, s) => n + s.totalTasks, 0),
        };

        return {
            success: true,
            data: {
                active,
                finished,
                nextTask: await findNextTask(userId, active[0]),
                totals,
            },
        };
    } catch (error: unknown) {
        console.error("Error building projects overview:", error);
        return { success: false, error: toErrorMessage(error) };
    }
}

/**
 * The first unfinished task on the project the user touched most recently.
 *
 * "Unfinished" is the absence of a `COMPLETED` row in `user_task_v2_status`, not
 * a column on the task - a task is shared and its completion is per user. The
 * exclusion is therefore against that user's own done-list, and a task nobody has
 * ever opened has no status row at all, which is why this cannot be an inner
 * join on status.
 */
async function findNextTask(
    userId: string,
    project: MyProjectSummary | undefined,
): Promise<MyProjectsOverview["nextTask"]> {
    if (!project) return null;

    const doneRows = await db
        .select({ taskId: userTaskV2Statuses.taskId })
        .from(userTaskV2Statuses)
        .where(
            and(
                eq(userTaskV2Statuses.userId, userId),
                eq(userTaskV2Statuses.projectId, project.id),
                // The enum is TO_DO | IN_PROGRESS | COMPLETED. It is NOT "DONE" -
                // the kanban column label and the stored value differ, and the
                // compiler is the only thing that catches guessing wrong here.
                eq(userTaskV2Statuses.status, "COMPLETED"),
            ),
        );

    const doneIds = doneRows.map((r) => r.taskId);

    const [next] = await db
        .select({
            id: projectV2Tasks.id,
            title: projectV2Tasks.title,
            sprintTitle: projectV2Sprints.name,
        })
        .from(projectV2Tasks)
        .innerJoin(projectV2Sprints, eq(projectV2Sprints.id, projectV2Tasks.sprintId))
        .where(
            and(
                eq(projectV2Sprints.projectId, project.id),
                // `notInArray` against an EMPTY list is the trap here: drizzle
                // renders it as a condition that matches nothing, so a user who
                // has completed no tasks would be told they have no next task.
                // Apply the exclusion only when there is something to exclude.
                doneIds.length > 0 ? notInArray(projectV2Tasks.id, doneIds) : undefined,
            ),
        )
        .orderBy(asc(projectV2Sprints.orderIndex), asc(projectV2Tasks.orderIndex))
        .limit(1);

    if (!next) return null;

    return {
        id: next.id,
        title: next.title,
        projectSlug: project.slug,
        projectTitle: project.title,
        sprintTitle: next.sprintTitle,
    };
}

/**
 * How many public catalogue projects exist, for the discovery strip below the
 * user's own work. One number, and only because "browse N projects" is a
 * meaningfully different invitation from "browse".
 */
export async function getCatalogueCount(): Promise<number> {
    try {
        const [row] = await db
            .select({ n: count() })
            .from(projectsV2)
            .where(catalogueWhere());
        return row?.n ?? 0;
    } catch {
        return 0;
    }
}
