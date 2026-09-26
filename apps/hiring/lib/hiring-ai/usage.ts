import "server-only"
import { and, count, eq, sql } from "drizzle-orm"
import { db, companyAiUsage } from "@repo/db"
import { HIRING_AI_LIMITS } from "@repo/pricing"

/*
 * The company AI panel's monthly cap (plan/hiring-app HA-11): each question a
 * member asks is one row of kind "panel_message", counted per company per
 * calendar month. The month starts on the database's clock.
 */

export const PANEL_USAGE_KIND = "panel_message"

export async function panelUsage(companyId: string): Promise<{ used: number; cap: number; left: number }> {
    const cap = HIRING_AI_LIMITS.panelMessagesPerMonth
    const [row] = await db.select({ n: count() }).from(companyAiUsage)
        .where(and(eq(companyAiUsage.companyId, companyId), eq(companyAiUsage.kind, PANEL_USAGE_KIND), sql`${companyAiUsage.createdAt} >= date_trunc('month', now())`))
    const used = row?.n ?? 0
    return { used, cap, left: Math.max(0, cap - used) }
}

/**
 * Take one question from this month's allowance, or null when it's used up.
 * Counted and written in one statement, so two members asking at once can't
 * both take the last one.
 */
export async function takePanelMessage(companyId: string, userId: string): Promise<string | null> {
    const cap = HIRING_AI_LIMITS.panelMessagesPerMonth
    const id = crypto.randomUUID()
    const rows = await db.execute<{ id: string }>(sql`
        insert into ${companyAiUsage} (id, company_id, user_id, kind)
        select ${id}, ${companyId}, ${userId}, ${PANEL_USAGE_KIND}
        where (select count(*) from ${companyAiUsage}
               where company_id = ${companyId} and kind = ${PANEL_USAGE_KIND} and created_at >= date_trunc('month', now())) < ${cap}
        returning id`)
    return rows.rows.length ? id : null
}

/** Give a question back when its answer failed before anything was said. */
export async function returnPanelMessage(usageId: string): Promise<void> {
    await db.delete(companyAiUsage).where(eq(companyAiUsage.id, usageId))
}
