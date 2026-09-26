import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import { db } from "./client"
import { companies } from "./schema/hiring"
import { jobs } from "./schema/jobs"
import { hiringSends } from "./schema/hiring-rounds"
import { messageReads, messages, messageThreads } from "./schema/messages"
import { notifications, users } from "./schema/schema"
import { kindsForTab, initialsOf, type InboxKind } from "./inbox-kinds"
import { membersWith, notifyCompany, notifyUser } from "./notify"
import { conversationPaused } from "./moderation"

/*
 * The Inbox's reads and writes (plan/inbox IN-5, IN-6, IN-7), shared by the
 * student app and the company app. Server-only by use: callers check who is
 * signed in and what they may do, then pass ids here.
 *
 * The list is the person's own notifications. A message writes one for each
 * person on the other side, so read state is always per person; the list shows
 * one row per thread (its latest), unread when any of its rows is.
 */

export type InboxSide = "student" | "company"
const PLATFORM = { student: "MAIN", company: "HIRING" } as const

export interface InboxRow {
    id: string
    kind: string
    unread: boolean
    actor: { name: string; initials: string } | null
    title: string
    preview: string
    context: { label: string; href?: string } | null
    at: string
    threadId: string | null
}

const LIST_LIMIT = 200

/** One person's Inbox for one app: newest first, a thread collapsed to its latest row. */
export async function listInbox(input: { userId: string; side: InboxSide; tab: string; unreadOnly: boolean }): Promise<InboxRow[]> {
    const kinds = kindsForTab(input.side, input.tab)
    if (kinds && !kinds.length) return []
    const rows = await db.select().from(notifications)
        .where(and(
            eq(notifications.userId, input.userId),
            eq(notifications.platform, PLATFORM[input.side]),
            ...(kinds ? [inArray(notifications.kind, kinds)] : []),
        ))
        .orderBy(desc(notifications.createdAt))
        .limit(LIST_LIMIT)
    const unreadThreads = new Set(rows.filter((r) => !r.read && r.threadId).map((r) => r.threadId!))
    const seen = new Set<string>()
    const out: InboxRow[] = []
    for (const r of rows) {
        if (r.threadId) {
            if (seen.has(r.threadId)) continue
            seen.add(r.threadId)
        }
        const unread = r.threadId ? unreadThreads.has(r.threadId) : !r.read
        if (input.unreadOnly && !unread) continue
        out.push({
            id: r.id, kind: r.kind, unread, actor: r.actor ?? null, title: r.title, preview: r.message,
            context: r.context ?? null, at: r.createdAt.toISOString(), threadId: r.threadId,
        })
    }
    return out
}

/** Unread count for the sidebar: a thread counts once. */
export async function unreadCount(userId: string, side: InboxSide): Promise<number> {
    const [row] = await db.select({ n: sql<number>`count(distinct coalesce(${notifications.threadId}, ${notifications.id}))`.mapWith(Number) })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.platform, PLATFORM[side]), eq(notifications.read, false)))
    return row?.n ?? 0
}

/** Unread per tab, for the tab counts. */
export async function unreadByKind(userId: string, side: InboxSide): Promise<Record<string, number>> {
    const rows = await db.select({ kind: notifications.kind, n: sql<number>`count(distinct coalesce(${notifications.threadId}, ${notifications.id}))`.mapWith(Number) })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.platform, PLATFORM[side]), eq(notifications.read, false)))
        .groupBy(notifications.kind)
    return Object.fromEntries(rows.map((r) => [r.kind, r.n]))
}

/** Mark one entry (and the rest of its thread) read or unread. */
export async function setRead(userId: string, side: InboxSide, notificationId: string, read: boolean): Promise<boolean> {
    const [n] = await db.select({ threadId: notifications.threadId }).from(notifications)
        .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId), eq(notifications.platform, PLATFORM[side])))
    if (!n) return false
    const now = new Date()
    if (n.threadId) {
        if (read) {
            await db.update(notifications).set({ read: true, readAt: now, updatedAt: now })
                .where(and(eq(notifications.userId, userId), eq(notifications.threadId, n.threadId), eq(notifications.read, false)))
            await db.insert(messageReads).values({ threadId: n.threadId, userId, lastReadAt: now })
                .onConflictDoUpdate({ target: [messageReads.threadId, messageReads.userId], set: { lastReadAt: now } })
        } else {
            // Unread again: the thread's latest row carries it.
            await db.update(notifications).set({ read: false, readAt: null, updatedAt: now }).where(eq(notifications.id, notificationId))
        }
        return true
    }
    await db.update(notifications).set({ read, readAt: read ? now : null, updatedAt: now }).where(eq(notifications.id, notificationId))
    return true
}

