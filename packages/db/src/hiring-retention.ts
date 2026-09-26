import { and, eq, inArray, isNull, like, sql } from "drizzle-orm"
import { PURGED } from "./hiring-purge"
import { db } from "./client"
import { hiringSends } from "./schema/hiring-rounds"
import { messageThreads } from "./schema/messages"
import { notifications } from "./schema/schema"
import { notifyCompany } from "./notify"

/*
 * Keeping a student's results only as long as the rules allow (plan/hiring-
 * rounds HR-21, overview "Retention"):
 * - expired sends are purged by ./hiring-purge.ts (the worker's daily cron);
 * - deleting an account withdraws every send and removes its data at once, and
 *   the company's threads say "account deleted".
 *
 * Every function takes the database so the worker can pass its own client.
 */

type Db = typeof db

/**
 * Before an account is deleted: withdraw every live send and remove every send's
 * data now, close the threads with "account deleted", take the "sent results"
 * notices out of the companies' inboxes, and tell each company.
 */
export async function removeStudentHiringData(userId: string, studentName: string, ex: Db = db): Promise<{ sends: number; threads: number }> {
    const sends = await ex.select({ id: hiringSends.id, companyId: hiringSends.companyId, status: hiringSends.status }).from(hiringSends).where(eq(hiringSends.userId, userId))
    if (sends.length) {
        await ex.update(hiringSends).set({
            status: sql`case when ${hiringSends.status} in ('SENT', 'VIEWED', 'INVITED') then 'WITHDRAWN'::hiring_send_status else ${hiringSends.status} end`,
            snapshot: PURGED,
            profile: PURGED,
            purgeAfter: sql`now()`,
        }).where(inArray(hiringSends.id, sends.map((s) => s.id)))
        for (const s of sends) {
            await ex.delete(notifications).where(and(eq(notifications.kind, "SEND_RECEIVED"), like(notifications.actionUrl, `%send=${s.id}`)))
        }
        const live = sends.filter((s) => ["SENT", "VIEWED", "INVITED"].includes(s.status))
        for (const companyId of [...new Set(live.map((s) => s.companyId))]) {
            await notifyCompany(companyId, "view_candidates", {
                kind: "SEND_WITHDRAWN",
                title: "deleted their account",
                body: "Their results were removed. Any conversation is kept for your records.",
                actor: { name: studentName },
            }, {}, ex)
        }
    }
    const threads = await ex.update(messageThreads).set({ closedAt: sql`coalesce(${messageThreads.closedAt}, now())`, studentDeletedAt: sql`now()` })
        .where(and(eq(messageThreads.userId, userId), isNull(messageThreads.studentDeletedAt)))
        .returning({ id: messageThreads.id })
    return { sends: sends.length, threads: threads.length }
}
