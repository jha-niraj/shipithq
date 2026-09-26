import { and, eq, sql } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { JobDurableObject, RetryableError, type ProgressFn, type StoredJob } from "./base"

const { pathfinderGoals, pathfinderDailySessions, pathfinderSubGoals } = schema

/**
 * Generate a goal's AI study plan - the ordered list of sub-goals a user works
 * through. Moved off `goals.action.ts:generateAIStudyPlan` (PF-W4).
 *
 * **This migration is about DURABILITY, not latency, and that is unusual.** The
 * call was already off the response path, but in the worst possible way:
 *
 *     generateAIStudyPlan(...).catch(err => console.error(...))
 *
 * A floating promise, never awaited, with no `waitUntil`. `createPathfinderGoal`
 * returns immediately and the isolate is then free to be torn down - so on
 * Cloudflare the plan may simply never be generated. No error reaches the user,
 * no row records the attempt, and the goal just sits there empty. "Sometimes my
 * plan does not appear" is not a diagnosable bug report, which is exactly why
 * this shape is worse than a slow request: a timeout at least tells you.
 *
 * As a job it gets a row, a status, retries and a visible failure.
 *
 * The prompt, model, temperature and token cap move verbatim.
 */

interface GoalCreationInput {
    /** Pointer only - the goal is re-read here. */
    goalId: string
    /** Chosen at creation time and not stored on the goal, so it travels. */
    focusAreas: string[]
}

interface StudyPlanTopic {
    title: string
    description: string
    order: number
}

export class GoalCreation extends JobDurableObject<GoalCreationInput> {
    protected readonly jobType: RunnableJobType = "goal_creation"
    protected override get initialPhaseLabel() {
        return "Planning your goal"
    }

