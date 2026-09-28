'use server'

import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import {
    db,
    pathfinderGoals,
    pathfinderGroups,
    pathfinderVerifications,
    pathfinderDailySessions,
    pathfinderSubGoals,
    studios,
} from '@repo/db'
import { eq, and, or, desc, asc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { revalidateGoal } from '@/lib/pathfinder/revalidate'
import { startBackgroundJob } from '@/actions/(main)/workers/jobs.action'
import { recordActivity, activityKey } from '@repo/db/activity'

// ================================================================================
// TYPES
// ================================================================================

// Re-exported from the DB enums, NOT hand-written.
//
// These were three literal unions typed out by hand, duplicating
// `pathfinderCategoryEnum`, `pathfinderLevelEnum` and `pathfinderStatusEnum` in
// packages/db. Adding INTERVIEW_PREP to the enum did not add it here, so the
// schema and the action disagreed and `createPathfinderGoal` rejected the very
// category the database had just learned about - a type error at the call site
// pointing at a file that looked entirely correct.
//
// Deriving them means the next enum value cannot drift: it either compiles
// everywhere or fails at the definition. All three unions were verified
// identical to their enums before this change, so nothing widened or narrowed.
// IMPORTED ONLY, deliberately NOT re-exported.
//
// This file is `"use server"`, and Next's server-actions transform treats every
// export in such a module as a callable action - including a `export type { ... }`
// re-export, which it rewrites into a value import from an ACTIONS_MODULE and
// then cannot resolve:
//
//     The export PathfinderStatus was not found in module .../goals.action.ts
//
// That is a 500 on every pathfinder page, and `tsc` passes on it cleanly, because
// as far as TypeScript is concerned a type re-export is perfectly legal. Only the
// build knows.
//
// Nothing needed the re-export anyway: every consumer already imports these
// three from `@repo/db` directly, which is where they belong.
import type { PathfinderCategory, PathfinderLevel, PathfinderStatus } from '@repo/db'

export interface CreateGoalInput {
    title: string
    slug?: string
    category: PathfinderCategory
    level: PathfinderLevel
    focusAreas: string[]
    targetDate?: Date
    duration?: 'ONE_WEEK' | 'FORTNIGHT' | 'ONE_MONTH' | 'TWO_MONTHS' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'CUSTOM' | null
    estimatedDays?: number
    groupId?: string | null
    /** false = private (5 credits), true = public (free) */
    isPublic?: boolean
    /** If true, AI generates a study plan (5-15 subgoals) after goal creation */
    generateAIPlan?: boolean
}

// ================================================================================
// SLUG UTILITIES
// ================================================================================

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Remove multiple hyphens
        .slice(0, 60) // Limit length
}

export async function checkSlugAvailability(slug: string, userId: string): Promise<{ available: boolean; suggestedSlug?: string }> {
    const existing = await db.query.pathfinderGoals.findFirst({
        where: and(eq(pathfinderGoals.userId, userId), eq(pathfinderGoals.slug, slug)),
    })

    if (!existing) {
        return { available: true }
    }

    // Generate alternative with number suffix
    let suffix = 1
    let newSlug = `${slug}-${suffix}`

    while (suffix < 100) {
        const exists = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.userId, userId), eq(pathfinderGoals.slug, newSlug)),
        })
        if (!exists) {
            return { available: false, suggestedSlug: newSlug }
        }
        suffix++
        newSlug = `${slug}-${suffix}`
    }

    return { available: false, suggestedSlug: `${slug}-${Date.now()}` }
}

export async function generateAndCheckSlug(title: string, userId: string): Promise<string> {
    const baseSlug = generateSlug(title)
    const { available, suggestedSlug } = await checkSlugAvailability(baseSlug, userId)
    return available ? baseSlug : (suggestedSlug || `${baseSlug}-${Date.now()}`)
}

export interface GoalWithRelations {
    id: string
    slug: string
    title: string
    category: PathfinderCategory
    level: PathfinderLevel
    focusAreas: string[]
    targetDate: Date | null
    overview: string | null
    estimatedDays: number | null
    estimatedHours: number | null
    learningObjectives: string[]
    prerequisites: string[]
    status: PathfinderStatus
    progressPercent: number
    totalSubGoals: number
    completedSubGoals: number
    totalQuizAnswered: number
    totalCodingSolved: number
    streakDays: number
    lastActivityAt: Date | null
    createdAt: Date
    updatedAt: Date
    startedAt: Date | null
    completedAt: Date | null
    groupId: string | null
}

// ================================================================================
// CREATE GOAL
// ================================================================================

