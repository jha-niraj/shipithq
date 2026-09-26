import { and, eq } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { JobDurableObject, RetryableError, type ProgressFn, type StoredJob } from "./base"

const { resumeDraft } = schema

/**
 * Build a resume from a user's public profiles. Moved off the two import actions
 * in `resume-import.action.ts`.
 *
 * **This is the reason RES-9 was not optional.** Every other call moved in that
 * task is one model completion; this one is a queue of other people's APIs with a
 * model call on the end of it. A profile import makes, in sequence:
 *
 *   - an Exa `/contents` fetch of the LinkedIn profile, `livecrawlTimeout` 10s
 *   - a GitHub user fetch and a repo-list fetch
 *   - three more GitHub fetches, one per top repo, for its languages
 *   - optionally an Exa fetch of Twitter, and another of a portfolio site
 *   - then a gpt-4o pass over up to 8,000 characters of the lot
 *
 * A Cloudflare request cannot hold that open, and the inline version had already
 * taken 20 credits by the time it found out. Here the same work runs under an
 * alarm, and a job that dies refunds because the app sees a terminal status.
 *
 * The prompt, the model and the source-by-source behaviour are unchanged. Only
 * where it runs, and the HTTP client it runs through, have moved: `exa-js` is a
 * Node SDK, so the one endpoint this needs is called directly - the same choice
 * `src/openai.ts` already makes for OpenAI.
 */

/**
 * One import path since 2026-09-25: the Import with AI sheet's (plan/resume RES-23).
 *
 * There used to be a second, "combined" variant for the old New Resume dialog - a
 * GitHub URL scraped through Exa, and pasted resume text. Nothing dispatched it
 * after that dialog's import branch was deleted (Niraj approved removing both,
 * 2026-09-25). A job queued with the old fields before a deploy still runs: it
 * reads LinkedIn, Twitter and the portfolio and ignores `githubUrl`/`pastedText`.
 */
interface ResumeImportInput {
	name: string
	templateSlug: string
	linkedinUrl?: string
	/** Read through the GitHub REST API: repos, stars and languages. */
	githubUsername?: string
	twitterHandle?: string
	portfolioUrl?: string
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

/** What the model is shown. Unchanged from the inline version. */
const MAX_PROMPT_CHARS = 8_000

const EXA_CONTENTS = "https://api.exa.ai/contents"
const EXA_LIVECRAWL_TIMEOUT_MS = 10_000

export class ResumeImport extends JobDurableObject<ResumeImportInput> {
	protected readonly jobType: RunnableJobType = "resume_import"
	protected override get initialPhaseLabel() {
		return "Reading your profiles"
	}

