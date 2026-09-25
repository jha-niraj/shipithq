import { eq } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import { scrapeSite, isFirecrawlError, type ScrapeResult } from "@repo/firecrawl"
import type { CompanyDraftFields } from "@repo/db/schema"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { cleanFields, isRefusedDomain, normalise, onDomain, pageUrl, readRobots } from "./company-scrape-core"
import { JobDurableObject, RetryableError, type ProgressFn, type StoredJob } from "./base"

const { companyProfileDrafts } = schema

/**
 * Read a company's own site into a draft profile (plan/hiring-rounds HR-5).
 *
 * The dispatcher (an admin adding a company, HR-6, or a student's request, HR-7)
 * inserts a `company_profile_draft` in SCRAPING with the confirmed domain; this
 * job gets only its id. It maps the site, scrapes up to 12 of the pages that say
 * what a company is like to work at, and has the model draft each profile field
 * with the page it came from. The draft is never the live company row: an admin
 * reviews and publishes it.
 *
 * Retries, timeouts and error classes live in `@repo/firecrawl`; nothing here
 * adds a second layer. A Firecrawl failure fails the job with its own message.
 */

interface CompanyScrapeInput {
	draftId: string
}

/** Pages read. Bounds the cost: one map credit per preferred term, plus one per page. */
const MAX_PAGES = 12
const PREFER = ["about", "careers", "jobs", "engineering", "team", "culture", "benefits"]
/** Per page and in total, what the model is shown. */
const MAX_PAGE_CHARS = 6_000
const MAX_TOTAL_CHARS = 48_000

const SYSTEM = `You draft a company's profile for a hiring platform from pages of the company's OWN website. Students read it to decide whether to apply.

Rules:
- Use ONLY facts stated on the pages given. Never guess an industry, size, location or technology the pages do not state. A field the pages say nothing about is left out entirely.
- Every field you include cites the ONE page it came from, as "sourceUrl", copied exactly from the "URL:" line of that page.
- Never include a person's name, email address or phone number in any field. Describe the team, not individuals.
- "description": 2-4 plain sentences on what the company does and for whom. No marketing superlatives.
- "industry": a short label ("Fintech", "Developer tools").
- "size": only if a page states a headcount or range ("51-200 employees", "over 1,000 people").
- "locations": offices or where the team works ("Bengaluru", "Remote (India)").
- "techStack": languages, frameworks and tools the pages say the company uses, e.g. on an engineering blog or a job post.
- "culture": 2-3 sentences on how the team works, in the company's terms.
- "benefits": short items ("Health insurance for family", "Learning budget").
- "careersUrl": the page listing open roles, if one was read.

Reply with one JSON object and nothing else:
{ "name": {"value": string, "sourceUrl": string}, "description": {...}, "industry": {...}, "size": {...}, "locations": {"value": string[], "sourceUrl": string}, "techStack": {"value": string[], "sourceUrl": string}, "culture": {...}, "benefits": {"value": string[], "sourceUrl": string}, "careersUrl": {"value": string, "sourceUrl": string} }
Leave out any key you cannot support from the pages.`

export class CompanyScrape extends JobDurableObject<CompanyScrapeInput> {
	protected readonly jobType: RunnableJobType = "company_scrape"
	protected override get initialPhaseLabel() {
		return "Reading the company's site"
	}

	protected async run(job: StoredJob<CompanyScrapeInput>, progress: ProgressFn): Promise<unknown> {
		const db = this.db()
		const draft = await db.query.companyProfileDrafts.findFirst({
			where: eq(companyProfileDrafts.id, job.input.draftId),
		})
		if (!draft) throw new Error("That company draft no longer exists")
		if (draft.status !== "SCRAPING") {
			// Discarded or already finished while queued: nothing to do, nothing to charge.
			return { draftId: draft.id, status: draft.status, skipped: true }
		}

		try {
			return await this.scrapeInto(draft.id, draft.domain, progress)
		} catch (error: unknown) {
			// A retry keeps the draft in SCRAPING; any other failure is final and the
			// draft says why, so a reviewer never sees an empty "ready" draft.
			if (!(error instanceof RetryableError)) {
				const message = error instanceof Error ? error.message : "The site could not be read"
				await db.update(companyProfileDrafts)
					.set({ status: "FAILED", error: message.slice(0, 500) })
					.where(eq(companyProfileDrafts.id, draft.id))
			}
			throw error
		}
	}

