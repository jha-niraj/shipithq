"use server";

import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import { db, pathfinderGoals, pathfinderSubGoals, pathfinderDailySessions, studios, studioSteps } from '@repo/db'
import { eq, and, asc, inArray } from 'drizzle-orm'
import { revalidatePath } from "next/cache";

// ==========================================
// Create or get Studio for a Pathfinder Sub-Goal
// ==========================================

export async function createOrGetStudioForSubGoal(subGoalId: string, subGoalTitle: string) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { error: "Unauthorized" };
        }

        const subGoal = await db.query.pathfinderSubGoals.findFirst({
            where: eq(pathfinderSubGoals.id, subGoalId),
            with: { goal: { columns: { userId: true } } },
        });

        if (!subGoal || subGoal.goal.userId !== session.user.id) {
            return { error: "Sub-goal not found" };
        }

        if (subGoal.studioId) {
            return { studioId: subGoal.studioId, isNew: false };
        }

        const studioSlug = `subgoal-${subGoalId}-${Date.now().toString(36)}`;
        const [studio] = await db.insert(studios).values({
            slug: studioSlug,
            title: `📝 ${subGoalTitle}`,
            description: `Study notes for: ${subGoalTitle}`,
            source: 'PATHFINDER',
            sourceId: subGoalId,
            visibility: 'PRIVATE',
            userId: session.user.id,
            stepCount: 0,
        }).returning();

        if (!studio) throw new Error("Failed to create studio")

        await db.update(pathfinderSubGoals)
            .set({ studioId: studio.id })
            .where(eq(pathfinderSubGoals.id, subGoalId));

        revalidatePath(`/pathfinder`);
        return { studioId: studio.id, isNew: true };
    } catch (error) {
        console.error("Error creating studio for sub-goal:", error);
        return { error: "Failed to create studio" };
    }
}

// ==========================================
// Every topic's notes, for the goal's Notes tab (plan/pathfinder PF-8)
// ==========================================

/**
 * Each topic's written explanation, in plan order, for reading straight through.
 * Owner only. A topic with no notes yet comes back with `content: null` so the
 * reader can say so rather than skip it silently.
 */
export async function getGoalNotes(goalId: string) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) return { success: false as const, error: "Unauthorized", days: [] };
        const goal = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.id, goalId), eq(pathfinderGoals.userId, session.user.id)),
            columns: { id: true },
            with: {
                dailySessions: {
                    orderBy: [asc(pathfinderDailySessions.date)],
                    columns: { id: true, date: true },
                    with: { subGoals: { orderBy: [asc(pathfinderSubGoals.order)], columns: { id: true, title: true, studioId: true, kind: true } } },
                },
            },
        });
        if (!goal) return { success: false as const, error: "Goal not found", days: [] };

        const studioIds = goal.dailySessions.flatMap((d) => d.subGoals.map((t) => t.studioId)).filter((s): s is string => !!s);
        const steps = studioIds.length
            ? await db.select({ studioId: studioSteps.studioId, content: studioSteps.content })
                .from(studioSteps)
                .where(and(inArray(studioSteps.studioId, studioIds), eq(studioSteps.type, "EXPLANATION")))
            : [];
        const byStudio = new Map(steps.map((s) => [s.studioId, s.content]));

        return {
            success: true as const,
            days: goal.dailySessions
                .filter((d) => d.subGoals.length > 0)
                .map((d, i) => ({
                    day: i + 1,
                    date: d.date,
                    topics: d.subGoals.map((t) => ({ id: t.id, title: t.title, kind: t.kind, content: t.studioId ? byStudio.get(t.studioId) ?? null : null })),
                })),
        };
    } catch (error: unknown) {
        console.error("Error loading goal notes:", error);
        return { success: false as const, error: "Could not load the notes", days: [] };
    }
}
