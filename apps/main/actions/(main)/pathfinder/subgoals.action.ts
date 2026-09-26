'use server'

import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import {
    db,
    pathfinderGoals,
    pathfinderDailySessions,
    pathfinderSubGoals,
    studios,
} from '@repo/db'
import { eq, and, asc, desc, sql, max } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import type OpenAI from 'openai'
import { openai } from '@/lib/openai-client'
import {
    generateVideos, generateDocuments
} from '@/actions/(main)/studios/ai-generation.actions'
import { canRunPathfinderAI, getGoalUsageSummary } from './usage.action'
import { startBackgroundJob } from '@/actions/(main)/workers/jobs.action'
import { modelFor } from '@repo/ai'


// ================================================================================
// TYPES
// ================================================================================

export interface CreateSubGoalInput {
    goalId: string
    title: string
    description?: string
    source?: 'text' | 'voice'
    voiceTranscript?: string
}

export interface QuizQuestion {
    id: string
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
}

export interface CodingProblem {
    title: string
    description: string
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
    starterCode: string
    hints: string[]
    sampleInput?: string
    sampleOutput?: string
}

// ================================================================================
// GET OR CREATE DAILY SESSION
// ================================================================================

export async function getOrCreateDailySession(goalId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayStr = today.toISOString().split('T')[0]!

        let dailySession = await db.query.pathfinderDailySessions.findFirst({
            where: and(
                eq(pathfinderDailySessions.goalId, goalId),
                eq(pathfinderDailySessions.date, todayStr)
            ),
            with: {
                subGoals: {
                    orderBy: [asc(pathfinderSubGoals.order)],
                },
            },
        })

        if (!dailySession) {
            const [created] = await db.insert(pathfinderDailySessions).values({
                goalId,
                userId: session.user.id,
                date: todayStr,
            }).returning()

            if (!created) throw new Error("Failed to create daily session")
            dailySession = { ...created, subGoals: [] }
        }

        return { success: true, session: dailySession }
    } catch (error) {
        console.error('Error getting/creating daily session:', error)
        return { success: false, error: 'Failed to get daily session' }
    }
}

// ================================================================================
// GET DAILY SESSION BY DATE
// ================================================================================

export async function getDailySessionByDate(goalId: string, date: Date) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const normalizedDate = new Date(date)
        normalizedDate.setHours(0, 0, 0, 0)
        const normalizedDateStr = normalizedDate.toISOString().split('T')[0]!

        const dailySession = await db.query.pathfinderDailySessions.findFirst({
            where: and(
                eq(pathfinderDailySessions.goalId, goalId),
                eq(pathfinderDailySessions.date, normalizedDateStr)
            ),
            with: {
                subGoals: {
                    orderBy: [asc(pathfinderSubGoals.order)],
                },
            },
        })

        return { success: true, session: dailySession }
    } catch (error) {
        console.error('Error getting daily session:', error)
        return { success: false, error: 'Failed to get daily session' }
    }
}

// ================================================================================
// GET ALL SESSIONS FOR A GOAL
// ================================================================================

export async function getGoalSessions(goalId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized', sessions: [] }
        }

        const sessions = await db.query.pathfinderDailySessions.findMany({
            where: eq(pathfinderDailySessions.goalId, goalId),
            orderBy: [desc(pathfinderDailySessions.date)],
            with: {
                subGoals: {
                    orderBy: [asc(pathfinderSubGoals.order)],
                },
            },
        })

        return { success: true, sessions }
    } catch (error) {
        console.error('Error getting goal sessions:', error)
        return { success: false, error: 'Failed to get sessions', sessions: [] }
    }
}

// ================================================================================
// CREATE SUB-GOAL
// ================================================================================

