"use server"

import { db, companyMembers, companyRoles, jobs, jobApplications, memberInvitations } from "@repo/db"
import { requirePermission, type CompanyContext } from "@/lib/permissions"
import { eq, and, count, isNotNull, asc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type {
    Permission, TeamMember, UpdateTeamMemberPayload,
    CompanyMemberRole, CompanyMemberJobTitle, MemberInviteStatus
} from "@/types"

// ============================================
// HELPER FUNCTIONS
// ============================================

function parsePermissions(permissions: unknown): Permission[] {
    if (!permissions) return []
    try {
        const parsed = typeof permissions === "string"
            ? JSON.parse(permissions)
            : permissions
        return Array.isArray(parsed) ? parsed as Permission[] : []
    } catch {
        return []
    }
}

/**
 * The Owner invariants (plan/hiring-app HA-6): only an Owner can demote,
 * deactivate or remove an Owner, and a company always keeps at least one
 * active Owner. Returns the refusal, or null when the change may go ahead.
 */
async function ownerGuard(
    ctx: CompanyContext,
    target: { isActive: boolean; companyRole: { isOwner: boolean } | null }
): Promise<string | null> {
    if (!target.companyRole?.isOwner) return null
    if (!ctx.isOwner) return "Only an Owner can change, deactivate or remove an Owner."
    if (!target.isActive) return null
    const [row] = await db
        .select({ owners: count() })
        .from(companyMembers)
        .innerJoin(companyRoles, eq(companyRoles.id, companyMembers.roleId))
        .where(and(
            eq(companyMembers.companyId, ctx.companyId),
            eq(companyMembers.isActive, true),
            eq(companyRoles.isOwner, true)
        ))
    if ((row?.owners ?? 0) <= 1) return "A company must keep at least one Owner."
    return null
}

// ============================================
// TEAM MEMBER FETCHING ACTIONS
// ============================================

/**
 * Get all team members of the current user's company
 */
export async function getTeamMembers() {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth

    try {
        const currentMember = ctx.member

        const members = (await db.query.companyMembers.findMany({
            where: eq(companyMembers.companyId, currentMember.companyId),
            with: { companyRole: true },
            orderBy: [asc(companyMembers.createdAt)]
        })).sort((x, y) => Number(Boolean(y.companyRole?.isOwner)) - Number(Boolean(x.companyRole?.isOwner)))

        // Fetch user info separately
        const { users } = await import("@repo/db")
        const { inArray } = await import("drizzle-orm")
        const userIds = [...new Set(members.map(m => m.userId))]
        const userList = userIds.length > 0
            ? await db.select({ id: users.id, name: users.name, email: users.email, image: users.image })
                .from(users)
                .where(inArray(users.id, userIds))
            : []
        const userMap = new Map(userList.map(u => [u.id, u]))

        // Get job counts per member
        const jobCountsRaw = await db
            .select({ postedById: jobs.postedById, cnt: count() })
            .from(jobs)
            .where(eq(jobs.companyId, currentMember.companyId))
            .groupBy(jobs.postedById)
        const jobCountMap = new Map(jobCountsRaw.map(r => [r.postedById, r.cnt]))

        const teamMembers: TeamMember[] = members.map((member) => ({
            id: member.id,
            userId: member.userId,
            companyId: member.companyId,
            role: member.role as CompanyMemberRole,
            roleId: member.roleId,
            roleName: member.companyRole?.name ?? "No role",
            isOwner: Boolean(member.companyRole?.isOwner),
            jobTitle: member.jobTitle as CompanyMemberJobTitle,
            jobTitleCustom: member.jobTitleCustom,
            displayName: member.displayName,
            email: member.email,
            phone: member.phone,
            permissions: parsePermissions(member.permissions),
            inviteStatus: member.inviteStatus as MemberInviteStatus,
            isActive: member.isActive,
            lastActiveAt: member.lastActiveAt,
            createdAt: member.createdAt,
            updatedAt: member.updatedAt,
            user: userMap.get(member.userId) ?? { id: member.userId, name: null, email: member.email, image: null },
            jobsPosted: jobCountMap.get(member.id) || 0
        }))

        return {
            success: true,
            data: teamMembers,
            isHead: ctx.can("manage_team")
        }
    } catch (error) {
        console.error("Get team members error:", error)
        return { success: false, error: "Failed to fetch team members" }
    }
}

/**
 * Get a single team member by ID
 */
export async function getTeamMember(memberId: string) {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth

    try {
        const currentMember = ctx.member

        const member = await db.query.companyMembers.findFirst({
            where: and(
                eq(companyMembers.id, memberId),
                eq(companyMembers.companyId, currentMember.companyId)
            ),
            with: { companyRole: true }
        })

        if (!member) {
            return { success: false, error: "Member not found" }
        }

        // Fetch user separately
        const { users: usersTable2 } = await import("@repo/db")
        const memberUser = await db.query.users.findFirst({
            where: eq(usersTable2.id, member.userId),
            columns: { id: true, name: true, email: true, image: true }
        })

        const jobsPostedRows = await db
            .select({ count: count() })
            .from(jobs)
            .where(and(eq(jobs.companyId, currentMember.companyId), eq(jobs.postedById, memberId)))
        const jobsPostedResult = jobsPostedRows[0]

        const teamMember: TeamMember = {
            id: member.id,
            userId: member.userId,
            companyId: member.companyId,
            role: member.role as CompanyMemberRole,
            roleId: member.roleId,
            roleName: member.companyRole?.name ?? "No role",
            isOwner: Boolean(member.companyRole?.isOwner),
            jobTitle: member.jobTitle as CompanyMemberJobTitle,
            jobTitleCustom: member.jobTitleCustom,
            displayName: member.displayName,
            email: member.email,
            phone: member.phone,
            permissions: parsePermissions(member.permissions),
            inviteStatus: member.inviteStatus as MemberInviteStatus,
            isActive: member.isActive,
            lastActiveAt: member.lastActiveAt,
            createdAt: member.createdAt,
            updatedAt: member.updatedAt,
            user: memberUser ?? { id: member.userId, name: null, email: member.email, image: null },
            jobsPosted: jobsPostedResult?.count ?? 0
        }

        return {
            success: true,
            data: teamMember,
            isHead: ctx.can("manage_team")
        }
    } catch (error) {
        console.error("Get team member error:", error)
        return { success: false, error: "Failed to fetch team member" }
    }
}

// ============================================
// TEAM MEMBER UPDATE ACTIONS (HEAD ONLY)
// ============================================

/**
 * Update a team member's role and permissions
 */
export async function updateTeamMember(memberId: string, payload: UpdateTeamMemberPayload) {
    const auth = await requirePermission("manage_team")
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth

    try {
        const currentMember = ctx.member

        // Editing a member's permission list defines what they can do: manage_roles.
        if (payload.permissions !== undefined && !ctx.can("manage_roles")) {
            return { success: false, error: "You don't have permission to do this. Ask your company's owner." }
        }

        const targetMember = await db.query.companyMembers.findFirst({
            where: and(
                eq(companyMembers.id, memberId),
                eq(companyMembers.companyId, currentMember.companyId)
            ),
            with: { companyRole: true }
        })

        if (!targetMember) {
            return { success: false, error: "Member not found" }
        }

        const changesRole = payload.role !== undefined && payload.role !== targetMember.role
        if (targetMember.id === currentMember.id && changesRole) {
            return { success: false, error: "Cannot demote yourself" }
        }

        if (changesRole || payload.isActive === false) {
            const refusal = await ownerGuard(ctx, targetMember)
            if (refusal) return { success: false, error: refusal }
        }

        const updateData: Record<string, unknown> = {}
        if (payload.role !== undefined) updateData.role = payload.role
        if (payload.jobTitle !== undefined) updateData.jobTitle = payload.jobTitle
        if (payload.jobTitleCustom !== undefined) updateData.jobTitleCustom = payload.jobTitleCustom
        if (payload.isActive !== undefined) updateData.isActive = payload.isActive
        if (payload.permissions !== undefined) {
            updateData.permissions = JSON.stringify(payload.permissions)
        }

        if (Object.keys(updateData).length > 0) {
            await db.update(companyMembers)
                .set(updateData)
                .where(eq(companyMembers.id, memberId))
        }

        revalidatePath("/team")
        return { success: true, message: "Team member updated successfully" }
    } catch (error) {
        console.error("Update team member error:", error)
        return { success: false, error: "Failed to update team member" }
    }
}

/**
 * Update member role (simplified version)
 */
export async function updateMemberRole(memberId: string, newRole: CompanyMemberRole) {
    try {
        const auth = await requirePermission("manage_team")
        if (!auth.ok) return { success: false, error: auth.error }
        const currentMember = auth.ctx.member

        if (currentMember.id === memberId) {
            return { success: false, error: "You cannot change your own role" }
        }

        const targetMember = await db.query.companyMembers.findFirst({
            where: and(
                eq(companyMembers.id, memberId),
                eq(companyMembers.companyId, currentMember.companyId)
            ),
            with: { companyRole: true }
        })

        if (!targetMember) {
            return { success: false, error: "Member not found" }
        }

        if (newRole !== targetMember.role) {
            const refusal = await ownerGuard(auth.ctx, targetMember)
            if (refusal) return { success: false, error: refusal }
        }

        await db.update(companyMembers)
            .set({ role: newRole })
            .where(eq(companyMembers.id, memberId))

        revalidatePath("/team")
        return { success: true }
    } catch (error) {
        console.error("Error updating member role:", error)
        return { success: false, error: "Failed to update role" }
    }
}

/**
 * Deactivate a team member (soft delete)
 */
export async function deactivateTeamMember(memberId: string) {
    const auth = await requirePermission("manage_team")
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth

    try {
        const currentMember = ctx.member

        if (currentMember.id === memberId) {
            return { success: false, error: "Cannot deactivate yourself" }
        }

        const targetMember = await db.query.companyMembers.findFirst({
            where: and(
                eq(companyMembers.id, memberId),
                eq(companyMembers.companyId, currentMember.companyId)
            ),
            with: { companyRole: true }
        })

        if (!targetMember) {
            return { success: false, error: "Member not found" }
        }

        const refusal = await ownerGuard(ctx, targetMember)
        if (refusal) return { success: false, error: refusal }

        await db.update(companyMembers)
            .set({ isActive: false })
            .where(eq(companyMembers.id, memberId))

        revalidatePath("/team")
        return { success: true, message: "Team member deactivated" }
    } catch (error) {
        console.error("Deactivate team member error:", error)
        return { success: false, error: "Failed to deactivate team member" }
    }
}

/**
 * Reactivate a team member
 */
export async function reactivateTeamMember(memberId: string) {
    const auth = await requirePermission("manage_team")
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth

    try {
        const currentMember = ctx.member

        const targetMember = await db.query.companyMembers.findFirst({
            where: and(
                eq(companyMembers.id, memberId),
                eq(companyMembers.companyId, currentMember.companyId)
            ),
            with: { companyRole: true }
        })

        if (!targetMember) {
            return { success: false, error: "Member not found" }
        }

        await db.update(companyMembers)
            .set({ isActive: true })
            .where(eq(companyMembers.id, memberId))

        revalidatePath("/team")
        return { success: true, message: "Team member reactivated" }
    } catch (error) {
        console.error("Reactivate team member error:", error)
        return { success: false, error: "Failed to reactivate team member" }
    }
}

/**
 * Remove team member (hard delete)
 */
export async function removeTeamMember(memberId: string) {
    try {
        const auth = await requirePermission("manage_team")
        if (!auth.ok) return { success: false, error: auth.error }
        const currentMember = auth.ctx.member

        if (currentMember.id === memberId) {
            return { success: false, error: "You cannot remove yourself" }
        }

        const targetMember = await db.query.companyMembers.findFirst({
            where: and(
                eq(companyMembers.id, memberId),
                eq(companyMembers.companyId, currentMember.companyId)
            ),
            with: { companyRole: true }
        })

        if (!targetMember) {
            return { success: false, error: "Member not found" }
        }

        const refusal = await ownerGuard(auth.ctx, targetMember)
        if (refusal) return { success: false, error: refusal }

        await db.delete(companyMembers).where(eq(companyMembers.id, memberId))

        revalidatePath("/team")
        return { success: true }
    } catch (error) {
        console.error("Error removing member:", error)
        return { success: false, error: "Failed to remove member" }
    }
}

// ============================================
// TEAM STATS
// ============================================

/**
 * Get team statistics
 */
export async function getTeamStats() {
    try {
        const auth = await requirePermission()
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const membersCountRows = await db
            .select({ count: count() })
            .from(companyMembers)
            .where(eq(companyMembers.companyId, member.companyId))

        const pendingInvitesRows = await db
            .select({ count: count() })
            .from(memberInvitations)
            .where(and(
                eq(memberInvitations.companyId, member.companyId),
                eq(memberInvitations.status, "PENDING")
            ))

        const jobsPostedRows = await db
            .select({ count: count() })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))

        // Count applications reviewed (have a reviewedById)
        const companyJobIds = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        const jobIds = companyJobIds.map(j => j.id)

        let candidatesProcessed = 0
        if (jobIds.length > 0) {
            const { inArray } = await import("drizzle-orm")
            const processedRows = await db
                .select({ count: count() })
                .from(jobApplications)
                .where(and(
                    inArray(jobApplications.jobId, jobIds),
                    isNotNull(jobApplications.reviewedById)
                ))
            candidatesProcessed = processedRows[0]?.count ?? 0
        }

        return {
            success: true,
            data: {
                totalMembers: membersCountRows[0]?.count ?? 0,
                pendingInvites: pendingInvitesRows[0]?.count ?? 0,
                jobsPosted: jobsPostedRows[0]?.count ?? 0,
                candidatesProcessed
            }
        }
    } catch (error) {
        console.error("Error fetching team stats:", error)
        return { success: false, error: "Failed to fetch stats" }
    }
}
