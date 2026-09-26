"use server"

import { eq } from "drizzle-orm"
import { db, users } from "@repo/db"
import type { AssistantChatProposal, AssistantFeedback } from "@repo/db/assistant"
import { deleteSession, getSessionMessages, listSessions, setFeedback, toPanelChat } from "@repo/db/assistant-store"
import { requirePermission } from "@/lib/permissions"
import { answerProposal } from "@/lib/hiring-ai/proposals"
import { createPipeline, savePipeline } from "@/actions/interview-config/pipeline-builder.action"
import { panelUsage } from "@/lib/hiring-ai/usage"

/*
 * The company AI panel's conversations (plan/hiring-app HA-11), from the app's
 * side. The chat route (`app/api/ai/chat`) writes turns; these list, read,
 * delete and rate them. Each is private to the member, inside their company,
 * and needs "use AI". The shapes match the student app's assistant-chat
 * actions, so the shared panel takes either.
 */

type ChatSummary = { id: string; title: string | null; createdAt: number; updatedAt: number }

async function scope() {
    const auth = await requirePermission("use_ai")
    return auth.ok ? { userId: auth.ctx.userId, companyId: auth.ctx.companyId } : null
}

const NO = { success: false as const, error: "Your role can't use the AI panel. Ask your company's owner." }

export async function listHiringChats(): Promise<{ success: true; sessions: ChatSummary[] } | { success: false; error: string }> {
    const s = await scope()
    if (!s) return NO
    try {
        const rows = await listSessions(s)
        return { success: true, sessions: rows.map((r) => ({ id: r.id, title: r.title, createdAt: r.createdAt.getTime(), updatedAt: r.updatedAt.getTime() })) }
    } catch (error: unknown) {
        console.error("[hiring-ai] list failed:", error)
        return { success: false, error: "Could not load your chats." }
    }
}

export async function getHiringChat(sessionId: string): Promise<
    | ({ success: true } & ReturnType<typeof toPanelChat>)
    | { success: false; notFound?: boolean; error: string }
> {
    const s = await scope()
    if (!s) return NO
    try {
        const found = await getSessionMessages(s, sessionId)
        if (!found) return { success: false, notFound: true, error: "That chat no longer exists." }
        return { success: true, ...toPanelChat(found) }
    } catch (error: unknown) {
        console.error("[hiring-ai] load failed:", error)
        return { success: false, error: "Could not load that chat." }
    }
}

export async function deleteHiringChat(sessionId: string): Promise<{ success: boolean; error?: string }> {
    const s = await scope()
    if (!s) return NO
    try {
        return (await deleteSession(s, sessionId)) ? { success: true } : { success: false, error: "That chat no longer exists." }
    } catch (error: unknown) {
        console.error("[hiring-ai] delete failed:", error)
        return { success: false, error: "Could not delete that chat." }
    }
}

export async function setHiringMessageFeedback(messageId: string, value: AssistantFeedback | null): Promise<{ success: boolean; error?: string }> {
    const s = await scope()
    if (!s) return NO
    if (value !== null && value !== 1 && value !== -1) return { success: false, error: "Invalid feedback." }
    try {
        return (await setFeedback(s, messageId, value)) ? { success: true } : { success: false, error: "That reply no longer exists." }
    } catch (error: unknown) {
        console.error("[hiring-ai] feedback failed:", error)
        return { success: false, error: "Could not save your feedback." }
    }
}

/** How much of this month's cap is left, for the panel's footer. */
export async function getHiringAiUsage(): Promise<{ success: true; used: number; cap: number; left: number } | { success: false; error: string }> {
    const s = await scope()
    if (!s) return NO
    const u = await panelUsage(s.companyId)
    return { success: true, ...u }
}

/** Confirm or cancel a proposal card (plan/hiring-app HA-12); the work is in lib/hiring-ai/proposals.ts. */
export async function answerHiringProposal(messageId: string, decision: "confirm" | "cancel"): Promise<{ success: true; proposal: AssistantChatProposal } | { success: false; error: string }> {
    const auth = await requirePermission("use_ai")
    if (!auth.ok) return { success: false, error: auth.error }
    const [me] = await db.select({ name: users.name }).from(users).where(eq(users.id, auth.ctx.userId))
    return answerProposal({
        userId: auth.ctx.userId, companyId: auth.ctx.companyId, companyName: auth.ctx.member.company.name, memberName: me?.name ?? "The hiring team", can: auth.ctx.can,
    }, messageId, decision === "confirm" ? "confirm" : "cancel", { createPipeline, savePipeline })
}
