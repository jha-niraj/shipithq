"use server"

import { listInbox, markAllRead as markAll, openEntry, postMessage, setRead as setReadRow, startThread, unreadByKind, unreadCount } from "@repo/db/inbox"
import { initialsFrom, tabCounts, toEntry, toOpened, type InboxEntryView, type InboxMessageView, type InboxOpenedView } from "@repo/db/inbox-view"
import { db, hiringSends, users } from "@repo/db"
import { and, eq } from "drizzle-orm"
import { requirePermission } from "@/lib/permissions"
import { lockedSendIds } from "@/lib/plan"
import { LOCKED_SEND } from "@/lib/sends"
import { sendNewMessageEmail } from "@/lib/inbox/email"

/*
 * The company Inbox (plan/inbox IN-6): HIRING notifications for the signed-in
 * member (fan-out rows, so read is per member), and the company's threads with
 * students. Any member reads their own inbox; writing to a student needs
 * "message candidates".
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

async function member() {
    const auth = await requirePermission()
    if (!auth.ok) return null
    const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, auth.ctx.userId))
    return { ...auth.ctx, name: u?.name ?? "A teammate" }
}

const NO = { success: false as const, error: "Sign in to your company to see its inbox." }

export async function listInboxAction(tab: string, unreadOnly: boolean): Promise<Result<{ entries: InboxEntryView[]; tabCounts: Record<string, number> }>> {
    const m = await member()
    if (!m) return NO
    try {
        const [rows, byKind] = await Promise.all([listInbox({ userId: m.userId, side: "company", tab, unreadOnly }), unreadByKind(m.userId, "company")])
        return { success: true, data: { entries: rows.map(toEntry), tabCounts: tabCounts("company", byKind) } }
    } catch (error: unknown) {
        console.error("listInboxAction:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the inbox" }
    }
}

export async function openInboxAction(id: string): Promise<Result<InboxOpenedView>> {
    const m = await member()
    if (!m) return NO
    try {
        const v = await openEntry(m.userId, "company", id)
        if (!v) return { success: false, error: "That's no longer in your inbox." }
        const opened = toOpened(v, m.userId, "company")
        // Reading is for everyone on the team; writing to a student needs the permission.
        if (opened.reply && !opened.reply.disabledReason && !m.can("message_candidates")) {
            opened.reply = { placeholder: "", disabledReason: "Your role can read candidate messages but not reply. Ask your company's owner." }
        }
        return { success: true, data: opened }
    } catch (error: unknown) {
        console.error("openInboxAction:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not open it" }
    }
}

export async function setReadAction(id: string, read: boolean): Promise<Result<null>> {
    const m = await member()
    if (!m) return NO
    return (await setReadRow(m.userId, "company", id, read)) ? { success: true, data: null } : { success: false, error: "That's no longer in your inbox." }
}

export async function markAllReadAction(tab: string): Promise<Result<null>> {
    const m = await member()
    if (!m) return NO
    await markAll(m.userId, "company", tab)
    return { success: true, data: null }
}

async function afterPost(r: Awaited<ReturnType<typeof postMessage>>, m: NonNullable<Awaited<ReturnType<typeof member>>>, body: string): Promise<Result<InboxMessageView>> {
    if (!r.ok) return { success: false, error: r.error }
    if (r.emailTo === "student") await sendNewMessageEmail({ threadId: r.threadId, fromName: m.member.company.name, body }).catch((e: unknown) => console.error("new-message email:", e))
    return { success: true, data: { id: r.messageId, author: { name: `${m.name} · ${m.member.company.name}`, initials: initialsFrom(m.name) }, mine: true, body: body.trim(), at: new Date().toISOString() } }
}

export async function replyAction(threadId: string, text: string): Promise<Result<InboxMessageView>> {
    const auth = await requirePermission("message_candidates")
    if (!auth.ok) return { success: false, error: auth.error }
    const m = await member()
    if (!m) return NO
    try {
        // The thread must be this company's.
        const own = await db.query.messageThreads.findFirst({ where: (x, { and: a, eq: e }) => a(e(x.id, threadId), e(x.companyId, m.companyId)), columns: { id: true } })
        if (!own) return { success: false, error: "That conversation isn't your company's." }
        return afterPost(await postMessage({ threadId, author: { kind: "COMPANY", userId: m.userId, name: m.name }, body: typeof text === "string" ? text : "" }), m, text)
    } catch (error: unknown) {
        console.error("replyAction:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not send. Your text is still in the box." }
    }
}

/** From the candidate workspace: write to a student who sent results (opens or reuses the thread). */
export async function messageCandidateAction(sendId: string, text: string): Promise<Result<{ threadId: string }>> {
    const auth = await requirePermission("message_candidates")
    if (!auth.ok) return { success: false, error: auth.error }
    const m = await member()
    if (!m) return NO
    try {
        const send = await db.query.hiringSends.findFirst({ where: and(eq(hiringSends.id, sendId), eq(hiringSends.companyId, m.companyId)), columns: { id: true } })
        if (!send) return { success: false, error: "That candidate isn't yours." }
        if ((await lockedSendIds(m.companyId)).has(sendId)) return { success: false, error: LOCKED_SEND }
        const r = await startThread({ companyId: m.companyId, sendId, author: { userId: m.userId, name: m.name }, body: typeof text === "string" ? text : "" })
        const done = await afterPost(r, m, text)
        return done.success && r.ok ? { success: true, data: { threadId: r.threadId } } : { success: false, error: done.success ? "Could not send" : done.error }
    } catch (error: unknown) {
        console.error("messageCandidateAction:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not send. Your text is still in the box." }
    }
}

export async function inboxCountAction(): Promise<number> {
    const m = await member()
    return m ? unreadCount(m.userId, "company") : 0
}
