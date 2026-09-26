import { and, sql } from "drizzle-orm"
import type { NeonHttpDatabase } from "drizzle-orm/neon-http"
import { hiringSends } from "./schema/hiring-rounds"

/*
 * Removing expired send data (plan/hiring-rounds HR-21, overview "Retention"):
 * a withdrawn or declined send's snapshot and profile go after `purgeAfter`
 * (90 days). No client import, so the worker's daily cron can run it with its
 * own database; `pnpm script send-purge` runs it by hand.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = NeonHttpDatabase<any>

/** What a purged send keeps: its row (status, dates, outcomes), none of the student's data. */
export const PURGED = { purged: true } as const

export const notPurged = sql`coalesce(${hiringSends.snapshot}->>'purged', '') <> 'true'`

/** Sends past their purge date that still hold data. */
export async function sendsDueForPurge(ex: AnyDb) {
    return ex.select({ id: hiringSends.id, status: hiringSends.status, purgeAfter: hiringSends.purgeAfter })
        .from(hiringSends)
        .where(and(sql`${hiringSends.purgeAfter} < now()`, notPurged))
}

/** Remove the snapshot and profile from every send past its purge date. Returns how many. */
export async function purgeExpiredSends(ex: AnyDb): Promise<number> {
    const done = await ex.update(hiringSends)
        .set({ snapshot: PURGED, profile: PURGED })
        .where(and(sql`${hiringSends.purgeAfter} < now()`, notPurged))
        .returning({ id: hiringSends.id })
    return done.length
}
