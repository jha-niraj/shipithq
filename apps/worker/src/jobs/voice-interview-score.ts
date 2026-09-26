import { modelFor } from "@repo/ai"
import { fetchTranscript } from "@repo/sarvamai/agents"
import type { RunnableJobType } from "../env"
import { chatJSON } from "../openai"
import { JobDurableObject, type ProgressFn, type StoredJob } from "./base"
import { MIN_CANDIDATE_TURNS, SCORE_SYSTEM, parseScore, scoreUser, silentScore, type RubricCriterion, type Turn } from "./voice-interview-score-core"

/**
 * A voice or typed interview scored against its rubric (plan/voice VO-9).
 *
 * A worker job because a voice interview waits on Sarvam: its transcript can lag
 * the end of the call, so this polls for up to three minutes before scoring
 * (CLAUDE.md "Long-running work"). A typed interview's turns come in the input,
 * as the server saved them.
 *
 * It reads and writes nothing of ours: it returns the score, and the app writes
 * the attempt or mock session and settles or refunds the credits when it sees
 * the terminal status. A failure (no transcript, no answer from the model) is
 * the app's cue to mark it NOT_SCORED and refund, never to score 0.
 */

export interface VoiceInterviewScoreInput {
	/** Which interview, for the app's bookkeeping only. */
	ref: { kind: "mock" | "round"; id: string }
	mode: "VOICE" | "TYPED"
	/** VOICE: the Sarvam call whose transcript is scored. */
	interactionId?: string
	/** TYPED: the saved turns. */
	turns?: Turn[]
	/** What the interview was about, for the scorer. */
	about: string
	rubric: RubricCriterion[]
}

const POLL_EVERY_MS = 10_000
const POLL_FOR_MS = 180_000

export class VoiceInterviewScore extends JobDurableObject<VoiceInterviewScoreInput> {
	protected readonly jobType: RunnableJobType = "voice_interview_score"
	protected override get initialPhaseLabel() {
		return "Reading the transcript"
	}

	protected async run(job: StoredJob<VoiceInterviewScoreInput>, progress: ProgressFn): Promise<unknown> {
		const { mode, rubric } = job.input
		if (!Array.isArray(rubric) || rubric.length === 0) throw new Error("No rubric to score against")

		let turns: Turn[]
		let source: "sarvam" | "typed"
		if (mode === "VOICE") {
			if (!job.input.interactionId) throw new Error("The call never connected, so there is no transcript")
			turns = await this.waitForTranscript(job.input.interactionId, progress)
			source = "sarvam"
		} else {
			turns = (job.input.turns ?? []).filter((t) => (t.role === "interviewer" || t.role === "candidate") && typeof t.text === "string")
			source = "typed"
		}

		const answered = turns.filter((t) => t.role === "candidate" && t.text.trim().length > 0).length
		if (answered < MIN_CANDIDATE_TURNS) return { ...silentScore(rubric), transcript: turns, source }

		await progress(70, "Scoring against the rubric")
		const content = await chatJSON({
			apiKey: this.env.OPENAI_API_KEY,
			model: modelFor("voiceInterviewScore"),
			system: SCORE_SYSTEM,
			user: scoreUser({ about: job.input.about, rubric, turns }),
			maxTokens: 1500,
			temperature: 0.1,
		})
		return { ...parseScore(content, rubric), transcript: turns, source }
	}

	private async waitForTranscript(interactionId: string, progress: ProgressFn): Promise<Turn[]> {
		const until = Date.now() + POLL_FOR_MS
		for (let i = 0; ; i++) {
			const t = await fetchTranscript(interactionId, this.env)
			if (!t.ok) throw new Error(t.error)
			if (t.ready) return t.turns
			if (Date.now() >= until) throw new Error("Sarvam hasn't produced this call's transcript")
			await progress(Math.min(60, 10 + i * 5), "Waiting for the transcript")
			await new Promise((r) => setTimeout(r, POLL_EVERY_MS))
		}
	}
}
