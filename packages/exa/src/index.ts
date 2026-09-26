/**
 * The one Exa client. Used by `apps/main` and `apps/worker`, which each bind their own
 * key source and re-export from `lib/sales/exa.ts` and `src/lib/exa.ts`.
 *
 * ## Why this is a package and not two files
 *
 * There used to be two hand-rolled clients, and the worker's was a reduced copy that had
 * quietly drifted: it never grew `includeDomains`, `excludeDomains` or `category`. Both
 * were a bare `fetch` with no timeout, so a hung Exa call hung the request that made it,
 * and neither could tell a 429 apart from a 400. Fixing that twice is how they drifted in
 * the first place, so it now lives once. `srs/sales-marketing-engine/marketing-engine.md:434`
 * flagged the duplication as an open question; this closes it.
 *
 * ## The key is always an argument
 *
 * `apps/main` reads `process.env`, the worker reads a Cloudflare `env` binding, and neither
 * is reachable from the other. Taking the key as the first parameter is what lets one
 * implementation serve both. The app-side wrapper is what keeps `isExaConfigured()`.
 */

import { AppError } from '@repo/errors'

const ENDPOINT = 'https://api.exa.ai/search'

/**
 * 20s. Measured p50 for search-with-contents is under 3s, but the fan-outs ask for up to
 * 8 results with full page text and Exa fetches some of those live. 20s matches the
 * long-running third-party calls already in the codebase (`comms/search.ts`, `github-app.ts`)
 * and is still far below any request timeout, so a stuck call fails us instead of hanging.
 */
const DEFAULT_TIMEOUT_MS = 20_000

const MAX_ATTEMPTS = 3
/** 250ms, then 500ms. Same shape as `withDbRetry` so it reads familiar. */
const BACKOFF_MS = [250, 500]
/**
 * Exa may ask for a longer wait than we are willing to hold a request open for. Honour
 * `Retry-After` up to this, then give up and let the caller decide - blocking a user's
 * research run for two minutes is worse than telling them to try again.
 */
const MAX_RETRY_AFTER_MS = 10_000

export interface ExaResult {
    url: string
    title: string
    text: string
    summary: string
}

export interface ExaSearchOptions {
    summaryQuery?: string
    maxChars?: number
    /**
     * Restrict results to these domains only (e.g. `[companyDomain]` to research ONE company,
     * or the social domains to find its LinkedIn/Twitter). This is what keeps a URL lookup
     * on-target instead of returning loosely-related sites.
     */
    includeDomains?: string[]
    excludeDomains?: string[]
    /** Exa content category hint ("company", "linkedin profile", "tweet", ...). */
    category?: string
    /** Override the request timeout. Callers should almost never need this. */
    timeoutMs?: number
}

/**
 * An Exa call that failed in a way the caller may want to branch on.
 *
 * It extends `AppError` so it classifies like everything else: `ratelimit` and `network`
 * are retryable and render calm "try again" copy, while a misconfigured key is deliberately
 * NOT `auth` - that kind sends the user to the sign-in page, and a bad server-side API key
 * is our problem, not their session.
 */
export class ExaError extends AppError {
    /** HTTP status, or undefined when the request never got a response (timeout, DNS, socket). */
    readonly status?: number

    constructor(kind: 'ratelimit' | 'network' | 'unknown', userMessage: string, opts?: { status?: number; cause?: unknown }) {
        super(kind, userMessage, { cause: opts?.cause })
        this.name = 'ExaError'
        this.status = opts?.status
    }
}

export function isExaError(err: unknown): err is ExaError {
    return err instanceof ExaError
}

/** 429 and 5xx are worth another go. Everything else in the 4xx range is our bug. */
function isRetryableStatus(status: number): boolean {
    return status === 429 || (status >= 500 && status <= 599)
}

/**
 * A request that never produced a response: `AbortSignal.timeout` fires a `TimeoutError`
 * DOMException, and DNS/socket failures surface as a TypeError from fetch. Both are worth
 * retrying, and neither can have half-applied anything, because Exa only reads.
 */
function isRetryableNetworkError(err: unknown): boolean {
    if (isExaError(err)) return false // already classified, do not double-handle
    if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) return true
    return err instanceof TypeError
}

/** `Retry-After` is either delta-seconds or an HTTP date. Accept both, clamp the result. */
function retryAfterMs(res: Response): number | null {
    const raw = res.headers.get('retry-after')
    if (!raw) return null
    const secs = Number(raw)
    const ms = Number.isFinite(secs) ? secs * 1000 : Date.parse(raw) - Date.now()
    if (!Number.isFinite(ms) || ms <= 0) return null
    return Math.min(ms, MAX_RETRY_AFTER_MS)
}

