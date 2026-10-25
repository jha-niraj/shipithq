// Nepal Standard Time is UTC+5:45 (offset: 345 minutes).
// Using server local time (setHours) is wrong — the server runs UTC, so
// "midnight" on the server is not midnight in Nepal.
// All attendance date writes and comparisons must use Nepal-local dates.

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

/**
 * Returns the Nepal-local date string (YYYY-MM-DD) for a given UTC Date.
 * Defaults to now.
 */
export function toNepalDateStr(utc: Date = new Date()): string {
    const nepalTime = new Date(utc.getTime() + NEPAL_OFFSET_MS);
    return nepalTime.toISOString().split('T')[0]!;
}

/**
 * Returns the Nepal-local day-of-week (0=Sunday … 6=Saturday) for a given UTC Date.
 */
export function nepalDayOfWeek(utc: Date = new Date()): number {
    const nepalTime = new Date(utc.getTime() + NEPAL_OFFSET_MS);
    return nepalTime.getUTCDay();
}

/**
 * Returns true if the given YYYY-MM-DD date string is in the future relative to Nepal today.
 */
export function isNepalFutureDate(dateStr: string): boolean {
    return dateStr > toNepalDateStr();
}

/**
 * Returns 'YYYY-MM-DD' from a Date, ensuring Nepal-local date is used.
 * Alias for toNepalDateStr kept for readability at call sites that accept a Date.
 */
export function dateToNepalStr(d: Date): string {
    return toNepalDateStr(d);
}

/**
 * Returns the Nepal-local date string (YYYY-MM-DD) `days` before now.
 *
 * Added because three places in the student app were each re-deriving "N days ago in Nepal" from
 * the raw offset (`srs/student/08-study-plan-and-brain.md` defect 3). Three copies of the same
 * arithmetic drift; this is the one that does not.
 */
export function nepalDaysAgoStr(days: number, utc: Date = new Date()): string {
    return toNepalDateStr(new Date(utc.getTime() - days * 86_400_000));
}

/**
 * The UTC instant Nepal's civil day began.
 *
 * Nepal is UTC+05:45, and Workers run in UTC, so `new Date(y, m, d, 0, 0, 0)` on the server is
 * UTC midnight - 05:45 local. Every payment a school took before quarter to six in the morning was
 * bucketed into the previous day in "collected today", which is the first figure an accountant
 * checks. This returns the instant that actually starts their day.
 */
export function nepalDayStartUtc(utc: Date = new Date()): Date {
    const nepal = new Date(utc.getTime() + NEPAL_OFFSET_MS);
    const midnightNepalAsUtcClock = Date.UTC(
        nepal.getUTCFullYear(), nepal.getUTCMonth(), nepal.getUTCDate(), 0, 0, 0, 0,
    );
    return new Date(midnightNepalAsUtcClock - NEPAL_OFFSET_MS);
}
