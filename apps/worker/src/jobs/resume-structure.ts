import { and, eq } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { JobDurableObject, RetryableError, type ProgressFn, type StoredJob } from "./base"

const { users, resumeDraft } = schema

/**
 * Turn an uploaded resume's raw extracted text into structured content.
 *
 * The upload itself (`user/resume.action.ts:uploadResume`) is fast: unpdf runs
 * locally and gives us `users.resumeText` in under a second. What is NOT fast is
 * making that text mean something - the model call that pulls out roles, dates,
 * bullets and skills is a full gpt-4o completion over the whole document, which
 * is exactly the kind of wait a server action cannot hold.
 *
 * It also runs behind an upload nobody is watching. At onboarding the user has
 * already moved into the app by the time this finishes, and on the profile page
 * they get their file back immediately - the structured version simply appears.
 *
 * The output lands as a `resume_draft`, so an imported resume is a first-class
 * editable resume rather than a blob of text hidden on the user row. If the user
 * has no default resume yet, this one becomes it, which is what makes the AI
 * features (cover letters, mock interviews, the assistant's `get_my_resume`)
 * work for someone who has done nothing but upload a PDF.
 */

interface ResumeStructureInput {
	/**
	 * Name for the draft this job creates. A pointer job would normally carry
	 * only ids, and this is the one exception: it is a label chosen at upload
	 * time ("Resume from onboarding"), not data that can go stale.
	 */
	draftName?: string
}

interface StructuredResume {
	header: {
		name: string
		email: string | null
		phone: string | null
		location: string | null
		title: string | null
		summary: string | null
		website: string | null
		linkedin: string | null
		github: string | null
		portfolio: string | null
	}
	experience: Array<{
		id: string
		company: string
		role: string
		location: string | null
		startDate: string
		endDate: string | null
		current: boolean
		bullets: string[]
	}>
	projects: Array<{
		id: string
		name: string
		description: string | null
		technologies: string[]
		github: string | null
		liveUrl: string | null
		bullets: string[]
	}>
	education: Array<{
		id: string
		institution: string
		degree: string | null
		field: string | null
		startDate: string
		endDate: string | null
		bullets: string[]
	}>
	skills: Array<{ category: string; items: string[] }>
	certifications: Array<{
		id: string
		name: string
		issuer: string | null
		date: string | null
		url: string | null
	}>
}

const SYSTEM = `You are a resume parser. You are given the raw text of a resume, extracted from a PDF or DOCX. That text arrives in reading order, which for a two-column or table-based layout means fields belonging to different sections can be interleaved - reconstruct the intended structure rather than copying the text order.

Rules:
- Use ONLY facts present in the text. Never invent a company, date, metric or skill. A resume that says nothing about certifications gets an empty array, not a plausible guess.
- Dates are ISO strings (YYYY-MM-DD). When only a month and year are given, use the first of the month. When only a year is given, use January 1st of that year.
- "current": true only when the text says the role is ongoing (Present, Current, Now).
- Group skills by category (Programming Languages, Frameworks, Tools, Databases, Cloud, etc.). Put anything you cannot categorise under "Other".
- Use random 8-character lowercase alphanumeric strings for every "id".
- Every nullable field must be present and set to null when not found - never omit a key, never use undefined.
- Bullets keep the applicant's own wording. Strip leading bullet glyphs and collapse a bullet split across lines back into one string.

Reply with a single JSON object and nothing else, in exactly this shape:
{
  "header": { "name": string, "email": string|null, "phone": string|null, "location": string|null, "title": string|null, "summary": string|null, "website": string|null, "linkedin": string|null, "github": string|null, "portfolio": string|null },
  "experience": [{ "id": string, "company": string, "role": string, "location": string|null, "startDate": string, "endDate": string|null, "current": boolean, "bullets": string[] }],
  "projects": [{ "id": string, "name": string, "description": string|null, "technologies": string[], "github": string|null, "liveUrl": string|null, "bullets": string[] }],
  "education": [{ "id": string, "institution": string, "degree": string|null, "field": string|null, "startDate": string, "endDate": string|null, "bullets": string[] }],
  "skills": [{ "category": string, "items": string[] }],
  "certifications": [{ "id": string, "name": string, "issuer": string|null, "date": string|null, "url": string|null }]
}

Every one of those six keys must be present. A section the resume does not have is an empty array, not a missing key.`

/**
 * Below this, the "text" we extracted is not a resume: a scanned PDF with no text
 * layer, an image-only export, or a failed extraction. Structuring it would spend
 * a gpt-4o call to produce confident-looking nonsense, which is worse than
 * failing - the result becomes the user's default resume and every AI feature
 * downstream quotes it.
 */
