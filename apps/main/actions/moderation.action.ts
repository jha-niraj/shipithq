"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { db, companies, messages, messageThreads } from "@repo/db"
import { blockCompany, createReport, listBlocks, unblockCompany } from "@repo/db/moderation"

/*
 * A student's reports and blocks (plan/hiring-rounds HR-24). Reports go to the
 * admin queue; the reported party is never told who reported.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

async function userId(): Promise<string | null> {
    const session = await getSession(await headers())
    return session?.user?.id ?? null
}

const SIGNED_OUT = { success: false as const, error: "Sign in first." }

async function file(kind: "COMPANY" | "JOB" | "MESSAGE", targetId: string, reason: string, details: string): Promise<Result<null>> {
    const uid = await userId()
    if (!uid) return SIGNED_OUT
    try {
        if (kind === "MESSAGE") {
            // Only a message in your own thread, and not one you wrote.
            const [m] = await db.select({ authorKind: messages.authorKind }).from(messages)
                .innerJoin(messageThreads, eq(messageThreads.id, messages.threadId))
                .where(and(eq(messages.id, targetId), eq(messageThreads.userId, uid)))
            if (!m || m.authorKind !== "COMPANY") return { success: false, error: "You can report messages a company sent you." }
        }
        const r = await createReport({ reporterUserId: uid, targetKind: kind, targetId, reason, details: typeof details === "string" ? details : "" })
        return r.ok ? { success: true, data: null } : { success: false, error: r.error }
    } catch (error: unknown) {
        console.error("report:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not send the report. Try again." }
    }
}

export async function reportCompany(companyId: string, reason: string, details: string) { return file("COMPANY", companyId, reason, details) }
export async function reportJob(jobId: string, reason: string, details: string) { return file("JOB", jobId, reason, details) }
export async function reportMessage(messageId: string, reason: string, details: string) { return file("MESSAGE", messageId, reason, details) }

/** Block or unblock a company, by id. */
export async function setCompanyBlocked(companyId: string, blocked: boolean): Promise<Result<null>> {
    const uid = await userId()
    if (!uid) return SIGNED_OUT
    const [c] = await db.select({ id: companies.id }).from(companies).where(eq(companies.id, companyId))
    if (!c) return { success: false, error: "That company is gone." }
    if (blocked) await blockCompany(uid, c.id)
    else await unblockCompany(uid, c.id)
    revalidatePath("/settings/privacy")
    return { success: true, data: null }
}

/** Block or unblock the company on one of your threads (the Inbox's button). */
export async function setThreadBlocked(threadId: string, blocked: boolean): Promise<Result<null>> {
    const uid = await userId()
    if (!uid) return SIGNED_OUT
    const [t] = await db.select({ companyId: messageThreads.companyId }).from(messageThreads).where(and(eq(messageThreads.id, threadId), eq(messageThreads.userId, uid)))
    if (!t) return { success: false, error: "That conversation isn't yours." }
    return setCompanyBlocked(t.companyId, blocked)
}

export interface BlockedCompany { companyId: string; name: string; slug: string; at: string }

export async function getMyBlocks(): Promise<Result<BlockedCompany[]>> {
    const uid = await userId()
    if (!uid) return SIGNED_OUT
    const rows = await listBlocks(uid)
    return { success: true, data: rows.map((r) => ({ ...r, at: r.at.toISOString() })) }
}

