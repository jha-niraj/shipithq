/*
 * The Inbox's data shapes (plan/inbox IN-3). Each app turns its rows into these;
 * the components never fetch.
 */

export interface InboxActor { name: string; initials: string }

export interface InboxEntry {
    id: string
    /** A notification kind (packages/db/src/inbox-kinds.ts), or "THREAD" for a message thread. */
    kind: string
    unread: boolean
    actor: InboxActor | null
    /** The line after the actor, e.g. "invited you to talk about Backend intern". */
    title: string
    preview: string
    context: { label: string; href?: string } | null
    /** ISO time. */
    at: string
}

export interface InboxMessage {
    id: string
    author: InboxActor
    /** Written by the person viewing. */
    mine: boolean
    body: string
    at: string
}

export interface InboxTab { value: string; label: string; count?: number }

/** An opened entry, ready for InboxDetail. */
export interface InboxOpened {
    id: string
    title: string
    breadcrumb: string | null
    open: { href: string; label: string } | null
    chips: string[]
    body: string | null
    threadId: string | null
    conversation: InboxMessage[] | null
    reply: { placeholder: string; disabledReason: string | null } | null
    /** A student's thread with a company: whether they've blocked it (HR-24). */
    block?: { blocked: boolean; companyName: string } | null
}

export type InboxResult<T> = { success: true; data: T } | { success: false; error: string }

/** What an app hands InboxApp: its server actions, already scoped to the signed-in person. */
export interface InboxActions {
    list: (tab: string, unreadOnly: boolean) => Promise<InboxResult<{ entries: InboxEntry[]; tabCounts: Record<string, number> }>>
    open: (id: string) => Promise<InboxResult<InboxOpened>>
    setRead: (id: string, read: boolean) => Promise<InboxResult<null>>
    markAllRead: (tab: string) => Promise<InboxResult<null>>
    reply: (threadId: string, text: string) => Promise<InboxResult<InboxMessage>>
    /** Report a message from the other side (HR-24). */
    report?: (messageId: string, reason: string, details: string) => Promise<InboxResult<null>>
    /** Block or unblock the company on a thread (students only). */
    setBlocked?: (threadId: string, blocked: boolean) => Promise<InboxResult<null>>
}

/** Fired on window when something is read or sent, so the sidebar badge refreshes. */
export const INBOX_CHANGED_EVENT = "shipithq:inbox-changed"
