import { STUDENT_KIND_TAB, COMPANY_KIND_TAB, type InboxKind } from "./inbox-kinds"
import type { EntryView, InboxRow } from "./inbox"

/** The shapes @repo/ui's Inbox draws (structurally the same as its InboxEntry / InboxOpened). */
export interface InboxEntryView { id: string; kind: string; unread: boolean; actor: { name: string; initials: string } | null; title: string; preview: string; context: { label: string; href?: string } | null; at: string }
export interface InboxMessageView { id: string; author: { name: string; initials: string }; mine: boolean; body: string; at: string }
export interface InboxOpenedView {
    id: string
    title: string
    breadcrumb: string | null
    open: { href: string; label: string } | null
    chips: string[]
    body: string | null
    threadId: string | null
    conversation: InboxMessageView[] | null
    reply: { placeholder: string; disabledReason: string | null } | null
    block?: { blocked: boolean; companyName: string } | null
}

/*
 * Turning the Inbox's rows into what @repo/ui's Inbox draws (plan/inbox IN-5,
 * IN-6), for both apps.
 */

export function toEntry(r: InboxRow): InboxEntryView {
    return { id: r.id, kind: r.threadId ? "THREAD" : r.kind, unread: r.unread, actor: r.actor, title: r.title, preview: r.preview, context: r.context, at: r.at }
}

/** Unread per tab from unread per kind; "all" is the total. */
export function tabCounts(side: "student" | "company", byKind: Record<string, number>): Record<string, number> {
    const table = side === "student" ? STUDENT_KIND_TAB : COMPANY_KIND_TAB
    const out: Record<string, number> = { all: 0 }
    for (const [kind, n] of Object.entries(byKind)) {
        out.all! += n
        const tab = table[kind as InboxKind]
        if (tab) out[tab] = (out[tab] ?? 0) + n
    }
    return out
}

export function toOpened(v: EntryView, me: string, side: "student" | "company"): InboxOpenedView {
    if (v.thread) {
        const t = v.thread
        const other = side === "student" ? t.companyName : t.studentName
        return {
            id: v.id,
            title: t.jobTitle ?? t.subject,
            breadcrumb: other,
            open: null,
            chips: [side === "student" ? t.companyName : t.studentName, ...(t.jobTitle ? [t.jobTitle] : []), `${t.messages.length} ${t.messages.length === 1 ? "message" : "messages"}`],
            body: null,
            threadId: t.id,
            conversation: t.messages.map((m) => ({
                id: m.id,
                author: { name: m.authorName, initials: initialsFrom(m.authorName) },
                mine: m.authorUserId === me,
                body: m.body,
                at: m.at,
            })),
            reply: pausedReply(t, side) ?? (side === "company" && t.closed
                ? { placeholder: "", disabledReason: t.studentName === "Account deleted"
                    ? "This candidate deleted their account. The conversation is kept for your records."
                    : `${t.studentName} withdrew their results, so this conversation is closed. They can still read it.` }
                : { placeholder: `Reply to ${other}...`, disabledReason: null }),
            // A student can block the company on its thread (HR-24); a suspended company's thread has nothing to block.
            block: side === "student" && t.paused !== "SUSPENDED" ? { blocked: t.paused === "BLOCKED", companyName: t.companyName } : null,
        }
    }
    return {
        id: v.id,
        title: v.actor ? `${v.actor.name} ${v.title}` : v.title,
        breadcrumb: v.context?.label ?? null,
        open: v.href ? { href: v.href, label: "Open" } : null,
        chips: [new Date(v.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })],
        body: v.body,
        threadId: null,
        conversation: null,
        reply: null,
    }
}

/** A paused conversation's reply box (HR-24): suspended, or blocked by the student. */
function pausedReply(t: NonNullable<EntryView["thread"]>, side: "student" | "company") {
    if (t.paused === "SUSPENDED") return { placeholder: "", disabledReason: side === "company" ? "Your company is suspended, so its conversations are paused." : `ShipItHQ has suspended ${t.companyName}, so this conversation is paused.` }
    if (t.paused === "BLOCKED") return { placeholder: "", disabledReason: side === "company" ? "This candidate isn't accepting messages." : `You blocked ${t.companyName}. Unblock it to reply.` }
    return null
}

export function initialsFrom(name: string): string {
    const parts = name.split("·")[0]!.trim().split(/\s+/).filter(Boolean)
    return (parts.length > 1 ? `${parts[0]![0]}${parts[parts.length - 1]![0]}` : (parts[0] ?? "?").slice(0, 2)).toUpperCase()
}