	protected async run(job: StoredJob<ResumeImportInput>, progress: ProgressFn): Promise<unknown> {
		const db = this.db()
		const input = job.input

		// Fail on a missing key BEFORE any scraping. Every source below is
		// best-effort and swallows its own errors, so an unset key would produce
		// zero parts and reach the user as "make sure your profiles are public" -
		// sending them to fix something that is not broken while the real problem
		// is our configuration.
		const needsExa = Boolean(input.linkedinUrl || input.twitterHandle || input.portfolioUrl)
		if (needsExa && !this.env.EXA_API_KEY) {
			throw new Error("Profile importing is not configured on this environment")
		}

		const parts: string[] = []
		const usedSources: string[] = []

		if (input.linkedinUrl) {
			const raw = await this.exaText(input.linkedinUrl)
			if (raw) {
				parts.push(`=== LinkedIn Profile ===\n${raw.slice(0, 5000)}`)
				usedSources.push("linkedin")
			}
		}

		await progress(30, "Reading your code")

		if (input.githubUsername) {
			const githubText = await this.githubProfile(input.githubUsername.replace(/^@/, "").trim())
			if (githubText) {
				parts.push(githubText)
				usedSources.push("github")
			}
		}

		if (input.twitterHandle) {
			const raw = await this.exaText(`https://twitter.com/${input.twitterHandle.replace(/^@/, "")}`)
			if (raw) {
				parts.push(`=== Twitter/X Profile ===\n${raw.slice(0, 2000)}`)
				usedSources.push("twitter")
			}
		}

		if (input.portfolioUrl) {
			const raw = await this.exaText(input.portfolioUrl)
			if (raw) {
				parts.push(`=== Portfolio Website ===\n${raw.slice(0, 3000)}`)
				usedSources.push("portfolio")
			}
		}

		// Every source failing is a failed job, which is what refunds the hold.
		// Some succeeding is a success even when the import is thinner than the
		// user hoped - the model still ran, and CR-6 records that as the charge
		// boundary. Both rules are the inline version's; they are written here
		// because the hold system's default is neither.
		if (parts.length === 0) {
			throw new Error("Could not read anything from those sources. Make sure the profiles are public.")
		}

		await progress(55, "Writing your resume")

		const sourceHint = "LinkedIn profile, GitHub repositories, and additional sources"

		const structured = await this.structure(parts.join("\n\n").slice(0, MAX_PROMPT_CHARS), sourceHint)

		await progress(85, "Saving your resume")

		// Whether this claims the default slot is decided HERE, not at dispatch:
		// minutes can pass before the alarm fires and the user may have created and
		// defaulted a resume by hand in between. Same reasoning as
		// `resume-structure.ts`, and the same reason `createResumeDraft` is not
		// simply called - it is a server action, and this is a Durable Object.
		const existingDefault = await db.query.resumeDraft.findFirst({
			where: and(eq(resumeDraft.userId, job.userId), eq(resumeDraft.isDefault, true)),
			columns: { id: true },
		})

		// The draft is inserted at the END of the run, not pre-created by the app
		// the way a tailored resume is. Deliberately the opposite call: a tailored
		// draft that fails still holds the source resume and is worth opening, but
		// a failed import would leave an empty row in the user's list that says
		// nothing and has to be cleaned up by hand.
		const [draft] = await db
			.insert(resumeDraft)
			.values({
				userId: job.userId,
				name: input.name,
				templateSlug: input.templateSlug || "clean-minimal",
				content: structured as unknown as Record<string, unknown>,
				importedFrom: usedSources.join(","),
				importedUrl: input.linkedinUrl ?? (input.githubUsername ? `https://github.com/${input.githubUsername.replace(/^@/, "").trim()}` : null),
				isDefault: !existingDefault,
			})
			.returning({ id: resumeDraft.id, name: resumeDraft.name, shareSlug: resumeDraft.shareSlug })

		if (!draft) throw new Error("We read your profiles but could not save the resume")

		return {
			draftId: draft.id,
			name: draft.name,
			shareSlug: draft.shareSlug,
			isDefault: !existingDefault,
			sources: usedSources,
		}
	}

	/**
	 * One Exa `/contents` fetch.
	 *
	 * Best-effort by contract: every caller above treats an empty string as "this
	 * source had nothing", and a private LinkedIn or a dead portfolio URL is a
	 * normal outcome rather than a failure of the import. A thrown error here
	 * would fail the whole job over one optional source.
	 */
	private async exaText(url: string): Promise<string> {
		try {
			const res = await fetch(EXA_CONTENTS, {
				method: "POST",
				headers: {
					"x-api-key": this.env.EXA_API_KEY ?? "",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ urls: [url], text: true, livecrawlTimeout: EXA_LIVECRAWL_TIMEOUT_MS }),
			})
			if (!res.ok) return ""
			const data = (await res.json()) as { results?: Array<{ text?: string }> }
			return data.results?.[0]?.text?.trim() ?? ""
		} catch {
			return ""
		}
	}

