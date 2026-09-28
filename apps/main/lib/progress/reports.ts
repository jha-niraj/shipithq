import "server-only"
import { and, desc, eq } from "drizzle-orm"
import { db, progressReports, reportPreferences } from "@repo/db"
import { nextSendDay, type ReportFrequency, type ReportSnapshot } from "@repo/db/progress"

/**
 * Reading progress reports (plan/progress PRG-8, PRG-9). The snapshot is rendered as
 * stored; nothing here recomputes it.
 */

export type LoadedReport = { id: string; snapshot: ReportSnapshot; shareToken: string | null; createdAt: Date }

/** The owner's report, or null when it is not theirs (a 404, never a 403). Marks it viewed. */
export async function loadOwnReport(userId: string, id: string): Promise<LoadedReport | null> {
    const [row] = await db.select().from(progressReports).where(and(eq(progressReports.id, id), eq(progressReports.userId, userId)))
    if (!row) return null
    if (!row.viewedAt) await db.update(progressReports).set({ viewedAt: new Date() }).where(eq(progressReports.id, id))
    return { id: row.id, snapshot: row.data as ReportSnapshot, shareToken: row.shareToken, createdAt: row.createdAt }
}

/** A shared report by its token; null once sharing is switched off. */
export async function loadSharedReport(token: string): Promise<LoadedReport | null> {
    if (!token || token.length < 16) return null
    const [row] = await db.select().from(progressReports).where(eq(progressReports.shareToken, token))
    if (!row) return null
    return { id: row.id, snapshot: row.data as ReportSnapshot, shareToken: null, createdAt: row.createdAt }
}

export type ReportListItem = { id: string; frequency: string; periodStart: string; periodEnd: string; xp: number; activities: number; createdAt: Date; viewed: boolean }

export async function listReports(userId: string, limit = 50): Promise<ReportListItem[]> {
    const rows = await db.select({
        id: progressReports.id, frequency: progressReports.frequency, periodStart: progressReports.periodStart, periodEnd: progressReports.periodEnd,
        data: progressReports.data, createdAt: progressReports.createdAt, viewedAt: progressReports.viewedAt,
    }).from(progressReports).where(eq(progressReports.userId, userId)).orderBy(desc(progressReports.periodEnd), desc(progressReports.createdAt)).limit(limit)
    return rows.map((r) => {
        const s = r.data as ReportSnapshot
        return { id: r.id, frequency: r.frequency, periodStart: String(r.periodStart), periodEnd: String(r.periodEnd), xp: s.totals.xp, activities: s.totals.activities, createdAt: r.createdAt, viewed: !!r.viewedAt }
    })
}

/** The saved choice; no row means weekly (overview 6). */
export async function reportFrequencyFor(userId: string): Promise<ReportFrequency | "OFF"> {
    const [row] = await db.select({ frequency: reportPreferences.frequency }).from(reportPreferences).where(eq(reportPreferences.userId, userId))
    return row?.frequency ?? "WEEKLY"
}

export function nextReportDate(frequency: ReportFrequency | "OFF", today = new Date()): Date | null {
    if (frequency === "OFF") return null
    const t = new Date(today); t.setUTCDate(t.getUTCDate() + 1)
    return nextSendDay(frequency, t)
}
