import { and, eq } from "drizzle-orm"
import { pickVerificationProblems } from "@repo/db/pathfinder-coding"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { JobDurableObject, RetryableError, type ProgressFn, type StoredJob } from "./base"

const { pathfinderGoals, pathfinderVerifications, mockInterviewVoice, practiceProblem } = schema

/**
 * Pathfinder verification generation.
 *
 * Why this is on a worker: it calls the OpenAI **Assistants** API, which is not
 * a single completion - it creates a thread, starts a run, then POLLS for that
 * run to finish, up to 90 times at one second apart. That is up to 90 seconds of
 * blocking sleep, which no request survives. The user had already been charged
 * by the time Cloudflare killed it.
 *
 * The assistant id and the response schema are unchanged from the inline
 * version this replaced. One change since (plan/pathfinder PF-17): the prompt
 * no longer asks for coding questions. The job picks judged Practice problems
 * instead and stores their ids as `codingProblemIds`.
 */

interface VerificationInput {
	goalId: string
}

interface AssistantRun {
	id: string
	status: string
	last_error?: { message?: string }
}

/** Matches the inline version's polling budget exactly: 90 attempts, 1s apart. */
const MAX_POLL_ATTEMPTS = 90
const POLL_INTERVAL_MS = 1000

export class VerificationGeneration extends JobDurableObject<VerificationInput> {
	protected readonly jobType: RunnableJobType = "verification_generation"
	protected override get initialPhaseLabel() {
		return "Preparing"
	}