export async function createSubGoal(input: CreateSubGoalInput) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        // Verify goal belongs to user
        const goal = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.id, input.goalId), eq(pathfinderGoals.userId, session.user.id)),
        })

        if (!goal) {
            return { success: false, error: 'Goal not found' }
        }

        // Check if user can run AI (usage limit)
        const canRun = await canRunPathfinderAI(input.goalId)
        if (!canRun.allowed) {
            return {
                success: false,
                error: canRun.reason ?? 'AI usage limit reached',
                code: 'USAGE_BLOCKED',
                pendingCredits: canRun.pendingCredits,
            }
        }

        // Get or create today's session
        const sessionResult = await getOrCreateDailySession(input.goalId)
        if (!sessionResult.success || !sessionResult.session) {
            return { success: false, error: 'Failed to get daily session' }
        }

        const dailySession = sessionResult.session

        // Get max order for this session
        const [maxResult] = await db
            .select({ maxOrder: max(pathfinderSubGoals.order) })
            .from(pathfinderSubGoals)
            .where(eq(pathfinderSubGoals.sessionId, dailySession.id))

        // Create sub-goal
        const [subGoal] = await db.insert(pathfinderSubGoals).values({
            goalId: input.goalId,
            sessionId: dailySession.id,
            title: input.title,
            description: input.description,
            source: input.source || 'text',
            voiceTranscript: input.voiceTranscript,
            order: (maxResult?.maxOrder || 0) + 1,
        }).returning()

        if (!subGoal) throw new Error("Failed to create sub-goal")

        // Update session stats
        await db.update(pathfinderDailySessions)
            .set({ totalSubGoals: sql`${pathfinderDailySessions.totalSubGoals} + 1` })
            .where(eq(pathfinderDailySessions.id, dailySession.id))

        // Update goal stats
        await db.update(pathfinderGoals)
            .set({
                totalSubGoals: sql`${pathfinderGoals.totalSubGoals} + 1`,
                lastActivityAt: new Date(),
            })
            .where(eq(pathfinderGoals.id, input.goalId))

        // Create Studio for this sub-goal
        const studioSlug = `subgoal-${subGoal.id}-${Date.now().toString(36)}`
        const [studio] = await db.insert(studios).values({
            slug: studioSlug,
            title: `📝 ${input.title}`,
            description: `Study notes for: ${input.title}`,
            source: 'PATHFINDER',
            sourceId: subGoal.id,
            visibility: 'PRIVATE',
            userId: session.user.id,
            stepCount: 0,
        }).returning()

        if (!studio) throw new Error("Failed to create studio")

        await db.update(pathfinderSubGoals)
            .set({ studioId: studio.id })
            .where(eq(pathfinderSubGoals.id, subGoal.id))

        // Videos and docs stay here and stay fire-and-forget: they are Exa
        // lookups against the Studio, they were already non-blocking, and nothing
        // in the response depends on them.
        Promise.all([
            generateVideos(studio.id, input.title),
            generateDocuments(studio.id, input.title),
        ]).catch((err) => console.error('Failed to add videos/docs to studio:', err))

        // The two MODEL calls move to the worker (PF-W2).
        //
        // This action used to block on both: `generateExplanation`, a gpt-4o-mini
        // completion with no `max_tokens` at all, and `generateAIContentForSubGoal`,
        // quiz plus up to three coding problems at 2000 tokens. Either can outrun a
        // Cloudflare request budget; together they reliably would - and this runs
        // when a user creates their first sub-goal, which is close to the first
        // thing they ever do in this module.
        //
        // Everything above stays synchronous, so the user gets a real sub-goal and
        // its Studio back immediately and the generation fills them in. Same shape
        // as `createTailoredResume`: a failed job leaves a usable row rather than
        // nothing.
        const started = await startBackgroundJob(
            'subgoal_generation',
            { subGoalId: subGoal.id },
        )

        const usageSummary = await getGoalUsageSummary(input.goalId)

        revalidatePath(`/pathfinder/${input.goalId}`)
        return {
            success: true,
            subGoal,
            // The job id the client follows. A failed DISPATCH is not a failed
            // sub-goal - the row exists and is usable - so this returns success
            // either way and the caller decides whether to poll.
            jobId: started.success ? started.jobId : undefined,
            generationError: started.success ? undefined : started.error,
            usageSummary: usageSummary ?? undefined,
        }
    } catch (error) {
        console.error('Error creating sub-goal:', error)
        return { success: false, error: 'Failed to create sub-goal' }
    }
}

