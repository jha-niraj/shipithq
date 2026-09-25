import type { ErrorKind } from './kinds';

/**
 * The ONE place user-facing error copy lives. Keep every string here so it can
 * be translated later (i18n) without hunting through the codebase. These must be
 * calm, honest, and never leak internals (no SQL, no stack, no IDs).
 */
export const ERROR_TITLES: Record<ErrorKind, string> = {
    network: 'Connection problem',
    auth: 'Session expired',
    forbidden: 'No access',
    notfound: 'Not found',
    validation: 'Check your input',
    conflict: 'Conflict',
    ratelimit: 'Too many requests',
    unknown: 'Something went wrong',
};

export const ERROR_MESSAGES: Record<ErrorKind, string> = {
    network: "We couldn't reach the server for a moment. Reconnecting…",
    auth: 'Your session has expired. Please sign in again.',
    forbidden: "You don't have access to this.",
    notfound: 'That could not be found.',
    validation: 'Please review the highlighted fields and try again.',
    conflict: 'This was just changed elsewhere. Refresh and try again.',
    ratelimit: 'Too many requests. Please wait a moment and try again.',
    unknown: 'Something went wrong. Please try again.',
};

/** Default user-safe message for a kind. */
export function defaultMessage(kind: ErrorKind): string {
    return ERROR_MESSAGES[kind];
}
