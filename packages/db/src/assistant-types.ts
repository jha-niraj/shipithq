/**
 * Client-safe types for the ShipItHQ AI chat (plan/ai-chat). No database code, so
 * the panel can import these without pulling the client into the browser bundle.
 * Exported as `@repo/db/assistant`.
 */

/** A control a tool produced: a link to the thing it made or a page to go to. */
export interface AssistantChatAction {
    label: string
    href: string
    kind?: string
}

/** A document attached to a user turn. `text` is the EXTRACTED text (capped at 20k
 *  characters by /api/ai/upload-doc); it is kept so the model can re-read it later. */
export interface AssistantChatAttachment {
    id: string
    name: string
    chars: number
    truncated?: boolean
    text: string
}

/** One tool call the agent made during a turn, as it finished. */
export interface AssistantChatStep {
    id: string
    name: string
    status: "done" | "error"
    summary?: string
}

export interface AssistantChatMessageMeta {
    actions?: AssistantChatAction[]
    attachments?: AssistantChatAttachment[]
    steps?: AssistantChatStep[]
    /** The reply was cut short by the user pressing stop or by a stream error. */
    partial?: boolean
}

/** 1 = helpful, -1 = not helpful. */
export type AssistantFeedback = 1 | -1
