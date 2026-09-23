"use server"

import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import type { AssistantFeedback } from "@repo/db/assistant"
import { deleteSession, getSessionMessages, listSessions, setFeedback } from "@/lib/ai/chat-store"
import type { AIChatMessage, AIChatSummary } from "@/lib/ai/chat-types"

// The AI panel's conversations, from the app's side (plan/ai-chat, AC-4). The chat
// route writes turns; these read, delete and rate them. Every one is scoped to the
// signed-in user through lib/ai/chat-store.ts.

async function userId(): Promise<string | null> {
    const session = await getSession(await headers())
    return session?.user?.id ?? null
}

export async function listAssistantChats(): Promise<{ success: true; sessions: AIChatSummary[] } | { success: false; error: string }> {
    const uid = await userId()
    if (!uid) return { success: false, error: "Not signed in." }
    try {
        const rows = await listSessions(uid)
        return {
            success: true,
            sessions: rows.map((r) => ({
                id: r.id,
                title: r.title,
                createdAt: r.createdAt.getTime(),
                updatedAt: r.updatedAt.getTime(),
            })),
        }
    } catch (error: unknown) {
        console.error("[assistant-chat] list failed:", error)
        return { success: false, error: "Could not load your chats." }
    }
}

export async function getAssistantChat(sessionId: string): Promise<
    | { success: true; session: AIChatSummary; messages: AIChatMessage[] }
    | { success: false; notFound?: boolean; error: string }
> {
    const uid = await userId()
    if (!uid) return { success: false, error: "Not signed in." }
    try {
        const found = await getSessionMessages(uid, sessionId)
        if (!found) return { success: false, notFound: true, error: "That chat no longer exists." }
        const { session, messages } = found
        return {
            success: true,
            session: {
                id: session.id,
                title: session.title,
                createdAt: session.createdAt.getTime(),
                updatedAt: session.updatedAt.getTime(),
            },
            messages: messages.map((m) => ({
                id: m.id,
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.content,
                createdAt: m.createdAt.getTime(),
                ...(m.metadata?.actions?.length ? { actions: m.metadata.actions } : {}),
                // The panel only shows an attachment's name. Its text stays on the server,
                // where the route re-reads it for the model.
                ...(m.metadata?.attachments?.length
                    ? { attachments: m.metadata.attachments.map((a) => ({ ...a, text: "" })) }
                    : {}),
                ...(m.metadata?.steps?.length ? { steps: m.metadata.steps } : {}),
                ...(m.metadata?.partial ? { partial: true } : {}),
                feedback: m.feedback === 1 || m.feedback === -1 ? m.feedback : null,
            })),
        }
    } catch (error: unknown) {
        console.error("[assistant-chat] load failed:", error)
        return { success: false, error: "Could not load that chat." }
    }
}

export async function deleteAssistantChat(sessionId: string): Promise<{ success: boolean; error?: string }> {
    const uid = await userId()
    if (!uid) return { success: false, error: "Not signed in." }
    try {
        const deleted = await deleteSession(uid, sessionId)
        return deleted ? { success: true } : { success: false, error: "That chat no longer exists." }
    } catch (error: unknown) {
        console.error("[assistant-chat] delete failed:", error)
        return { success: false, error: "Could not delete that chat." }
    }
}

export async function setAssistantMessageFeedback(
    messageId: string,
    value: AssistantFeedback | null,
): Promise<{ success: boolean; error?: string }> {
    const uid = await userId()
    if (!uid) return { success: false, error: "Not signed in." }
    if (value !== null && value !== 1 && value !== -1) return { success: false, error: "Invalid feedback." }
    try {
        const saved = await setFeedback(uid, messageId, value)
        return saved ? { success: true } : { success: false, error: "That reply no longer exists." }
    } catch (error: unknown) {
        console.error("[assistant-chat] feedback failed:", error)
        return { success: false, error: "Could not save your feedback." }
    }
}
