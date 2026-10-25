/**
 * Next.js control-flow signals are thrown as errors ON PURPOSE. They are not failures - they are how
 * the App Router navigates and decides how to render. If any catch block, `classifyError()` or
 * `fail()` swallows one, the thing it was signalling silently stops working. Every error-handling
 * entry point MUST detect these first and re-throw.
 *
 * ## The signals, as Next 15.5 throws them (read from its source, 2026-10-09)
 *
 *   redirect() / permanentRedirect()   digest starts "NEXT_REDIRECT"
 *   notFound()                         digest "NEXT_HTTP_ERROR_FALLBACK;404"
 *   forbidden() / unauthorized()       digest "NEXT_HTTP_ERROR_FALLBACK;403" / ";401"
 *   headers()/cookies()/searchParams   digest "DYNAMIC_SERVER_USAGE" - "this route cannot be
 *     read during a static build              static; render it per request instead"
 *   useSearchParams() without Suspense digest "BAILOUT_TO_CLIENT_SIDE_RENDERING"
 *   prerender aborted mid-request      digest "HANGING_PROMISE_REJECTION"
 *   React postpone (PPR)               `$$typeof === Symbol.for('react.postpone')`
 *
 * ## Why this list grew (2026-10-09)
 *
 * It used to check only `NEXT_REDIRECT` and `NEXT_NOT_FOUND`. `NEXT_NOT_FOUND` is the NEXT 14 digest:
 * in Next 15 `notFound()` throws `NEXT_HTTP_ERROR_FALLBACK;404`, so a `notFound()` inside
 * `try { ... } catch (e) { return fail(e) }` was being swallowed and returned as a generic "unknown"
 * error instead of a 404. And `DYNAMIC_SERVER_USAGE` was not recognised at all, so every action that
 * read the session during `next build` logged `[action-error] kind=unknown :: Dynamic server usage`
 * for a signal that was never an error. This is the same set Next's own `unstable_rethrow` checks.
 *
 * ## Why string sniffing and not `unstable_rethrow` from next/navigation
 *
 * `@repo/errors` is used by the Cloudflare worker and the React Native app too, where `next` does not
 * exist. Matching on the digest needs no import, and outside Next it simply never matches.
 */
const EXACT_DIGESTS = new Set([
    'NEXT_NOT_FOUND', // Next 14's notFound(); kept so a downgrade or a stale build cannot regress this
    'DYNAMIC_SERVER_USAGE',
    'BAILOUT_TO_CLIENT_SIDE_RENDERING',
    'HANGING_PROMISE_REJECTION',
]);

const DIGEST_PREFIXES = ['NEXT_REDIRECT', 'NEXT_HTTP_ERROR_FALLBACK;'];

const REACT_POSTPONE = Symbol.for('react.postpone');

export function isNextControlFlow(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    if ((err as { $$typeof?: unknown }).$$typeof === REACT_POSTPONE) return true;
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest !== 'string') return false;
    return EXACT_DIGESTS.has(digest) || DIGEST_PREFIXES.some((p) => digest.startsWith(p));
}