export async function markAllRead(userId: string, side: InboxSide, tab: string): Promise<number> {
    const kinds = kindsForTab(side, tab)
    const now = new Date()
    const done = await db.update(notifications).set({ read: true, readAt: now, updatedAt: now })
        .where(and(
            eq(notifications.userId, userId), eq(notifications.platform, PLATFORM[side]), eq(notifications.read, false),
            ...(kinds ? [inArray(notifications.kind, kinds.length ? kinds : ["__none__"])] : []),
        ))
        .returning({ id: notifications.id })
    return done.length
}

// ── Opening an entry ─────────────────────────────────────────────────────────

export interface ThreadView {
    id: string
    subject: string
    companyName: string
    studentName: string
    jobTitle: string | null
    closed: boolean
    /** Why the conversation is paused, when it is (HR-24): the company is suspended, or the student blocked it. */
    paused: "SUSPENDED" | "BLOCKED" | null
    companyId: string
    messages: { id: string; authorKind: "COMPANY" | "STUDENT"; authorUserId: string | null; authorName: string; body: string; at: string }[]
}

export interface EntryView {
    id: string
    kind: string
    title: string
    body: string
    actor: { name: string; initials: string } | null
    context: { label: string; href?: string } | null
    href: string | null
    at: string
    thread: ThreadView | null
}

export async function loadThread(threadId: string): Promise<ThreadView | null> {
    const [t] = await db.select({ t: messageThreads, companyName: companies.name, studentName: users.name, jobTitle: jobs.title })
        .from(messageThreads)
        .innerJoin(companies, eq(companies.id, messageThreads.companyId))
        .leftJoin(users, eq(users.id, messageThreads.userId))
        .leftJoin(jobs, eq(jobs.id, messageThreads.jobId))
        .where(eq(messageThreads.id, threadId))
    if (!t) return null
    const rows = await db.select({ m: messages, name: users.name }).from(messages)
        .leftJoin(users, eq(users.id, messages.authorUserId))
        .where(eq(messages.threadId, threadId)).orderBy(asc(messages.createdAt))
    const studentName = t.t.studentDeletedAt || !t.t.userId ? "Account deleted" : (t.studentName ?? "Student")
    const paused = t.t.userId ? await conversationPaused(t.t.companyId, t.t.userId) : null
    return {
        id: t.t.id,
        subject: t.t.subject,
        companyName: t.companyName,
        studentName,
        jobTitle: t.jobTitle,
        closed: Boolean(t.t.closedAt || t.t.studentDeletedAt || paused),
        paused,
        companyId: t.t.companyId,
        messages: rows.map((r) => ({
            id: r.m.id,
            authorKind: r.m.authorKind,
            authorUserId: r.m.authorUserId,
            authorName: r.m.authorKind === "COMPANY" ? `${r.name ?? "Someone"} · ${t.companyName}` : (t.t.userId ? (r.name ?? studentName) : studentName),
            body: r.m.body,
            at: r.m.createdAt.toISOString(),
        })),
    }
}

/** Open an entry: it and its thread are marked read for this person. */
export async function openEntry(userId: string, side: InboxSide, notificationId: string): Promise<EntryView | null> {
    const [n] = await db.select().from(notifications)
        .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId), eq(notifications.platform, PLATFORM[side])))
    if (!n) return null
    await setRead(userId, side, notificationId, true)
    const thread = n.threadId ? await loadThread(n.threadId) : null
    return {
        id: n.id, kind: n.kind, title: n.title, body: n.message, actor: n.actor ?? null, context: n.context ?? null,
        href: n.actionUrl, at: n.createdAt.toISOString(), thread,
    }
}

// ── Messages ─────────────────────────────────────────────────────────────────