	private async scrapeInto(draftId: string, rawDomain: string, progress: ProgressFn) {
		const db = this.db()
		const domain = rawDomain.trim().toLowerCase().replace(/^www\./, "")

		// Before any credit is spent.
		if (isRefusedDomain(domain)) {
			throw new Error(`${domain} is a social or non-company site; add the company's own website instead.`)
		}
		const key = this.env.FIRECRAWL_API_KEY
		if (!key) throw new Error("Web page fetching is not configured (FIRECRAWL_API_KEY is not set on the worker).")

		const rootUrl = `https://${domain}`
		const robots = await readRobots(rootUrl)
		if (!robots.allows("/")) {
			throw new Error(`${domain}'s robots.txt asks crawlers not to read the site, so no profile was drafted.`)
		}

		await progress(15, "Finding the about, careers and team pages")

		const robotsSkipped: string[] = []
		let site
		try {
			site = await scrapeSite(key, rootUrl, {
				maxPages: MAX_PAGES,
				prefer: PREFER,
				// A PDF is billed per page of the PDF; a brochure is not worth 40 credits.
				pdfMaxPages: 3,
				filter: (url) => {
					if (!onDomain(url, domain)) return false
					let path = "/"
					try { path = new URL(url).pathname || "/" } catch { return false }
					if (!robots.allows(path)) { robotsSkipped.push(url); return false }
					return true
				},
			})
		} catch (error: unknown) {
			// Every page failed (or none was allowed): the real reason, not an empty draft.
			const reason = isFirecrawlError(error) || error instanceof Error ? error.message : "The site could not be read"
			throw new Error(reason)
		}

		// A redirect can land a page on another domain; it is not the company's.
		const pages = site.pages.filter((p) => onDomain(pageUrl(p) ?? "", domain))
		if (pages.length === 0) throw new Error(`Every page read redirected away from ${domain}.`)

		await progress(60, "Drafting the profile")

		const fields = await this.draft(domain, pages)

		await db.update(companyProfileDrafts)
			.set({
				status: "READY",
				fields,
				sourcePages: pages.map((p) => ({ url: pageUrl(p)!, title: p.metadata.title ?? null })),
				degraded: site.degraded,
				failedUrls: site.failedUrls,
				robotsSkipped,
				error: site.degraded ? `${site.failedUrls.length} page(s) could not be read; this draft is partial.` : null,
			})
			.where(eq(companyProfileDrafts.id, draftId))

		return {
			draftId,
			pages: pages.length,
			fields: Object.keys(fields),
			degraded: site.degraded,
			robotsSkipped: robotsSkipped.length,
		}
	}

	private async draft(domain: string, pages: ScrapeResult[]): Promise<CompanyDraftFields> {
		let budget = MAX_TOTAL_CHARS
		const blocks: string[] = []
		for (const p of pages) {
			if (budget <= 0) break
			const body = (p.markdown ?? "").slice(0, Math.min(MAX_PAGE_CHARS, budget))
			budget -= body.length
			blocks.push(`URL: ${pageUrl(p)}\nTitle: ${p.metadata.title ?? ""}\n\n${body}`)
		}

		let raw: string
		try {
			raw = await chatJSON({
				apiKey: this.env.OPENAI_API_KEY,
				model: modelFor("companyProfileDraft"),
				temperature: 0.1,
				maxTokens: 2_000,
				system: SYSTEM,
				user: `The company's domain is ${domain}. Its pages:\n\n${blocks.join("\n\n---\n\n")}`,
			})
		} catch (error: unknown) {
			if (error instanceof RetryableError) throw error
			throw new Error(error instanceof Error ? error.message : "The profile could not be drafted")
		}

		let parsed: Record<string, unknown>
		try {
			parsed = JSON.parse(raw) as Record<string, unknown>
		} catch {
			throw new Error("The profile draft came back in a form we could not read")
		}
		const read = new Set(pages.map((p) => normalise(pageUrl(p)!)))
		return cleanFields(parsed, domain, read)
	}
}
