import { and, eq } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import { coerceResumeDraftContent, renderResumeText } from "@repo/db/resume"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { JobDurableObject, type ProgressFn, type StoredJob } from "./base"

const { resumeDraft } = schema

/**
 * Score a resume against a job description, moved off
 * `resume-draft.action.ts:scoreResumeAgainstJD`.
 *
 * This is the mildest of the three calls moved in RES-9 - `gpt-4o-mini` with a
 * short JSON answer, which usually did survive a request. It moved anyway, for
 * two reasons that are not about the timeout:
 *
 * 1. **It sits in front of tailoring.** A user scores, reads the missing
 *    keywords, then tailors. If scoring is inline and tailoring is a job, the
 *    same panel has two different waiting behaviours a few seconds apart, and the
 *    inline one is the one with no progress and no refund if the request dies.
 * 2. **`jdSnapshot` stopped being written here.** The inline version stored the
 *    job description on the resume it had just scored. That row is the user's
 *    master resume and is supposed to be job-agnostic; the JD belongs to the
 *    scoring attempt, which is now a `background_job` row that already carries
 *    its own input. Only `atsScore` is persisted.
 *
 * The model, the instruction and the JSON shape are otherwise unchanged. What did
 * change is what the model is shown: `renderResumeText` rather than
 * `JSON.stringify`, for the reason `docs/resume-system.md` gives - the same
 * information in roughly half the tokens, without nudging the model to reason in
 * JSON shape.
 */

interface ResumeAtsScoreInput {
	draftId: string
	jobDescription: string
}

interface AtsResult {
	score: number
	missing_keywords: string[]
	matched_keywords: string[]
	suggestions: string[]
}

const SYSTEM = `You are an ATS expert. Score a resume against a job description from 0 to 100.

Judge only what the resume actually says. A keyword the resume does not contain is a missing keyword, not something to infer from a related one.

Reply with a single JSON object and nothing else, in exactly this shape:
{ "score": number, "missing_keywords": string[], "matched_keywords": string[], "suggestions": string[] }`

export class ResumeAtsScore extends JobDurableObject<ResumeAtsScoreInput> {
	protected readonly jobType: RunnableJobType = "resume_ats_score"
	protected override get initialPhaseLabel() {
		return "Reading your resume"
	}

	protected async run(job: StoredJob<ResumeAtsScoreInput>, progress: ProgressFn): Promise<unknown> {
		const db = this.db()
		const { draftId, jobDescription } = job.input

		// Scoped to the job's userId, which came from the signed token. A draft id
		// on its own must not let anyone score someone else's resume.
		const draft = await db.query.resumeDraft.findFirst({
			where: and(eq(resumeDraft.id, draftId), eq(resumeDraft.userId, job.userId)),
		})
		if (!draft) throw new Error("That resume no longer exists")

		const resumeText = renderResumeText(coerceResumeDraftContent(draft.content))

		await progress(35, "Matching against the job description")

		const rawJson = await chatJSON({
			apiKey: this.env.OPENAI_API_KEY,
			model: modelFor("resumeAtsScore"),
			system: SYSTEM,
			user: `Job Description:\n${jobDescription}\n\nResume:\n${resumeText}`,
		})

		let parsed: Partial<AtsResult>
		try {
			parsed = JSON.parse(rawJson) as Partial<AtsResult>
		} catch {
			// Not retryable: the same prompt returns the same unparseable answer.
			throw new Error("The ATS scorer returned output we could not read")
		}

		// A score of 0 is a legitimate score - a resume genuinely unrelated to the
		// posting should get one. So this checks the TYPE, not truthiness. The
		// inline version had the same guard for the same reason (CR-5); it survives
		// the move verbatim.
		if (typeof parsed.score !== "number" || Number.isNaN(parsed.score)) {
			throw new Error("The ATS scorer did not return a score")
		}

		await progress(85, "Saving your score")

		// `atsScore` only. See the note at the top of this file: `jdSnapshot` used
		// to be written here and is not any more.
		await db
			.update(resumeDraft)
			.set({ atsScore: parsed.score })
			.where(and(eq(resumeDraft.id, draftId), eq(resumeDraft.userId, job.userId)))

		return {
			score: parsed.score,
			missing_keywords: Array.isArray(parsed.missing_keywords) ? parsed.missing_keywords : [],
			matched_keywords: Array.isArray(parsed.matched_keywords) ? parsed.matched_keywords : [],
			suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
		}
	}
}
