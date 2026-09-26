import { and, eq, sql } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON, chatText } from "../openai"
import { JobDurableObject, RetryableError, type ProgressFn, type StoredJob } from "./base"

const { pathfinderSubGoals, pathfinderDailySessions, pathfinderGoals, studioSteps } = schema

/**
 * Everything a new pathfinder sub-goal needs generating, moved off
 * `subgoals.action.ts:createSubGoal` (PF-W2).
 *
 * **Why this one mattered most in the module.** Creating a sub-goal is close to
 * the first thing a user ever does in pathfinder, and the action blocked on TWO
 * model calls before returning:
 *
 *   1. `generateExplanation` - a `gpt-4o-mini` completion with **no
 *      `max_tokens` at all**, asked for a detailed explanation with code
 *      snippets and markdown. Unbounded by construction.
 *   2. `generateAIContentForSubGoal` - quiz questions plus up to three coding
 *      problems, `max_tokens: 2000`.
 *
 * Either alone can outrun a Cloudflare request budget; together they reliably
 * would. The srs put it plainly: "A timeout at that moment is a user who never
 * comes back."
 *
 * **What did NOT move.** The sub-goal row, its daily session, its stats and its
 * Studio are all still created synchronously in the action, before this job is
 * dispatched. The user sees their sub-goal immediately and this fills it in - the
 * same shape `createTailoredResume` uses, and for the same reason: a failure here
 * leaves a real, usable sub-goal rather than nothing.
 *
 * Both prompts move VERBATIM - same model, same temperature, same token caps,
 * same JSON shape. A migration that also reworded a prompt cannot be reviewed,
 * because a regression and a prompt change look identical from the outside.
 */

interface SubGoalGenerationInput {
    /** Pointer only. Everything else is re-read here. */
    subGoalId: string
}

interface CodingProblem {
    id?: string
    title?: string
    description?: string
    difficulty?: string
    starterCode?: string
    hints?: string[]
    sampleInput?: string
    sampleOutput?: string
}

export class SubGoalGeneration extends JobDurableObject<SubGoalGenerationInput> {
    protected readonly jobType: RunnableJobType = "subgoal_generation"
    protected override get initialPhaseLabel() {
        return "Preparing your sub-goal"
    }

    protected async run(job: StoredJob<SubGoalGenerationInput>, progress: ProgressFn): Promise<unknown> {
        const db = this.db()
        const { subGoalId } = job.input

        // Re-read rather than trusting a payload: minutes can pass before this
        // alarm fires and the user may have renamed the sub-goal in between. The
        // goal join also re-checks ownership - a sub-goal id alone must not let
        // anyone generate against someone else's goal.
        const subGoal = await db.query.pathfinderSubGoals.findFirst({
            where: eq(pathfinderSubGoals.id, subGoalId),
            with: { goal: true },
        })
        if (!subGoal) throw new Error("That sub-goal no longer exists")

        const goal = subGoal.goal
        if (!goal || goal.userId !== job.userId) {
            throw new Error("That sub-goal belongs to a different account")
        }

        const title = subGoal.title
        const category = goal.category
        const level = goal.level

        // ── 1. The explanation, into the sub-goal's Studio ────────────────────
        await progress(20, "Writing your explanation")

        let explanationWritten = false
        if (subGoal.studioId) {
            const explanation = await this.explain(title)
            if (explanation) {
                // Upsert, matching `generateExplanation`: a sub-goal regenerated
                // twice must not stack two EXPLANATION steps in its Studio.
                const existing = await db.query.studioSteps.findFirst({
                    where: and(eq(studioSteps.studioId, subGoal.studioId), eq(studioSteps.type, "EXPLANATION")),
                })
                if (existing) {
                    await db.update(studioSteps).set({ content: explanation }).where(eq(studioSteps.id, existing.id))
                } else {
                    const count = await db.$count(studioSteps, eq(studioSteps.studioId, subGoal.studioId))
                    await db.insert(studioSteps).values({
                        studioId: subGoal.studioId,
                        type: "EXPLANATION",
                        content: explanation,
                        source: "AI",
                        orderNumber: count + 1,
                        metadata: {},
                    })
                }
                explanationWritten = true
            }
        }

        // ── 2. Quiz + coding problems ─────────────────────────────────────────
        await progress(60, "Building practice problems")

        const codingProblems = await this.practiceContent(title, category, level)
        const hasCoding = codingProblems.length > 0

        await progress(85, "Saving")

        // The two writes are a pair: the sub-goal's problems and the session's
        // running count. `db.batch` because the neon-http driver has no
        // transactions - see the repo CLAUDE.md. A half-applied pair would leave
        // the session counter disagreeing with the rows it counts.
        await db.batch([
            db
                .update(pathfinderSubGoals)
                .set({ aiCodingProblem: hasCoding ? codingProblems : null, hasCoding })
                .where(eq(pathfinderSubGoals.id, subGoalId)),
            db
                .update(pathfinderDailySessions)
                .set({ totalCodingProblems: sql`${pathfinderDailySessions.totalCodingProblems} + ${codingProblems.length}` })
                .where(eq(pathfinderDailySessions.id, subGoal.sessionId)),
        ])

        // Touch the goal so the module's "last activity" ordering reflects the
        // generation finishing, not the row being created a minute earlier.
        await db
            .update(pathfinderGoals)
            .set({ lastActivityAt: new Date() })
            .where(eq(pathfinderGoals.id, goal.id))

        return {
            subGoalId,
            explanationWritten,
            codingProblemCount: codingProblems.length,
            hasCoding,
        }
    }