/** At most one email per thread per hour for each side (DoD 8): the interval in postMessage. */
export const MAX_MESSAGE_CHARS = 4000

export type PostResult =
    | { ok: true; messageId: string; threadId: string; emailTo: "student" | "company" | null }
    | { ok: false; error: string }

/**
 * Write a message into a thread and tell the other side. `emailTo` says whether
 * an email is due (none sent for this thread in the last hour, DoD 8); the
 * caller sends it. The stamp is taken atomically, so two quick messages send
 * one email.
 */
export async function postMessage(input: {
    threadId: string
    author: { kind: "COMPANY" | "STUDENT"; userId: string; name: string }
    body: string
    /** How the other side's Inbox names it, when it's more than a message (e.g. an invite). */
    notice?: { kind: InboxKind; title: string }
}): Promise<PostResult> {
    const body = input.body.trim()
    if (!body) return { ok: false, error: "Write a message first." }
    if (body.length > MAX_MESSAGE_CHARS) return { ok: false, error: `Keep a message under ${MAX_MESSAGE_CHARS} characters.` }
    const thread = await db.query.messageThreads.findFirst({ where: eq(messageThreads.id, input.threadId) })
    if (!thread) return { ok: false, error: "That conversation is gone." }
    if (!thread.userId || thread.studentDeletedAt) return { ok: false, error: "This candidate deleted their account, so the conversation is closed." }
    const studentId = thread.userId
    if (input.author.kind === "COMPANY" && thread.closedAt) return { ok: false, error: "This candidate withdrew their results, so the conversation is closed." }
    if (input.author.kind === "STUDENT" && thread.userId !== input.author.userId) return { ok: false, error: "That conversation isn't yours." }
    // A suspended company's conversations are paused, and a student's block stops the company (HR-24).
    const paused = await conversationPaused(thread.companyId, studentId)
    if (paused === "SUSPENDED") return { ok: false, error: "This company is suspended, so its conversations are paused." }
    if (paused === "BLOCKED") return { ok: false, error: input.author.kind === "COMPANY" ? "This candidate isn't accepting messages." : "You blocked this company. Unblock it to reply." }

    const now = new Date()
    const [m] = await db.insert(messages).values({ threadId: thread.id, authorKind: input.author.kind, authorUserId: input.author.userId, body }).returning({ id: messages.id })
    await db.update(messageThreads).set({ lastMessageAt: now }).where(eq(messageThreads.id, thread.id))
    await db.insert(messageReads).values({ threadId: thread.id, userId: input.author.userId, lastReadAt: now })
        .onConflictDoUpdate({ target: [messageReads.threadId, messageReads.userId], set: { lastReadAt: now } })

    const company = await db.query.companies.findFirst({ where: eq(companies.id, thread.companyId), columns: { name: true } })
    const preview = body.length > 160 ? `${body.slice(0, 157)}...` : body
    const job = thread.jobId ? await db.query.jobs.findFirst({ where: eq(jobs.id, thread.jobId), columns: { title: true } }) : null
    const label = job?.title ?? thread.subject
    let emailTo: "student" | "company" | null = null
    if (input.author.kind === "COMPANY") {
        await notifyUser(studentId, {
            platform: "MAIN", kind: input.notice?.kind ?? "MESSAGE_FROM_COMPANY", title: input.notice?.title ?? `wrote to you about ${label}`, body: preview,
            actor: { name: company?.name ?? "A company" }, context: { label, href: "/inbox" }, href: null, threadId: thread.id,
        })
        // Stamp and cutoff both in SQL, on the database's clock (a JS Date parameter
        // compares against a timestamp column in the wrong zone).
        const [stamped] = await db.update(messageThreads).set({ lastEmailToStudentAt: sql`now()` })
            .where(and(eq(messageThreads.id, thread.id), sql`(${messageThreads.lastEmailToStudentAt} is null or ${messageThreads.lastEmailToStudentAt} < now() - interval '1 hour')`))
            .returning({ id: messageThreads.id })
        if (stamped) emailTo = "student"
    } else {
        await notifyCompany(thread.companyId, "message_candidates", {
            kind: "MESSAGE_FROM_STUDENT", title: `replied about ${label}`, body: preview,
            actor: { name: input.author.name }, context: { label, href: "/inbox" }, href: null, threadId: thread.id,
        })
        // Stamp and cutoff both in SQL, on the database's clock (a JS Date parameter
        // compares against a timestamp column in the wrong zone).
        const [stamped] = await db.update(messageThreads).set({ lastEmailToCompanyAt: sql`now()` })
            .where(and(eq(messageThreads.id, thread.id), sql`(${messageThreads.lastEmailToCompanyAt} is null or ${messageThreads.lastEmailToCompanyAt} < now() - interval '1 hour')`))
            .returning({ id: messageThreads.id })
        if (stamped) emailTo = "company"
    }
    return { ok: true, messageId: m!.id, threadId: thread.id, emailTo }
}