// ================================================================================
// GET SUB-GOAL WITH AI CONTENT
// ================================================================================

export async function getSubGoalWithContent(subGoalId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const subGoal = await db.query.pathfinderSubGoals.findFirst({
            where: eq(pathfinderSubGoals.id, subGoalId),
            with: {
                goal: {
                    columns: { userId: true },
                },
            },
        })

        if (!subGoal || subGoal.goal.userId !== session.user.id) {
            return { success: false, error: 'Sub-goal not found' }
        }

        return { success: true, subGoal }
    } catch (error) {
        console.error('Error getting sub-goal:', error)
        return { success: false, error: 'Failed to get sub-goal' }
    }
}

// ================================================================================
// UPDATE SUB-GOAL STATUS
// ================================================================================

export async function updateSubGoalStatus(
    subGoalId: string,
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const subGoal = await db.query.pathfinderSubGoals.findFirst({
            where: eq(pathfinderSubGoals.id, subGoalId),
            with: {
                goal: {
                    columns: { id: true, userId: true },
                },
            },
        })

        if (!subGoal || subGoal.goal.userId !== session.user.id) {
            return { success: false, error: 'Sub-goal not found' }
        }

        const wasCompleted = subGoal.status === 'COMPLETED'
        const isNowCompleted = status === 'COMPLETED'

        await db.update(pathfinderSubGoals)
            .set({
                status,
                completedAt: isNowCompleted ? new Date() : null,
            })
            .where(eq(pathfinderSubGoals.id, subGoalId))

        // Update counters
        if (!wasCompleted && isNowCompleted) {
            await db.update(pathfinderDailySessions)
                .set({ completedSubGoals: sql`${pathfinderDailySessions.completedSubGoals} + 1` })
                .where(eq(pathfinderDailySessions.id, subGoal.sessionId))
            await db.update(pathfinderGoals)
                .set({
                    completedSubGoals: sql`${pathfinderGoals.completedSubGoals} + 1`,
                    lastActivityAt: new Date(),
                })
                .where(eq(pathfinderGoals.id, subGoal.goalId))
        } else if (wasCompleted && !isNowCompleted) {
            await db.update(pathfinderDailySessions)
                .set({ completedSubGoals: sql`${pathfinderDailySessions.completedSubGoals} - 1` })
                .where(eq(pathfinderDailySessions.id, subGoal.sessionId))
            await db.update(pathfinderGoals)
                .set({ completedSubGoals: sql`${pathfinderGoals.completedSubGoals} - 1` })
                .where(eq(pathfinderGoals.id, subGoal.goalId))
        }

        revalidatePath(`/pathfinder/${subGoal.goal.id}`)
        return { success: true }
    } catch (error) {
        console.error('Error updating sub-goal status:', error)
        return { success: false, error: 'Failed to update status' }
    }
}

// ================================================================================
// SUBMIT SUB-GOAL QUIZ ANSWERS
// ================================================================================