const MIN_RESUME_CHARS = 200

/** What we send to the model. Roughly 6-7k tokens, comfortably a long resume. */
const MAX_RESUME_CHARS = 24_000

export class ResumeStructure extends JobDurableObject<ResumeStructureInput> {
	protected readonly jobType: RunnableJobType = "resume_structure"
	protected override get initialPhaseLabel() {
		return "Reading your resume"
	}

	protected async run(job: StoredJob<ResumeStructureInput>, progress: ProgressFn): Promise<unknown> {
		const db = this.db()

		// Re-read rather than trusting a snapshot: the user may have replaced the
		// file between the upload and this alarm, and the newest text is the one
		// they meant.
		const user = await db.query.users.findFirst({
			where: eq(users.id, job.userId),
			columns: { id: true, name: true, email: true, resumeText: true },
		})
		if (!user) throw new Error("User not found")

		const raw = user.resumeText?.trim() ?? ""
		if (raw.length < MIN_RESUME_CHARS) {
			// Not retryable: the same text will be just as unreadable next time.
			throw new Error(
				"Could not read enough text from that file. If it is a scanned or image-only PDF, upload a text-based export instead.",
			)
		}

		await progress(30, "Extracting your experience")

		const structured = await this.structure(raw.slice(0, MAX_RESUME_CHARS))

		// The model is instructed to leave the header alone when the resume omits
		// a field, but the account already knows the user's name and email, so a
		// blank header is worth filling rather than shipping empty.
		structured.header.name ||= user.name ?? ""
		structured.header.email ||= user.email ?? ""

		await progress(80, "Saving your resume")

		// Whether this becomes the default is decided here, at write time, and not
		// at dispatch: minutes can pass before this alarm fires, and the user may
		// have created and defaulted a resume by hand in between. Only claim the
		// slot if it is still empty.
		const existingDefault = await db.query.resumeDraft.findFirst({
			where: and(eq(resumeDraft.userId, job.userId), eq(resumeDraft.isDefault, true)),
			columns: { id: true },
		})

		const [draft] = await db
			.insert(resumeDraft)
			.values({
				userId: job.userId,
				name: job.input.draftName?.trim() || "Imported resume",
				templateSlug: "clean-minimal",
				content: structured as unknown as Record<string, unknown>,
				importedFrom: "upload",
				isDefault: !existingDefault,
			})
			.returning({ id: resumeDraft.id })

		return {
			draftId: draft?.id ?? null,
			isDefault: !existingDefault,
			counts: {
				experience: structured.experience.length,
				projects: structured.projects.length,
				education: structured.education.length,
				skills: structured.skills.length,
				certifications: structured.certifications.length,
			},
		}
	}

	private async structure(text: string): Promise<StructuredResume> {
		let rawJson: string
		try {
			rawJson = await chatJSON({
				apiKey: this.env.OPENAI_API_KEY,
				model: modelFor("resumeStructure"),
				temperature: 0.1,
				maxTokens: 8000,
				system: SYSTEM,
				user: `Extract the structured resume from this text:\n\n${text}`,
			})
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "The resume parser was unreachable"
			// `chatJSON` reports the status in its message. A 4xx means the request
			// itself was wrong, so a retry sends the identical body and fails
			// identically; only transport failures and 5xx are worth repeating.
			if (/OpenAI API error 4\d\d/.test(message)) throw new Error(message)
			throw new RetryableError(message)
		}

		let parsed: Partial<StructuredResume>
		try {
			parsed = JSON.parse(rawJson) as Partial<StructuredResume>
		} catch {
			throw new Error("The resume parser returned output we could not read")
		}

		// Normalise before anything downstream sees it. `content` is read by the
		// editor and by every AI feature that quotes the resume, and each of them
		// assumes these six arrays exist - a missing key would be a crash in the
		// editor rather than an empty section.
		const header = parsed.header ?? ({} as StructuredResume["header"])
		return {
			header: {
				name: header.name ?? "",
				email: header.email ?? null,
				phone: header.phone ?? null,
				location: header.location ?? null,
				title: header.title ?? null,
				summary: header.summary ?? null,
				website: header.website ?? null,
				linkedin: header.linkedin ?? null,
				github: header.github ?? null,
				portfolio: header.portfolio ?? null,
			},
			experience: Array.isArray(parsed.experience) ? parsed.experience : [],
			projects: Array.isArray(parsed.projects) ? parsed.projects : [],
			education: Array.isArray(parsed.education) ? parsed.education : [],
			skills: Array.isArray(parsed.skills) ? parsed.skills : [],
			certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
		}
	}
}
