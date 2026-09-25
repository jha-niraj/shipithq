import { classifyError } from './classify';
import { kindToHttpStatus } from './kinds';
import type { ActionFailure } from './result';

/**
 * Turn any thrown value into an HTTP error envelope for route handlers, the
 * Cloudflare worker, and public-api. Mirrors ActionResult so a client can read
 * `kind`/`retryable` the same way whether it called a Server Action or an API.
 *
 * NOTE: re-throws Next.js redirect()/notFound() via classifyError (harmless in
 * the worker, where they never occur).
 */
export function toHttpError(err: unknown, ref?: string): {
    status: number;
    body: ActionFailure;
    headers: Record<string, string>;
} {
    const c = classifyError(err);
    const status = kindToHttpStatus(c.kind);
    const headers: Record<string, string> = {};
    // Give clients a hint for backoff on retryable throttling / unavailability.
    if (c.kind === 'ratelimit' || c.kind === 'network') headers['Retry-After'] = '2';
    console.error(`[http-error] ${status} kind=${c.kind}${ref ? ` ref=${ref}` : ''} :: ${c.devMessage}`);
    return {
        status,
        headers,
        body: {
            success: false,
            error: c.userMessage,
            kind: c.kind,
            retryable: c.retryable,
            ...(ref ? { ref } : {}),
            ...(c.fieldErrors ? { fieldErrors: c.fieldErrors } : {}),
        },
    };
}

/**
 * Convenience: a ready-to-return `Response` with JSON body + status + headers.
 * `Response` is a global in Cloudflare Workers, edge, and Node 18+.
 */
export function errorResponse(err: unknown, ref?: string): Response {
    const { status, body, headers } = toHttpError(err, ref);
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', ...headers },
    });
}