    protected async run(job: StoredJob<GoalCreationInput>, progress: ProgressFn): Promise<unknown> {
        const db = this.db()
        const { goalId, focusAreas } = job.input

        // Scoped to the job's userId, which came from the signed token.
        const goal = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.id, goalId), eq(pathfinderGoals.userId, job.userId)),
        })
        if (!goal) throw new Error("That goal no longer exists")

        // Refuse to plan a goal that already has sub-goals. The alarm can re-fire
        // after an eviction, and the original code appended unconditionally - a
        // second run would silently double every topic in the plan. The base
        // class's duplicate-run guard covers one dispatch; this covers a retry
        // that got far enough to write.
        const existing = await db.$count(pathfinderSubGoals, eq(pathfinderSubGoals.goalId, goalId))
        if (existing > 0) {
            return { goalId, skipped: true, reason: "This goal already has a study plan", topicCount: 0 }
        }

        await progress(30, "Choosing your topics")

        const topics = await this.plan(goal.title, goal.category, goal.level, focusAreas ?? [])
        if (topics.length === 0) throw new Error("The planner returned no topics")

        await progress(75, `Saving ${topics.length} topics`)

        // One daily session to hang the plan off, created if today has none.
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayStr = today.toISOString().split("T")[0] as string

        // `onConflictDoNothing`, not read-then-write. See IP-10.
        //
        // The find-then-insert this replaces lost the race in a live run of the
        // sibling job: `createPathfinderGoal` returns a slug, the user lands on
        // the goal page, the page opens today's session - and this job is opening
        // one at the same moment. Both see nothing, both insert, and the loser
        // gets
        //
        //     duplicate key value violates unique constraint "idx_pfds_goal_id_date"
        //
        // which fails the whole plan after the credits are already held. The
        // unique index is the authority, so let it arbitrate and read back
        // whichever row won.
        const [inserted] = await db
            .insert(pathfinderDailySessions)
            .values({ goalId, userId: job.userId, date: todayStr })
            .onConflictDoNothing()
            .returning()

        const dailySession =
            inserted ??
            (await db.query.pathfinderDailySessions.findFirst({
                where: and(
                    eq(pathfinderDailySessions.goalId, goalId),
                    eq(pathfinderDailySessions.date, todayStr),
                ),
            }))
        if (!dailySession) throw new Error("Could not open a session for this plan")

        // All the sub-goals in ONE insert rather than a loop of N.
        //
        // The original awaited an insert per topic - 8 to 15 sequential round
        // trips - and a failure at topic 9 left a half-written plan with the
        // counters below never updated. One statement is atomic on its own and is
        // also the difference between one network round trip and fifteen.
        await db.insert(pathfinderSubGoals).values(
            topics.map((t) => ({
                goalId,
                sessionId: dailySession.id,
                title: t.title,
                description: t.description,
                source: "text" as const,
                order: t.order,
                isAIGenerated: true,
                isContentLoaded: false,
            })),
        )

        // The two counters are a pair, so they go together. `db.batch` because the
        // neon-http driver has no transactions - see the repo CLAUDE.md.
        await db.batch([
            db
                .update(pathfinderDailySessions)
                .set({ totalSubGoals: sql`${pathfinderDailySessions.totalSubGoals} + ${topics.length}` })
                .where(eq(pathfinderDailySessions.id, dailySession.id)),
            db
                .update(pathfinderGoals)
                .set({
                    totalSubGoals: sql`${pathfinderGoals.totalSubGoals} + ${topics.length}`,
                    lastActivityAt: new Date(),
                })
                .where(eq(pathfinderGoals.id, goalId)),
        ])

        return { goalId, topicCount: topics.length, sessionId: dailySession.id, skipped: false }
    }

    /** `generateAIStudyPlan`'s prompt, verbatim. */
    private async plan(
        title: string,
        category: string,
        level: string,
        focusAreas: string[],
    ): Promise<StudyPlanTopic[]> {
        const topicCount = level === "BEGINNER" ? "8-12" : level === "INTERMEDIATE" ? "10-15" : "12-15"

        const prompt = `You are an expert educator creating a structured study plan.

A user wants to learn "${title}" at ${level.toLowerCase()} level.
Category: ${category.replace("_", " ")}
Focus areas: ${focusAreas.length > 0 ? focusAreas.join(", ") : "General"}

Generate ${topicCount} study topics/sub-goals that form a logical learning path from basics to advanced.

Rules:
- Topics should be ordered from foundational to advanced
- Each topic should be a discrete learning unit (1-3 hours of study)
- Cover theory, practice, and real-world application
- For ${level.toLowerCase()} level, adjust depth appropriately
- Be specific (not "Learn arrays" but "Arrays: Traversal, Insertion, and Deletion Patterns")
- Include practical/hands-on topics (not just theory)

Return JSON:
{
  "topics": [
    { "title": "Topic title", "description": "Brief 1-2 sentence description of what this covers", "order": 1 }
  ]
}

Return ONLY valid JSON, no markdown.`

        let raw: string
        try {
            raw = await chatJSON({
                apiKey: this.env.OPENAI_API_KEY,
                model: modelFor("pathfinderGoalCreation"),
                temperature: 0.7,
                maxTokens: 2000,
                system: "",
                user: prompt,
            })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "The planner was unreachable"
            if (/OpenAI API error 4\d\d/.test(message)) throw new Error(message)
            throw new RetryableError(message)
        }

        let parsed: { topics?: unknown }
        try {
            parsed = JSON.parse(raw) as { topics?: unknown }
        } catch {
            throw new Error("The planner returned output we could not read")
        }
        if (!Array.isArray(parsed.topics)) return []

        // Normalise before writing. `order` is `notNull` on the table, and a topic
        // that arrives without one would fail the insert and take the whole plan
        // with it - so index position is the fallback.
        return (parsed.topics as StudyPlanTopic[])
            .filter((t) => t && typeof t.title === "string" && t.title.trim())
            .map((t, i) => ({
                title: t.title.trim(),
                description: typeof t.description === "string" ? t.description : "",
                order: typeof t.order === "number" ? t.order : i + 1,
            }))
    }
}
