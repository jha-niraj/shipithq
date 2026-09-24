import { and, asc, eq, inArray, isNull } from "drizzle-orm"
import { QUIZ_UNLOCK_PERCENT, quizUnlocked } from "@repo/db/project-gates"
import { modelFor } from "@repo/ai"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { JobDurableObject, type ProgressFn, type StoredJob } from "./base"
import { SPRINT_QUIZ_SYSTEM, sprintQuizUserPrompt, validateSprintQuiz } from "./sprint-quiz-core"

const { projectsV2, projectV2Sprints, projectV2Tasks, projectV2SprintQuizzes, userTaskV2Statuses } = schema

// ─────────────────────────────────────────────────────────────────────────────
// sprint_quiz: a sprint's quiz (plan/project-workspace WS-12, decided by Niraj
// 2026-09-24: 25 credits, opens when every task in the sprint is done).
//
// The app holds the credits at dispatch; this job never touches them. Every
// refusal below THROWS rather than returning, because a completed job settles
// the hold - a learner must not pay for a quiz that already existed or that
// they were not allowed to generate.
// ─────────────────────────────────────────────────────────────────────────────

/** A sprint's quiz, or with `projectId` and no sprint the project's FINAL quiz (WS-14). */
interface Input {
	sprintId?: string
	projectId?: string
}

export class SprintQuiz extends JobDurableObject<Input> {
	protected readonly jobType: RunnableJobType = "sprint_quiz"
	protected override get initialPhaseLabel() {
		return "Reading the sprint"
	}

