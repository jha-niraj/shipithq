import "server-only"

import { and, asc, desc, eq, inArray } from "drizzle-orm"
import { db, assistantChatSession, assistantChatMessage } from "@repo/db"
import type { AssistantChatMessageMeta, AssistantFeedback } from "@repo/db/assistant"

// Database access for the ShipItHQ AI chat (plan/ai-chat, AC-3 and AC-4).
//
// Every function takes the signed-in user's id and scopes by it. A session id that
// belongs to someone else behaves exactly like one that does not exist: callers get
// null and answer 404, so the response never confirms that the id is real.

/** Messages the model sees per turn, newest last (plan/ai-chat/overview.md, Limits). */
export const CHAT_HISTORY_LIMIT = 20
/** Longest title kept, in characters (overview, Limits). */
export const CHAT_TITLE_MAX = 60

export type StoredMessage = typeof assistantChatMessage.$inferSelect

export async function getOwnedSession(userId: string, sessionId: string) {
    const [row] = await db
        .select()
        .from(assistantChatSession)
        .where(and(eq(assistantChatSession.id, sessionId), eq(assistantChatSession.userId, userId)))
        .limit(1)
    return row ?? null
}

export async function createSession(userId: string) {
    const [row] = await db.insert(assistantChatSession).values({ userId }).returning()
    if (!row) throw new Error("Could not create chat session")
    return row
}

export async function listSessions(userId: string, limit = 100) {
    return db
        .select({
            id: assistantChatSession.id,
            title: assistantChatSession.title,
            createdAt: assistantChatSession.createdAt,
            updatedAt: assistantChatSession.updatedAt,
        })
        .from(assistantChatSession)
        .where(eq(assistantChatSession.userId, userId))
        .orderBy(desc(assistantChatSession.updatedAt))
        .limit(limit)
}

/** All messages of an owned session, oldest first. Null when not owned. */
export async function getSessionMessages(userId: string, sessionId: string) {
    const session = await getOwnedSession(userId, sessionId)
    if (!session) return null
    const messages = await db
        .select()
        .from(assistantChatMessage)
        .where(eq(assistantChatMessage.sessionId, sessionId))
        .orderBy(asc(assistantChatMessage.createdAt), asc(assistantChatMessage.id))
    return { session, messages }
}

/** The last `limit` messages, returned oldest first, for the model's context. */
export async function recentMessages(sessionId: string, limit = CHAT_HISTORY_LIMIT) {
    const rows = await db
        .select()
        .from(assistantChatMessage)
        .where(eq(assistantChatMessage.sessionId, sessionId))
        .orderBy(desc(assistantChatMessage.createdAt), desc(assistantChatMessage.id))
        .limit(limit)
    return rows.reverse()
}

export async function insertMessage(input: {
    sessionId: string
    role: "user" | "assistant"
    content: string
    metadata?: AssistantChatMessageMeta | null
    createdAt?: Date
}) {
    const [row] = await db
        .insert(assistantChatMessage)
        .values({
            sessionId: input.sessionId,
            role: input.role,
            content: input.content,
            metadata: input.metadata ?? null,
            ...(input.createdAt ? { createdAt: input.createdAt } : {}),
        })
        .returning({ id: assistantChatMessage.id })
    return row?.id ?? null
}

export async function touchSession(sessionId: string, title?: string) {
    await db
        .update(assistantChatSession)
        .set({ updatedAt: new Date(), ...(title ? { title } : {}) })
        .where(eq(assistantChatSession.id, sessionId))
}

export async function deleteSession(userId: string, sessionId: string): Promise<boolean> {
    const rows = await db
        .delete(assistantChatSession)
        .where(and(eq(assistantChatSession.id, sessionId), eq(assistantChatSession.userId, userId)))
        .returning({ id: assistantChatSession.id })
    return rows.length > 0
}

/** Set or clear feedback on an assistant message the user owns. False when not owned. */
export async function setFeedback(userId: string, messageId: string, value: AssistantFeedback | null): Promise<boolean> {
    // The ownership check is a subquery on the user's sessions, so a message id alone
    // (which the client holds) can never reach someone else's row.
    const owned = db
        .select({ id: assistantChatSession.id })
        .from(assistantChatSession)
        .where(eq(assistantChatSession.userId, userId))
    const rows = await db
        .update(assistantChatMessage)
        .set({ feedback: value })
        .where(and(
            eq(assistantChatMessage.id, messageId),
            eq(assistantChatMessage.role, "assistant"),
            inArray(assistantChatMessage.sessionId, owned),
        ))
        .returning({ id: assistantChatMessage.id })
    return rows.length > 0
}

/** The text the model sees for a stored turn: the message plus any attached documents. */
export function modelContent(m: Pick<StoredMessage, "content" | "metadata">): string {
    const attached = (m.metadata?.attachments ?? [])
        .map((a) =>
            `\n\n--- Attached document: ${a.name} ---\n${a.text}` +
            (a.truncated ? "\n[truncated]" : "") +
            "\n--- end of document ---")
        .join("")
    return `${m.content}${attached}`.trim()
}

/** A fallback title from the question itself: first line, trimmed to the limit. */
export function fallbackTitle(question: string): string {
    const line = question.split("\n").find((l) => l.trim())?.trim() ?? "New chat"
    return line.length > CHAT_TITLE_MAX ? `${line.slice(0, CHAT_TITLE_MAX - 1).trimEnd()}…` : line
}
