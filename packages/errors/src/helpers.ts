import type { ActionResult } from './result';
import type { ErrorKind } from './kinds';
import { classifyError } from './classify';

/** Build a success result. */
export function ok<T>(data: T): ActionResult<T> {
    return { success: true, data };
}

/**
 * Build a failure result from ANY thrown value.
 *
 *   try { ... return ok(data) } catch (e) { return fail(e) }
 *
 * - Classifies the error (network/auth/forbidden/…), so the message is truthful
 *   and never a disguised infra blip.
 * - Logs the FULL dev detail (with an optional ref) - the dev message is NEVER
 *   returned to the client.
 * - Re-throws Next.js redirect()/notFound() automatically (via classifyError).
 *
 * `ref` is an optional correlation id you can surface to the user as an "Error
 * ID" and grep for in logs.
 */
export function fail(err: unknown, ref?: string): ActionResult<never> {
    const c = classifyError(err); // re-throws control-flow before we get here
    // Structured server-side log. Keep the dev message OUT of the response.
    console.error(`[action-error] kind=${c.kind} retryable=${c.retryable}${ref ? ` ref=${ref}` : ''} :: ${c.devMessage}`);
    return {
        success: false,
        error: c.userMessage,
        kind: c.kind,
        retryable: c.retryable,
        ...(ref ? { ref } : {}),
        ...(c.fieldErrors ? { fieldErrors: c.fieldErrors } : {}),
    };
}

/**
 * Build a failure result directly from a kind + message, without a thrown error.
 * Handy for early-return guards inside actions:
 *   if (!name) return failWith('validation', 'Name is required');
 */
export function failWith(
    kind: ErrorKind,
    message: string,
    opts?: { retryable?: boolean; ref?: string; fieldErrors?: Record<string, string> },
): ActionResult<never> {
    const retryable = opts?.retryable ?? (kind === 'network' || kind === 'ratelimit');
    return {
        success: false,
        error: message,
        kind,
        retryable,
        ...(opts?.ref ? { ref: opts.ref } : {}),
        ...(opts?.fieldErrors ? { fieldErrors: opts.fieldErrors } : {}),
    };
}
