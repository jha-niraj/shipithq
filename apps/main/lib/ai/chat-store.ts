import "server-only"

import * as store from "@repo/db/assistant-store"
import type { AssistantFeedback } from "@repo/db/assistant"

// Database access for the ShipItHQ AI chat (plan/ai-chat, AC-3 and AC-4), now the
// shared store in @repo/db (plan/hiring-app HA-11) in the student app's scope:
// the signed-in user, with no company. A company member's hiring-app chats never
// show up here.

export { CHAT_HISTORY_LIMIT, CHAT_TITLE_MAX, fallbackTitle, insertMessage, modelContent, recentMessages, touchSession } from "@repo/db/assistant-store"
export type { StoredMessage } from "@repo/db/assistant-store"

const student = (userId: string) => ({ userId, companyId: null })

export const getOwnedSession = (userId: string, sessionId: string) => store.getOwnedSession(student(userId), sessionId)
export const createSession = (userId: string) => store.createSession(student(userId))
export const listSessions = (userId: string, limit = 100) => store.listSessions(student(userId), limit)
export const getSessionMessages = (userId: string, sessionId: string) => store.getSessionMessages(student(userId), sessionId)
export const deleteSession = (userId: string, sessionId: string) => store.deleteSession(student(userId), sessionId)
export const setFeedback = (userId: string, messageId: string, value: AssistantFeedback | null) => store.setFeedback(student(userId), messageId, value)
