import { and, eq } from "drizzle-orm"
import { emptyMentorState, type PracticeMentorState } from "@repo/db/practice"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { modelFor } from "@repo/ai"
import { JobDurableObject, type ProgressFn, type StoredJob } from "./base"

const { practiceUserSession } = schema

// ─────────────────────────────────────────────────────────────────────────────
// practice_reflect: the closing word on a guided DSA session (plan/practice-dsa
// PD-13).
//
// The score is NOT the model's opinion. It comes from facts already recorded:
// 100 when every test passed and the optimal complexity was confirmed, 70 when
// only the brute force passed. The model writes the feedback, in the mentor's
// voice, quoting the user's own reflection, and judges each requirement against
// those facts. This job writes nothing to the session: the app applies the
// result (status, XP, leaderboard) from the stored job result, so there is one
// XP path in the product and a client cannot forge a score.
// ─────────────────────────────────────────────────────────────────────────────

interface Input {
	sessionId: string
}

type ChatMessage = { role?: string; content?: string; ephemeral?: boolean }

export const REFLECT_SYSTEM = `You are the student's DSA mentor writing the closing note for one problem they just finished with you. Reply with JSON only:
{"feedback": string, "requirementsMet": boolean[]}

"feedback": 3 to 6 sentences, plain text, no headings, addressed to the student:
- What they did well, specifically (their approach, how they debugged, how they reasoned about complexity).
- If they wrote a reflection, build on it and quote a few of their words.
- If they did NOT reach the optimal solution: say so plainly, then leave them one question about the bottleneck in their own solution ("what is your inner loop searching for?"). Do NOT name the technique or data structure that makes it optimal, anywhere in the note, including the practice suggestion: they may come back to this problem.
- One concrete thing to practise next (a skill, not the answer to this problem).
Never include code.

"requirementsMet": one boolean per requirement, in order, judged ONLY from the facts given (tests passed, optimal confirmed, complexity claimed).`

export class PracticeReflect extends JobDurableObject<Input> {
	protected readonly jobType: RunnableJobType = "practice_reflect"
	protected override get initialPhaseLabel() {
		return "Reviewing your session"
	}

	protected async run(job: StoredJob<Input>, progress: ProgressFn): Promise<unknown> {
		const db = this.db()
		const session = await db.query.practiceUserSession.findFirst({
			where: and(eq(practiceUserSession.id, job.input.sessionId), eq(practiceUserSession.userId, job.userId)),
			columns: { id: true, status: true, mentorState: true, chatHistory: true, lastFeedback: true, bestScore: true, requirementsMet: true },
			with: { problem: { columns: { title: true, requirements: true, difficulty: true } } },
		})
		if (!session) throw new Error("That practice session no longer exists")

		// Double dispatch after completion: hand back what was already decided.
		if (session.status === "COMPLETED" && session.lastFeedback) {
			return { score: session.bestScore, feedback: session.lastFeedback, requirementsMet: session.requirementsMet ?? {}, repeat: true }
		}

		const state: PracticeMentorState = { ...emptyMentorState(), ...(session.mentorState ?? {}) }
		const brutePassed = state.testsPassedAt.length > 0 || state.lastSubmit?.passed === true
		if (!brutePassed) throw new Error("A session can be finished only after its tests have passed")
		const optimal = state.optimalConfirmed === true && state.lastSubmit?.passed === true
		const score = optimal ? 100 : 70

		const transcript = ((Array.isArray(session.chatHistory) ? session.chatHistory : []) as ChatMessage[])
			.filter((m) => !m.ephemeral && (m.role === "user" || m.role === "assistant") && m.content?.trim())
			.slice(-24)
			.map((m) => `${m.role === "user" ? "STUDENT" : "MENTOR"}: ${(m.content ?? "").slice(0, 1200)}`)
			.join("\n\n")

		await progress(40, "Writing your feedback")
		const raw = await chatJSON({
			apiKey: this.env.OPENAI_API_KEY,
			model: modelFor("practiceReflect"),
			system: REFLECT_SYSTEM,
			user: `Problem: ${session.problem.title} (${session.problem.difficulty})
Requirements:
${session.problem.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Facts:
- All tests passed: ${brutePassed ? "yes" : "no"}
- Optimal complexity confirmed with a correct justification: ${optimal ? "yes" : "no"}
- Their approach: ${state.approach ?? "(not recorded)"}
- Complexity they claimed: ${state.claimedComplexity ?? "(not recorded)"}
- Their reflection, verbatim: ${state.reflection ?? "(they did not write one)"}

Conversation (latest part):
${transcript || "(none)"}`,
			temperature: 0.4,
			maxTokens: 700,
		})

		let feedback: string
		let met: boolean[]
		try {
			const v = JSON.parse(raw) as { feedback?: unknown; requirementsMet?: unknown }
			feedback = typeof v.feedback === "string" && v.feedback.trim() ? v.feedback.trim().slice(0, 2000) : ""
			met = Array.isArray(v.requirementsMet) ? v.requirementsMet.map((x) => x === true) : []
		} catch {
			throw new Error("The feedback came back in a form we could not read")
		}
		if (!feedback) throw new Error("The feedback came back empty")

		const requirementsMet: Record<string, boolean> = {}
		session.problem.requirements.forEach((_, i) => {
			// Facts win over the model where they are unambiguous.
			requirementsMet[`req-${i}`] = optimal ? true : (met[i] ?? false)
		})

		await progress(90, "Done")
		return { score, feedback, requirementsMet, optimal }
	}
}
