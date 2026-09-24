import { and, asc, desc, eq } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { JobDurableObject, type ProgressFn, type StoredJob } from "./base"
import { PROJECT_AI_SYSTEM, validateProposal } from "./project-ai-core"

const { projectsV2, projectV2Sprints, projectAiMessages, projectV2Files, userTaskV2Statuses } = schema

// ─────────────────────────────────────────────────────────────────────────────
// project_ai: one reply from the workspace's Project AI (plan/project-workspace
// WS-15, decided by Niraj 2026-09-24).
//
// It answers questions about the project's code, breaks a task into steps, and
// PROPOSES a new task or sprint. It never writes one: a proposal is stored on
// the reply, and only the owner pressing Add in the app creates rows (and takes
// the 5 credits). When the sprint or the focus is unclear it asks back instead
// of guessing. Free: this job holds no credits.
//
// Input is a pointer (the user's message row); everything else - the plan, the
// current task, the files - is read now, not from a snapshot.
// ─────────────────────────────────────────────────────────────────────────────

interface Input {
	projectId: string
	messageId: string
}

const HISTORY = 12
const FILE_CAP = 24_000 // characters of code sent with one question
/**
 * V1 (plan/project-repos RP-2): learners code on their own machine, so the
 * files stored on the project are at best the untouched starter - sending
 * them would have the AI describe code the learner does not have. Back on
 * with the in-browser editor (V2).
 */
const SEND_CODE = false


export class ProjectAi extends JobDurableObject<Input> {
	protected readonly jobType: RunnableJobType = "project_ai"
	protected override get initialPhaseLabel() {
		return "Thinking"
	}

