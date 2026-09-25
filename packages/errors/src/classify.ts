import type { ErrorKind } from './kinds';
import { AppError } from './app-error';
import { isNextControlFlow } from './next';
import { defaultMessage } from './messages';

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
// packages/db/src/retry.ts (isTransientDbError, incl. the Neon Pool/WebSocket
// ErrorEvent shape) and apps/main error boundaries. If you find another copy
// anywhere, delete it and call this. `packages/db` delegates to this.
const TRANSIENT_CODES: ReadonlySet<string> = new Set([
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_SOCKET',
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'EAI_AGAIN',
    'ENOTFOUND',
    'EPIPE',
]);

const TRANSIENT_MESSAGE_HINTS: readonly string[] = [
    'fetch failed',
    'terminated',
    'other side closed',
    'connection terminated',
    'socket hang up',
    'connect timeout',
    'error connecting to database',
    'websocket',
    'failed query',
    'neondberror',
    'connect to the database',
    'connecting to database',
    'control plane',
    'too many database connection',
    'failed to get session',
    'network request failed', // React Native fetch
    'timeout',
];

export function isTransient(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    // Neon's WebSocket Pool driver reports connection drops as a DOM-style
    // ErrorEvent carried in `cause` (type "error"); the real code/message live on
    // the nested `error`. Such events are always pre-response connection failures.
    const e = err as {
        name?: string;
        message?: string;
        code?: string;
        cause?: { code?: string; message?: string; type?: string; error?: { code?: string; message?: string } };
    };

    if (e.name === 'AbortError') return true;
    if (e.cause?.type === 'error') return true;

    const msg = `${e.message ?? ''} ${e.cause?.message ?? ''} ${e.cause?.error?.message ?? ''}`.toLowerCase();
    if (TRANSIENT_MESSAGE_HINTS.some(h => msg.includes(h))) return true;

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
export function classifyError(err: unknown): ClassifiedError {
    // 1. Control-flow signals must propagate untouched.
    if (isNextControlFlow(err)) throw err;

    const devMessage = err instanceof Error ? (err.stack ?? err.message) : String(err);

    // 2. Deliberate domain error.
    if (err instanceof AppError) {
        return {
            kind: err.kind,
            retryable: err.retryable,
            userMessage: err.userMessage,
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
