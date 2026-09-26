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
    users,
    creditTransactions,
} from '@repo/db'
import { eq, and, desc, asc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { PATHFINDER_CREDITS } from '@/lib/constants/pricing'
import { startBackgroundJob } from '@/actions/(main)/workers/jobs.action'

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
import { modelFor } from '@repo/ai'

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

        const isPublic = input.isPublic ?? true

        // Private goals cost 5 credits
        if (!isPublic) {
            const [user] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, session.user.id))
            const required = PATHFINDER_CREDITS.privateGoalCreation
            if (!user || user.credits < required) {
                return {
                    success: false,
                    error: `Insufficient credits. Private goals require ${required} credits.`,
                    code: 'INSUFFICIENT_CREDITS',
                    required,
                    available: user?.credits ?? 0,
                }
            }
        }

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

        if (!isPublic) {
            const required = PATHFINDER_CREDITS.privateGoalCreation
            // Was a read-then-write debit plus a separate ledger insert: two
            // concurrent creates both passed the check, and a failure between the
            // two writes left the balance and the ledger permanently disagreeing.
            // `debitCredits` does both in one guarded transaction.
            const charge = await debitCredits({
                userId: session.user.id,
                amount: required,
                description: `Pathfinder Private Goal: ${input.title}`,
            })
            if (!charge.ok) {
                return { success: false, error: insufficientCreditsMessage(charge), code: charge.code }
            }
        }

        // Create verification record
        await db.insert(pathfinderVerifications).values({
            goalId: goal.id,
            quizStatus: 'PENDING',
            codingStatus: 'LOCKED',
            mockStatus: 'LOCKED',
            projectStatus: 'PENDING',
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
            with: {
                verification: true,
                group: true,
                dailySessions: {
                    orderBy: [desc(pathfinderDailySessions.date)],
                    limit: 7,
                    with: {
                        subGoals: true,
                    },
                },
            },
        })

        const groups = await db.query.pathfinderGroups.findMany({
            where: eq(pathfinderGroups.userId, session.user.id),
            orderBy: [asc(pathfinderGroups.order)],
            with: {
                goals: true,
            },
        })

        return { success: true, goals, groups }
    } catch (error) {
        console.error('Error fetching goals:', error)
        return { success: false, error: 'Failed to fetch goals', goals: [], groups: [] }
    }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getPathfinderGoal(slugOrId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized', goal: null }
        }

        const isUuid = UUID_REGEX.test(slugOrId)
        const goal = await db.query.pathfinderGoals.findFirst({
            where: isUuid
                ? and(eq(pathfinderGoals.id, slugOrId), eq(pathfinderGoals.userId, session.user.id))
                : and(eq(pathfinderGoals.userId, session.user.id), eq(pathfinderGoals.slug, slugOrId)),
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

import { openai } from '@/lib/openai-client'
import { debitCredits, insufficientCreditsMessage } from '@/lib/credits/debit'

interface StudyPlanTopic {
    title: string
    description: string
    order: number
}

/**
 * Generate AI content (quiz, coding, resources) for an AI-generated sub-goal
 * that hasn't had content loaded yet. Called when user clicks "Generate Content".
 */
export async function generateContentForAISubGoal(subGoalId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const subGoal = await db.query.pathfinderSubGoals.findFirst({
            where: eq(pathfinderSubGoals.id, subGoalId),
            with: { goal: { columns: { id: true, userId: true, category: true, level: true, title: true } } },
        })

        if (!subGoal || subGoal.goal.userId !== session.user.id) {
            return { success: false, error: 'Sub-goal not found' }
        }

        if (subGoal.isContentLoaded) {
            return { success: true, message: 'Content already loaded' }
        }

        // Check usage
        const { canRunPathfinderAI, getGoalUsageSummary } = await import('./usage.action')
        const canRun = await canRunPathfinderAI(subGoal.goalId)
        if (!canRun.allowed) {
            return {
                success: false,
                error: canRun.reason ?? 'AI usage limit reached',
                code: 'USAGE_BLOCKED',
            }
        }

        const { generateExplanation, generateVideos, generateDocuments } = await import('@/actions/(main)/studios/ai-generation.actions')

        // Create Studio for this sub-goal
        const studioSlug = `subgoal-${subGoalId}-${Date.now().toString(36)}`
        const [studio] = await db.insert(studios).values({
            slug: studioSlug,
            title: `📝 ${subGoal.title}`,
            description: `Study notes for: ${subGoal.title}`,
            source: 'PATHFINDER',
            sourceId: subGoalId,
            visibility: 'PRIVATE',
            userId: session.user.id,
            stepCount: 0,
        }).returning()

        if (!studio) throw new Error("Failed to create studio")

        await db.update(pathfinderSubGoals)
            .set({ studioId: studio.id })
            .where(eq(pathfinderSubGoals.id, subGoalId))

        await generateExplanation(
            studio.id,
            `Provide a detailed explanation of "${subGoal.title}". Include key concepts, practical examples, code snippets where relevant, and best practices. Use clear markdown formatting.`
        )

        Promise.all([
            generateVideos(studio.id, subGoal.title),
            generateDocuments(studio.id, subGoal.title),
        ]).catch((err) => console.error('Failed to add videos/docs:', err))

        await generateQuizAndCoding(subGoalId, subGoal.goalId, session.user.id, subGoal.title, subGoal.goal.category, subGoal.goal.level)

        await db.update(pathfinderSubGoals)
            .set({ isContentLoaded: true })
            .where(eq(pathfinderSubGoals.id, subGoalId))

        const usageSummary = await getGoalUsageSummary(subGoal.goalId)

        revalidatePath(`/pathfinder/${subGoal.goalId}`)
        return {
            success: true,
            usageSummary: usageSummary ?? undefined,
        }
    } catch (error) {
        console.error('Error generating content for AI sub-goal:', error)
        return { success: false, error: 'Failed to generate content' }
    }
}

async function generateQuizAndCoding(
    subGoalId: string,
    goalId: string,
    userId: string,
    title: string,
    category: string,
    level: string
) {
    try {
        const codingCount = level === 'BEGINNER' ? 2 : level === 'INTERMEDIATE' ? 2 : 3
        const prompt = `You are an expert educator creating coding practice.

A user is learning about "${title}" as part of their ${category} studies at ${level} level.

Generate ${codingCount} coding problems if this topic involves practical coding skills. Pick appropriate difficulty (EASY, MEDIUM, HARD) for each - vary them. For theory-only topics, use [].

Return JSON in this exact format:
{
  "codingProblems": [
    {
      "id": "cp1",
      "title": "Problem title",
      "description": "Detailed problem description",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "starterCode": "function solve() {\\n  // Your code here\\n}",
      "hints": ["Hint 1", "Hint 2"],
      "sampleInput": "Example input",
      "sampleOutput": "Expected output"
    }
  ]
}

Rules: Vary difficulty. Return ONLY valid JSON, no markdown.`

        const response = await openai.chat.completions.create({
            model: modelFor("pathfinderQuizAndCoding"),
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2000,
            response_format: { type: 'json_object' },
        })

        const content = response.choices[0]?.message?.content
        if (!content) return

        const { logPathfinderUsage } = await import('./usage.action')
        const inputTokens = response.usage?.prompt_tokens ?? 0
        const outputTokens = response.usage?.completion_tokens ?? 0
        if (inputTokens > 0 || outputTokens > 0) {
            await logPathfinderUsage({ goalId, userId, action: 'subgoal_quiz_coding', provider: 'openai', inputTokens, outputTokens })
        }

        const aiContent = JSON.parse(content)
        const codingProblems = Array.isArray(aiContent.codingProblems)
            ? aiContent.codingProblems
            : aiContent.codingProblem
                ? [aiContent.codingProblem]
                : []
        const hasCoding = codingProblems.length > 0

        await db.update(pathfinderSubGoals)
            .set({
                aiCodingProblem: hasCoding ? codingProblems : null,
                hasCoding,
            })
            .where(eq(pathfinderSubGoals.id, subGoalId))

        const subGoal = await db.query.pathfinderSubGoals.findFirst({
            where: eq(pathfinderSubGoals.id, subGoalId),
            columns: { sessionId: true },
        })

        if (subGoal) {
            await db.update(pathfinderDailySessions)
                .set({ totalCodingProblems: sql`${pathfinderDailySessions.totalCodingProblems} + ${codingProblems.length}` })
                .where(eq(pathfinderDailySessions.id, subGoal.sessionId))
        }
    } catch (error) {
        console.error('Error generating quiz/coding for AI sub-goal:', error)
    }
}

function _getCategoryEmoji(category: PathfinderCategory): string {
    const emojis: Record<PathfinderCategory, string> = {
        DSA: '🧮',
        WEB_DEVELOPMENT: '🌐',
        FRONTEND: '🎨',
        BACKEND: '⚙️',
        DEVOPS: '🚀',
        AI_ML: '🤖',
        DATABASE: '🗄️',
        SYSTEM_DESIGN: '🏗️',
        MOBILE: '📱',
        INTERVIEW_PREP: '🎯',
        OTHER: '📚',
    }
    return emojis[category] || '📚'
}

function _mapToMockCategory(category: PathfinderCategory): 'TECHNICAL' | 'CODING' | 'SYSTEM_DESIGN' | 'GENERAL' {
    const mapping: Record<PathfinderCategory, 'TECHNICAL' | 'CODING' | 'SYSTEM_DESIGN' | 'GENERAL'> = {
        DSA: 'CODING',
        WEB_DEVELOPMENT: 'TECHNICAL',
        FRONTEND: 'TECHNICAL',
        BACKEND: 'TECHNICAL',
        DEVOPS: 'TECHNICAL',
        AI_ML: 'TECHNICAL',
        DATABASE: 'TECHNICAL',
        SYSTEM_DESIGN: 'SYSTEM_DESIGN',
        MOBILE: 'TECHNICAL',
        // An interview-prep goal's mock section is a general interview, not a
        // subject exam - its questions already carry their own kind.
        INTERVIEW_PREP: 'GENERAL',
        OTHER: 'GENERAL',
    }
    return mapping[category]
}

function _mapToMockLevel(level: PathfinderLevel): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' {
    return level
}