function classify(status: number, body: string): ExaError {
    const detail = body ? `: ${body.slice(0, 200)}` : ''
    if (status === 429) {
        return new ExaError('ratelimit', 'Web search is rate limited right now. Try again in a moment.', { status })
    }
    if (status >= 500) {
        return new ExaError('network', 'Web search is temporarily unavailable. Try again in a moment.', { status, cause: detail })
    }
    if (status === 401 || status === 403) {
        // Deliberately not `auth` - see the ExaError doc comment.
        return new ExaError('unknown', 'Web search is not configured correctly (the Exa API key was rejected).', { status, cause: detail })
    }
    return new ExaError('unknown', `Web search rejected the request (${status}).`, { status, cause: detail })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * One Exa `/search` call with inline `contents`, so a single request returns candidate URLs
 * plus page text and an LLM summary.
 *
 * Retries 429, 5xx and connection failures up to 3 attempts with backoff. Every read is
 * idempotent, so a retry cannot double-apply anything - but note Exa BILLS each attempt,
 * which is why the attempt count is small and 4xx never retries.
 */
export async function exaSearch(
    apiKey: string,
    query: string,
    numResults: number,
    opts?: ExaSearchOptions,
): Promise<ExaResult[]> {
    if (!apiKey) throw new ExaError('unknown', 'Web search is not configured (EXA_API_KEY is not set).')

    const body: Record<string, unknown> = {
        query,
        numResults: Math.min(Math.max(numResults, 1), 100),
        type: 'auto',
        contents: {
            text: { maxCharacters: opts?.maxChars ?? 1200 },
            summary: { query: opts?.summaryQuery ?? SUMMARY_QUERY },
        },
    }
    if (opts?.includeDomains?.length) body.includeDomains = opts.includeDomains
    if (opts?.excludeDomains?.length) body.excludeDomains = opts.excludeDomains
    if (opts?.category) body.category = opts.category

    const payload = JSON.stringify(body)
    let lastErr: unknown

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        let res: Response
        try {
            res = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                body: payload,
                signal: AbortSignal.timeout(opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS),
            })
        } catch (err) {
            lastErr = err
            if (attempt === MAX_ATTEMPTS || !isRetryableNetworkError(err)) {
                throw new ExaError('network', 'Could not reach web search. Check the connection and try again.', { cause: err })
            }
            await sleep(BACKOFF_MS[attempt - 1] ?? 1000)
            continue
        }

        if (!res.ok) {
            const text = await res.text().catch(() => '')
            const err = classify(res.status, text)
            if (attempt === MAX_ATTEMPTS || !isRetryableStatus(res.status)) throw err
            lastErr = err
            await sleep(retryAfterMs(res) ?? BACKOFF_MS[attempt - 1] ?? 1000)
            continue
        }

        const data = (await res.json()) as {
            results?: { url?: string; title?: string; text?: string; summary?: string }[]
        }
        return (data.results ?? [])
            .filter((r) => r.url)
            .map((r) => ({
                url: r.url as string,
                title: r.title ?? '',
                text: r.text ?? '',
                summary: r.summary ?? '',
            }))
    }

    // Unreachable: the loop either returns or throws. Kept so the type is honest.
    throw lastErr instanceof Error ? lastErr : new ExaError('network', 'Web search failed.')
}

export const SUMMARY_QUERY =
    'In 2-3 sentences: what this company does, its industry, rough size/stage, location/country, and the name + title of a likely decision maker (founder, CEO, or relevant head) if visible.'

// ─── fan-out ─────────────────────────────────────────────────────────────────────

export interface ExaFanOutBatch<T> {
    item: T
    results: ExaResult[]
}

export interface ExaFanOut<T> {
    /** Only the sub-queries that came back. A failed one contributes nothing. */
    batches: ExaFanOutBatch<T>[]
    /** True when at least one sub-query failed but others succeeded. */
    degraded: boolean
    failed: number
    total: number
}

