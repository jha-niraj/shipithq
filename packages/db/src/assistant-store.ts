import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import { db } from "./client"
import { assistantChatMessage, assistantChatSession } from "./schema/assistant"
import type { AssistantChatMessageMeta, AssistantFeedback } from "./assistant-types"

/*
 * AI chat storage for both apps (plan/ai-chat AC-3 and AC-4; plan/hiring-app
 * HA-11). Every call takes a scope: the signed-in user, and the company when
 * it's a member's chat in the hiring app (null in the student app). A session
 * outside the scope behaves exactly like one that doesn't exist, so a response
 * never confirms an id is real, and a person's student chats and company chats
 * never mix.
 */

export interface ChatScope {
    userId: string
    /** The company, for a hiring-app chat; null for the student app. */
    companyId: string | null
}

/** Messages the model sees per turn, newest last (plan/ai-chat/overview.md, Limits). */
export const CHAT_HISTORY_LIMIT = 20
/** Longest title kept, in characters. */
export const CHAT_TITLE_MAX = 60

export type StoredMessage = typeof assistantChatMessage.$inferSelect

const inScope = (s: ChatScope) => and(
    eq(assistantChatSession.userId, s.userId),
    s.companyId ? eq(assistantChatSession.companyId, s.companyId) : isNull(assistantChatSession.companyId),
)

export async function getOwnedSession(scope: ChatScope, sessionId: string) {
    const [row] = await db.select().from(assistantChatSession).where(and(eq(assistantChatSession.id, sessionId), inScope(scope))).limit(1)
    return row ?? null
}

export async function createSession(scope: ChatScope) {
    const [row] = await db.insert(assistantChatSession).values({ userId: scope.userId, companyId: scope.companyId }).returning()
    if (!row) throw new Error("Could not create chat session")
    return row
}

export async function listSessions(scope: ChatScope, limit = 100) {
    return db
        .select({ id: assistantChatSession.id, title: assistantChatSession.title, createdAt: assistantChatSession.createdAt, updatedAt: assistantChatSession.updatedAt })
        .from(assistantChatSession)
        .where(inScope(scope))
        .orderBy(desc(assistantChatSession.updatedAt))
        .limit(limit)
}

/** All messages of an owned session, oldest first. Null when not owned. */
export async function getSessionMessages(scope: ChatScope, sessionId: string) {
    const session = await getOwnedSession(scope, sessionId)
    if (!session) return null
    const messages = await db.select().from(assistantChatMessage)
        .where(eq(assistantChatMessage.sessionId, sessionId))
        .orderBy(asc(assistantChatMessage.createdAt), asc(assistantChatMessage.id))
    return { session, messages }
}

/** The last `limit` messages, returned oldest first, for the model's context. */
export async function recentMessages(sessionId: string, limit = CHAT_HISTORY_LIMIT) {
    const rows = await db.select().from(assistantChatMessage)
        .where(eq(assistantChatMessage.sessionId, sessionId))
        .orderBy(desc(assistantChatMessage.createdAt), desc(assistantChatMessage.id))
        .limit(limit)
    return rows.reverse()
}

export async function insertMessage(input: { sessionId: string; role: "user" | "assistant"; content: string; metadata?: AssistantChatMessageMeta | null; createdAt?: Date }) {
    const [row] = await db.insert(assistantChatMessage).values({
        sessionId: input.sessionId,
        role: input.role,
        content: input.content,
        metadata: input.metadata ?? null,
        ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    }).returning({ id: assistantChatMessage.id })
    return row?.id ?? null
}

export async function touchSession(sessionId: string, title?: string) {
    await db.update(assistantChatSession).set({ updatedAt: new Date(), ...(title ? { title } : {}) }).where(eq(assistantChatSession.id, sessionId))
}

export async function deleteSession(scope: ChatScope, sessionId: string): Promise<boolean> {
    const rows = await db.delete(assistantChatSession).where(and(eq(assistantChatSession.id, sessionId), inScope(scope))).returning({ id: assistantChatSession.id })
    return rows.length > 0
}

/** Set or clear feedback on an assistant message in scope. False when not owned. */
export async function setFeedback(scope: ChatScope, messageId: string, value: AssistantFeedback | null): Promise<boolean> {
    // Ownership is a subquery on the scope's sessions, so a message id alone can never reach someone else's row.
    const owned = db.select({ id: assistantChatSession.id }).from(assistantChatSession).where(inScope(scope))
    const rows = await db.update(assistantChatMessage).set({ feedback: value })
        .where(and(eq(assistantChatMessage.id, messageId), eq(assistantChatMessage.role, "assistant"), inArray(assistantChatMessage.sessionId, owned)))
        .returning({ id: assistantChatMessage.id })
    return rows.length > 0
}

