import type { ErrorKind } from './kinds';
import { AppError } from './app-error';
import { isNextControlFlow } from './next';
import { defaultMessage } from './messages';
import { quotaExhaustedRecently } from './quota-signal';

export interface ClassifiedError {
    kind: ErrorKind;
    retryable: boolean;
    /** Safe to display to the user. */
    userMessage: string;
    /** Full detail for logs ONLY - may contain SQL/stack. Never render this. */
    devMessage: string;
    /** Field-level messages for `validation` failures (optional). */
    fieldErrors?: Record<string, string>;
}

// ── Transient / connection-level detection ──────────────────────────────────────
// The single home for this heuristic. It merges what used to live in
// packages/db/src/client.ts (TRANSIENT_CODES) and apps/main/app/(main)/error.tsx
// (isTransientDbError). If you find another copy anywhere, delete it and call this.
const TRANSIENT_CODES: ReadonlySet<string> = new Set([
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_SOCKET',
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'EAI_AGAIN',
    // kept for shipithq apps - Neon WebSocket Pool driver connection drops
    'ENOTFOUND',
    'EPIPE',
]);

const TRANSIENT_MESSAGE_HINTS: readonly string[] = [
    'fetch failed',
    'terminated',
    'failed query',
    'neondberror',
    'connect to the database',
    'connecting to database',
    'control plane',
    'too many database connection',
    'failed to get session',
    'network request failed', // React Native fetch
    'timeout',
    // kept for shipithq apps - Neon WebSocket Pool driver messages
    'other side closed',
    'connection terminated',
    'socket hang up',
    'connect timeout',
    'error connecting to database',
    'websocket',
];

/**
 * SQLSTATE classes that are DETERMINISTIC - the same query will fail the same way forever.
 *   22 = data exception (bad cast, numeric overflow)
 *   23 = integrity constraint violation (unique, FK, not-null, check)
 *   42 = syntax error or access rule violation (undefined column, datatype mismatch)
 * These are code bugs, never infrastructure. Retrying them is pointless and reporting them as
 * "we couldn't reach the server" hides real defects - which is exactly how a bill-status enum
 * mismatch masqueraded as a network blip.
 */
const DETERMINISTIC_SQLSTATE = /^(22|23|42)/;

/**
 * A hard provider limit that a retry can never clear.
 *
 * These have to be recognised BEFORE the transient check, because they arrive wearing a
 * transient error's clothes. Neon returns HTTP 402 for an exhausted compute quota, drizzle
 * wraps it as "Failed query: select ..." - which matches TRANSIENT_MESSAGE_HINTS - and the
 * body even carries `"neon:retryable": true`, meaning "this request never reached a
 * connection", not "this will work if you try again".
 *
 * Classified as transient, an exhausted quota renders as "Reconnecting..." with a Retry
 * button, forever, while the real cause sits in a server log. It is the same failure the
 * DETERMINISTIC_SQLSTATE comment above describes: a permanent condition disguised as a blip.
 */
const QUOTA_MESSAGE_HINTS: readonly string[] = [
    'exceeded the compute time quota',
    'exceeded the data transfer quota',
    'exceeded the logical size quota',
    'quota exceeded',
    'upgrade your plan',
];

function isQuotaExhausted(err: unknown): boolean {
    // Walk the whole `cause` chain, not one link. The real chain here is three deep -
    // better-auth's APIError -> drizzle's "Failed query: ..." -> NeonDbError carrying
    // "Server error (HTTP status 402)" - so checking only `err.cause` misses it.
    // Bounded, because a cyclic `cause` is not worth hanging a request over.
    let node: unknown = err;
    for (let depth = 0; node && typeof node === 'object' && depth < 5; depth++) {
        const e = node as { message?: string; status?: number; statusCode?: number; cause?: unknown };
        // 402 is unambiguous: nothing else in this stack issues a Payment Required.
        if (e.status === 402 || e.statusCode === 402) return true;
        const msg = (e.message ?? '').toLowerCase();
        if (QUOTA_MESSAGE_HINTS.some((h) => msg.includes(h))) return true;
        node = e.cause;
    }
    return false;
}



export function isTransient(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const e = err as {
        name?: string;
        message?: string;
        code?: string;
        cause?: { code?: string; message?: string; type?: string; error?: { code?: string; message?: string } };
    };

    if (e.name === 'AbortError') return true;

    // A spent quota is permanent until someone changes a billing plan. Checked first so the
    // "failed query" / "neondberror" hints below cannot claim it as a momentary blip and put
    // a Retry button on a condition no amount of retrying resolves.
    if (isQuotaExhausted(err)) return false;

    // Postgres attaches a SQLSTATE to every server-side error. Check it BEFORE the message hints:
    // drizzle wraps EVERY failure - including deterministic ones - in "Failed query: ...", and
    // neon throws NeonDbError for those too, so the message alone cannot tell a dead connection
    // apart from a broken query. The code can, so it wins.
    const sqlState = e.code ?? e.cause?.code;
    if (typeof sqlState === 'string' && DETERMINISTIC_SQLSTATE.test(sqlState)) return false;

    const msg = (e.message ?? '').toLowerCase();
    if (TRANSIENT_MESSAGE_HINTS.some(h => msg.includes(h))) return true;

    // kept for shipithq apps - Neon's WebSocket Pool driver reports connection drops as a DOM-style
    // ErrorEvent carried in `cause` (type "error"); the real code/message live on the nested `error`.
    if (e.cause?.type === 'error') return true;

    const causeMsg = `${e.cause?.message ?? ''} ${e.cause?.error?.message ?? ''}`.trim().toLowerCase();
    if (causeMsg && TRANSIENT_MESSAGE_HINTS.some(h => causeMsg.includes(h))) return true;

    const code = e.code ?? e.cause?.code ?? e.cause?.error?.code;
    return code !== undefined && TRANSIENT_CODES.has(code);
}