	protected async run(job: StoredJob<Input>, progress: ProgressFn): Promise<unknown> {
		const db = this.db()

		const sprint = job.input.sprintId
			? await db.query.projectV2Sprints.findFirst({
				where: eq(projectV2Sprints.id, job.input.sprintId),
				columns: { id: true, projectId: true, sprintNumber: true, name: true, goal: true },
			})
			: null
		if (job.input.sprintId && !sprint) throw new Error("That sprint no longer exists")
		if (sprint?.sprintNumber === 0) throw new Error("Setup has no quiz")
		const projectId = sprint?.projectId ?? job.input.projectId
		if (!projectId) throw new Error("No sprint or project given")

		const project = await db.query.projectsV2.findFirst({
			where: and(eq(projectsV2.id, projectId), eq(projectsV2.createdBy, job.userId)),
			columns: { id: true, title: true, stacks: true, technologies: true },
		})
		if (!project) throw new Error("That project is not yours")

		const existing = await db.query.projectV2SprintQuizzes.findFirst({
			where: sprint
				? eq(projectV2SprintQuizzes.sprintId, sprint.id)
				: and(eq(projectV2SprintQuizzes.projectId, project.id), isNull(projectV2SprintQuizzes.sprintId)),
			columns: { id: true, jobId: true },
		})
		// A re-run of THIS job (the alarm fired twice) hands back what it wrote.
		if (existing?.jobId === job.jobId) return { quizId: existing.id, repeat: true }
		if (existing) throw new Error(sprint ? "This sprint already has a quiz" : "This project already has a final quiz")

		// The tasks the quiz is about: this sprint's, or every build sprint's.
		const sprints = await db.select({ id: projectV2Sprints.id, number: projectV2Sprints.sprintNumber, name: projectV2Sprints.name, goal: projectV2Sprints.goal })
			.from(projectV2Sprints).where(eq(projectV2Sprints.projectId, project.id)).orderBy(asc(projectV2Sprints.orderIndex))
		const inScope = sprint ? sprints.filter((sp) => sp.id === sprint.id) : sprints.filter((sp) => sp.number > 0)
		const allTasks = await db.select({ id: projectV2Tasks.id, sprintId: projectV2Tasks.sprintId, title: projectV2Tasks.title, description: projectV2Tasks.description, criteria: projectV2Tasks.criteria })
			.from(projectV2Tasks).where(inArray(projectV2Tasks.sprintId, sprints.map((sp) => sp.id))).orderBy(asc(projectV2Tasks.orderIndex))
		const scopeIds = new Set(inScope.map((sp) => sp.id))
		const order = new Map(sprints.map((sp, i) => [sp.id, i]))
		const tasks = allTasks.filter((t) => scopeIds.has(t.sprintId)).sort((x, y) => (order.get(x.sprintId)! - order.get(y.sprintId)!))
		if (tasks.length === 0) throw new Error("There are no tasks to ask about")

		const statuses = await db.select({ taskId: userTaskV2Statuses.taskId, status: userTaskV2Statuses.status, notes: userTaskV2Statuses.notes })
			.from(userTaskV2Statuses)
			.where(and(eq(userTaskV2Statuses.userId, job.userId), eq(userTaskV2Statuses.projectId, project.id)))
		const byTask = new Map(statuses.map((s) => [s.taskId, s]))
		if (sprint) {
			const open = tasks.filter((t) => byTask.get(t.id)?.status !== "COMPLETED")
			if (open.length > 0) throw new Error(`Finish the sprint first: ${open.length} task${open.length === 1 ? "" : "s"} left`)
		} else {
			// The final gate counts every task, Setup included - as the progress bar does.
			const done = allTasks.filter((t) => byTask.get(t.id)?.status === "COMPLETED").length
			const pct = allTasks.length ? Math.round((done / allTasks.length) * 100) : 0
			if (!quizUnlocked(pct)) throw new Error(`The final quiz opens at ${QUIZ_UNLOCK_PERCENT}% of tasks; you are at ${pct}%`)
		}
		const sprintLabel = new Map(sprints.map((sp) => [sp.id, `Sprint ${sp.number}`]))

		const stacks = (project.stacks ?? {}) as Record<string, unknown>
		const stack = Object.entries(stacks)
			.filter(([, v]) => typeof v === "string" && v.trim() && !/^none$/i.test(v.trim()))
			.map(([k, v]) => `${k}: ${v}`).join(", ") || (project.technologies ?? []).join(", ") || "not stated"

		await progress(30, "Writing the questions")
		const raw = await chatJSON({
			apiKey: this.env.OPENAI_API_KEY,
			model: modelFor("sprintQuiz"),
			system: SPRINT_QUIZ_SYSTEM,
			user: sprintQuizUserPrompt({
				projectTitle: project.title,
				stack,
				scope: sprint ? `Sprint ${sprint.sprintNumber}: ${sprint.name}\nGoal: ${sprint.goal}` : "THE WHOLE PROJECT (the final quiz), every sprint",
				tasks: tasks.map((t) => ({
					id: t.id,
					sprint: sprint ? undefined : sprintLabel.get(t.sprintId),
					title: t.title,
					brief: (t.description ?? []).join(" "),
					criteria: t.criteria ?? [],
					note: byTask.get(t.id)?.notes ?? null,
				})),
			}),
			maxTokens: 4000,
			temperature: 0.6,
		})

		await progress(80, "Checking the questions")
		let parsed: unknown
		try {
			parsed = JSON.parse(raw)
		} catch {
			throw new Error("The AI returned something that was not JSON")
		}
		const questions = validateSprintQuiz(parsed, tasks.map((t) => t.id))
		if (!questions) throw new Error("The AI's questions did not pass the checks; nothing was charged")

		await progress(90, "Saving the quiz")
		// The unique sprint_id (or, for the final quiz, the partial unique index on
		// project_id) is the last word on a race between two jobs: the
		// loser's insert fails, the job fails, and its hold is released.
		const [row] = await db.insert(projectV2SprintQuizzes)
			.values({ projectId: project.id, sprintId: sprint?.id ?? null, questions, jobId: job.jobId })
			.returning({ id: projectV2SprintQuizzes.id })
		return { quizId: row!.id }
	}
}
