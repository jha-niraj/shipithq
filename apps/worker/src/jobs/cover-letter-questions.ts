import type { RunnableJobType } from "../env"
import { modelFor } from "@repo/ai"
import { chatJSON } from "../openai"
import { JobDurableObject, type ProgressFn, type StoredJob } from "./base"

/**
 * Generate the tailored questions a user answers before a cover letter is
 * written. Moved off `cover-letter.action.ts:generateCoverLetterQuestions`.
 *
 * The pair matters more than either half: `generateAndSaveCoverLetter` has been a
 * `cover_letter` job since the RES-9 predecessor work, and this is the step
 * immediately before it in the same screen. Leaving one inline and one on the
 * worker gave the user two different waiting experiences one click apart - and
 * the inline one was the half that could not refund, because a request killed
 * mid-completion leaves nothing running to notice.
 *
 * The instruction and the model (`gpt-4o`) are unchanged. The response format is
 * the one difference and it is forced by the environment: the action used the
 * OpenAI SDK's `zodResponseFormat`, which is a Node-side helper this worker does
 * not have. The schema is therefore written into the prompt, the same way every
 * other job in this directory does it, and validated on the way out - which is
 * what the strict schema was buying.
 */

interface CoverLetterQuestionsInput {
	jobDescription: string
}

type QuestionType = "TEXTAREA" | "SINGLE" | "MULTIPLE"

interface Question {
	id: string
	text: string
	type: QuestionType
	options: string[] | null
}

const SYSTEM = `You are an expert technical recruiter and career coach. Review the provided Job Description and generate 3 to 5 targeted questions for the applicant. These questions should help customize their cover letter based on specific job requirements. The questions should ask for specific metrics, examples of experience with required tools, or how their past work aligns with core responsibilities.

Reply with a single JSON object and nothing else, in exactly this shape:
{ "questions": [{ "id": string, "text": string, "type": "TEXTAREA" | "SINGLE" | "MULTIPLE", "options": string[] | null }] }

IMPORTANT: Always include the "options" field in every question. Set it to null for TEXTAREA questions and to an array of 3-4 choices for SINGLE or MULTIPLE questions. Never omit the field.

Use a random 8-character lowercase alphanumeric string for each "id".`

const VALID_TYPES: readonly QuestionType[] = ["TEXTAREA", "SINGLE", "MULTIPLE"]

export class CoverLetterQuestions extends JobDurableObject<CoverLetterQuestionsInput> {
	protected readonly jobType: RunnableJobType = "cover_letter_questions"
	protected override get initialPhaseLabel() {
		return "Reading the job description"
	}

	protected async run(job: StoredJob<CoverLetterQuestionsInput>, progress: ProgressFn): Promise<unknown> {
		const { jobDescription } = job.input
		if (!jobDescription?.trim()) throw new Error("No job description to read")

		await progress(40, "Working out what to ask you")

		const rawJson = await chatJSON({
			apiKey: this.env.OPENAI_API_KEY,
			model: modelFor("coverLetterQuestions"),
			system: SYSTEM,
			user: `Job Description:\n\n${jobDescription}`,
		})

		let parsed: { questions?: unknown }
		try {
			parsed = JSON.parse(rawJson) as { questions?: unknown }
		} catch {
			throw new Error("Could not read the generated questions")
		}

		const questions = Array.isArray(parsed.questions) ? parsed.questions.map(normalise).filter(isUsable) : []

		// No questions is a FAILED generation, not an empty result. Returning `[]`
		// would settle the hold and hand the user a form with nothing in it; the
		// inline version made the same call (CR-4) and it survives the move.
		if (questions.length === 0) {
			throw new Error("No questions could be generated from that job description")
		}

		return { questions }
	}
}

/**
 * Coerce one model-produced question into the shape the form renders.
 *
 * The prompt asks for all four fields, and asking is not the same as getting: the
 * original action needed a hard schema for exactly this reason, and the note above
 * `QuestionsSchema` in `cover-letter.action.ts` recorded that `options` was the
 * field the model dropped. A SINGLE question that arrives without its options
 * renders as a choice with nothing to choose.
 */
function normalise(raw: unknown): Question | null {
	if (!raw || typeof raw !== "object") return null
	const q = raw as Record<string, unknown>

	const text = typeof q.text === "string" ? q.text.trim() : ""
	if (!text) return null

	const type = VALID_TYPES.includes(q.type as QuestionType) ? (q.type as QuestionType) : "TEXTAREA"
	const options = Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === "string") : []

	return {
		// An id collision would give React two rows with one key and make the
		// second answer overwrite the first, so a missing one is generated rather
		// than defaulted to something shared.
		id: typeof q.id === "string" && q.id.trim() ? q.id.trim() : Math.random().toString(36).slice(2, 10),
		text,
		// A choice question with no choices is downgraded to free text rather than
		// dropped: the question itself is still worth answering.
		type: type !== "TEXTAREA" && options.length === 0 ? "TEXTAREA" : type,
		options: type === "TEXTAREA" || options.length === 0 ? null : options,
	}
}

function isUsable(q: Question | null): q is Question {
	return q !== null
}