export async function createPathfinderGoal(input: CreateGoalInput) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        // Verify group belongs to user if provided
        if (input.groupId) {
            const group = await db.query.pathfinderGroups.findFirst({
                where: and(eq(pathfinderGroups.id, input.groupId), eq(pathfinderGroups.userId, session.user.id)),
            })
            if (!group) {
                return { success: false, error: 'Group not found' }
            }
        }

        // Generate or validate slug
        const slug = input.slug
            ? await generateAndCheckSlug(input.slug, session.user.id)
            : await generateAndCheckSlug(input.title, session.user.id)

        // Map duration to estimatedDays if not custom
        const DURATION_DAYS: Record<string, number> = {
            ONE_WEEK: 7,
            FORTNIGHT: 14,
            ONE_MONTH: 30,
            TWO_MONTHS: 60,
            THREE_MONTHS: 90,
            SIX_MONTHS: 180,
        }
        const estimatedDays = input.duration && input.duration !== 'CUSTOM'
            ? DURATION_DAYS[input.duration] ?? input.estimatedDays
            : input.estimatedDays ?? null

        // Private by default and sharing is free (plan/pathfinder decision 2, 2026-09-27).
        // A private goal used to cost credits, which made every goal public by default.
        const isPublic = input.isPublic ?? false

        // Create the goal
        const [goal] = await db.insert(pathfinderGoals).values({
            userId: session.user.id,
            title: input.title,
            slug,
            category: input.category,
            level: input.level,
            focusAreas: input.focusAreas,
            targetDate: input.targetDate,
            duration: input.duration ?? null,
            estimatedDays,
            groupId: input.groupId || null,
            isPublic,
            status: 'ACTIVE',
            overview: `Learn ${input.title} - Add daily tasks and practice to build your skills.`,
            learningObjectives: [],
            prerequisites: [],
            startedAt: new Date(),
        }).returning()

        if (!goal) throw new Error("Failed to create goal")

        // Create verification record
        await db.insert(pathfinderVerifications).values({
            goalId: goal.id,
            quizStatus: 'PENDING',
            codingStatus: 'LOCKED',
            mockStatus: 'LOCKED',
            projectStatus: 'PENDING',
        })

        // The activity ledger (plan/progress PRG-3).
        await recordActivity(db, session.user.id, {
            type: 'PATHFINDER_GOAL_STARTED',
            title: `Started goal: ${goal.title}`,
            description: `${goal.category} - ${goal.level}`.toLowerCase(),
            xp: 0,
            key: activityKey.goalStarted(goal.id),
            meta: { goalId: goal.id, slug: goal.slug },
        })

        // The study plan runs on the worker (PF-W4).
        //
        // This was a FLOATING PROMISE - `generateAIStudyPlan(...).catch(...)`,
        // never awaited, with no `waitUntil`. The action returned immediately and
        // the isolate was then free to be torn down, so on Cloudflare the plan
        // could simply never be generated: no error, no record of the attempt,
        // just a goal that stays empty. "Sometimes my plan does not appear" is not
        // a diagnosable bug report, which makes that shape worse than a slow
        // request - a timeout at least tells you something happened.
        //
        // As a job it gets a row, a status, retries and a visible failure.
        let planJobId: string | undefined
        let planError: string | undefined
        if (input.generateAIPlan) {
            const started = await startBackgroundJob(
                'goal_creation',
                { goalId: goal.id, focusAreas: input.focusAreas ?? [] },
            )
            if (started.success) planJobId = started.jobId
            // A failed dispatch does not fail the goal - the goal exists and can
            // be planned by hand or retried.
            else planError = started.error
        }

        revalidatePath('/pathfinder')
        return { success: true, goalId: goal.id, slug: goal.slug, planJobId, planError }
    } catch (error) {
        console.error('Error creating goal:', error)
        return { success: false, error: 'Failed to create goal' }
    }
}

// ================================================================================
// GET GOALS
// ================================================================================

export async function getUserPathfinderGoals() {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized', goals: [], groups: [] }
        }

        const goals = await db.query.pathfinderGoals.findMany({
            where: eq(pathfinderGoals.userId, session.user.id),
            orderBy: [desc(pathfinderGoals.createdAt)],
        })

        // The dashboard draws cards from the goal rows alone; it used to load each
        // goal's last seven days with every topic, and every group with its goals.
        const groups = await db.query.pathfinderGroups.findMany({
            where: eq(pathfinderGroups.userId, session.user.id),
            orderBy: [asc(pathfinderGroups.order)],
        })

        return { success: true, goals, groups }
    } catch (error) {
        console.error('Error fetching goals:', error)
        return { success: false, error: 'Failed to fetch goals', goals: [], groups: [] }
    }
}

export async function getPathfinderGoal(slugOrId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized', goal: null }
        }

        // Ids are cuid2 and slugs are unique per owner, so one query covers both.
        const goal = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.userId, session.user.id), or(eq(pathfinderGoals.slug, slugOrId), eq(pathfinderGoals.id, slugOrId))),
            with: {
                verification: true,
                group: true,
                dailySessions: {
                    orderBy: [desc(pathfinderDailySessions.date)],
                    with: {
                        subGoals: {
                            orderBy: [asc(pathfinderSubGoals.order)],
                        },
                    },
                },
            },
        })

        if (!goal) {
            return { success: false, error: 'Goal not found', goal: null }
        }

        return { success: true, goal }
    } catch (error) {
        console.error('Error fetching goal:', error)
        return { success: false, error: 'Failed to fetch goal', goal: null }
    }
}

