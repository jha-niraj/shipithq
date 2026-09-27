'use server'

import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import {
    db,
    pathfinderGoals,
    pathfinderDailySessions,
    pathfinderSubGoals,
    users,
} from '@repo/db'
import { eq, and, desc, asc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { copyGoalFor } from '@/lib/pathfinder/copy'

// ================================================================================
// PUBLIC GOALS (plan/pathfinder PF-3)
// ================================================================================

/**
 * The Explore grid: shared goals with their author and counts, never their topics.
 * This used to load every session and topic of every public goal to draw a card.
 */
export async function getPublicPathfinderGoals() {
    try {
        const goals = await db.select({
            id: pathfinderGoals.id,
            title: pathfinderGoals.title,
            category: pathfinderGoals.category,
            level: pathfinderGoals.level,
            overview: pathfinderGoals.overview,
            totalSubGoals: pathfinderGoals.totalSubGoals,
            createdAt: pathfinderGoals.createdAt,
            userId: pathfinderGoals.userId,
            authorName: users.name,
            authorUsername: users.username,
            authorImage: users.image,
            days: sql<number>`(select count(*)::int from pathfinder_daily_session s where s.goal_id = ${pathfinderGoals.id})`,
            coding: sql<number>`(select count(*)::int from pathfinder_sub_goal t where t.goal_id = ${pathfinderGoals.id} and t.has_coding)`,
            copies: sql<number>`(select count(*)::int from pathfinder_goal f where f.forked_from_id = ${pathfinderGoals.id})`,
        })
            .from(pathfinderGoals)
            .innerJoin(users, eq(users.id, pathfinderGoals.userId))
            .where(and(eq(pathfinderGoals.isPublic, true), sql`${pathfinderGoals.totalSubGoals} > 0`))
            .orderBy(desc(pathfinderGoals.createdAt))
            .limit(200)

        return { success: true, goals }
    } catch (error: unknown) {
        console.error('Error fetching public goals:', error)
        return { success: false, goals: [] }
    }
}

export type PublicGoalCard = Awaited<ReturnType<typeof getPublicPathfinderGoals>>['goals'][number]

/**
 * One shared goal, by id. Slugs are unique only per owner, so a slug alone could
 * open someone else's goal; an id cannot. A private goal is simply not found.
 */
export async function getPublicPathfinderGoal(goalId: string) {
    try {
        const session = await getSession(headers())
        const goal = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.id, goalId), eq(pathfinderGoals.isPublic, true)),
            with: {
                user: { columns: { id: true, name: true, username: true, image: true } },
                dailySessions: {
                    orderBy: [asc(pathfinderDailySessions.date)],
                    columns: { id: true, date: true },
                    with: {
                        subGoals: {
                            orderBy: [asc(pathfinderSubGoals.order)],
                            columns: { id: true, title: true, description: true, kind: true, hasCoding: true },
                        },
                    },
                },
            },
        })
        if (!goal) return { success: false as const, goal: null }

        // Your own copy of it, so the page says "Open your copy" instead of copying twice.
        const mine = session?.user?.id
            ? await db.query.pathfinderGoals.findFirst({
                where: and(eq(pathfinderGoals.userId, session.user.id), eq(pathfinderGoals.forkedFromId, goal.id)),
                columns: { slug: true },
            })
            : undefined

        return {
            success: true as const,
            goal: {
                id: goal.id,
                title: goal.title,
                category: goal.category,
                level: goal.level,
                overview: goal.overview,
                learningObjectives: goal.learningObjectives,
                prerequisites: goal.prerequisites,
                user: goal.user,
                isOwner: goal.userId === session?.user?.id,
                ownerSlug: goal.userId === session?.user?.id ? goal.slug : null,
                copySlug: mine?.slug ?? null,
                days: goal.dailySessions.map((d, i) => ({ id: d.id, day: i + 1, topics: d.subGoals })),
            },
        }
    } catch (error: unknown) {
        console.error('Error fetching public goal:', error)
        return { success: false as const, goal: null }
    }
}

export type PublicGoal = NonNullable<Awaited<ReturnType<typeof getPublicPathfinderGoal>>['goal']>

// ================================================================================
// COPY A SHARED GOAL (plan/pathfinder PF-5)
// ================================================================================

/** Copy a shared goal into your own goals, free. The work is in `lib/pathfinder/copy.ts`. */
export async function copyPathfinderGoal(goalId: string) {
    const session = await getSession(headers())
    const userId = session?.user?.id
    if (!userId) return { success: false as const, error: 'Sign in to copy a goal', slug: null }
    const r = await copyGoalFor(userId, goalId)
    if (r.success && !r.existing) {
        revalidatePath('/pathfinder')
        revalidatePath('/pathfinder/explore')
    }
    return r
}

/**
 * "Adopt this path" on an incident (plan/pathfinder PF-13): copy the case's hand-written
 * path, owned by the ShipItHQ account, into your goals. Adopting twice opens your copy.
 */
export async function adoptIncidentPath(caseSlug: string) {
    const session = await getSession(headers())
    const userId = session?.user?.id
    if (!userId) return { success: false as const, error: 'Sign in to adopt this path', slug: null }
    const { INCIDENT_PATHS, PATH_OWNER } = await import('@/content/incidents/paths')
    const path = INCIDENT_PATHS[caseSlug]
    if (!path) return { success: false as const, error: 'This incident has no path yet', slug: null }
    const [goal] = await db.select({ id: pathfinderGoals.id })
        .from(pathfinderGoals)
        .innerJoin(users, eq(users.id, pathfinderGoals.userId))
        .where(and(eq(users.email, PATH_OWNER.email), eq(pathfinderGoals.slug, path.slug), eq(pathfinderGoals.isPublic, true)))
        .limit(1)
    if (!goal) return { success: false as const, error: 'The path is not published yet', slug: null }
    const r = await copyGoalFor(userId, goal.id)
    if (r.success && !r.existing) revalidatePath('/pathfinder')
    return r
}