/** The text the model sees for a stored turn: the message plus any attached documents. */
export function modelContent(m: Pick<StoredMessage, "content" | "metadata">): string {
    const attached = (m.metadata?.attachments ?? [])
        .map((a) => `\n\n--- Attached document: ${a.name} ---\n${a.text}` + (a.truncated ? "\n[truncated]" : "") + "\n--- end of document ---")
        .join("")
    return `${m.content}${attached}`.trim()
}

/** A fallback title from the question itself: first line, trimmed to the limit. */
export function fallbackTitle(question: string): string {
    const line = question.split("\n").find((l) => l.trim())?.trim() ?? "New chat"
    return line.length > CHAT_TITLE_MAX ? `${line.slice(0, CHAT_TITLE_MAX - 1).trimEnd()}...` : line
}

/** A stored session and its messages, in the panel's shapes (both apps' "get chat" action). */
export function toPanelChat(found: NonNullable<Awaited<ReturnType<typeof getSessionMessages>>>) {
    const { session, messages } = found
    return {
        session: { id: session.id, title: session.title, createdAt: session.createdAt.getTime(), updatedAt: session.updatedAt.getTime() },
        messages: messages.map((m) => ({
            id: m.id,
            role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
            content: m.content,
            createdAt: m.createdAt.getTime(),
            ...(m.metadata?.actions?.length ? { actions: m.metadata.actions } : {}),
            // The panel only shows an attachment's name; its text stays on the server.
            ...(m.metadata?.attachments?.length ? { attachments: m.metadata.attachments.map((a) => ({ ...a, text: "" })) } : {}),
            ...(m.metadata?.steps?.length ? { steps: m.metadata.steps } : {}),
            ...(m.metadata?.partial ? { partial: true } : {}),
            ...(m.metadata?.proposal ? { proposal: m.metadata.proposal } : {}),
            feedback: (m.feedback === 1 || m.feedback === -1 ? m.feedback : null) as AssistantFeedback | null,
        })),
    }
}

// ── Proposals (plan/hiring-app HA-12) ────────────────────────────────────────

/** One assistant message in scope, with its stored metadata. Null when not owned. */
export async function getOwnedMessage(scope: ChatScope, messageId: string) {
    const owned = db.select({ id: assistantChatSession.id }).from(assistantChatSession).where(inScope(scope))
    const [row] = await db.select().from(assistantChatMessage)
        .where(and(eq(assistantChatMessage.id, messageId), eq(assistantChatMessage.role, "assistant"), inArray(assistantChatMessage.sessionId, owned)))
    return row ?? null
}

/**
 * Move a message's proposal out of "pending", once. The update is conditional on
 * the stored status, so a double click or two tabs can't both confirm it.
 * Returns false when it was no longer pending.
 */
export async function settleProposal(scope: ChatScope, messageId: string, status: "done" | "cancelled", result?: { summary: string; href?: string }): Promise<boolean> {
    const owned = db.select({ id: assistantChatSession.id }).from(assistantChatSession).where(inScope(scope))
    const patch = { status, ...(result ? { result } : {}) }
    const rows = await db.update(assistantChatMessage)
        .set({ metadata: sql`jsonb_set(${assistantChatMessage.metadata}, '{proposal}', (${assistantChatMessage.metadata}->'proposal') || ${JSON.stringify(patch)}::jsonb)` })
        .where(and(
            eq(assistantChatMessage.id, messageId),
            inArray(assistantChatMessage.sessionId, owned),
            sql`${assistantChatMessage.metadata}->'proposal'->>'status' = 'pending'`,
        ))
        .returning({ id: assistantChatMessage.id })
    return rows.length > 0
}

/** Record what confirming did, after the work (the status is already settled). */
export async function setProposalResult(messageId: string, result: { summary: string; href?: string }): Promise<void> {
    await db.update(assistantChatMessage)
        .set({ metadata: sql`jsonb_set(${assistantChatMessage.metadata}, '{proposal,result}', ${JSON.stringify(result)}::jsonb)` })
        .where(eq(assistantChatMessage.id, messageId))
}