	/**
	 * GitHub through the REST API - profile, top repos by stars, and the languages
	 * of the top three.
	 *
	 * Also best-effort, and for a sharper reason than the Exa calls: unauthenticated
	 * GitHub is 60 requests an hour per IP, and this makes six. A rate-limited
	 * import should still produce a resume from LinkedIn rather than failing
	 * outright.
	 */
	private async githubProfile(username: string): Promise<string> {
		if (!username) return ""

		const headers: Record<string, string> = {
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			// GitHub rejects requests with no User-Agent. The Node SDK set one; a
			// bare `fetch` from a Worker does not.
			"User-Agent": "shipithq-worker",
		}
		if (this.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${this.env.GITHUB_TOKEN}`

		try {
			const [userRes, reposRes] = await Promise.all([
				fetch(`https://api.github.com/users/${username}`, { headers }),
				fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=8&type=owner`, { headers }),
			])
			if (!userRes.ok) return ""

			const user = (await userRes.json()) as {
				name?: string
				bio?: string
				company?: string
				location?: string
				blog?: string
				public_repos?: number
				followers?: number
			}
			const repos = reposRes.ok
				? ((await reposRes.json()) as Array<{
						name: string
						description?: string
						language?: string
						stargazers_count: number
					}>)
				: []

			const topRepos = repos.slice(0, 3)
			const langResults = await Promise.allSettled(
				topRepos.map((r) =>
					fetch(`https://api.github.com/repos/${username}/${r.name}/languages`, { headers }).then(
						(res) => res.json() as Promise<Record<string, number>>,
					),
				),
			)

			const repoDetails = topRepos.map((r, i) => {
				const result = langResults[i]
				const langs = result?.status === "fulfilled" ? Object.keys(result.value ?? {}) : []
				return `- ${r.name}: ${r.description || "No description"} | Stars: ${r.stargazers_count} | Languages: ${[r.language, ...langs].filter(Boolean).join(", ")}`
			})

			return [
				`=== GitHub Profile: ${user.name || username} ===`,
				`Bio: ${user.bio || "N/A"}`,
				`Company: ${user.company || "N/A"}`,
				`Location: ${user.location || "N/A"}`,
				`Website: ${user.blog || "N/A"}`,
				`Public Repos: ${user.public_repos || 0} | Followers: ${user.followers || 0}`,
				"",
				"=== Top Projects ===",
				...repoDetails,
				"",
				"=== Other Repos ===",
				...repos.slice(3).map((r) => `- ${r.name} (${r.language || "Unknown"})`).slice(0, 5),
			].join("\n")
		} catch {
			return ""
		}
	}

	private async structure(text: string, sourceHint: string): Promise<StructuredResume> {
		let rawJson: string
		try {
			rawJson = await chatJSON({
				apiKey: this.env.OPENAI_API_KEY,
				model: modelFor("resumeImport"),
				maxTokens: 8000,
				system: `You are a resume parser. Extract structured resume data from ${sourceHint} content.
Use cuid-style IDs (random 8-char strings) for array items.
Dates should be ISO strings (YYYY-MM-DD).
Group skills by category (Programming Languages, Frameworks, Tools, Databases, Cloud, etc.).
All nullable fields should be null if not found, never undefined.
Use ONLY facts present in the content. Never invent a company, date, metric or skill.

Reply with a single JSON object and nothing else, in exactly this shape:
{
  "header": { "name": string, "email": string|null, "phone": string|null, "location": string|null, "title": string|null, "summary": string|null, "website": string|null, "linkedin": string|null, "github": string|null, "portfolio": string|null },
  "experience": [{ "id": string, "company": string, "role": string, "location": string|null, "startDate": string, "endDate": string|null, "current": boolean, "bullets": string[] }],
  "projects": [{ "id": string, "name": string, "description": string|null, "technologies": string[], "github": string|null, "liveUrl": string|null, "bullets": string[] }],
  "education": [{ "id": string, "institution": string, "degree": string|null, "field": string|null, "startDate": string, "endDate": string|null, "bullets": string[] }],
  "skills": [{ "category": string, "items": string[] }],
  "certifications": [{ "id": string, "name": string, "issuer": string|null, "date": string|null, "url": string|null }]
}

Every one of those six keys must be present. A section the content does not support is an empty array, not a missing key.`,
				user: `Extract resume data from this content:\n\n${text}`,
			})
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "The resume parser was unreachable"
			// A 4xx means the request itself was wrong, so a retry sends the
			// identical body and fails identically. Only transport failures and 5xx
			// are worth repeating. Same rule as `resume-structure.ts`.
			if (/OpenAI API error 4\d\d/.test(message)) throw new Error(message)
			throw new RetryableError(message)
		}

		let parsed: Partial<StructuredResume>
		try {
			parsed = JSON.parse(rawJson) as Partial<StructuredResume>
		} catch {
			throw new Error("The resume parser returned output we could not read")
		}

		// Normalise before anything downstream sees it: the editor and every AI
		// consumer index into all six arrays, and a missing key is a crash in the
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
