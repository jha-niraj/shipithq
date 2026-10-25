/**
 * A short-lived note that the database provider is refusing queries on quota.
 *
 * ## Why a signal and not just error inspection
 *
 * The 402 is only legible at ONE point in the stack: the raw HTTP response inside the Neon
 * fetch wrapper. By the time it reaches an action's catch block it has been through
 *
 *     NeonDbError -> drizzle "Failed query: ..." -> better-auth APIError
 *
 * and better-auth does not chain: it catches the failure, logs it, and throws a FRESH
 * `APIError('Failed to get session')` carrying `statusCode: 500` and no `cause`. Every trace
 * of the 402 is gone. Walking `err.cause` finds nothing, and the generic "failed query" hint
 * then classifies a spent quota as a momentary blip - "Reconnecting...", with a Retry button,
 * for a condition no retry can clear.
 *
 * So the observation is recorded where it is still true, and read back where the decision is
 * made. This is deliberately a hint, not a source of truth:
 *
 *   - Module state is per process (per isolate on Workers), so it is best-effort. A process
 *     that has not yet seen a 402 classifies the first failure the old way. In practice the
 *     mark is set on the very same request that later fails, because the fetch wrapper runs
 *     before anything unwinds.
 *   - It only ever DOWNGRADES a would-be `network` verdict to `quota`. It cannot invent an
 *     error, and it cannot make a healthy request fail.
 *   - It expires, and any successful query clears it, so recovery needs no restart.
 */

/** Long enough to cover a burst of failing requests, short enough to self-heal. */
const TTL_MS = 60_000;

let exhaustedAt = 0;

/** Called by the DB layer the moment a provider returns a quota refusal. */
export function noteQuotaExhausted(): void {
    exhaustedAt = Date.now();
}

/** Called by the DB layer on any successful response - the quota is evidently back. */
export function clearQuotaSignal(): void {
    exhaustedAt = 0;
}

/** True if a quota refusal was seen recently enough to explain the error in hand. */
export function quotaExhaustedRecently(): boolean {
    return exhaustedAt !== 0 && Date.now() - exhaustedAt < TTL_MS;
}