	protected async run(job: StoredJob<VerificationInput>, progress: ProgressFn): Promise<unknown> {
		const db = this.db()
		const assistantId = this.env.PATHFINDER_ASSISTANT_ID
		if (!assistantId) throw new Error("Verification generation not configured")

		// Re-read the goal here rather than trusting a snapshot taken when the
		// job was queued - the user may have completed more sub-goals since.
		const goal = await db.query.pathfinderGoals.findFirst({
			where: eq(pathfinderGoals.id, job.input.goalId),
			with: {
				dailySessions: {
					orderBy: (ds, { desc }) => [desc(ds.date)],
					limit: 14,
					with: {
						subGoals: {
							columns: { title: true, quizCompleted: true, codingCompleted: true },
							orderBy: (sg, { asc }) => [asc(sg.order)],
						},
					},
				},
			},
		})
		if (!goal) throw new Error("Goal not found")

		await progress(15, "Reading your progress")

		// -- Context build: identical to the inline version --------------------
		const dailySessions = goal.dailySessions ?? []
		const subGoalTitles = dailySessions.flatMap((s) => s.subGoals.map((sg) => sg.title))
		const uniqueTopics = [...new Set(subGoalTitles)].slice(0, 15)
		const completedCount = dailySessions.reduce((sum, s) => sum + s.completedSubGoals, 0)

		const userContext = {
			goal: {
				title: goal.title,
				category: goal.category,
				level: goal.level,
				focusAreas: goal.focusAreas,
				overview: goal.overview ?? undefined,
			},
			userLearningProgress: {
				topicsLearned: uniqueTopics,
				tasksCompleted: completedCount,
				totalSubGoals: goal.totalSubGoals,
				quizAnswered: goal.totalQuizAnswered,
				codingSolved: goal.totalCodingSolved,
			},
			instruction:
				"Generate verification quiz questions tailored to what this user has actually learned. Focus on the topics they practiced. Return the full pathfinder_learning_plan schema with quizQuestions (20-25), mockInterview, minorProject, majorProject. Leave codingQuestions empty: coding is verified with judged practice problems.",
		}

		const headers = {
			Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
			"Content-Type": "application/json",
			"OpenAI-Beta": "assistants=v2",
		}

		await progress(25, "Asking the assistant")

		const threadRes = await fetch("https://api.openai.com/v1/threads", {
			method: "POST",
			headers,
			body: JSON.stringify({ messages: [{ role: "user", content: JSON.stringify(userContext) }] }),
		})
		// Nothing has been created yet, so a failure here is safe to retry.
		if (!threadRes.ok) throw new RetryableError(`Could not start generation (${threadRes.status})`)
		const thread = (await threadRes.json()) as { id: string }

		const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
			method: "POST",
			headers,
			body: JSON.stringify({ assistant_id: assistantId }),
		})
		if (!runRes.ok) throw new RetryableError(`Could not start generation (${runRes.status})`)
		let run = (await runRes.json()) as AssistantRun

		// -- The 90s poll that could never have survived a server action -------
		let attempts = 0
		while (run.status !== "completed" && attempts < MAX_POLL_ATTEMPTS) {
			await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
			const pollRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, { headers })
			run = (await pollRes.json()) as AssistantRun
			attempts++

			if (run.status === "failed" || run.status === "cancelled" || run.status === "expired") {
				throw new Error(run.last_error?.message ?? "Generation failed")
			}
			// 25 -> 85% across the poll window, so the bar keeps moving through
			// the longest part of the job instead of sitting still for a minute.
			if (attempts % 5 === 0) {
				const pct = 25 + Math.min(60, Math.round((attempts / MAX_POLL_ATTEMPTS) * 60))
				await progress(pct, "Building your assessment")
			}
		}
		if (run.status !== "completed") throw new Error("Generation timed out")

		const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, { headers })
		const messagesData = (await messagesRes.json()) as {
			data: Array<{ role: string; content: Array<{ type: string; text?: { value: string } }> }>
		}
		const assistantMessage = messagesData.data.find((m) => m.role === "assistant")
		const content = assistantMessage?.content?.[0]
		if (!content || content.type !== "text" || !content.text) {
			throw new Error("No response from assistant")
		}

		let aiPlan: Record<string, unknown>
		try {
			aiPlan = JSON.parse(content.text.value) as Record<string, unknown>
		} catch {
			// Its own error rather than a raw SyntaxError, so the app can refund
			// on a message a user can read.
			throw new Error("The assistant returned malformed output")
		}

		await progress(90, "Saving your plan")

		// Coding is verified with judged Practice problems, never AI-written ones
		// (plan/pathfinder PF-17): their tests were never run against a solution.
		const candidates = await db
			.select({
				id: practiceProblem.id,
				title: practiceProblem.title,
				tags: practiceProblem.tags,
				difficulty: practiceProblem.difficulty,
				sortOrder: practiceProblem.sortOrder,
			})
			.from(practiceProblem)
			.where(and(eq(practiceProblem.module, "DSA"), eq(practiceProblem.judgeStatus, "ready"), eq(practiceProblem.isActive, true)))
		const codingProblemIds = pickVerificationProblems(candidates, {
			title: goal.title,
			category: goal.category,
			topics: subGoalTitles,
		})
		delete aiPlan.codingQuestions
		aiPlan.codingProblemIds = codingProblemIds

		// -- Persist: same writes the inline version made ----------------------
		const mockConfig = aiPlan.mockInterview as Record<string, unknown> | undefined
		let mockId: string | null = null
		if (mockConfig) {
			const [mock] = await db
				.insert(mockInterviewVoice)
				.values({
					title: (mockConfig.title as string) || `Verification: ${goal.title}`,
					description: (mockConfig.description as string) || `Mock interview for ${goal.title} verification`,
					category: "TECHNICAL",
					level: (goal.level as "BEGINNER" | "INTERMEDIATE" | "ADVANCED") ?? "INTERMEDIATE",
					duration: (mockConfig.duration as number) || 15,
					questionsCount: (mockConfig.questionsCount as number) || 5,
					knowledgeBase:
						(mockConfig.knowledgeBase as string) ||
						`Verification interview for: ${goal.title}. Category: ${goal.category}. Level: ${goal.level}.`,
					isPublic: false,
					isPredefined: false,
					createdById: job.userId,
					includesResume: false,
					baseCredits: 0,
					creditsRequired: 0,
					tags: ["pathfinder", "verification"],
				})
				.returning()
			if (mock) mockId = mock.id
		}

		await db
			.update(pathfinderGoals)
			.set({
				overview: (aiPlan.overview as string) ?? goal.overview,
				learningObjectives: (aiPlan.learningObjectives as string[]) ?? goal.learningObjectives,
				prerequisites: (aiPlan.prerequisites as string[]) ?? goal.prerequisites,
			})
			.where(eq(pathfinderGoals.id, job.input.goalId))

		await db
			.update(pathfinderVerifications)
			.set({
				generatedPlan: aiPlan as object,
				mockInterviewId: mockId,
				// No matching problems: the goal has no coding section (LOCKED, and
				// `codingProblemIds: []` tells the app it is not required).
				codingStatus: codingProblemIds.length ? "PENDING" : "LOCKED",
				mockStatus: "PENDING",
			})
			.where(eq(pathfinderVerifications.goalId, job.input.goalId))

		// A pointer, not the plan. The plan itself is already persisted on
		// `pathfinder_verification.generated_plan`; copying it into
		// `background_job.result` as well would store a multi-thousand-token
		// document twice for no reader.
		return { goalId: job.input.goalId, mockInterviewId: mockId }
	}
}