/**
 * The company opens (or reuses) the thread with a student who sent it results,
 * and writes the first message. Refused for a send that was withdrawn.
 */
export async function startThread(input: { companyId: string; sendId: string; author: { userId: string; name: string }; body: string; notice?: { kind: InboxKind; title: string } }): Promise<PostResult> {
    const send = await db.query.hiringSends.findFirst({ where: and(eq(hiringSends.id, input.sendId), eq(hiringSends.companyId, input.companyId)) })
    if (!send || send.status === "WITHDRAWN") return { ok: false, error: "This candidate's results are no longer shared with you." }
    // Checked before the thread exists, so a block never leaves an empty thread behind.
    const paused = await conversationPaused(input.companyId, send.userId)
    if (paused === "SUSPENDED") return { ok: false, error: "Your company is suspended, so it can't message candidates." }
    if (paused === "BLOCKED") return { ok: false, error: "This candidate isn't accepting messages." }
    const job = await db.query.jobs.findFirst({ where: eq(jobs.id, send.jobId), columns: { title: true } })
    const [created] = await db.insert(messageThreads).values({
        companyId: input.companyId, userId: send.userId, sendId: send.id, jobId: send.jobId, subject: job?.title ?? "Your results",
    }).onConflictDoUpdate({
        target: [messageThreads.companyId, messageThreads.userId],
        // A thread per (company, student): reopen it on the newest send.
        set: { sendId: send.id, jobId: send.jobId, closedAt: null },
    }).returning({ id: messageThreads.id })
    return postMessage({ threadId: created!.id, author: { kind: "COMPANY", ...input.author }, body: input.body, notice: input.notice })
}

/** A withdrawn send closes its thread for the company (DoD 10). */
export async function closeThreadsForSend(sendId: string): Promise<void> {
    await db.update(messageThreads).set({ closedAt: new Date() }).where(and(eq(messageThreads.sendId, sendId), isNull(messageThreads.closedAt)))
}

/** The thread with a student for a company, if any: the workspace's Message button. */
export async function threadWith(companyId: string, userId: string) {
    return db.query.messageThreads.findFirst({ where: and(eq(messageThreads.companyId, companyId), eq(messageThreads.userId, userId)), columns: { id: true, closedAt: true } })
}

export { initialsOf }
export type { InboxKind }

/** Who a "new message" email goes to, and what it's about. */
export async function messageEmailTargets(threadId: string, to: "student" | "company"): Promise<{ emails: string[]; about: string; companyName: string; studentName: string } | null> {
    const view = await db.select({ t: messageThreads, companyName: companies.name, studentEmail: users.email, studentName: users.name, jobTitle: jobs.title })
        .from(messageThreads)
        .innerJoin(companies, eq(companies.id, messageThreads.companyId))
        .leftJoin(users, eq(users.id, messageThreads.userId))
        .leftJoin(jobs, eq(jobs.id, messageThreads.jobId))
        .where(eq(messageThreads.id, threadId))
    const t = view[0]
    if (!t) return null
    const base = { about: t.jobTitle ?? t.t.subject, companyName: t.companyName, studentName: t.studentName ?? "A candidate" }
    if (to === "student") return { ...base, emails: t.studentEmail ? [t.studentEmail] : [] }
    const ids = await membersWith(t.t.companyId, "message_candidates")
    const emails = ids.length ? (await db.select({ email: users.email }).from(users).where(inArray(users.id, ids))).map((u) => u.email) : []
    return { ...base, emails }
}
