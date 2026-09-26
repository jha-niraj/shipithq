/**
 * The Firecrawl client: the RETRIEVAL half of our web stack.
 *
 * ## What this is for, and what it is not for
 *
 * Exa (`@repo/exa`) answers "find me pages about X". Firecrawl answers "turn this URL I
 * already have into clean data, even if the site fights back". Measured side by side, Exa
 * returned nothing at all on a bot-protected page while Firecrawl returned the full article,
 * and Exa strips links and tables while Firecrawl preserves them. Do NOT reach for this to do
 * discovery - Exa beat it 0/5 on the lead-generation query and is cheaper with content.
 *
 * Deliberately built the same way as `@repo/exa`: raw fetch, one timeout, one retry policy,
 * `AppError` classification, zero runtime dependencies. Firecrawl ships an official SDK, but
 * it carries its own retry and timeout that would compete with ours, and the whole point of
 * these packages is that the policy lives in exactly one place per provider.
 *
 * ## Endpoints covered
 *
 * `/v2/scrape` and `/v2/map` only. `/v2/crawl` is deliberately absent: map returns a site's
 * URL list for ONE credit, and scraping the pages you choose costs the same per page as
 * crawling them, so map+scrape does the same job synchronously with no job table, no polling
 * and no webhook. Add crawl when a real target proves it needs link discovery past the
 * sitemap. `/v2/parse` (local file upload) is absent for the same reason: nothing needs it yet.
 */

import { AppError } from '@repo/errors'

const BASE = 'https://api.firecrawl.dev/v2'

/**
 * 45s, against Exa's 20s, and the difference is the point: Exa serves its own index while
 * Firecrawl drives a real browser at the live page. A measured scrape was under 2s, but a
 * heavy JS page - especially one also rendering a screenshot - is far slower, and a timeout
 * that fires on a page which would have succeeded just burns a credit for nothing.
 */
const SCRAPE_TIMEOUT_MS = 45_000
/** Map is an index lookup on Firecrawl's side, not a page render, so it gets Exa's budget. */
const MAP_TIMEOUT_MS = 20_000

const MAX_ATTEMPTS = 3
const BACKOFF_MS = [250, 500]
const MAX_RETRY_AFTER_MS = 10_000

/**
 * How many pages `scrapeSite` fetches at once.
 *
 * Unlike `@repo/exa`, which runs its fan-out uncapped, this one IS capped - because the
 * limits are an order of magnitude tighter. Firecrawl's free tier allows 10 scrape requests
 * a minute (Hobby 100, Standard 500), so an uncapped 8-page site scrape on the free plan
 * would rate-limit itself, and every 429 we retry through is latency we chose to take.
 */
const DEFAULT_CONCURRENCY = 3

// ─── errors ──────────────────────────────────────────────────────────────────────

/**
 * Extends `AppError` so it classifies like everything else and `handleServerError` can show
 * `userMessage` to the user. As in `@repo/exa`, a rejected key is NOT `auth`: that kind
 * bounces the user to sign-in, and a bad server-side API key is our problem, not their session.
 */
export class FirecrawlError extends AppError {
    /** HTTP status, or undefined when the request never got a response. */
    readonly status?: number

    constructor(kind: 'ratelimit' | 'network' | 'unknown', userMessage: string, opts?: { status?: number; cause?: unknown }) {
        super(kind, userMessage, { cause: opts?.cause })
        this.name = 'FirecrawlError'
        this.status = opts?.status
    }
}

export function isFirecrawlError(err: unknown): err is FirecrawlError {
    return err instanceof FirecrawlError
}

function isRetryableStatus(status: number): boolean {
    return status === 429 || (status >= 500 && status <= 599)
}

function isRetryableNetworkError(err: unknown): boolean {
    if (isFirecrawlError(err)) return false
    if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) return true
    return err instanceof TypeError
}

function retryAfterMs(res: Response): number | null {
    const raw = res.headers.get('retry-after')
    if (!raw) return null
    const secs = Number(raw)
    const ms = Number.isFinite(secs) ? secs * 1000 : Date.parse(raw) - Date.now()
    if (!Number.isFinite(ms) || ms <= 0) return null
    return Math.min(ms, MAX_RETRY_AFTER_MS)
}

