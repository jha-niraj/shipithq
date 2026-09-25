"use server"

import { and, asc, eq, ne, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import {
    db, companyMembers, companyRoles, withTransaction,
    ROLE_PRESETS, sanitizePermissions, type HiringPermission, type RolePresetKey,
} from "@repo/db"
import { requirePermission } from "@/lib/permissions"

/*
 * The company's roles (plan/hiring-app HA-6, HA-7, Niraj 2026-09-25): the fixed
 * Owner, three editable presets (Admin, Recruiter, Interviewer) and any custom
 * roles the company adds, each a set of permissions from HIRING_PERMISSIONS.
 *
 * Rules held here, on the server:
 * - The Owner role cannot be renamed, edited or deleted, and is the only role
 *   that holds "delete_company".
 * - Presets can be edited but not deleted: Interviewer is where members of a
 *   deleted custom role fall back to.
 * - Only an Owner can make someone an Owner.
 * - A company always keeps at least one Owner.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

export interface CompanyRoleView {
    id: string
    name: string
    permissions: HiringPermission[]
    isOwner: boolean
    presetKey: RolePresetKey | null
    members: { id: string; name: string; email: string; image: string | null }[]
}

const NAME_MAX = 40
const cleanName = (name: string) => name.trim().replace(/\s+/g, " ").slice(0, NAME_MAX)

export async function listCompanyRoles(): Promise<Result<{ roles: CompanyRoleView[]; canManageRoles: boolean; canManageTeam: boolean; isOwner: boolean; myRoleId: string | null }>> {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth
    try {
        const [roles, members] = await Promise.all([
            db.select().from(companyRoles).where(eq(companyRoles.companyId, ctx.companyId)).orderBy(asc(companyRoles.createdAt)),
            db.query.companyMembers.findMany({
                where: and(eq(companyMembers.companyId, ctx.companyId), eq(companyMembers.isActive, true)),
                columns: { id: true, roleId: true, displayName: true, email: true },
                with: { user: { columns: { name: true, image: true } } },
            }),
        ])
        // Owner first, then the presets in their usual order, then custom roles by age.
        const order = (r: typeof roles[number]) => (r.isOwner ? 0 : r.presetKey ? ["OWNER", "ADMIN", "RECRUITER", "INTERVIEWER"].indexOf(r.presetKey) : 10)
        const sorted = [...roles].sort((a, b) => order(a) - order(b))
        return {
            success: true,
            data: {
                roles: sorted.map((r) => ({
                    id: r.id,
                    name: r.name,
                    permissions: sanitizePermissions(r.permissions, r.isOwner),
                    isOwner: r.isOwner,
                    presetKey: (r.presetKey as RolePresetKey | null) ?? null,
                    members: members.filter((m) => m.roleId === r.id).map((m) => ({
                        id: m.id,
                        name: m.user?.name || m.displayName || m.email,
                        email: m.email,
                        image: m.user?.image ?? null,
                    })),
                })),
                canManageRoles: ctx.can("manage_roles"),
                canManageTeam: ctx.can("manage_team"),
                isOwner: ctx.isOwner,
                myRoleId: ctx.member.roleId ?? null,
            },
        }
    } catch (error: unknown) {
        console.error("listCompanyRoles:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load roles" }
    }
}

export async function createCompanyRole(input: { name: string; fromRoleId?: string | null }): Promise<Result<{ id: string }>> {
    const auth = await requirePermission("manage_roles")
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth
    const name = cleanName(input.name)
    if (!name) return { success: false, error: "Give the role a name." }
    if (/^owner$/i.test(name)) return { success: false, error: "\"Owner\" is reserved for the company's owners." }
    try {
        let permissions: HiringPermission[] = []
        if (input.fromRoleId) {
            const source = await db.query.companyRoles.findFirst({
                where: and(eq(companyRoles.id, input.fromRoleId), eq(companyRoles.companyId, ctx.companyId)),
            })
            if (!source) return { success: false, error: "That role no longer exists." }
            permissions = sanitizePermissions(source.permissions, false)
        }
        const [row] = await db.insert(companyRoles).values({
            companyId: ctx.companyId, name, permissions, isOwner: false, presetKey: null, updatedAt: new Date(),
        }).onConflictDoNothing().returning({ id: companyRoles.id })
        if (!row) return { success: false, error: `A role called "${name}" already exists.` }
        revalidatePath("/team/roles")
        return { success: true, data: { id: row.id } }
    } catch (error: unknown) {
        console.error("createCompanyRole:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not create the role" }
    }
}

export async function updateCompanyRole(roleId: string, input: { name: string; permissions: string[] }): Promise<Result<null>> {
    const auth = await requirePermission("manage_roles")
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth
    const name = cleanName(input.name)
    if (!name) return { success: false, error: "Give the role a name." }
    try {
        const role = await db.query.companyRoles.findFirst({
            where: and(eq(companyRoles.id, roleId), eq(companyRoles.companyId, ctx.companyId)),
        })
        if (!role) return { success: false, error: "That role no longer exists." }
        if (role.isOwner) return { success: false, error: "The Owner role always has every permission and can't be changed." }
        if (/^owner$/i.test(name)) return { success: false, error: "\"Owner\" is reserved for the company's owners." }
        const clash = await db.query.companyRoles.findFirst({
            where: and(eq(companyRoles.companyId, ctx.companyId), sql`lower(${companyRoles.name}) = ${name.toLowerCase()}`, ne(companyRoles.id, roleId)),
            columns: { id: true },
        })
        if (clash) return { success: false, error: `A role called "${name}" already exists.` }
        await db.update(companyRoles)
            .set({ name, permissions: sanitizePermissions(input.permissions, false), updatedAt: new Date() })
            .where(eq(companyRoles.id, roleId))
        revalidatePath("/team/roles")
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("updateCompanyRole:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not save the role" }
    }
}

export async function deleteCompanyRole(roleId: string): Promise<Result<{ movedMembers: number }>> {
    const auth = await requirePermission("manage_roles")
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth
    try {
        const role = await db.query.companyRoles.findFirst({
            where: and(eq(companyRoles.id, roleId), eq(companyRoles.companyId, ctx.companyId)),
        })
        if (!role) return { success: false, error: "That role no longer exists." }
        if (role.isOwner || role.presetKey) return { success: false, error: "The starting roles can be edited, not deleted." }
        const fallback = await db.query.companyRoles.findFirst({
            where: and(eq(companyRoles.companyId, ctx.companyId), eq(companyRoles.presetKey, "INTERVIEWER")),
            columns: { id: true },
        })
        if (!fallback) return { success: false, error: "The Interviewer role is missing; run pnpm script company-roles." }
        const moved = await withTransaction(async (tx) => {
            const rows = await tx.update(companyMembers).set({ roleId: fallback.id })
                .where(and(eq(companyMembers.companyId, ctx.companyId), eq(companyMembers.roleId, roleId)))
                .returning({ id: companyMembers.id })
            await tx.delete(companyRoles).where(eq(companyRoles.id, roleId))
            return rows.length
        })
        revalidatePath("/team/roles")
        revalidatePath("/team")
        return { success: true, data: { movedMembers: moved } }
    } catch (error: unknown) {
        console.error("deleteCompanyRole:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not delete the role" }
    }
}

/** Gives a member a role. Only an Owner can make or unmake an Owner; the last Owner stays one. */
export async function assignMemberRole(memberId: string, roleId: string): Promise<Result<null>> {
    const auth = await requirePermission("manage_team")
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth
    try {
        const [member, role] = await Promise.all([
            db.query.companyMembers.findFirst({
                where: and(eq(companyMembers.id, memberId), eq(companyMembers.companyId, ctx.companyId)),
                with: { companyRole: true },
            }),
            db.query.companyRoles.findFirst({ where: and(eq(companyRoles.id, roleId), eq(companyRoles.companyId, ctx.companyId)) }),
        ])
        if (!member) return { success: false, error: "That member is not in your company." }
        if (!role) return { success: false, error: "That role no longer exists." }
        const touchesOwner = role.isOwner || Boolean(member.companyRole?.isOwner)
        if (touchesOwner && !ctx.isOwner) return { success: false, error: "Only an Owner can make or change an Owner." }
        if (member.companyRole?.isOwner && !role.isOwner) {
            const [{ owners } = { owners: 0 }] = await db.select({ owners: sql<number>`count(*)::int` })
                .from(companyMembers)
                .innerJoin(companyRoles, eq(companyRoles.id, companyMembers.roleId))
                .where(and(eq(companyMembers.companyId, ctx.companyId), eq(companyMembers.isActive, true), eq(companyRoles.isOwner, true)))
            if (owners <= 1) return { success: false, error: "A company must keep at least one Owner." }
        }
        await db.update(companyMembers).set({ roleId: role.id }).where(eq(companyMembers.id, member.id))
        revalidatePath("/team/roles")
        revalidatePath("/team")
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("assignMemberRole:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not change the role" }
    }
}
