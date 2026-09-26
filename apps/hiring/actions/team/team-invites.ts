"use server"

import { db, companyMembers, companyRoles, memberInvitations, users } from "@repo/db"
import { checkWorkEmail } from "@repo/auth/work-email"
import { requirePermission } from "@/lib/permissions"
import { canAddMember } from "@/lib/plan"
import { eq, and, desc, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { randomBytes } from "crypto"
import { sendHiringEmail } from "@/lib/emails/hiringemail"
import type {
    InviteTeamMemberPayload, CompanyMemberRole, PendingInvite,
    CompanyMemberJobTitle
} from "@/types"

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateInviteCode(): string {
    return randomBytes(16).toString("hex")
}

// ============================================
// INVITATION ACTIONS
// ============================================

/**
 * Invite a team member to the company
 */
/** The legacy enum kept on the row, from the role's preset (custom roles read as RECRUITER). */
const LEGACY_FROM_PRESET: Record<string, CompanyMemberRole> = {
    OWNER: "FOUNDER", ADMIN: "ADMIN", RECRUITER: "RECRUITER", INTERVIEWER: "INTERVIEWER",
}

/**
 * Invites someone to the company with one of its roles (plan/hiring-app HA-8).
 *
 * - The email must be a work email (HA-4), and is stored lower-cased.
 * - The role must be this company's; only an Owner can invite an Owner.
 * - Someone already in this company, or in ANOTHER company (one company per
 *   person), cannot be invited; neither can an email with a pending invite.
 * - The code works once and expires after 7 days (acceptance: invite.action.ts).
 */
export async function inviteTeamMember(payload: InviteTeamMemberPayload) {
    const auth = await requirePermission("manage_team")
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth

    const email = payload.email.trim().toLowerCase()
    const workEmail = checkWorkEmail(email)
    if (!workEmail.ok) return { success: false, error: workEmail.message }

    try {
        const role = await db.query.companyRoles.findFirst({
            where: and(eq(companyRoles.id, payload.roleId), eq(companyRoles.companyId, ctx.companyId)),
        })
        if (!role) return { success: false, error: "Choose a role for the invitation." }
        if (role.isOwner && !ctx.isOwner) return { success: false, error: "Only an Owner can invite an Owner." }

        const existingUser = await db.query.users.findFirst({
            where: sql`lower(${users.email}) = ${email}`,
            columns: { id: true },
        })
        if (existingUser) {
            const membership = await db.query.companyMembers.findFirst({
                where: eq(companyMembers.userId, existingUser.id),
                columns: { companyId: true },
            })
            if (membership?.companyId === ctx.companyId) return { success: false, error: "That person is already in your company." }
            if (membership) return { success: false, error: "That person already belongs to another company on ShipItHQ." }
        }

        const pending = await db.query.memberInvitations.findFirst({
            where: and(
                eq(memberInvitations.companyId, ctx.companyId),
                sql`lower(${memberInvitations.email}) = ${email}`,
                eq(memberInvitations.status, "PENDING"),
            ),
            columns: { id: true },
        })
        if (pending) return { success: false, error: "An invitation is already pending for this email. Resend it instead." }
        // The plan's member limit; pending invitations count (plan/hiring-app HA-20).
        const room = await canAddMember(ctx.companyId)
        if (!room.ok) return { success: false, error: room.error }

        const inviteCode = generateInviteCode()
        await db.insert(memberInvitations).values({
            companyId: ctx.companyId,
            email,
            name: payload.name ?? null,
            role: payload.role ?? LEGACY_FROM_PRESET[role.presetKey ?? ""] ?? "RECRUITER",
            roleId: role.id,
            jobTitle: payload.jobTitle || "RECRUITER",
            inviteCode,
            invitedById: ctx.memberId,
            message: payload.message,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        })

        const inviteUrl = `${process.env.NEXT_PUBLIC_HIRING_URL || "http://localhost:6004"}/invite?code=${inviteCode}`
        try {
            await sendHiringEmail({
                email,
                emailType: "MEMBER_INVITATION",
                inviterName: ctx.member.displayName || ctx.member.email || "A team member",
                companyName: ctx.member.company?.name || "the company",
                name: role.name,
                inviteUrl,
                message: payload.message ?? undefined,
            })
        } catch (emailError: unknown) {
            console.error("Failed to send invitation email:", emailError instanceof Error ? emailError.message : emailError)
        }

        revalidatePath("/team")
        return { success: true, message: "Invitation sent successfully" }
    } catch (error: unknown) {
        console.error("Invite team member error:", error instanceof Error ? error.message : error)
        return { success: false, error: "Failed to send invitation" }
    }
}

/**
 * Invite team member (simplified: email and role only)
 */
export async function inviteTeamMemberSimple(email: string, roleId: string) {
    const auth = await requirePermission("manage_team")
    if (!auth.ok) return { success: false, error: auth.error }
    return inviteTeamMember({ email, roleId })
}

/**
 * Get pending invitations for the company
 */
export async function getPendingInvites(): Promise<{ success: boolean; data?: PendingInvite[]; error?: string }> {
    try {
        const auth = await requirePermission()
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const invites = await db.query.memberInvitations.findMany({
            where: and(
                eq(memberInvitations.companyId, member.companyId),
                eq(memberInvitations.status, "PENDING")
            ),
            orderBy: [desc(memberInvitations.createdAt)]
        })

        // Fetch invitedBy member info separately
        const invitedByIds = [...new Set(invites.map(i => i.invitedById).filter(Boolean))] as string[]
        const invitedByMembers = invitedByIds.length > 0
            ? await db.query.companyMembers.findMany({
                where: (m, { inArray }) => inArray(m.id, invitedByIds),
                columns: { id: true, displayName: true, userId: true }
              })
            : []
        const { inArray: inArrayFn } = await import("drizzle-orm")
        const { users } = await import("@repo/db")
        const inviterUserIds = [...new Set(invitedByMembers.map(m => m.userId))]
        const inviterUsers = inviterUserIds.length > 0
            ? await db.select({ id: users.id, name: users.name, email: users.email })
                .from(users)
                .where(inArrayFn(users.id, inviterUserIds))
            : []
        const inviterUserMap = new Map(inviterUsers.map(u => [u.id, u]))
        const invitedByMap = new Map(invitedByMembers.map(m => [m.id, {
            id: m.id,
            displayName: m.displayName,
            user: inviterUserMap.get(m.userId) ?? { name: null, email: "" }
        }]))

        const pendingInvites: PendingInvite[] = invites.map(inv => ({
            id: inv.id,
            email: inv.email,
            name: inv.name,
            role: inv.role as CompanyMemberRole,
            jobTitle: inv.jobTitle as CompanyMemberJobTitle,
            inviteCode: inv.inviteCode,
            status: inv.status as "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED",
            message: inv.message,
            invitedAt: inv.createdAt,
            expiresAt: inv.expiresAt,
            invitedBy: invitedByMap.get(inv.invitedById) ?? { id: inv.invitedById, displayName: null, user: { name: null, email: "" } }
        }))

        return { success: true, data: pendingInvites }
    } catch (error: unknown) {
        console.error("Error fetching pending invites:", error)
        return { success: false, error: "Failed to fetch invites" }
    }
}

/**
 * Get pending invitations with extended info
 */
export async function getPendingInvitations() {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth

    try {
        const currentMember = ctx.member

        const invitations = await db.query.memberInvitations.findMany({
            where: and(
                eq(memberInvitations.companyId, currentMember.companyId),
                eq(memberInvitations.status, "PENDING")
            ),
            orderBy: [desc(memberInvitations.createdAt)]
        })

        // Fetch invitedBy member info separately
        const invitedByIds2 = [...new Set(invitations.map(i => i.invitedById).filter(Boolean))] as string[]
        const invitedByMembers2 = invitedByIds2.length > 0
            ? await db.query.companyMembers.findMany({
                where: (m, { inArray }) => inArray(m.id, invitedByIds2),
                columns: { id: true, displayName: true, userId: true }
              })
            : []
        const { inArray: inArrayFn2 } = await import("drizzle-orm")
        const { users: usersTable } = await import("@repo/db")
        const inviterUserIds2 = [...new Set(invitedByMembers2.map(m => m.userId))]
        const inviterUsers2 = inviterUserIds2.length > 0
            ? await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
                .from(usersTable)
                .where(inArrayFn2(usersTable.id, inviterUserIds2))
            : []
        const inviterUserMap2 = new Map(inviterUsers2.map(u => [u.id, u]))
        const invitedByMap2 = new Map(invitedByMembers2.map(m => [m.id, {
            id: m.id,
            displayName: m.displayName,
            user: inviterUserMap2.get(m.userId) ?? { name: null, email: "" }
        }]))

        return {
            success: true,
            data: invitations.map(inv => ({
                id: inv.id,
                email: inv.email,
                name: inv.name,
                role: inv.role,
                jobTitle: inv.jobTitle,
                inviteCode: inv.inviteCode,
                status: inv.status,
                message: inv.message,
                invitedAt: inv.createdAt,
                expiresAt: inv.expiresAt,
                invitedBy: invitedByMap2.get(inv.invitedById) ?? { id: inv.invitedById, displayName: null, user: { name: null, email: "" } }
            })),
            isHead: ctx.can("manage_team")
        }
    } catch (error: unknown) {
        console.error("Get pending invitations error:", error)
        return { success: false, error: "Failed to fetch invitations" }
    }
}

/**
 * Cancel/revoke an invitation
 */
export async function cancelInvitation(invitationId: string) {
    try {
        const auth = await requirePermission("manage_team")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const invitation = await db.query.memberInvitations.findFirst({
            where: and(
                eq(memberInvitations.id, invitationId),
                eq(memberInvitations.companyId, member.companyId)
            )
        })

        if (!invitation) {
            return { success: false, error: "Invitation not found" }
        }

        await db.update(memberInvitations)
            .set({ status: "REVOKED" })
            .where(eq(memberInvitations.id, invitationId))

        revalidatePath("/team")
        return { success: true }
    } catch (error: unknown) {
        console.error("Error canceling invitation:", error)
        return { success: false, error: "Failed to cancel invitation" }
    }
}

/**
 * Revoke invitation (alias for cancelInvitation)
 */
export async function revokeInvitation(invitationId: string) {
    const auth = await requirePermission("manage_team")
    if (!auth.ok) return { success: false, error: auth.error }
    return cancelInvitation(invitationId)
}

/**
 * Resend an invitation email
 */
export async function resendInvitation(invitationId: string) {
    try {
        const auth = await requirePermission("manage_team")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const invitation = await db.query.memberInvitations.findFirst({
            where: and(
                eq(memberInvitations.id, invitationId),
                eq(memberInvitations.companyId, member.companyId)
            )
        })

        if (!invitation) {
            return { success: false, error: "Invitation not found" }
        }

        // Update expiration date
        await db.update(memberInvitations)
            .set({ expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
            .where(eq(memberInvitations.id, invitationId))

        // The company role's name for the email; the legacy enum only for old invites.
        const roleRow = invitation.roleId
            ? await db.query.companyRoles.findFirst({ where: eq(companyRoles.id, invitation.roleId), columns: { name: true } })
            : null
        const inviteUrl = `${process.env.NEXT_PUBLIC_HIRING_URL || "http://localhost:6004"}/invite?code=${invitation.inviteCode}`
        try {
            await sendHiringEmail({
                email: invitation.email,
                emailType: "MEMBER_INVITATION",
                companyName: member.company?.name || "the company",
                name: roleRow?.name ?? invitation.role,
                inviteUrl,
                message: invitation.message ?? undefined,
            })
        } catch (emailError) {
            console.error("Failed to resend invitation email:", emailError)
        }

        revalidatePath("/team")
        return { success: true }
    } catch (error: unknown) {
        console.error("Error resending invitation:", error)
        return { success: false, error: "Failed to resend invitation" }
    }
}
