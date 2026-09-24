import { and, asc, eq, inArray } from "drizzle-orm"
import { MOCK_UNLOCK_PERCENT, mockUnlocked } from "@repo/db/project-gates"
import { modelFor } from "@repo/ai"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { JobDurableObject, type ProgressFn, type StoredJob } from "./base"
import {
	SPRINT_MOCK_FEEDBACK, SPRINT_MOCK_INTERVIEWER, mockContextBlock, mockTranscriptBlock, validateInterviewerTurn, validateMockFeedback,
	type MockContext,
} from "./sprint-mock-core"

const { projectsV2, projectV2Sprints, projectV2Tasks, projectV2SprintMockSessions, userTaskV2Statuses } = schema

type Turn = { role: "interviewer" | "learner"; text: string; at: string; jobId?: string }

// ─────────────────────────────────────────────────────────────────────────────
// sprint_mock: a sprint's mock interview (plan/project-workspace WS-13, decided
// by Niraj 2026-09-24: 30 credits a session, text plus dictation).
//
// One job type, three steps, all on one session row:
//   open      - the first question. The app holds the session's 30 credits on
//               THIS dispatch, so a session that never produces a question
//               fails here and the hold is released.
//   turn      - the next question or a follow-up, after the learner answers.
//               When the interviewer closes, the feedback is written in the
//               same job.
//   feedback  - the learner ended early; score what was said.
// Turns and feedback cost nothing extra: the session was paid for at open.
// ─────────────────────────────────────────────────────────────────────────────

interface Input {
	sessionId: string
	step: "open" | "turn" | "feedback"
}

export class SprintMock extends JobDurableObject<Input> {
	protected readonly jobType: RunnableJobType = "sprint_mock"
	protected override get initialPhaseLabel() {
		return "The interviewer is reading your sprint"
	}

	protected async run(job: StoredJob<Input>, progress: ProgressFn): Promise<unknown> {
		const db = this.db()
		const session = await db.query.projectV2SprintMockSessions.findFirst({
			where: and(eq(projectV2SprintMockSessions.id, job.input.sessionId), eq(projectV2SprintMockSessions.userId, job.userId)),
		})
		if (!session) throw new Error("That interview no longer exists")
		const transcript = (session.transcript ?? []) as Turn[]

		// A re-run of this job (the alarm fired twice) hands back what it wrote.
		if (transcript.some((t) => t.jobId === job.jobId)) return { sessionId: session.id, repeat: true }
		if (session.status === "ended") return { sessionId: session.id, alreadyEnded: true }

		const context = await this.context(session.sprintId, session.projectId, job.userId)
		// The final interview's gate, re-checked where the credits are at stake.
		if (job.input.step === "open" && !session.sprintId && !mockUnlocked(context.pct)) {
			await db.update(projectV2SprintMockSessions).set({ status: "failed" }).where(eq(projectV2SprintMockSessions.id, session.id))
			throw new Error(`The final mock interview opens at ${MOCK_UNLOCK_PERCENT}% of tasks; you are at ${context.pct}%`)
		}
		const save = (patch: Partial<typeof projectV2SprintMockSessions.$inferInsert>) =>
			db.update(projectV2SprintMockSessions).set(patch).where(eq(projectV2SprintMockSessions.id, session.id))

		if (job.input.step === "feedback") {
			await progress(40, "Writing your feedback")
			const feedback = await this.feedback(context, transcript)
			await save({ status: "ended", feedback, endedAt: new Date() })
			return { sessionId: session.id, ended: true }
		}

		if (job.input.step === "open" ? transcript.length > 0 : transcript.at(-1)?.role !== "learner") {
			throw new Error("The interview is not waiting for the interviewer")
		}

		await progress(40, job.input.step === "open" ? "Preparing the first question" : "Thinking about your answer")
		let next: { message: string; done: boolean }
		try {
			const raw = await chatJSON({
				apiKey: this.env.OPENAI_API_KEY,
				model: modelFor("sprintMock"),
				system: SPRINT_MOCK_INTERVIEWER,
				user: `${mockContextBlock(context)}\n\nThe interview so far:\n${mockTranscriptBlock(transcript)}\n\nYour next line.`,
				maxTokens: 600,
				temperature: 0.5,
			})
			const turn = validateInterviewerTurn(JSON.parse(raw), transcript.filter((t) => t.role === "interviewer").length)
			if (!turn) throw new Error("The interviewer's reply was empty")
			next = turn
		} catch (error) {
			// An opening that never asks anything is a session that never started:
			// marked failed, and the job fails so the hold is released.
			if (job.input.step === "open") await save({ status: "failed" })
			throw error
		}

		const updated: Turn[] = [...transcript, { role: "interviewer", text: next.message, at: new Date().toISOString(), jobId: job.jobId }]
		if (!next.done) {
			await save({ status: "active", transcript: updated })
			return { sessionId: session.id }
		}

		await save({ status: "active", transcript: updated })
		await progress(70, "Writing your feedback")
		const feedback = await this.feedback(context, updated)
		await save({ status: "ended", feedback, endedAt: new Date() })
		return { sessionId: session.id, ended: true }
	}