	protected async run(job: StoredJob<Input>, progress: ProgressFn): Promise<unknown> {
		const db = this.db()

		// A re-run of the same job hands back the reply it already wrote.
		const written = await db.query.projectAiMessages.findFirst({
			where: and(eq(projectAiMessages.jobId, job.jobId), eq(projectAiMessages.role, "assistant")),
			columns: { id: true },
		})
		if (written) return { messageId: written.id, repeat: true }

		const question = await db.query.projectAiMessages.findFirst({
			where: and(
				eq(projectAiMessages.id, job.input.messageId),
				eq(projectAiMessages.projectId, job.input.projectId),
				eq(projectAiMessages.userId, job.userId),
				eq(projectAiMessages.role, "user"),
			),
		})
		if (!question) throw new Error("That message no longer exists")

		const project = await db.query.projectsV2.findFirst({
			where: and(eq(projectsV2.id, job.input.projectId), eq(projectsV2.createdBy, job.userId)),
			columns: { id: true, title: true, description: true, technologies: true, stacks: true },
			with: {
				sprints: {
					orderBy: [asc(projectV2Sprints.orderIndex)],
					columns: { id: true, sprintNumber: true, name: true, goal: true },
					with: { tasks: { orderBy: (t, { asc: a }) => [a(t.orderIndex)], columns: { id: true, title: true, description: true, criteria: true } } },
				},
			},
		})
		if (!project) throw new Error("That project is not yours")

		const statuses = await db.select({ taskId: userTaskV2Statuses.taskId, status: userTaskV2Statuses.status, notes: userTaskV2Statuses.notes })
			.from(userTaskV2Statuses)
			.where(and(eq(userTaskV2Statuses.userId, job.userId), eq(userTaskV2Statuses.projectId, project.id)))
		const done = new Set(statuses.filter((s) => s.status === "COMPLETED").map((s) => s.taskId))
		const notes = new Map(statuses.filter((s) => s.notes?.trim()).map((s) => [s.taskId, s.notes!.trim().slice(0, 400)]))

		const plan = project.sprints.map((sp) =>
			`${sp.sprintNumber === 0 ? "Setup" : `Sprint ${sp.sprintNumber}`}: ${sp.name} - ${sp.goal}\n` +
			sp.tasks.map((t, i) => `  ${i + 1}. [${done.has(t.id) ? "done" : "open"}] ${t.title}${notes.has(t.id) ? `\n     learner's note: ${notes.get(t.id)}` : ""}`).join("\n")
		).join("\n")

		const current = project.sprints.flatMap((sp) => sp.tasks.map((t) => ({ sp, t }))).find((x) => x.t.id === question.taskId)
		const currentBlock = current
			? `The learner is on Sprint ${current.sp.sprintNumber}, task "${current.t.title}".\nBrief: ${(current.t.description ?? []).join(" ")}\nDone when: ${(current.t.criteria ?? []).join("; ")}`
			: "No task is selected."

		const history = (await db.query.projectAiMessages.findMany({
			where: eq(projectAiMessages.projectId, project.id),
			orderBy: [desc(projectAiMessages.createdAt)],
			limit: HISTORY + 1,
			columns: { id: true, role: true, content: true },
		})).reverse().filter((m) => m.id !== question.id)
			.map((m) => `${m.role === "user" ? "LEARNER" : "YOU"}: ${m.content.slice(0, 1500)}`).join("\n\n")

		const code = SEND_CODE ? await relevantCode(db, project.id, question.content) : null
		const stack = stackLine(project.stacks, project.technologies)

		await progress(40, "Writing a reply")
		const raw = await chatJSON({
			apiKey: this.env.OPENAI_API_KEY,
			model: modelFor("projectAi"),
			system: PROJECT_AI_SYSTEM,
			maxTokens: 1800,
			temperature: 0.4,
			user: `Project: ${project.title}\n${project.description}\nStack: ${stack}\n\nThe plan:\n${plan || "(no sprints yet)"}\n\n${currentBlock}\n\n${code ? `Files:\n${code}\n\n` : ""}Earlier in this conversation:\n${history || "(nothing yet)"}\n\nLEARNER: ${question.content}`,
		})

		let parsed: { reply?: unknown; proposal?: unknown }
		try {
			parsed = JSON.parse(raw) as { reply?: unknown; proposal?: unknown }
		} catch {
			throw new Error("The AI returned something that was not JSON")
		}
		const reply = typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim().slice(0, 4000) : null
		if (!reply) throw new Error("The AI returned an empty reply")
		// Never into Setup (sprint 0, plan/project-repos RP-3).
		const proposal = validateProposal(parsed.proposal, project.sprints.map((sp) => sp.sprintNumber).filter((n) => n > 0))

		await progress(90, "Saving")
		const [row] = await db.insert(projectAiMessages).values({
			projectId: project.id,
			userId: job.userId,
			role: "assistant",
			content: reply,
			taskId: question.taskId,
			proposal: proposal ?? null,
			proposalStatus: proposal ? "pending" : null,
			jobId: job.jobId,
		}).returning({ id: projectAiMessages.id })

		return { messageId: row!.id }
	}
}

/** "frontend: React, backend: Hono" from the project's stacks, else its technologies. */
function stackLine(stacks: unknown, technologies: string[] | null): string {
	const parts = stacks && typeof stacks === "object" && !Array.isArray(stacks)
		? Object.entries(stacks as Record<string, unknown>).filter(([, v]) => typeof v === "string" && v.trim() && !/^none$/i.test(v.trim())).map(([k, v]) => `${k}: ${v}`)
		: []
	return parts.join(", ") || (technologies ?? []).join(", ") || "not stated"
}

/**
 * The file list always; contents for the files the question names (by path or
 * name), else the source files, until the cap. Tests are included only when
 * asked about - they are the answer key's shape, not the answer.
 */
async function relevantCode(db: ReturnType<ProjectAi["db"]>, projectId: string, question: string): Promise<string> {
	const files = await db.select({ path: projectV2Files.path, content: projectV2Files.content })
		.from(projectV2Files).where(eq(projectV2Files.projectId, projectId)).orderBy(asc(projectV2Files.path))
	const list = files.map((f) => f.path).join("\n")
	const q = question.toLowerCase()
	const named = files.filter((f) => q.includes(f.path.toLowerCase()) || q.includes(f.path.split("/").pop()!.toLowerCase()))
	const pool = named.length > 0 ? named : files.filter((f) => f.path.startsWith("/src/") && /\.(tsx?|css)$/.test(f.path))
	let budget = FILE_CAP
	const bodies: string[] = []
	for (const f of pool) {
		if (budget <= 0) break
		const body = f.content.slice(0, budget)
		budget -= body.length
		bodies.push(`--- ${f.path}${body.length < f.content.length ? " (truncated)" : ""}\n${body}`)
	}
	return `${list}\n\n${bodies.join("\n\n")}`
}
