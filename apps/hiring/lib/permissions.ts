import "server-only"

import { cache } from "react"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { db, companyMembers, sanitizePermissions, type HiringPermission } from "@repo/db"

export type { HiringPermission } from "@repo/db"

/*
 * Who is asking, in which company, allowed to do what (plan/hiring-app HA-6).
 *
 * The ONE place a hiring action learns its company and checks a permission.
 * There used to be ~15 private copies of `getUserCompany()` across
 * actions/*, and permission checks were `role !== "FOUNDER"` in some files and
 * missing from jobs, applications and candidates entirely - any member could
 * do anything there.
 *
 * Permissions come from the member's `company_role` (Owner: everything). A
 * member with no role yet (none after the backfill) gets nothing.
 */

export interface CompanyContext {
    userId: string
    memberId: string
    companyId: string
    /** The member row with its company, the shape the old helpers returned. */
    member: NonNullable<Awaited<ReturnType<typeof loadMember>>>
    roleName: string
    isOwner: boolean
    permissions: ReadonlySet<HiringPermission>
    can: (permission: HiringPermission) => boolean
}

function loadMember(userId: string) {
    return db.query.companyMembers.findFirst({
        where: eq(companyMembers.userId, userId),
        with: { company: true, companyRole: true },
    })
}

/** The signed-in member's context, or null when signed out or without a company. Cached per request. */
export const getCompanyContext = cache(async (): Promise<CompanyContext | null> => {
    const session = await getSession(headers())
    const userId = session?.user?.id
    if (!userId) return null
    const member = await loadMember(userId)
    if (!member || !member.isActive) return null
    const role = member.companyRole
    const isOwner = Boolean(role?.isOwner)
    const permissions = new Set(role ? sanitizePermissions(role.permissions, isOwner) : [])
    return {
        userId,
        memberId: member.id,
        companyId: member.companyId,
        member,
        roleName: role?.name ?? "No role",
        isOwner,
        permissions,
        can: (p) => permissions.has(p),
    }
})

export type PermissionResult =
    | { ok: true; ctx: CompanyContext }
    | { ok: false; error: string; status: "unauthorized" | "forbidden" }

/**
 * Use at the top of a server action:
 *
 *   const auth = await requirePermission("manage_jobs")
 *   if (!auth.ok) return { success: false, error: auth.error }
 *
 * Pass no permission for actions any member may call (their own profile,
 * notifications, reading the company).
 */
export async function requirePermission(permission?: HiringPermission): Promise<PermissionResult> {
    const ctx = await getCompanyContext()
    if (!ctx) return { ok: false, status: "unauthorized", error: "Unauthorized" }
    if (permission && !ctx.can(permission)) {
        return { ok: false, status: "forbidden", error: "You don't have permission to do this. Ask your company's owner." }
    }
    // A suspended company is frozen (plan/hiring-rounds HR-24): it can read, not act.
    if (permission && FROZEN_WHILE_SUSPENDED.has(permission) && ctx.member.company.suspendedAt) {
        return { ok: false, status: "forbidden", error: "ShipItHQ has suspended your company while it reviews a report, so this is paused. Write to support@shipithq.com." }
    }
    return { ok: true, ctx }
}

/** What a suspended company can't do. Reading candidates, the team, billing and deleting stay open. */
const FROZEN_WHILE_SUSPENDED: ReadonlySet<HiringPermission> = new Set(["message_candidates", "invite_decline", "manage_jobs", "manage_pipelines", "edit_company", "use_ai"])
