import { and, eq } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import { renderResumeText, coerceResumeDraftContent, isResumeDraftContent, type ResumeDraftContent } from "@repo/db/resume"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { JobDurableObject, type ProgressFn, type StoredJob } from "./base"

const { resumeDraft } = schema

/**
 * Tailor a resume for one job description, moved off
 * `resume-draft.action.ts:tailorResumeForJD`.
 *
 * Two things changed in the move, both deliberate and both requested:
 *
 * 1. **It no longer overwrites the source resume.** The inline version said, in a
 *    comment, "Update THIS draft in place - do not create a new one". So tailoring
 *    for a job destroyed the master: the honest resume the user had built was
 *    replaced by a version narrowed to one application, and the next tailoring ran
 *    against the already-narrowed copy. This job writes a SEPARATE draft that the
 *    app created up front, and never touches the source.
 *
 * 2. **The prompt gets rendered text, not `JSON.stringify`.** Same information,
 *    roughly half the tokens, and the model stops being nudged to think in JSON
 *    shape. The model still RETURNS structured content, because the app needs it.
 *
 * The instruction, the model (`gpt-4o`) and the response schema are otherwise
 * unchanged.
 */

interface ResumeTailorInput {
    /** The resume being tailored FROM. Never written to. */
    sourceDraftId: string
    /** The draft the app pre-created to receive the result. */
    targetDraftId: string
    jobTitle: string
    company?: string
    jobDescription: string
}

interface TailorResult {
    updatedContent?: unknown
    suggestions?: string[]
    keywordsAdded?: string[]
    summary?: string
    atsScore?: number
}

export class ResumeTailor extends JobDurableObject<ResumeTailorInput> {
    protected readonly jobType: RunnableJobType = "resume_tailor"
    protected override get initialPhaseLabel() {
        return "Reading your resume"
    }

    protected async run(job: StoredJob<ResumeTailorInput>, progress: ProgressFn): Promise<unknown> {
        const db = this.db()
        const { sourceDraftId, targetDraftId, jobTitle, company, jobDescription } = job.input

        // Both reads are scoped to the job's userId, which came from the signed
        // token - a draft id alone must not let anyone tailor someone else's resume.
        const source = await db.query.resumeDraft.findFirst({
            where: and(eq(resumeDraft.id, sourceDraftId), eq(resumeDraft.userId, job.userId)),
        })
        if (!source) throw new Error("The resume this was based on no longer exists")

        const target = await db.query.resumeDraft.findFirst({
            where: and(eq(resumeDraft.id, targetDraftId), eq(resumeDraft.userId, job.userId)),
        })
        if (!target) throw new Error("The tailored resume was removed before it could be written")

        const baseContent = coerceResumeDraftContent(source.content)

        await progress(30, "Matching against the job description")

        const raw = await chatJSON({
            apiKey: this.env.OPENAI_API_KEY,
            model: modelFor("resumeTailor"),
            system: `You are an expert resume coach. Given a resume and a job description, do these things:
1. Rewrite the experience bullet points to better match the JD language and keywords. Keep all facts accurate - only rephrase and reframe.
2. Reorder skills so the ones the JD asks for come first. Do not invent skills the resume does not claim.
3. Identify what important skills or experiences mentioned in the JD are MISSING from this resume and list them as suggestions.
4. Estimate an ATS match score from 0-100 for the tailored resume against this JD.

NEVER fabricate employers, dates, titles, degrees or metrics. If the JD wants something the candidate does not have, it belongs in "suggestions", not in the resume.

Return JSON in this exact format:
{
  "updatedContent": { ...full updated resume content, same structure as the input JSON schema described below... },
  "suggestions": ["Missing: Kubernetes experience", "Add: mention of CI/CD pipelines"],
  "keywordsAdded": ["React", "TypeScript"],
  "summary": "Tailored 3 bullet points and reordered skills to match the JD.",
  "atsScore": 78
}

"updatedContent" must have exactly these keys: header, experience, projects, education, skills, certifications.
- header: { name, email, phone?, location?, title?, summary?, website?, linkedin?, github?, portfolio? }
- experience[]: { id, company, role, location?, startDate, endDate?, current, bullets[] }
- projects[]: { id, name, description?, technologies[], github?, liveUrl?, bullets[] }
- education[]: { id, institution, degree?, field?, startDate, endDate?, bullets[] }
- skills[]: { category, items[] }
- certifications[]: { id, name, issuer?, date?, url? }
Preserve every id, company, role, institution and date exactly as given.`,
            user: `Job Title: ${jobTitle}
${company ? `Company: ${company}\n` : ""}
Job Description:
${jobDescription}

Current Resume:
${renderResumeText(baseContent)}

The structured form of the same resume, to preserve ids and dates exactly:
${JSON.stringify(baseContent)}`,
            maxTokens: 8000,
        })

        await progress(80, "Writing the tailored resume")

        let parsed: TailorResult
        try {
            parsed = JSON.parse(raw) as TailorResult
        } catch {
            throw new Error("Tailoring returned malformed output")
        }

        // A model that returns a partial or wrongly shaped resume must not be
        // allowed to write it: the tailored draft would render as a blank page. Fall
        // back to the source content and report it, so the user gets the suggestions
        // and keeps a usable document.
        const returned = parsed.updatedContent
        const usable = isResumeDraftContent(returned)
        const content: ResumeDraftContent = usable ? coerceResumeDraftContent(returned) : baseContent

        const score =
            typeof parsed.atsScore === "number" && parsed.atsScore >= 0 && parsed.atsScore <= 100
                ? Math.round(parsed.atsScore)
                : null

        await db
            .update(resumeDraft)
            .set({
                content: content as unknown as ResumeDraftContent,
                tailoredFor: jobTitle,
                tailoredForCompany: company ?? null,
                jdSnapshot: jobDescription,
                sourceDraftId,
                ...(score !== null ? { atsScore: score } : {}),
            })
            .where(eq(resumeDraft.id, targetDraftId))

        return {
            draftId: targetDraftId,
            sourceDraftId,
            contentRewritten: usable,
            atsScore: score,
            suggestions: parsed.suggestions ?? [],
            keywordsAdded: parsed.keywordsAdded ?? [],
            summary: usable
                ? (parsed.summary ?? "")
                : "The model returned an unusable resume, so your original content was kept. The suggestions below still apply.",
        }
    }
}