// ================================================================================
// UPDATE GOAL STATUS
// ================================================================================

export async function updateGoalStatus(goalId: string, status: PathfinderStatus) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const goal = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.id, goalId), eq(pathfinderGoals.userId, session.user.id)),
        })

        if (!goal) {
            return { success: false, error: 'Goal not found' }
        }

        await db.update(pathfinderGoals)
            .set({
                status,
                ...(status === 'VERIFICATION' ? { verificationStartedAt: new Date() } : {}),
                ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
            })
            .where(eq(pathfinderGoals.id, goalId))

        revalidatePath('/pathfinder')
        return { success: true }
    } catch (error) {
        console.error('Error updating goal status:', error)
        return { success: false, error: 'Failed to update goal status' }
    }
}

// ================================================================================
// DELETE GOAL
// ================================================================================

export async function deletePathfinderGoal(goalId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const goal = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.id, goalId), eq(pathfinderGoals.userId, session.user.id)),
        })

        if (!goal) {
            return { success: false, error: 'Goal not found' }
        }

        await db.delete(pathfinderGoals).where(eq(pathfinderGoals.id, goalId))

        revalidatePath('/pathfinder')
        return { success: true }
    } catch (error) {
        console.error('Error deleting goal:', error)
        return { success: false, error: 'Failed to delete goal' }
    }
}

// ================================================================================
// AI STUDY PLAN GENERATION
// ================================================================================

/**
 * Fill an AI-planned topic with its notes and practice problems (plan/pathfinder PF-7).
 * The model calls run in the `subgoal_generation` worker job, the same one a topic
 * added by hand uses; this only makes the topic's Studio and dispatches the job. It
 * used to run three model calls inline in this action, so a slow reply timed the
 * request out and left the topic on "Generating" for good.
 */
export async function generateContentForAISubGoal(subGoalId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) return { success: false as const, error: 'Unauthorized' }

        const subGoal = await db.query.pathfinderSubGoals.findFirst({
            where: eq(pathfinderSubGoals.id, subGoalId),
            with: { goal: { columns: { id: true, userId: true } } },
        })
        if (!subGoal || subGoal.goal.userId !== session.user.id) return { success: false as const, error: 'Topic not found' }
        if (subGoal.isContentLoaded) return { success: true as const, jobId: undefined }

        const { canRunPathfinderAI } = await import('./usage.action')
        const canRun = await canRunPathfinderAI(subGoal.goalId)
        if (!canRun.allowed) return { success: false as const, error: canRun.reason ?? 'AI usage limit reached' }

        let studioId = subGoal.studioId
        if (!studioId) {
            const [studio] = await db.insert(studios).values({
                slug: `subgoal-${subGoalId}-${Date.now().toString(36)}`,
                title: `📝 ${subGoal.title}`,
                description: `Study notes for: ${subGoal.title}`,
                source: 'PATHFINDER',
                sourceId: subGoalId,
                visibility: 'PRIVATE',
                userId: session.user.id,
                stepCount: 0,
            }).returning({ id: studios.id })
            if (!studio) throw new Error('Failed to create studio')
            studioId = studio.id
            await db.update(pathfinderSubGoals).set({ studioId }).where(eq(pathfinderSubGoals.id, subGoalId))

            // Videos and docs are Exa lookups against the Studio, the same fire-and-forget
            // `createSubGoal` does; nothing waits on them.
            const { generateVideos, generateDocuments } = await import('@/actions/(main)/studios/ai-generation.actions')
            Promise.all([generateVideos(studioId, subGoal.title), generateDocuments(studioId, subGoal.title)])
                .catch((err: unknown) => console.error('Failed to add videos/docs:', err))
        }

        // One job per topic at a time: a double click follows the running job.
        const started = await startBackgroundJob('subgoal_generation', { subGoalId }, { singleFlight: true, singleFlightKey: subGoalId })
        if (!started.success) return { success: false as const, error: started.error ?? 'Could not start generating' }
        return { success: true as const, jobId: started.jobId }
    } catch (error: unknown) {
        console.error('Error starting AI sub-goal generation:', error)
        return { success: false as const, error: 'Could not start generating' }
    }
}

// ================================================================================
// SHARE (plan/pathfinder PF-4)
// ================================================================================

/** Share a goal in Explore, or stop sharing it. Free either way; owner only. */
export async function setGoalPublic(goalId: string, isPublic: boolean) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) return { success: false as const, error: 'Unauthorized' }
        const [row] = await db.update(pathfinderGoals)
            .set({ isPublic, updatedAt: new Date() })
            .where(and(eq(pathfinderGoals.id, goalId), eq(pathfinderGoals.userId, session.user.id)))
            .returning({ id: pathfinderGoals.id })
        if (!row) return { success: false as const, error: 'Goal not found' }
        await revalidateGoal(goalId)
        revalidatePath('/pathfinder/explore')
        return { success: true as const, isPublic }
    } catch (error: unknown) {
        console.error('Error sharing goal:', error)
        return { success: false as const, error: 'Could not change sharing' }
    }
}
