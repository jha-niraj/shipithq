"use server"

import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import { db, users } from "@repo/db"
import { eq } from "drizzle-orm"
import { listInbox, markAllRead as markAll, openEntry, postMessage, setRead as setReadRow, unreadByKind, unreadCount } from "@repo/db/inbox"
import type { InboxEntry, InboxMessage, InboxOpened, InboxResult } from "@repo/ui/components/inbox/types"
import { tabCounts, toEntry, toOpened, initialsFrom } from "@repo/db/inbox-view"
import { sendNewMessageEmail } from "@/lib/inbox/email"

/*
 * The student's Inbox (plan/inbox IN-5): MAIN notifications only, and the
 * student's threads with companies. Every call is scoped to the signed-in user.
 */

async function me(): Promise<{ id: string; name: string } | null> {
    const session = await getSession(await headers())
    const id = session?.user?.id
    if (!id) return null
    const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, id))
    return { id, name: u?.name ?? "Student" }
}

const SIGNED_OUT = { success: false as const, error: "Sign in to see your inbox." }

export async function listInboxAction(tab: string, unreadOnly: boolean): Promise<InboxResult<{ entries: InboxEntry[]; tabCounts: Record<string, number> }>> {
    const u = await me()
    if (!u) return SIGNED_OUT
    try {
        const [rows, byKind] = await Promise.all([listInbox({ userId: u.id, side: "student", tab, unreadOnly }), unreadByKind(u.id, "student")])
        return { success: true, data: { entries: rows.map(toEntry), tabCounts: tabCounts("student", byKind) } }
    } catch (error: unknown) {
        console.error("listInboxAction:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load your inbox" }
    }
}

export async function openInboxAction(id: string): Promise<InboxResult<InboxOpened>> {
    const u = await me()
    if (!u) return SIGNED_OUT
    try {
        const v = await openEntry(u.id, "student", id)
        return v ? { success: true, data: toOpened(v, u.id, "student") } : { success: false, error: "That's no longer in your inbox." }
    } catch (error: unknown) {
        console.error("openInboxAction:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not open it" }
    }
}

export async function setReadAction(id: string, read: boolean): Promise<InboxResult<null>> {
    const u = await me()
    if (!u) return SIGNED_OUT
    const ok = await setReadRow(u.id, "student", id, read)
    return ok ? { success: true, data: null } : { success: false, error: "That's no longer in your inbox." }
}

export async function markAllReadAction(tab: string): Promise<InboxResult<null>> {
    const u = await me()
    if (!u) return SIGNED_OUT
    await markAll(u.id, "student", tab)
    return { success: true, data: null }
}

export async function replyAction(threadId: string, text: string): Promise<InboxResult<InboxMessage>> {
    const u = await me()
    if (!u) return SIGNED_OUT
    try {
        const r = await postMessage({ threadId, author: { kind: "STUDENT", userId: u.id, name: u.name }, body: typeof text === "string" ? text : "" })
        if (!r.ok) return { success: false, error: r.error }
        if (r.emailTo === "company") await sendNewMessageEmail({ threadId, to: "company", fromName: u.name, body: text }).catch((e: unknown) => console.error("new-message email:", e))
        const initials = initialsFrom(u.name)
        return { success: true, data: { id: r.messageId, author: { name: u.name, initials }, mine: true, body: text.trim(), at: new Date().toISOString() } }
    } catch (error: unknown) {
        console.error("replyAction:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not send. Your text is still in the box." }
    }
}

/** The sidebar's Inbox count. */
export async function inboxCountAction(): Promise<number> {
    const u = await me()
    return u ? unreadCount(u.id, "student") : 0
}