/**
 * Run several Exa searches in parallel and decide what a partial failure means.
 *
 * ## The bug this exists to kill
 *
 * Every fan-out used to end in `.catch(() => ({ q, rs: [] }))`. That turns a 429 into "no
 * results", which downstream reads as "this topic has nothing on the web" and refunds the
 * user with the message "Check EXA_API_KEY" - wrong on both counts, and it hid every
 * rate-limit we ever hit. Worse, if seven of eight sub-queries succeeded the run was
 * presented as complete while being quietly a fraction of the research that was paid for.
 *
 * ## The rule
 *
 *  - every sub-query failed  -> THROW the first error, so the caller refunds AND the user
 *    reads the real reason ("rate limited", not "check your key")
 *  - some failed             -> return what came back, with `degraded` set so the caller can
 *    say so rather than passing it off as a full run
 *  - none failed             -> exactly as before
 *
 * An empty input list is not a failure; it returns an empty, non-degraded result.
 *
 * Concurrency is deliberately uncapped: retry with backoff already absorbs a self-inflicted
 * 429, and serialising the fan-out would slow the single slowest thing the product does.
 */
export async function exaFanOut<T>(
    items: T[],
    run: (item: T) => Promise<ExaResult[]>,
): Promise<ExaFanOut<T>> {
    if (items.length === 0) return { batches: [], degraded: false, failed: 0, total: 0 }

    const settled = await Promise.all(
        items.map((item) =>
            run(item).then(
                (results) => ({ ok: true as const, item, results }),
                (error: unknown) => ({ ok: false as const, item, error }),
            ),
        ),
    )

    const batches: ExaFanOutBatch<T>[] = []
    let firstError: unknown
    let failed = 0
    for (const s of settled) {
        if (s.ok) batches.push({ item: s.item, results: s.results })
        else {
            failed++
            if (firstError === undefined) firstError = s.error
        }
    }

    if (failed === items.length) {
        throw firstError instanceof Error
            ? firstError
            : new ExaError('network', 'Web search failed for every query in this run.')
    }

    return { batches, degraded: failed > 0, failed, total: items.length }
}

// ─── url helpers (shared: both clients had their own copy of domainOf) ────────────

/** Best-effort domain extraction for dedupe + email-guess. */
export function domainOf(url: string): string | null {
    try {
        const h = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
        return h || null
    } catch {
        return null
    }
}

/**
 * Treat the rep's input as a company domain when it looks like one - including bare
 * domains ("gurukulhq.com") that `new URL()` rejects without a protocol. Returns the
 * hostname if the input is (or contains) a URL/domain, otherwise null (it's a name).
 */
export function toCompanyDomain(input: string): string | null {
    let s = input.trim()
    if (!s || s.includes(' ')) return null
    if (!/^https?:\/\//i.test(s)) {
        // Bare domain or domain/path - accept only if it has a real TLD.
        if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(\/.*)?$/i.test(s)) return null
        s = `https://${s}`
    }
    return domainOf(s)
}

// Social/company-profile hosts we try to surface for a researched company.
export const SOCIAL_DOMAINS = [
    'linkedin.com', 'twitter.com', 'x.com', 'crunchbase.com',
    'facebook.com', 'instagram.com', 'github.com', 'youtube.com',
]

/** Map a social URL to a human platform label, or null if it isn't a known social host. */
export function socialPlatformOf(url: string): string | null {
    const d = domainOf(url)
    if (!d) return null
    if (d.endsWith('linkedin.com')) return 'LinkedIn'
    if (d.endsWith('twitter.com') || d.endsWith('x.com')) return 'X / Twitter'
    if (d.endsWith('crunchbase.com')) return 'Crunchbase'
    if (d.endsWith('facebook.com')) return 'Facebook'
    if (d.endsWith('instagram.com')) return 'Instagram'
    if (d.endsWith('github.com')) return 'GitHub'
    if (d.endsWith('youtube.com')) return 'YouTube'
    return null
}

// ─── contents ────────────────────────────────────────────────────────────────────

/**
 * One page's text from Exa's `/contents`, live-crawled, or null. Best-effort: any
 * failure is null, never a throw, because a caller uses this as a fallback after
 * another reader and has its own "we couldn't read it" path (plan/job-import JI-3).
 */
export async function exaContents(apiKey: string, url: string, opts?: { livecrawlTimeoutMs?: number; timeoutMs?: number }): Promise<{ text: string; title: string } | null> {
    if (!apiKey) return null
    try {
        const res = await fetch('https://api.exa.ai/contents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
            body: JSON.stringify({ urls: [url], text: true, livecrawlTimeout: opts?.livecrawlTimeoutMs ?? 10_000 }),
            signal: AbortSignal.timeout(opts?.timeoutMs ?? 20_000),
        })
        if (!res.ok) return null
        const data = (await res.json()) as { results?: Array<{ text?: string; title?: string }> }
        const first = data.results?.[0]
        const text = first?.text?.trim() ?? ''
        return text ? { text, title: first?.title ?? '' } : null
    } catch {
        return null
    }
}
