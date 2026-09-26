import { SOCIAL_DOMAINS, domainOf } from "@repo/exa"
import type { CompanyDraftField, CompanyDraftFields } from "@repo/db/schema"
import type { ScrapeResult } from "@repo/firecrawl"

/*
 * The parts of `company_scrape` (plan/hiring-rounds HR-5) that need no Durable
 * Object: which domains are refused, the robots.txt reading, and the check every
 * drafted field passes before it is stored. Kept apart so they can be run
 * directly, like @repo/ai/sprint-mock.
 */

const TEXT_FIELDS = ["name", "description", "industry", "size", "culture", "careersUrl"] as const
const LIST_FIELDS = ["locations", "techStack", "benefits"] as const

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const PHONE_RE = /\+?\d[\d\s().-]{8,}\d/

const ROBOTS_TIMEOUT_MS = 5_000

/** A domain we must never read as a company's own site. */
export function isRefusedDomain(domain: string): boolean {
	const d = domain.toLowerCase()
	if (SOCIAL_DOMAINS.some((s) => d === s || d.endsWith(`.${s}`))) return true
	// Not a public hostname: localhost, a bare IP, or an internal name.
	if (!d.includes(".") || /^\d+(\.\d+){3}$/.test(d) || d.endsWith(".local") || d.endsWith(".internal")) return true
	return false
}

/** A page belongs to the company when it is on the domain or one of its subdomains. */
export function onDomain(url: string, domain: string): boolean {
	const d = domainOf(url)
	return d !== null && (d === domain || d.endsWith(`.${domain}`))
}

export function pageUrl(p: ScrapeResult): string | undefined {
	return p.metadata.sourceURL ?? (p.metadata as { url?: string }).url
}

export function normalise(url: string): string {
	return url.replace(/[#?].*$/, "").replace(/\/$/, "").toLowerCase()
}

/** A careers page: its path or subdomain says so. */
const CAREERS_RE = /(^|[./-])(careers?|jobs?|join(-us)?|hiring|work-with-us|openings|vacancies)([./-]|$)/i

/**
 * The pages worth reading about a company as an employer. Anything else the map
 * search turns up (product docs, a design system's iframe, legal pages, landing
 * pages for events) costs a credit and tells a student nothing.
 */
const RELEVANT_RE = /(^|[./-])(about(-us)?|company|careers?|jobs?|join(-us)?|hiring|work-with-us|life|culture|values|mission|story|team|people|engineering|tech|benefits|perks)([./-]|$)/i
const IRRELEVANT_PATH_RE = /(^|\/)(docs?|api|legal|privacy|terms|policy|policies|cookie|login|signin|signup|pricing|checkout|cart|support|help|status)(\/|$)|\.(pdf|png|jpe?g|gif|svg|xml|json|zip)$/i

/** "/in/about" -> ["about"]: a leading locale ("in", "en-gb") is not the section. */
const LOCALE_RE = /^[a-z]{2}([-_][a-z]{2})?$/i
function sections(pathname: string): string[] {
	const parts = pathname.split("/").filter(Boolean)
	return parts.length && LOCALE_RE.test(parts[0]!) ? parts.slice(1) : parts
}

export function isRelevantPage(url: string, domain: string): boolean {
	let u: URL
	try { u = new URL(url) } catch { return false }
	const host = u.hostname.toLowerCase().replace(/^www\./, "")
	if (host !== domain && !host.endsWith(`.${domain}`)) return false
	const path = u.pathname.replace(/\/$/, "") || "/"
	// The homepage (or a locale's, "/in") says what the company does; always worth it.
	if (host === domain && sections(path).length === 0) return true
	if (IRRELEVANT_PATH_RE.test(path)) return false
	const sub = host === domain ? "" : host.slice(0, -(domain.length + 1))
	// A subdomain counts only when it is itself about the company (careers., engineering.).
	if (sub) return RELEVANT_RE.test(sub)
	// On the main site, the section must say so: /about-us, /careers/..., /life/...
	// A blog post whose slug happens to contain "culture" is not a culture page.
	return RELEVANT_RE.test(sections(path)[0] ?? "")
}

export function isCareersUrl(url: string, domain: string): boolean {
	if (!onDomain(url, domain)) return false
	try {
		const u = new URL(url)
		return CAREERS_RE.test(u.hostname) || CAREERS_RE.test(u.pathname)
	} catch {
		return false
	}
}

/** Where companies keep the pages a student wants, checked before any credit is spent. */
export const WELL_KNOWN_PATHS = ["/about", "/about-us", "/company", "/careers", "/jobs", "/culture", "/life", "/team", "/benefits"]
export const WELL_KNOWN_SUBDOMAINS = ["careers", "jobs"]

/**
 * Which well-known pages exist, with plain requests: free, unlike a scrape. A page
 * counts when it answers 200 on the company's domain and did not redirect to the
 * homepage (many sites send every unknown path there). A site that blocks plain
 * requests simply yields nothing here, and discovery still runs.
 */
export async function probeWellKnown(domain: string, timeoutMs = 5_000): Promise<string[]> {
	const targets = [
		...WELL_KNOWN_PATHS.map((p) => `https://${domain}${p}`),
		...WELL_KNOWN_SUBDOMAINS.map((s) => `https://${s}.${domain}`),
	]
	const hits = await Promise.all(targets.map(async (url) => {
		try {
			const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(timeoutMs), headers: { Accept: "text/html" } })
			await res.body?.cancel().catch(() => {})
			if (!res.ok) return null
			const final = res.url || url
			const u = new URL(final)
			const host = u.hostname.toLowerCase().replace(/^www\./, "")
			// Sent to the main site's homepage: the page does not exist.
			if (!onDomain(final, domain) || (host === domain && sections(u.pathname).length === 0)) return null
			return final
		} catch {
			return null
		}
	}))
	return [...new Set(hits.filter((u): u is string => u !== null))]
}

