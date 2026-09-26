// Shapes the AI panel works with (plan/ai-chat). Client-safe: no database code,
// shared by the panel store and the server actions that fill it.

import type { AssistantChatAction, AssistantChatAttachment, AssistantChatProposal, AssistantFeedback } from "@repo/db/assistant"

export type AIChatAction = AssistantChatAction
export type AIChatAttachment = AssistantChatAttachment
export type AIChatProposal = AssistantChatProposal

/** One tool call. `running` exists only while a turn is in flight; saved turns
 *  carry `done` or `error`. */
export interface AIChatStep {
    id: string
    name: string
    status: "running" | "done" | "error"
    summary?: string
}

export interface AIChatMessage {
    /** The server's id once the turn is saved; a temporary `tmp-` id before that. */
    id: string
    role: "user" | "assistant"
    content: string
    /** Epoch milliseconds. */
    createdAt: number
    actions?: AIChatAction[]
    attachments?: AIChatAttachment[]
    steps?: AIChatStep[]
    feedback?: AssistantFeedback | null
    /** Cut short by stop or a stream error. */
    partial?: boolean
    /** Something the assistant proposes to do, confirmed on a card (HA-12). */
    proposal?: AIChatProposal
}

export interface AIChatSummary {
    id: string
    /** Null until the first exchange has been titled. */
    title: string | null
    createdAt: number
    updatedAt: number
}

/** A turn that has not been saved yet. Feedback needs a real id, so it is off for these. */
export const isTempId = (id: string) => id.startsWith("tmp-")
