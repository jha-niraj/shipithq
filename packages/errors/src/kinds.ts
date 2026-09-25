/**
 * The single set of error categories every app in the monorepo uses.
 * Drives UI copy, icon, HTTP status, and whether a retry is offered.
 *
 * Keep this list small and stable - it is the contract between the server
 * (which classifies) and every client (web, React Native, worker) that renders.
 */
export type ErrorKind =
    | 'network'      // DB/API unreachable, timeout, fetch failed - RETRYABLE, calm "reconnecting"
    | 'auth'         // not authenticated / session expired - send to sign-in
    | 'forbidden'    // authenticated but not allowed (RBAC) - do NOT offer retry
    | 'notfound'     // resource missing
    | 'validation'   // bad user input (Zod / form) - show field-level message
    | 'conflict'     // version / unique conflict, already exists
    | 'ratelimit'    // too many requests - retryable after a delay
    | 'unknown';     // anything unclassified - generic, log for triage

/** Every kind, for exhaustive iteration in UIs and tests. */
export const ERROR_KINDS: readonly ErrorKind[] = [
    'network', 'auth', 'forbidden', 'notfound',
    'validation', 'conflict', 'ratelimit', 'unknown',
] as const;

/** Kinds where an immediate retry could plausibly succeed. */
export const RETRYABLE_KINDS: ReadonlySet<ErrorKind> = new Set<ErrorKind>([
    'network', 'ratelimit',
]);

/** Map a kind to an HTTP status code (used by worker / public-api / route handlers). */
export function kindToHttpStatus(kind: ErrorKind): number {
    switch (kind) {
        case 'auth': return 401;
        case 'forbidden': return 403;
        case 'notfound': return 404;
        case 'validation': return 422;
        case 'conflict': return 409;
        case 'ratelimit': return 429;
        case 'network': return 503;
        case 'unknown': return 500;
    }
}
