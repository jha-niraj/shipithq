import type { ErrorKind } from './kinds';
import { defaultMessage } from './messages';

/**
 * THE ONE RESPONSE TYPE.
 *
 * Every server action, route handler, and API in every app returns this and
 * nothing else. It replaces admin's `AdminResponse<T>` and main/student's
 * ad-hoc `{ success, error }`.
 *
 *   - on success: `data` carries the payload.
 *   - on failure: `error` is the USER-SAFE message (already friendly - safe to
 *     display directly), `kind` categorizes it, `retryable` says whether a retry
 *     could help, and `ref` is an optional correlation id for support ("Error
 *     ID"). Never put raw SQL / stack / PII in `error`.
 *
 * `fieldErrors` is an optional, additive extension used only by `validation`
 * failures so forms can show messages next to the offending fields.
 *
 * MIGRATION NOTE: `kind` and `retryable` are optional so the ~200 existing
 * `{ success: false, error }` literals keep compiling during the incremental
 * rollout. ALWAYS construct failures via `fail()` / `failWith()` - those set
 * `kind` and `retryable` for you. Consumers must treat a missing `kind` as
 * `'unknown'` and a missing `retryable` as `false` (the UI helpers do this).
 * The end state is that every failure flows through the helpers and carries both.
 */
// The `?: never` phantom fields let existing call sites read `.error`/`.data`
// without exhaustive narrowing (as `AdminResponse<T>` allowed before), so the
// incremental migration doesn't require touching every consumer at once.
export type ActionResult<T> =
    | {
        success: true;
        data: T;
        error?: never;
        kind?: never;
        retryable?: never;
        ref?: never;
        fieldErrors?: never;
    }
    | {
        success: false;
        error?: string;
        kind?: ErrorKind;
        retryable?: boolean;
        ref?: string;
        fieldErrors?: Record<string, string>;
        data?: never;
    };

/** Convenience alias for actions that return nothing meaningful on success. */
export type ActionOk = ActionResult<null>;

/** The failure half of ActionResult, for helpers that only accept failures. */
export type ActionFailure = Extract<ActionResult<unknown>, { success: false }>;

/** Narrowing helper. */
export function isFailure<T>(r: ActionResult<T>): r is ActionFailure {
    return r.success === false;
}

/** Read the kind off a failure, defaulting to 'unknown' for un-migrated literals. */
export function failureKind(r: ActionFailure): ErrorKind {
    return r.kind ?? 'unknown';
}

/** Read retryability off a failure, defaulting to false for un-migrated literals. */
export function failureRetryable(r: ActionFailure): boolean {
    return r.retryable ?? false;
}

/**
 * Read a user-safe message off a failure. Falls back to the kind's default copy
 * so a failure that somehow has no `error` string never renders as blank/undefined.
 * (Requires messages import - see below.)
 */
export function failureMessage(r: ActionFailure): string {
    if (r.error && r.error.trim()) return r.error;
    return defaultMessage(r.kind ?? 'unknown');
}