const STOP = new Set(["and", "the", "for", "of", "to", "in", "with", "per", "our", "a", "an", "on", "at", "by", "or", "all", "your"])
const words = (s: string) => s.toLowerCase().replace(/(\d),(\d)/g, "$1$2").split(/[^a-z0-9+#]+/).filter((w) => w && !STOP.has(w))

/**
 * Whether a short fact (a size, a location, a technology, a benefit) is actually
 * on the page it cites. Most of its words must appear there: a model given
 * example values copies them into a draft, and this is what catches it.
 */
export function grounded(value: string, pageText: string): boolean {
	const page = new Set(words(pageText))
	const want = words(value)
	if (want.length === 0) return pageText.toLowerCase().includes(value.toLowerCase().trim())
	const found = want.filter((w) => page.has(w)).length
	return found / want.length >= 0.7
}

/**
 * Pages written for people who work there, as opposed to customers. The homepage
 * and /about describe the product: asked for benefits, gpt-4o-mini listed
 * "API access" and "24x7 support" from razorpay.com/about even when told not to.
 */
const EMPLOYER_RE = /(^|[./-])(careers?|jobs?|join(-us)?|hiring|work-with-us|life|culture|values|team|people|benefits|perks|engineering|tech)([./-]|$)/i
export function isEmployerPage(url: string, domain: string): boolean {
	if (!onDomain(url, domain)) return false
	try {
		const u = new URL(url)
		const host = u.hostname.toLowerCase().replace(/^www\./, "")
		const sub = host === domain ? "" : host.slice(0, -(domain.length + 1))
		return (sub !== "" && EMPLOYER_RE.test(sub)) || EMPLOYER_RE.test(sections(u.pathname)[0] ?? "")
	} catch {
		return false
	}
}
/** About working there, so they must come from a page written for employees. */
const EMPLOYER_FIELDS = new Set(["culture", "benefits"])

/** Paraphrased by design, so not word-checked; an admin reviews them before publishing. */
const PARAPHRASED = new Set(["description", "culture", "industry"])

/**
 * Keep a field only when it cites a page that was actually read on the company's
 * domain, its facts appear on that page, and it holds no email address or phone
 * number. Everything the model says is checked here rather than trusted.
 *
 * `pages` maps each read page's normalised URL to its text.
 */
export interface DroppedField {
	field: string
	reason: "not_cited" | "not_on_page" | "personal_data" | "not_a_careers_page" | "not_an_employer_page" | "empty"
	/** For `not_cited`: what the model gave as its source. */
	cited?: string
}

export function cleanFields(
	parsed: Record<string, unknown>,
	domain: string,
	pages: Map<string, string>,
): { fields: CompanyDraftFields; dropped: DroppedField[] } {
	const out: CompanyDraftFields = {}
	const dropped: DroppedField[] = []
	// A summary drawn from several pages may cite a list; the first page that was read counts.
	const cites = (v: unknown): string | null => {
		const list = Array.isArray(v) ? v : [v]
		for (const u of list) {
			if (typeof u === "string" && onDomain(u, domain) && pages.has(normalise(u))) return u
		}
		return null
	}
	const clean = (s: string) => s.trim().slice(0, 1_200)
	const personal = (s: string) => EMAIL_RE.test(s) || PHONE_RE.test(s)

	for (const k of TEXT_FIELDS) {
		const f = parsed[k] as Partial<CompanyDraftField> | undefined
		if (f === undefined || f === null) continue
		const sourceUrl = cites(f.sourceUrl)
		if (!sourceUrl) { dropped.push({ field: k, reason: "not_cited", cited: JSON.stringify(f.sourceUrl ?? null).slice(0, 200) }); continue }
		if (EMPLOYER_FIELDS.has(k) && !isEmployerPage(sourceUrl, domain)) { dropped.push({ field: k, reason: "not_an_employer_page" }); continue }
		if (typeof f.value !== "string" || !clean(f.value)) { dropped.push({ field: k, reason: "empty" }); continue }
		let value = clean(f.value)
		if (personal(value)) { dropped.push({ field: k, reason: "personal_data" }); continue }
		if (k === "careersUrl") {
			if (!isCareersUrl(value, domain)) { dropped.push({ field: k, reason: "not_a_careers_page" }); continue }
			// Tracking parameters are the referrer's, not the company's.
			value = value.replace(/[?#].*$/, "")
		} else if (!PARAPHRASED.has(k) && !grounded(value, pages.get(normalise(sourceUrl)) ?? "")) {
			dropped.push({ field: k, reason: "not_on_page" })
			continue
		}
		out[k] = { value, sourceUrl }
	}
	for (const k of LIST_FIELDS) {
		const f = parsed[k] as Partial<CompanyDraftField<unknown[]>> | undefined
		if (f === undefined || f === null) continue
		const sourceUrl = cites(f.sourceUrl)
		if (!sourceUrl) { dropped.push({ field: k, reason: "not_cited", cited: JSON.stringify(f.sourceUrl ?? null).slice(0, 200) }); continue }
		if (EMPLOYER_FIELDS.has(k) && !isEmployerPage(sourceUrl, domain)) { dropped.push({ field: k, reason: "not_an_employer_page" }); continue }
		if (!Array.isArray(f.value)) { dropped.push({ field: k, reason: "empty" }); continue }
		const text = pages.get(normalise(sourceUrl)) ?? ""
		const items = f.value.filter((v): v is string => typeof v === "string").map((v) => clean(v).slice(0, 120)).filter(Boolean)
		const value: string[] = []
		for (const v of items) {
			if (personal(v)) dropped.push({ field: `${k}: ${v}`, reason: "personal_data" })
			else if (!grounded(v, text)) dropped.push({ field: `${k}: ${v}`, reason: "not_on_page" })
			else value.push(v)
		}
		if (value.length) out[k] = { value: value.slice(0, 20), sourceUrl }
	}
	return { fields: out, dropped }
}

// ── robots.txt ────────────────────────────────────────────────────────────────

export interface Robots {
	allows(path: string): boolean
}

/**
 * The rules for `*` and for `FirecrawlAgent`, read the usual way: the longest
 * matching rule wins, and Allow wins a tie. No robots.txt (or one we cannot
 * reach) allows everything, as crawlers treat it.
 */
export async function readRobots(rootUrl: string): Promise<Robots> {
	let text = ""
	try {
		const res = await fetch(`${rootUrl}/robots.txt`, { signal: AbortSignal.timeout(ROBOTS_TIMEOUT_MS), redirect: "follow" })
		if (res.ok) text = (await res.text()).slice(0, 200_000)
	} catch {
		text = ""
	}
	return parseRobots(text)
}

export function parseRobots(text: string): Robots {
	const rules: { allow: boolean; pattern: string }[] = []
	let agents: string[] = []
	let inRules = false
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.replace(/#.*$/, "").trim()
		const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line)
		if (!m) continue
		const field = m[1]!.toLowerCase()
		const value = m[2]!.trim()
		if (field === "user-agent") {
			// A user-agent line after rules starts a new group.
			if (inRules) { agents = []; inRules = false }
			agents.push(value.toLowerCase())
			continue
		}
		if (field !== "allow" && field !== "disallow") continue
		inRules = true
		const applies = agents.some((a) => a === "*" || a === "firecrawlagent")
		// An empty Disallow allows everything; it is not a rule.
		if (applies && value) rules.push({ allow: field === "allow", pattern: value })
	}

	const matches = (pattern: string, path: string) => {
		const anchored = pattern.endsWith("$")
		const body = (anchored ? pattern.slice(0, -1) : pattern)
			.split("*")
			.map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
			.join(".*")
		return new RegExp(`^${body}${anchored ? "$" : ""}`).test(path)
	}

	return {
		allows(path: string) {
			let best: { allow: boolean; length: number } | null = null
			for (const r of rules) {
				if (!matches(r.pattern, path)) continue
				const length = r.pattern.length
				if (!best || length > best.length || (length === best.length && r.allow)) best = { allow: r.allow, length }
			}
			return best ? best.allow : true
		},
	}
}