	/** What the interviewer knows: one sprint's tasks, or (sprintId null, the final interview) every build sprint's. */
	private async context(sprintId: string | null, projectId: string, userId: string): Promise<MockContext & { pct: number }> {
		const db = this.db()
		const [project, sprints, statuses] = await Promise.all([
			db.query.projectsV2.findFirst({ where: and(eq(projectsV2.id, projectId), eq(projectsV2.createdBy, userId)), columns: { title: true, stacks: true, technologies: true } }),
			db.select({ id: projectV2Sprints.id, number: projectV2Sprints.sprintNumber, name: projectV2Sprints.name, goal: projectV2Sprints.goal })
				.from(projectV2Sprints).where(eq(projectV2Sprints.projectId, projectId)).orderBy(asc(projectV2Sprints.orderIndex)),
			db.select({ taskId: userTaskV2Statuses.taskId, status: userTaskV2Statuses.status, notes: userTaskV2Statuses.notes }).from(userTaskV2Statuses)
				.where(and(eq(userTaskV2Statuses.userId, userId), eq(userTaskV2Statuses.projectId, projectId))),
		])
		if (!project) throw new Error("That project is not yours")
		const sprint = sprintId ? sprints.find((sp) => sp.id === sprintId) : null
		if (sprintId && !sprint) throw new Error("That sprint no longer exists")

		const allTasks = sprints.length
			? await db.select({ id: projectV2Tasks.id, sprintId: projectV2Tasks.sprintId, title: projectV2Tasks.title, description: projectV2Tasks.description, criteria: projectV2Tasks.criteria })
				.from(projectV2Tasks).where(inArray(projectV2Tasks.sprintId, sprints.map((sp) => sp.id))).orderBy(asc(projectV2Tasks.orderIndex))
			: []
		const byTask = new Map(statuses.map((s) => [s.taskId, s]))
		const done = allTasks.filter((t) => byTask.get(t.id)?.status === "COMPLETED").length
		const pct = allTasks.length ? Math.round((done / allTasks.length) * 100) : 0

		const inScope = new Set((sprint ? [sprint] : sprints.filter((sp) => sp.number > 0)).map((sp) => sp.id))
		const order = new Map(sprints.map((sp, i) => [sp.id, i]))
		const label = new Map(sprints.map((sp) => [sp.id, `Sprint ${sp.number}`]))
		const tasks = allTasks.filter((t) => inScope.has(t.sprintId)).sort((x, y) => order.get(x.sprintId)! - order.get(y.sprintId)!)

		const stacks = (project.stacks ?? {}) as Record<string, unknown>
		const stack = Object.entries(stacks)
			.filter(([, v]) => typeof v === "string" && v.trim() && !/^none$/i.test(v.trim()))
			.map(([k, v]) => `${k}: ${v}`).join(", ") || (project.technologies ?? []).join(", ") || "not stated"
		return {
			projectTitle: project.title,
			stack,
			scope: sprint ? `Sprint ${sprint.number}: ${sprint.name}\nGoal: ${sprint.goal}` : "THE WHOLE PROJECT (the final interview), every sprint",
			tasks: tasks.map((t) => ({
				sprint: sprint ? undefined : label.get(t.sprintId),
				title: t.title,
				brief: (t.description ?? []).join(" "),
				criteria: t.criteria ?? [],
				note: byTask.get(t.id)?.notes ?? null,
			})),
			pct,
		}
	}

	private async feedback(context: MockContext, transcript: Turn[]) {
		if (!transcript.some((t) => t.role === "learner")) {
			return { score: 0, summary: "The interview ended before you answered a question, so there is nothing to score yet.", strengths: [], gaps: [], nextSteps: ["Start a new session when you have twenty minutes to talk it through."] }
		}
		const raw = await chatJSON({
			apiKey: this.env.OPENAI_API_KEY,
			model: modelFor("sprintMock"),
			system: SPRINT_MOCK_FEEDBACK,
			user: `${mockContextBlock(context)}\n\nThe interview:\n${mockTranscriptBlock(transcript)}`,
			maxTokens: 1200,
			temperature: 0.3,
		})
		const feedback = validateMockFeedback(JSON.parse(raw))
		if (!feedback) throw new Error("The feedback could not be written; try ending the interview again")
		return feedback
	}
}