    /**
     * `generateExplanation`'s prompt, verbatim, including its lack of a
     * `max_tokens` cap. `chatText` and not `chatJSON`: this one wants prose, and
     * asking for a JSON object containing a string is a pointless round trip and
     * one more thing that can fail to parse.
     *
     * Best-effort. An explanation that fails should not lose the user their
     * practice problems - they are independently useful, and the job reports
     * which parts landed.
     */
    private async explain(title: string): Promise<string | null> {
        try {
            return await chatText({
                apiKey: this.env.OPENAI_API_KEY,
                model: modelFor("pathfinderSubgoalExplain"),
                system: "",
                user: `Provide a detailed explanation of "${title}". Include key concepts, practical examples, code snippets where relevant, and best practices. Use clear markdown formatting.`,
            })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "unknown"
            // A 4xx is our request being wrong and will fail identically on a
            // retry; only transport and 5xx are worth repeating. Neither should
            // kill the job - see the note above.
            console.error("[subgoal_generation] explanation failed:", message)
            return null
        }
    }

    /** `generateAIContentForSubGoal`'s prompt, verbatim. */
    private async practiceContent(title: string, category: string, level: string): Promise<CodingProblem[]> {
        const codingCount = level === "BEGINNER" ? 2 : level === "INTERMEDIATE" ? 2 : 3

        const prompt = `You are an expert educator creating learning content.

A user is learning about "${title}" as part of their ${category} studies at ${level} level.

Generate:
1. 3-5 quiz questions to test understanding of this topic
2. ${codingCount} coding problems if this topic involves practical coding skills. Pick appropriate difficulty for each (EASY, MEDIUM, or HARD) - vary them based on complexity. For theory-only topics, use empty array.

Return JSON in this exact format:
{
  "quizQuestions": [
    {
      "id": "q1",
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct"
    }
  ],
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

Rules:
- For topics like "Learn about X API" or "Understand Y Learn", codingProblems can be []
- For topics like "Practice X", "Implement Y", "Build Z", include ${codingCount} coding problems
- Vary difficulty: include at least one EASY, one MEDIUM, and optionally HARD for advanced
- All content should match the ${level} level

Return ONLY valid JSON, no markdown or code blocks.`

        let raw: string
        try {
            raw = await chatJSON({
                apiKey: this.env.OPENAI_API_KEY,
                model: modelFor("pathfinderSubgoalPractice"),
                temperature: 0.7,
                maxTokens: 2000,
                system: "",
                user: prompt,
            })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "The content generator was unreachable"
            if (/OpenAI API error 4\d\d/.test(message)) throw new Error(message)
            throw new RetryableError(message)
        }

        let parsed: { codingProblems?: unknown; codingProblem?: unknown }
        try {
            parsed = JSON.parse(raw) as { codingProblems?: unknown; codingProblem?: unknown }
        } catch {
            throw new Error("The content generator returned output we could not read")
        }

        // The singular `codingProblem` fallback is carried over deliberately: the
        // model has been observed returning one object instead of an array, and
        // the original code tolerated it. Dropping that tolerance in a migration
        // would look like the model getting worse.
        if (Array.isArray(parsed.codingProblems)) return parsed.codingProblems as CodingProblem[]
        if (parsed.codingProblem) return [parsed.codingProblem as CodingProblem]
        return []
    }
}