export async function submitSubGoalQuiz(
    subGoalId: string,
    answers: { questionId: string; selectedAnswer: number }[]
) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const subGoal = await db.query.pathfinderSubGoals.findFirst({
            where: eq(pathfinderSubGoals.id, subGoalId),
            with: {
                goal: {
                    columns: { id: true, userId: true },
                },
            },
        })

        if (!subGoal || subGoal.goal.userId !== session.user.id) {
            return { success: false, error: 'Sub-goal not found' }
        }

        // Quiz now lives in Studio - for legacy sub-goals we no longer have aiQuizQuestions
        const quizQuestions = ((subGoal as { aiQuizQuestions?: unknown }).aiQuizQuestions as QuizQuestion[] | undefined) || []

        if (quizQuestions.length === 0) {
            return { success: false, error: 'Quiz is in the Studio. Complete it in the Notes tab.' }
        }

        // Calculate score
        let correctCount = 0
        for (const answer of answers) {
            const question = quizQuestions.find((q) => q.id === answer.questionId)
            if (question && question.correctAnswer === answer.selectedAnswer) {
                correctCount++
            }
        }

        const score = Math.round((correctCount / quizQuestions.length) * 100)

        await db.update(pathfinderSubGoals)
            .set({
                quizCompleted: true,
                quizScore: score,
            })
            .where(eq(pathfinderSubGoals.id, subGoalId))

        await db.update(pathfinderDailySessions)
            .set({ correctQuizAnswers: sql`${pathfinderDailySessions.correctQuizAnswers} + ${correctCount}` })
            .where(eq(pathfinderDailySessions.id, subGoal.sessionId))

        await db.update(pathfinderGoals)
            .set({
                totalQuizAnswered: sql`${pathfinderGoals.totalQuizAnswered} + ${quizQuestions.length}`,
                lastActivityAt: new Date(),
            })
            .where(eq(pathfinderGoals.id, subGoal.goalId))

        revalidatePath(`/pathfinder/${subGoal.goal.id}`)
        return { success: true, score, correctCount, total: quizQuestions.length }
    } catch (error) {
        console.error('Error submitting quiz:', error)
        return { success: false, error: 'Failed to submit quiz' }
    }
}

// ================================================================================
// SUBMIT SUB-GOAL CODING SOLUTION
// ================================================================================

export async function submitSubGoalCoding(
    subGoalId: string,
    code: string,
    language: string,
    problemId?: string
) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const subGoal = await db.query.pathfinderSubGoals.findFirst({
            where: eq(pathfinderSubGoals.id, subGoalId),
            with: {
                goal: {
                    columns: { id: true, userId: true },
                },
            },
        })

        if (!subGoal || subGoal.goal.userId !== session.user.id) {
            return { success: false, error: 'Sub-goal not found' }
        }

        const rawCoding = subGoal.aiCodingProblem
        const problems: Array<Record<string, unknown> | undefined> = Array.isArray(rawCoding)
            ? rawCoding.map((p, i) => ({ ...(p as Record<string, unknown>), id: (p as Record<string, unknown>).id ?? `cp${i}` }))
            : rawCoding
                ? [{ ...(rawCoding as Record<string, unknown>), id: 'cp0' }]
                : []
        const codingProblem = problemId
            ? problems.find((p) => p?.id === problemId)
            : problems[0]
        if (!codingProblem) {
            return { success: false, error: 'No coding problem for this sub-goal' }
        }

        // Evaluate code using OpenAI
        const evaluationPrompt = `You are a code evaluator. Evaluate this solution:

Problem: ${codingProblem.title}
Description: ${codingProblem.description}
Expected sample input: ${codingProblem.sampleInput || 'N/A'}
Expected sample output: ${codingProblem.sampleOutput || 'N/A'}

User's solution (${language}):
\`\`\`${language}
${code}
\`\`\`

Evaluate and return JSON:
{
  "passed": true/false,
  "feedback": "Detailed feedback about the solution",
  "suggestions": ["Improvement suggestion 1", "Suggestion 2"],
  "score": 0-100
}

Be lenient - if the logic is mostly correct, pass it. Focus on:
1. Does it solve the problem?
2. Is the approach reasonable?
3. Any major issues?

Return ONLY valid JSON.`

        const response = await openai.chat.completions.create({
            model: modelFor("pathfinderCodingReview"),
            messages: [{ role: 'user', content: evaluationPrompt }],
            temperature: 0.3,
            max_tokens: 1000,
            response_format: { type: 'json_object' },
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            return { success: false, error: 'Failed to evaluate code' }
        }

        const evaluation = JSON.parse(content)
        const pid = codingProblem.id ?? 'cp0'

        // Update coding progress for multiple problems
        const currentProgress = (subGoal.codingProgress as Record<string, boolean>) ?? {}
        const newProgress = { ...currentProgress, [pid as string]: evaluation.passed }
        const allPassed = problems.every((p) => newProgress[(p?.id ?? 'cp0') as string] === true)
        const allAttempted = problems.every((p) => (p?.id ?? 'cp0') as string in newProgress)

        await db.update(pathfinderSubGoals)
            .set({
                codingProgress: newProgress,
                codingCompleted: allAttempted,
                codingPassed: allPassed,
            })
            .where(eq(pathfinderSubGoals.id, subGoalId))

        if (evaluation.passed) {
            await db.update(pathfinderDailySessions)
                .set({ solvedCodingProblems: sql`${pathfinderDailySessions.solvedCodingProblems} + 1` })
                .where(eq(pathfinderDailySessions.id, subGoal.sessionId))
        }

        await db.update(pathfinderGoals)
            .set({
                totalCodingSolved: sql`${pathfinderGoals.totalCodingSolved} + ${evaluation.passed ? 1 : 0}`,
                lastActivityAt: new Date(),
            })
            .where(eq(pathfinderGoals.id, subGoal.goalId))

        revalidatePath(`/pathfinder/${subGoal.goal.id}`)
        return {
            success: true,
            passed: evaluation.passed,
            feedback: evaluation.feedback,
            suggestions: evaluation.suggestions,
            score: evaluation.score,
            allPassed,
        }
    } catch (error) {
        console.error('Error submitting coding:', error)
        return { success: false, error: 'Failed to submit coding solution' }
    }
}

