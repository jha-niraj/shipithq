import { SOCIAL_DOMAINS, domainOf } from "@repo/exa"
import type { CompanyDraftField, CompanyDraftFields } from "@repo/db/schema"
import type { ScrapeResult } from "@repo/firecrawl"

/*
 * The parts of `company_scrape` (plan/hiring-rounds HR-5) that need no Durable
 * Object: which domains are refused, the robots.txt reading, and the check every
 * drafted field passes before it is stored. Kept apart so they can be run
 * directly, like sprint-mock-core.
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

/**
 * Keep a field only when it cites a page that was actually read on the company's
 * domain, and holds no email address or phone number. Everything the model says
 * is checked here rather than trusted.
 */
export function cleanFields(parsed: Record<string, unknown>, domain: string, read: Set<string>): CompanyDraftFields {
	const out: CompanyDraftFields = {}
	const cites = (v: unknown): string | null => {
		if (typeof v !== "string") return null
		return onDomain(v, domain) && read.has(normalise(v)) ? v : null
	}
	const clean = (s: string) => s.trim().slice(0, 1_200)
	const personal = (s: string) => EMAIL_RE.test(s) || PHONE_RE.test(s)

	for (const k of TEXT_FIELDS) {
		const f = parsed[k] as Partial<CompanyDraftField> | undefined
		const sourceUrl = cites(f?.sourceUrl)
		if (!sourceUrl || typeof f?.value !== "string") continue
		const value = clean(f.value)
		if (!value || personal(value)) continue
		if (k === "careersUrl" && !onDomain(value, domain)) continue
		out[k] = { value, sourceUrl }
	}
	for (const k of LIST_FIELDS) {
		const f = parsed[k] as Partial<CompanyDraftField<unknown[]>> | undefined
		const sourceUrl = cites(f?.sourceUrl)
		if (!sourceUrl || !Array.isArray(f?.value)) continue
		const value = f.value
			.filter((v): v is string => typeof v === "string")
			.map((v) => clean(v).slice(0, 120))
			.filter((v) => v && !personal(v))
			.slice(0, 20)
		if (value.length) out[k] = { value, sourceUrl }
	}
	return out
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
