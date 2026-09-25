"use server"

import { getCompanyContext, type HiringPermission } from "@/lib/permissions"

/**
 * The signed-in member's role and permissions, for client components to hide
 * controls they can't use (plan/hiring-app HA-6). Hiding is only courtesy: every
 * action checks again on the server with `requirePermission`.
 */
export async function getMyPermissions(): Promise<{ roleName: string; isOwner: boolean; permissions: HiringPermission[] } | null> {
    const ctx = await getCompanyContext()
    return ctx ? { roleName: ctx.roleName, isOwner: ctx.isOwner, permissions: [...ctx.permissions] } : null
}