// ================================================================================
// DELETE SUB-GOAL
// ================================================================================

export async function deleteSubGoal(subGoalId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const subGoal = await db.query.pathfinderSubGoals.findFirst({
            where: eq(pathfinderSubGoals.id, subGoalId),
            with: {
                goal: {
                    columns: { id: true, userId: true },
                },
            },
        })

        if (!subGoal || subGoal.goal.userId !== session.user.id) {
            return { success: false, error: 'Sub-goal not found' }
        }

        const wasCompleted = subGoal.status === 'COMPLETED'

        await db.delete(pathfinderSubGoals).where(eq(pathfinderSubGoals.id, subGoalId))

        await db.update(pathfinderDailySessions)
            .set({
                totalSubGoals: sql`${pathfinderDailySessions.totalSubGoals} - 1`,
                ...(wasCompleted ? { completedSubGoals: sql`${pathfinderDailySessions.completedSubGoals} - 1` } : {}),
            })
            .where(eq(pathfinderDailySessions.id, subGoal.sessionId))

        await db.update(pathfinderGoals)
            .set({
                totalSubGoals: sql`${pathfinderGoals.totalSubGoals} - 1`,
                ...(wasCompleted ? { completedSubGoals: sql`${pathfinderGoals.completedSubGoals} - 1` } : {}),
            })
            .where(eq(pathfinderGoals.id, subGoal.goalId))

        revalidatePath(`/pathfinder/${subGoal.goal.id}`)
        return { success: true }
    } catch (error) {
        console.error('Error deleting sub-goal:', error)
        return { success: false, error: 'Failed to delete sub-goal' }
    }
}

// ================================================================================
// SAVE SESSION NOTES
// ================================================================================

export async function saveSessionNotes(sessionId: string, notes: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const dailySession = await db.query.pathfinderDailySessions.findFirst({
            where: and(
                eq(pathfinderDailySessions.id, sessionId),
                eq(pathfinderDailySessions.userId, session.user.id)
            ),
        })

        if (!dailySession) {
            return { success: false, error: 'Session not found' }
        }

        await db.update(pathfinderDailySessions)
            .set({ notes })
            .where(eq(pathfinderDailySessions.id, sessionId))

        return { success: true }
    } catch (error) {
        console.error('Error saving notes:', error)
        return { success: false, error: 'Failed to save notes' }
    }
}