// ── Helpers for known library error shapes ──────────────────────────────────────

function readHttpStatus(err: unknown): number | undefined {
    if (!err || typeof err !== 'object') return undefined;
    const e = err as { status?: unknown; statusCode?: unknown; response?: { status?: unknown } };
    for (const v of [e.status, e.statusCode, e.response?.status]) {
        if (typeof v === 'number' && v >= 100 && v <= 599) return v;
    }
    return undefined;
}

function statusToKind(status: number): ErrorKind | undefined {
    if (status === 401) return 'auth';
    if (status === 403) return 'forbidden';
    if (status === 404) return 'notfound';
    if (status === 409) return 'conflict';
    if (status === 422) return 'validation';
    if (status === 429) return 'ratelimit';
    if (status === 408 || status === 503 || status === 504) return 'network';
    return undefined;
}

/** Zod errors expose `.issues: [{ path, message }]` and name === 'ZodError'. */
function readZodFieldErrors(err: unknown): Record<string, string> | undefined {
    if (!err || typeof err !== 'object') return undefined;
    const e = err as { name?: string; issues?: Array<{ path?: unknown[]; message?: string }> };
    if (e.name !== 'ZodError' || !Array.isArray(e.issues)) return undefined;
    const out: Record<string, string> = {};
    for (const issue of e.issues) {
        const key = Array.isArray(issue.path) && issue.path.length ? issue.path.join('.') : '_';
        if (issue.message && !out[key]) out[key] = issue.message;
    }
    return Object.keys(out).length ? out : undefined;
}

/**
 * Classify ANY thrown value into a stable shape.
 *
 * ORDER MATTERS:
 *   1. Re-throw Next.js control-flow (redirect/notFound) - never swallow.
 *   2. AppError - the deliberate, already-classified case.
 *   3. Transient/network - so an infra blip is NEVER mislabeled as a domain error.
 *   4. Known shapes (Zod, HTTP status).
 *   5. Fallback to `unknown`.
 */
/** The AppError itself, or one a driver wrapped (`cause` / Neon's `sourceError`), bounded. */
function findWrappedAppError(err: unknown): AppError | null {
    let node: unknown = err;
    for (let i = 0; i < 6 && node; i++) {
        if (node instanceof AppError) return node;
        const e = node as { cause?: unknown; sourceError?: unknown };
        node = e.cause ?? e.sourceError;
    }
    return null;
}

export function classifyError(err: unknown): ClassifiedError {
    // 1. Control-flow signals must propagate untouched.
    if (isNextControlFlow(err)) throw err;

    const devMessage = err instanceof Error ? (err.stack ?? err.message) : String(err);

    // 2. Deliberate domain error - also when a driver has wrapped it. The read-only gate for support
    //    impersonation throws an AppError from inside the Neon fetch, and arrives here as
    //    DrizzleQueryError -> (cause) NeonDbError -> (sourceError) AppError. Without this walk the
    //    "Failed query" wrapper reads as a network blip and the person is told to retry.
    const appError = findWrappedAppError(err);
    if (appError) {
        return {
            kind: appError.kind,
            retryable: appError.retryable,
            userMessage: appError.userMessage,
            devMessage,
        };
    }

    // 2b. Provider quota exhausted. Must precede the transient branch: these carry the
    //     same "Failed query" wrapper a real connection blip does, and offering a retry
    //     for one is a promise the system cannot keep.
    // The second arm is the one that catches the real case: better-auth severs the cause
    // chain, so the error in hand has NO trace of the 402 - but the DB layer saw it moments
    // ago on this very request. Gated on isTransient so this can only ever reclassify a
    // would-be "network" verdict, never touch a validation or forbidden error.
    if (isQuotaExhausted(err) || (quotaExhaustedRecently() && isTransient(err))) {
        return {
            kind: 'quota',
            retryable: false,
            userMessage: defaultMessage('quota'),
            devMessage,
        };
    }

    // 3. Transient / connection-level - highest priority among "real" errors so a
    //    DB timeout can never be disguised as "Not authorized" / "Failed to load".
    if (isTransient(err)) {
        return {
            kind: 'network',
            retryable: true,
            userMessage: defaultMessage('network'),
            devMessage,
        };
    }

    // 4a. Zod validation.
    const fieldErrors = readZodFieldErrors(err);
    if (fieldErrors) {
        return {
            kind: 'validation',
            retryable: false,
            userMessage: defaultMessage('validation'),
            devMessage,
            fieldErrors,
        };
    }

    // 4b. HTTP status carried on the error (fetch wrappers, Better Auth, etc.).
    const status = readHttpStatus(err);
    if (status !== undefined) {
        const kind = statusToKind(status);
        if (kind) {
            return {
                kind,
                retryable: kind === 'network' || kind === 'ratelimit',
                userMessage: defaultMessage(kind),
                devMessage,
            };
        }
    }

    // 5. Fallback.
    return {
        kind: 'unknown',
        retryable: false,
        userMessage: defaultMessage('unknown'),
        devMessage,
    };
}
