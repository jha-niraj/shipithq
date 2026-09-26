import { and, eq } from "drizzle-orm"
import { db, type TxClient } from "./client"
import { companyMembers, companyRoles } from "./schema/hiring"
import { notifications } from "./schema/schema"
import { initialsOf, type InboxKind } from "./inbox-kinds"
import { sanitizePermissions, type HiringPermission } from "./hiring-permissions"

/*
 * The one way anything writes to someone's Inbox (plan/inbox IN-2, DoD 6).
 * `notifyUser` writes one row for one person on one app; `notifyCompany` fans a
 * company notice out to every active member whose role has the permission (the
 * Owner always), one row each, so read state stays per person.
 */

type Executor = typeof db | TxClient

export interface NotifyInput {
    platform: "MAIN" | "HIRING" | "UNI" | "ADMIN"
    kind: InboxKind
    title: string
    body: string
    /** Who did it. Initials are worked out from the name. */
    actor?: { name: string } | null
    /** What it's about, e.g. a role: shown in the meta row and the breadcrumb. */
    context?: { label: string; href?: string } | null
    /** Where "Open" goes. */
    href?: string | null
    threadId?: string | null
    severity?: "INFO" | "SUCCESS" | "WARNING" | "ERROR"
}

function row(userId: string, input: NotifyInput, companyId: string | null) {
    return {
        userId,
        platform: input.platform,
        kind: input.kind,
        title: input.title.slice(0, 300),
        message: input.body.slice(0, 2000),
        type: input.severity ?? "INFO",
        actor: input.actor ? { name: input.actor.name, initials: initialsOf(input.actor.name) } : null,
        context: input.context ?? null,
        actionUrl: input.href ?? null,
        threadId: input.threadId ?? null,
        companyId,
        updatedAt: new Date(),
    }
}

/** The insert, unrun: for a `db.batch([...])` alongside other writes. */
export function notificationRows(userIds: string[], input: NotifyInput, ex: Executor = db) {
    return ex.insert(notifications).values([...new Set(userIds)].map((id) => row(id, input, null)))
}

export async function notifyUser(userId: string, input: NotifyInput, ex: Executor = db): Promise<void> {
    await ex.insert(notifications).values(row(userId, input, null))
}

/** Several people, one notice each (e.g. every voter on a company request). */
export async function notifyUsers(userIds: string[], input: NotifyInput, ex: Executor = db): Promise<number> {
    const ids = [...new Set(userIds)]
    if (!ids.length) return 0
    await ex.insert(notifications).values(ids.map((id) => row(id, input, null)))
    return ids.length
}

/** Different notices to different people in one insert (e.g. a daily reminder run). */
export async function notifyEach(items: { userId: string; input: NotifyInput }[], ex: Executor = db): Promise<number> {
    if (!items.length) return 0
    await ex.insert(notifications).values(items.map((i) => row(i.userId, i.input, null)))
    return items.length
}

/** The user ids of a company's active members who hold a permission (the Owner always). */
export async function membersWith(companyId: string, permission: HiringPermission | null, ex: Executor = db): Promise<string[]> {
    const rows = await ex.select({ userId: companyMembers.userId, permissions: companyRoles.permissions, isOwner: companyRoles.isOwner })
        .from(companyMembers)
        .leftJoin(companyRoles, eq(companyRoles.id, companyMembers.roleId))
        .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.isActive, true)))
    return rows
        .filter((r) => permission === null || sanitizePermissions(r.permissions ?? [], Boolean(r.isOwner)).includes(permission))
        .map((r) => r.userId)
}

/** A company notice to every member who should see it. Returns how many rows were written. */
export async function notifyCompany(companyId: string, permission: HiringPermission | null, input: Omit<NotifyInput, "platform">, opts: { except?: string[] } = {}, ex: Executor = db): Promise<number> {
    const except = new Set(opts.except ?? [])
    const ids = (await membersWith(companyId, permission, ex)).filter((id) => !except.has(id))
    if (!ids.length) return 0
    await ex.insert(notifications).values(ids.map((id) => row(id, { ...input, platform: "HIRING" }, companyId)))
    return ids.length
}

