import {
    db,
    pathfinderGoals,
    pathfinderVerifications,
    pathfinderDailySessions,
    pathfinderSubGoals,
    studios,
    studioSteps,
    withTransaction,
} from '@repo/db'
import { and, asc, eq, inArray } from 'drizzle-orm'

export type CopyResult =
    | { success: true; slug: string; goalId: string; existing: boolean }
    | { success: false; error: string; slug: null }

const DAY_MS = 24 * 60 * 60 * 1000
const isoDay = (d: Date) => d.toISOString().slice(0, 10)

/**
 * Copy a shared goal into your own goals: free, private, and complete. Every topic
 * keeps its kind, its AI flags and its coding problems, and its notes are copied
 * into a Studio of your own. The days are moved so day one is today, keeping the
 * gaps between them. Copying the same goal again opens the copy you already have.
 *
 * It used to charge the author's price, drop each topic's kind and content (so
 * copied topics sat on "Generating" forever), keep the source's past dates, and
 * fail on a second purchase of the same goal.
 */
export async function copyGoalFor(userId: string, goalId: string): Promise<CopyResult> {
    try {
        const existing = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.userId, userId), eq(pathfinderGoals.forkedFromId, goalId)),
            columns: { id: true, slug: true },
        })
        if (existing) return { success: true as const, slug: existing.slug, goalId: existing.id, existing: true }

        const source = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.id, goalId), eq(pathfinderGoals.isPublic, true)),
            with: {
                dailySessions: {
                    orderBy: [asc(pathfinderDailySessions.date)],
                    with: { subGoals: { orderBy: [asc(pathfinderSubGoals.order)] } },
                },
            },
        })
        if (!source) return { success: false as const, error: 'This goal is no longer shared', slug: null }

        // Notes live in each topic's Studio. Read them before the transaction.
        const studioIds = source.dailySessions.flatMap((d) => d.subGoals.map((s) => s.studioId)).filter((s): s is string => !!s)
        const sourceStudios = studioIds.length
            ? await db.query.studios.findMany({
                where: inArray(studios.id, studioIds),
                with: { steps: { orderBy: [asc(studioSteps.orderNumber)] } },
            })
            : []
        const studioById = new Map(sourceStudios.map((s) => [s.id, s]))

        const slug = await (async () => {
            let s = source.slug
            for (let i = 1; ; i++) {
                const taken = await db.query.pathfinderGoals.findFirst({
                    where: and(eq(pathfinderGoals.userId, userId), eq(pathfinderGoals.slug, s)),
                    columns: { id: true },
                })
                if (!taken) return s
                s = `${source.slug}-${i}`
            }
        })()

        const today = new Date(`${isoDay(new Date())}T00:00:00Z`).getTime()
        const first = source.dailySessions[0] ? new Date(`${source.dailySessions[0].date}T00:00:00Z`).getTime() : today
        const topicCount = source.dailySessions.reduce((n, d) => n + d.subGoals.length, 0)

        const created = await withTransaction(async (tx) => {
            const [goal] = await tx.insert(pathfinderGoals).values({
                userId,
                title: source.title,
                slug,
                category: source.category,
                level: source.level,
                focusAreas: source.focusAreas,
                duration: source.duration,
                estimatedDays: source.estimatedDays,
                estimatedHours: source.estimatedHours,
                overview: source.overview,
                learningObjectives: source.learningObjectives,
                prerequisites: source.prerequisites,
                isPublic: false,
                forkedFromId: source.id,
                status: 'ACTIVE',
                totalSubGoals: topicCount,
                startedAt: new Date(),
            }).returning({ id: pathfinderGoals.id, slug: pathfinderGoals.slug })
            if (!goal) throw new Error('Could not create the copy')

            await tx.insert(pathfinderVerifications).values({
                goalId: goal.id,
                quizStatus: 'PENDING',
                codingStatus: 'LOCKED',
                mockStatus: 'LOCKED',
                projectStatus: 'PENDING',
            })

            for (const day of source.dailySessions) {
                const offset = Math.round((new Date(`${day.date}T00:00:00Z`).getTime() - first) / DAY_MS)
                const [newDay] = await tx.insert(pathfinderDailySessions).values({
                    goalId: goal.id,
                    userId,
                    date: isoDay(new Date(today + offset * DAY_MS)),
                    totalSubGoals: day.subGoals.length,
                    totalCodingProblems: day.totalCodingProblems,
                }).returning({ id: pathfinderDailySessions.id })
                if (!newDay) throw new Error('Could not copy a day')

                for (const topic of day.subGoals) {
                    const [newTopic] = await tx.insert(pathfinderSubGoals).values({
                        goalId: goal.id,
                        sessionId: newDay.id,
                        title: topic.title,
                        description: topic.description,
                        source: topic.source,
                        kind: topic.kind,
                        order: topic.order,
                        isAIGenerated: topic.isAIGenerated,
                        isContentLoaded: topic.isContentLoaded,
                        aiCodingProblem: topic.aiCodingProblem,
                        hasCoding: topic.hasCoding,
                        status: 'PENDING',
                    }).returning({ id: pathfinderSubGoals.id })
                    if (!newTopic) throw new Error('Could not copy a topic')

                    const notes = topic.studioId ? studioById.get(topic.studioId) : undefined
                    if (!notes) continue
                    const [studio] = await tx.insert(studios).values({
                        slug: `subgoal-${newTopic.id}-${Date.now().toString(36)}`,
                        title: notes.title,
                        description: notes.description,
                        emoji: notes.emoji,
                        source: 'PATHFINDER',
                        sourceId: newTopic.id,
                        visibility: 'PRIVATE',
                        userId,
                        category: notes.category,
                        tags: notes.tags,
                        stepCount: notes.steps.length,
                    }).returning({ id: studios.id })
                    if (!studio) throw new Error('Could not copy notes')
                    if (notes.steps.length) {
                        await tx.insert(studioSteps).values(notes.steps.map((s) => ({
                            studioId: studio.id,
                            orderNumber: s.orderNumber,
                            type: s.type,
                            content: s.content,
                            metadata: s.metadata,
                            source: s.source,
                            status: s.status,
                        })))
                    }
                    await tx.update(pathfinderSubGoals).set({ studioId: studio.id }).where(eq(pathfinderSubGoals.id, newTopic.id))
                }
            }
            return goal
        })

        return { success: true as const, slug: created.slug, goalId: created.id, existing: false }
    } catch (error: unknown) {
        console.error('Error copying goal:', error)
        return { success: false as const, error: 'Could not copy this goal. Try again.', slug: null }
    }
}
