"use server"

import { and, eq } from "drizzle-orm"
import { db, hiringSends, messages, messageThreads } from "@repo/db"
import { createReport } from "@repo/db/moderation"
import { requirePermission } from "@/lib/permissions"

/*
 * A company's reports (plan/hiring-rounds HR-24): a candidate who sent it
 * results, or a message a candidate wrote in its thread. Filed for the company,
 * by the member; the candidate is never told.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

/** Report the candidate behind one of the company's sends. */
export async function reportCandidateAction(sendId: string, reason: string, details: string): Promise<Result<null>> {
    const auth = await requirePermission("view_candidates")
    if (!auth.ok) return { success: false, error: auth.error }
    try {
        const [s] = await db.select({ userId: hiringSends.userId }).from(hiringSends).where(and(eq(hiringSends.id, sendId), eq(hiringSends.companyId, auth.ctx.companyId)))
        if (!s) return { success: false, error: "That candidate isn't yours." }
        const r = await createReport({ reporterUserId: auth.ctx.userId, reporterCompanyId: auth.ctx.companyId, targetKind: "STUDENT", targetId: s.userId, reason, details: typeof details === "string" ? details : "" })
        return r.ok ? { success: true, data: null } : { success: false, error: r.error }
    } catch (error: unknown) {
        console.error("reportCandidateAction:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not send the report. Try again." }
    }
}

/** Report a message a candidate wrote in one of the company's threads. */
export async function reportMessageAction(messageId: string, reason: string, details: string): Promise<Result<null>> {
    const auth = await requirePermission("view_candidates")
    if (!auth.ok) return { success: false, error: auth.error }
    try {
        const [m] = await db.select({ authorKind: messages.authorKind }).from(messages)
            .innerJoin(messageThreads, eq(messageThreads.id, messages.threadId))
            .where(and(eq(messages.id, messageId), eq(messageThreads.companyId, auth.ctx.companyId)))
        if (!m || m.authorKind !== "STUDENT") return { success: false, error: "You can report messages a candidate sent you." }
        const r = await createReport({ reporterUserId: auth.ctx.userId, reporterCompanyId: auth.ctx.companyId, targetKind: "MESSAGE", targetId: messageId, reason, details: typeof details === "string" ? details : "" })
        return r.ok ? { success: true, data: null } : { success: false, error: r.error }
    } catch (error: unknown) {
        console.error("reportMessageAction:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not send the report. Try again." }
    }
}
