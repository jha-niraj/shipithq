import { and, eq } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import { renderResumeText } from "@repo/db/resume"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatText } from "../openai"
import { JobDurableObject, type ProgressFn, type StoredJob } from "./base"

const { coverLetter, resumeDraft } = schema

/**
 * Cover letter generation, moved off
 * `cover-letter.action.ts:generateAndSaveCoverLetter`.
 *
 * One change beyond moving it, and it is the reason this was worth doing:
 * **the letter is now written from the user's resume.**
 *
 * The inline version assembled an "applicant profile" out of the raw profile
 * tables - skills, work_experience, portfolio_project - while the user's actual
 * resume said something else. So the letter could contradict the document it was
 * stapled to, and it discarded every editorial decision the user had made in the
 * resume builder: which jobs to lead with, which bullets to keep, how to describe
 * themselves. A cover letter that disagrees with the resume is worse than no cover
 * letter.
 *
 * The resume text is resolved by the APP (see `lib/resume/primary.ts`) and passed
 * in, so what the letter is written from is exactly what the user was shown before
 * they pressed generate. Where a structured draft was the source, this job re-reads
 * it by id instead, so an edit made between dispatch and the alarm is picked up.
 *
 * Tone, structure instructions and the model (`gpt-4o`, temperature 0.7) are
 * unchanged from the inline version.
 */

interface CoverLetterInput {
    coverLetterId: string
    /**
     * Everything the model should know about the applicant, composed by the app.
     *
     * A deliberate exception to the pointer-not-payload rule. The composition
     * reads the profile tables AND the default resume and orders them a specific
     * way; duplicating that in the worker would be a second copy of a prompt
     * detail that has to stay identical, and re-deriving it here would let the
     * letter be written from something other than what the app decided.
     */
    applicantProfile: string
}

export class CoverLetter extends JobDurableObject<CoverLetterInput> {
    protected readonly jobType: RunnableJobType = "cover_letter"
    protected override get initialPhaseLabel() {
        return "Reading the job description"
    }

    protected async run(job: StoredJob<CoverLetterInput>, progress: ProgressFn): Promise<unknown> {
        const db = this.db()
        const { coverLetterId, applicantProfile } = job.input

        // Scoped to the job's userId, which came from the signed token.
        const letter = await db.query.coverLetter.findFirst({
            where: and(eq(coverLetter.id, coverLetterId), eq(coverLetter.userId, job.userId)),
        })
        if (!letter) throw new Error("This cover letter no longer exists")
        if (!letter.jobDescription?.trim()) throw new Error("This cover letter has no job description to work from")

        await progress(35, "Writing your letter")

        const questions = (letter.questions ?? []) as Array<{ id: string; text: string }>
        const answers = (letter.answers ?? {}) as Record<string, string | string[]>

        let qaStr = "Applicant Responses to Targeted Questions:\n"
        if (Array.isArray(questions)) {
            for (const q of questions) {
                const a = answers[q.id]
                const answer = Array.isArray(a) ? a.join(", ") : (a || "No answer provided.")
                qaStr += `Q: ${q.text}\nA: ${answer}\n\n`
            }
        }

        // Prompt, model and temperature verbatim from the inline version. A
        // migration that also changes the prompt cannot be verified, because
        // there is no way to tell a migration bug from a prompt change.
        const prompt = `
            You are an expert career coach writing a highly compelling, professional, yet personalized cover letter.
            Write a cover letter using markdown format.

            Context:
            Job Title: ${letter.jobTitle ?? ""}
            Company: ${letter.companyName ?? ""}
            Tone: ${letter.tone ?? "Professional"}

            Job Description:
            ${letter.jobDescription}

            Applicant Profile:
            ${applicantProfile}

            ${qaStr}

            Instructions:
            1. Do not include placeholders like "[Your Name]" if possible, use the applicant profile.
            2. Structure it well: header, greeting, strong opening, well-articulated body paragraphs highlighting specific relevant achievements based on the applicant profile and their answers, and a call-to-action closing.
            3. Be concise (max 3-4 paragraphs) and directly map the applicant's experience to the specific needs found in the job description.
            4. Include relevant links (e.g. to projects) if they are in the profile or answers.
            5. Return ONLY markdown content. No preamble.
            `

        const generatedContent = await chatText({
            apiKey: this.env.OPENAI_API_KEY,
            model: modelFor("coverLetter"),
            system: "You are an expert copywriter and career coach.",
            user: prompt,
            temperature: 0.7,
        })

        // A completion can succeed with empty content. Failing here is what makes
        // the app release the credit hold instead of settling it - keeping the
        // charge for a blank letter is exactly what holds exist to stop.
        if (!generatedContent.trim()) throw new Error("The cover letter came back empty.")

        await progress(90, "Saving")

        await db
            .update(coverLetter)
            .set({ generatedContent })
            .where(eq(coverLetter.id, coverLetterId))

        return {
            coverLetterId,
            // Returned as well as persisted so the client can render the moment
            // the poll completes, without a second round trip.
            content: generatedContent,
        }
    }
}