function classify(status: number, body: string): FirecrawlError {
    const detail = body ? `: ${body.slice(0, 200)}` : ''
    if (status === 429) {
        return new FirecrawlError('ratelimit', 'Web page fetching is rate limited right now. Try again in a moment.', { status })
    }
    // 402 is Firecrawl-specific and is the one an operator must act on: the plan's monthly
    // credits are gone. Saying "temporarily unavailable" would send someone hunting a bug
    // that is really a billing page.
    if (status === 402) {
        return new FirecrawlError('unknown', 'The web fetching plan is out of credits. An admin needs to top up Firecrawl.', { status, cause: detail })
    }
    if (status >= 500) {
        return new FirecrawlError('network', 'Web page fetching is temporarily unavailable. Try again in a moment.', { status, cause: detail })
    }
    if (status === 401 || status === 403) {
        return new FirecrawlError('unknown', 'Web page fetching is not configured correctly (the Firecrawl API key was rejected).', { status, cause: detail })
    }
    return new FirecrawlError('unknown', `Web page fetching rejected the request (${status}).`, { status, cause: detail })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** One POST with the shared timeout + retry policy. Every endpoint goes through this. */
async function post<T>(apiKey: string, path: string, body: unknown, timeoutMs: number): Promise<T> {
    if (!apiKey) throw new FirecrawlError('unknown', 'Web page fetching is not configured (FIRECRAWL_API_KEY is not set).')
    const payload = JSON.stringify(body)

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        let res: Response
        try {
            res = await fetch(`${BASE}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: payload,
                signal: AbortSignal.timeout(timeoutMs),
            })
        } catch (err) {
            if (attempt === MAX_ATTEMPTS || !isRetryableNetworkError(err)) {
                throw new FirecrawlError('network', 'Could not reach the web fetching service. Try again in a moment.', { cause: err })
            }
            await sleep(BACKOFF_MS[attempt - 1] ?? 1000)
            continue
        }

        if (!res.ok) {
            const text = await res.text().catch(() => '')
            const err = classify(res.status, text)
            if (attempt === MAX_ATTEMPTS || !isRetryableStatus(res.status)) throw err
            await sleep(retryAfterMs(res) ?? BACKOFF_MS[attempt - 1] ?? 1000)
            continue
        }

        return (await res.json()) as T
    }

    throw new FirecrawlError('network', 'Web page fetching failed.')
}

// ─── scrape ──────────────────────────────────────────────────────────────────────

/**
 * String formats are the plain ones. The object forms carry their own settings:
 *  - `json` runs an LLM against the page and returns data matching your schema (5 credits,
 *    not 1 - it is a model call, so do not request it "just in case")
 *  - `screenshot` renders the page as an image
 */
export type ScrapeFormat =
    | 'markdown'
    | 'html'
    | 'rawHtml'
    | 'links'
    | 'summary'
    | { type: 'json'; schema?: Record<string, unknown>; prompt?: string }
    | { type: 'screenshot'; fullPage?: boolean; quality?: number }

export interface ScrapeOptions {
    /** Defaults to `["markdown"]`. */
    formats?: ScrapeFormat[]
    /** Strip nav, footers and boilerplate. Defaults to true. */
    onlyMainContent?: boolean
    includeTags?: string[]
    excludeTags?: string[]
    /**
     * Serve a cached copy if Firecrawl fetched this URL within the last N milliseconds.
     * Cheaper and much faster for repeat reads of the same page (re-enriching a company).
     *
     * NEVER set this on a change-detection read. The whole job there is to notice that the
     * live page differs from last time, and a cache hit guarantees it cannot.
     */
    maxAge?: number
    /**
     * Cap how many pages of a PDF get parsed.
     *
     * This is the single most expensive footgun in the API: Firecrawl bills PDFs at one
     * credit per PAGE OF THE PDF, not per document. A 15 page paper cost exactly 15 credits
     * when measured, so a 300 page manual costs 300. Any code path a user can point at an
     * arbitrary URL should set this. See `FIRECRAWL_LIMITS.pdfMaxPages` in credit-prices.
     */
    pdfMaxPages?: number
    timeoutMs?: number
}

export interface ScrapeMetadata {
    title?: string
    description?: string
    language?: string
    sourceURL?: string
    statusCode?: number
    contentType?: string
    ogImage?: string
}

export interface ScrapeResult {
    markdown?: string
    html?: string
    rawHtml?: string
    links?: string[]
    summary?: string
    /** Present when a `json` format was requested. Shape is whatever schema you passed. */
    json?: unknown
    /** URL of the rendered screenshot when a `screenshot` format was requested. */
    screenshot?: string
    metadata: ScrapeMetadata
}

function scrapeBody(url: string, opts?: ScrapeOptions): Record<string, unknown> {
    const body: Record<string, unknown> = {
        url,
        formats: opts?.formats ?? ['markdown'],
        onlyMainContent: opts?.onlyMainContent ?? true,
    }
    if (opts?.includeTags?.length) body.includeTags = opts.includeTags
    if (opts?.excludeTags?.length) body.excludeTags = opts.excludeTags
    if (opts?.maxAge !== undefined) body.maxAge = opts.maxAge
    if (opts?.pdfMaxPages !== undefined) {
        body.parsers = [{ type: 'pdf', maxPages: opts.pdfMaxPages }]
    }
    return body
}

/** Fetch one URL and return it as clean data. 1 credit for a page, 5 if you ask for `json`. */
export async function scrape(apiKey: string, url: string, opts?: ScrapeOptions): Promise<ScrapeResult> {
    const res = await post<{ success?: boolean; data?: ScrapeResult; error?: string }>(
        apiKey,
        '/scrape',
        scrapeBody(url, opts),
        opts?.timeoutMs ?? SCRAPE_TIMEOUT_MS,
    )
    // A 200 with `success: false` is a page-level refusal, not a transport failure, so it
    // never reaches `classify`. Without this branch it would surface as an empty result and
    // read downstream as "this page is blank".
    if (!res.data) {
        throw new FirecrawlError('unknown', res.error ?? `Could not read ${url}.`, { status: 200 })
    }
    return { ...res.data, metadata: res.data.metadata ?? {} }
}

// ─── map ─────────────────────────────────────────────────────────────────────────

export interface MapOptions {
    /** Filter the returned links by a text match, e.g. "pricing". */
    search?: string
    /** Defaults to Firecrawl's 100. */
    limit?: number
    /** "include" (default), "skip" to ignore the sitemap, "only" to trust it exclusively. */
    sitemap?: 'include' | 'skip' | 'only'
    includeSubdomains?: boolean
    timeoutMs?: number
}

export interface MapLink {
    url: string
    title?: string
    description?: string
}

/**
 * Enumerate a site's URLs. ONE credit regardless of how many come back (100 measured), which
 * is what makes map-then-scrape the cheap way to read a site: you see the whole URL list for
 * a single credit and then pay per page only for the ones you actually want.
 */
export async function map(apiKey: string, url: string, opts?: MapOptions): Promise<MapLink[]> {
    const body: Record<string, unknown> = { url }
    if (opts?.search) body.search = opts.search
    if (opts?.limit !== undefined) body.limit = opts.limit
    if (opts?.sitemap) body.sitemap = opts.sitemap
    if (opts?.includeSubdomains !== undefined) body.includeSubdomains = opts.includeSubdomains

    const res = await post<{ success?: boolean; links?: (MapLink | string)[]; error?: string }>(
        apiKey,
        '/map',
        body,
        opts?.timeoutMs ?? MAP_TIMEOUT_MS,
    )
    // The endpoint has returned both bare strings and objects depending on options; normalise
    // so callers never have to care which one they got.
    return (res.links ?? []).map((l) => (typeof l === 'string' ? { url: l } : l)).filter((l) => Boolean(l.url))
}

// ─── map + scrape ────────────────────────────────────────────────────────────────

export interface ScrapeSiteOptions extends ScrapeOptions {
    /** Hard ceiling on pages fetched. Required in spirit: this is what bounds our spend. */
    maxPages: number
    /**
     * Path fragments to rank first, e.g. `["about", "pricing", "team"]`. Pages matching an
     * earlier entry sort before a later one, and anything unmatched goes last.
     *
     * Without this, "scrape 8 pages of this company's site" returns whatever the sitemap
     * happened to list first, which for most marketing sites is blog posts. The whole value
     * of reading a company's own site for enrichment is in about/pricing/team, so ordering
     * is not a nicety - it is the difference between useful and useless evidence.
     */
    prefer?: string[]
    /** Parallel scrapes. Defaults to 3; see DEFAULT_CONCURRENCY for why it is not unbounded. */
    concurrency?: number
    /** Passed through to `map`. */
    mapOptions?: Omit<MapOptions, 'timeoutMs'>
    /**
     * Drop a discovered URL before it is scraped (and so before it costs a credit): another
     * domain, or a path robots.txt disallows. Runs before `maxPages` is applied, so a
     * rejected URL does not use up a page of the budget.
     */
    filter?: (url: string) => boolean
    /**
     * URLs the caller already knows exist (it probed them itself), read right after the
     * entry URL and before anything discovery found. Map's `search` is a fuzzy match on
     * its own index: for razorpay.com, "about" returned docs pages titled "About Payment
     * Pages" and never `/about-us`, which the index did not hold at all.
     */
    seeds?: string[]
}

export interface ScrapeSiteResult {
    /** Pages that came back, in the order they were requested. */
    pages: ScrapeResult[]
    /** Every candidate URL discovery surfaced, before `maxPages` was applied. */
    discovered: MapLink[]
    /** URLs that were attempted but failed. */
    failedUrls: string[]
    /** True when at least one page failed but others succeeded. */
    degraded: boolean
    /** Discovered URLs that `filter` rejected; never scraped. */
    filteredUrls: string[]
}

/**
 * Find the URLs worth scraping.
 *
 * ## Why `prefer` runs a map PER TERM instead of filtering one big map
 *
 * The obvious implementation - map the site once, then sort the results so "about" and
 * "pricing" come first - does not work, and it fails silently, which is worse. A plain map
 * returns the site's own ordering, and for a marketing site that is overwhelmingly blog
 * posts. Measured against ramp.com: neither `/about-us` nor `/pricing` appeared in the first
 * 50 links, and raising the limit to 500 did not surface them either. Sorting cannot promote
 * a page that was never in the list, so `prefer` would have looked like it was working while
 * quietly handing back three customer stories.
 *
 * `map`'s own `search` parameter solves it exactly: `search: "pricing"` returned
 * `ramp.com/pricing` as the FIRST result, and `search: "about"` returned `ramp.com/about-us`
 * first. So when the caller says which sections matter, we ask Firecrawl for each one.
 *
 * Cost: one credit per preferred term, or one credit total when `prefer` is not set. That is
 * the price of actually landing on the right pages, and it is still a rounding error next to
 * the per-page scrape cost that follows.
 */
async function discover(
    apiKey: string,
    url: string,
    prefer: string[],
    maxPages: number,
    mapOptions?: Omit<MapOptions, 'timeoutMs'>,
): Promise<MapLink[]> {
    if (prefer.length === 0) {
        return map(apiKey, url, { limit: Math.max(maxPages * 5, 50), ...mapOptions })
    }

    // A single failed term must not sink the run - the others may still find what we need.
    const perTerm = await Promise.all(
        prefer.map((term) =>
            map(apiKey, url, { search: term, limit: 5, ...mapOptions }).catch(() => [] as MapLink[]),
        ),
    )

    // The entry URL first: a company's homepage is the single most useful page for saying
    // what it does, and it is not guaranteed to come back from a search for "about".
    const merged: MapLink[] = [{ url }]
    const seen = new Set([url.replace(/\/$/, '')])

    // ROUND-ROBIN across terms, not term-by-term. Taking every "about" hit before the first
    // "pricing" hit looks equivalent and is not: searching ramp.com for "about" returns
    // `/about-us` AND a community post at `.../email-all-users-about-ramp-updates`, so a
    // three-page budget was spent as homepage + about + forum-thread and never reached
    // /pricing at all. Someone who lists three sections wants all three covered, so each
    // term contributes its best hit before any term contributes its second.
    const depth = Math.max(0, ...perTerm.map((l) => l.length))
    for (let i = 0; i < depth; i++) {
        for (const links of perTerm) {
            const l = links[i]
            if (!l) continue
            const k = l.url.replace(/\/$/, '')
            if (seen.has(k)) continue
            seen.add(k)
            merged.push(l)
        }
    }
    return merged
}

/**
 * Read a site: map it, choose the most useful pages, scrape them.
 *
 * This is the primitive that replaces the pseudo-crawl at `enrich.ts:81`, where an Exa
 * semantic search with `includeDomains: [domain]` stood in for actually reading a company's
 * pages. That cost $0.007 a call, returned fuzzy matches and could not guarantee it had seen
 * the pricing page. This costs 1 credit to map plus 1 per page and is deterministic.
 *
 * Failure policy matches `exaFanOut`: every page failing THROWS (so the caller can refund and
 * show the real reason), a partial failure returns what came back with `degraded` set.
 */
export async function scrapeSite(apiKey: string, url: string, opts: ScrapeSiteOptions): Promise<ScrapeSiteResult> {
    const { maxPages, prefer, concurrency, mapOptions, filter, seeds, ...scrapeOpts } = opts

    const discovered = await discover(apiKey, url, prefer ?? [], maxPages, mapOptions)

    // Discovery can legitimately return nothing (a single-page site, or one with no sitemap
    // and no discoverable links). Falling back to the entry URL means a one-page site still
    // reads correctly instead of looking like a failure.
    const found = discovered.length ? discovered.map((l) => l.url) : [url]
    // The entry URL stays first, then the caller's seeds, then discovery's own order.
    const seen = new Set<string>()
    const all = [found[0]!, ...(seeds ?? []), ...found.slice(1)].filter((u) => {
        const k = u.replace(/\/$/, '')
        if (seen.has(k)) return false
        seen.add(k)
        return true
    })
    const filteredUrls = filter ? all.filter((u) => !filter(u)) : []
    const candidates = filter ? all.filter(filter) : all
    if (candidates.length === 0) {
        throw new FirecrawlError('unknown', `No page of ${url} could be read: every page found was filtered out.`)
    }
    // No re-ranking here. When `prefer` is set, discovery order IS the ranking: `discover`
    // already pinned the homepage and then round-robined each term's best hit. Sorting again
    // on substring matches would only undo that, and would promote any URL that happens to
    // contain a preference word over the page Firecrawl's own search ranked first.
    const targets = candidates.slice(0, Math.max(1, maxPages))

    const pages: ScrapeResult[] = []
    const failedUrls: string[] = []
    let firstError: unknown

    // A small worker pool rather than Promise.all: see DEFAULT_CONCURRENCY.
    const limit = Math.max(1, concurrency ?? DEFAULT_CONCURRENCY)
    let cursor = 0
    const results = new Array<ScrapeResult | undefined>(targets.length)

    async function worker(): Promise<void> {
        for (;;) {
            const i = cursor++
            if (i >= targets.length) return
            const target = targets[i]!
            try {
                results[i] = await scrape(apiKey, target, scrapeOpts)
            } catch (err) {
                failedUrls.push(target)
                if (firstError === undefined) firstError = err
            }
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, targets.length) }, worker))
    for (const r of results) if (r) pages.push(r)

    if (pages.length === 0) {
        throw firstError instanceof Error
            ? firstError
            : new FirecrawlError('network', `Could not read any page of ${url}.`)
    }

    return { pages, discovered, failedUrls, degraded: failedUrls.length > 0, filteredUrls }
}

// ─── account ─────────────────────────────────────────────────────────────────────

export interface CreditUsage {
    remainingCredits: number
    planCredits: number
    billingPeriodStart?: string
    billingPeriodEnd?: string
}

/**
 * Remaining credits on the account.
 *
 * NOTE: this endpoint is EVENTUALLY CONSISTENT - measured 10 to 30 seconds behind a call that
 * had already returned. It is fine for a dashboard, but do not gate a request on it and do not
 * benchmark against it without polling until the number stops moving.
 */
export async function creditUsage(apiKey: string): Promise<CreditUsage> {
    if (!apiKey) throw new FirecrawlError('unknown', 'Web page fetching is not configured (FIRECRAWL_API_KEY is not set).')
    const res = await fetch(`${BASE}/team/credit-usage`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(MAP_TIMEOUT_MS),
    }).catch((err: unknown) => {
        throw new FirecrawlError('network', 'Could not reach the web fetching service.', { cause: err })
    })
    if (!res.ok) throw classify(res.status, await res.text().catch(() => ''))
    const json = (await res.json()) as { data?: CreditUsage }
    if (!json.data) throw new FirecrawlError('unknown', 'Could not read the Firecrawl credit balance.')
    return json.data
}
