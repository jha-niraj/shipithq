"use server"

import { headers } from "next/headers"
import { and, eq, gt, sql } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { db, companies, companyMembers, companyRoles, memberInvitations, notifyCompany, withTransaction } from "@repo/db"

/*
 * Accepting an invitation (plan/hiring-app HA-8). The invite email links to
 * /invite?code=...; the page reads the invitation here, the invitee signs in
 * (or signs up) with the invited address, and accepts.
 *
 * Rules, all on the server:
 * - A code works once, and only while PENDING and unexpired (7 days).
 * - The signed-in email must be the invited one (case-insensitive).
 * - One company per person: someone already in a company cannot accept.
 * - The membership and the invitation's ACCEPTED status are written in one
 *   transaction, and the status flip is conditional, so a double click or
 *   two tabs cannot create two memberships.
 */

export type InvitationView =
    | { status: "valid"; companyName: string; roleName: string; email: string; inviterName: string | null; message: string | null }
    | { status: "expired" | "used" | "cancelled" | "not_found" }

const findByCode = (code: string) =>
    db.select({
        id: memberInvitations.id,
        companyId: memberInvitations.companyId,
        email: memberInvitations.email,
        roleId: memberInvitations.roleId,
        status: memberInvitations.status,
        expiresAt: memberInvitations.expiresAt,
        message: memberInvitations.message,
        companyName: companies.name,
        roleName: companyRoles.name,
        inviterName: companyMembers.displayName,
    })
        .from(memberInvitations)
        .innerJoin(companies, eq(companies.id, memberInvitations.companyId))
        .leftJoin(companyRoles, eq(companyRoles.id, memberInvitations.roleId))
        .leftJoin(companyMembers, eq(companyMembers.id, memberInvitations.invitedById))
        .where(eq(memberInvitations.inviteCode, code))
        .limit(1)

function viewOf(row: Awaited<ReturnType<typeof findByCode>>[number] | undefined): InvitationView {
    if (!row) return { status: "not_found" }
    if (row.status === "ACCEPTED") return { status: "used" }
    if (row.status !== "PENDING") return { status: "cancelled" }
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return { status: "expired" }
    return {
        status: "valid",
        companyName: row.companyName,
        roleName: row.roleName ?? "Member",
        email: row.email,
        inviterName: row.inviterName,
        message: row.message,
    }
}

/** What the invite page shows. Public: the code itself is the secret. */
export async function getInvitation(code: string): Promise<InvitationView> {
    if (!code || code.length > 128) return { status: "not_found" }
    const [row] = await findByCode(code)
    return viewOf(row)
}

export async function acceptInvitation(code: string): Promise<{ success: true } | { success: false; error: string }> {
    const session = await getSession(headers())
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Sign in with the invited email first." }

    const [row] = await findByCode(code)
    const view = viewOf(row)
    if (view.status !== "valid" || !row) {
        const reason: Record<string, string> = {
            expired: "This invitation has expired. Ask for a new one.",
            used: "This invitation has already been used.",
            cancelled: "This invitation was cancelled.",
            not_found: "This invitation doesn't exist.",
        }
        return { success: false, error: reason[view.status] ?? "This invitation can't be used." }
    }
    if ((session.user.email ?? "").toLowerCase() !== row.email.toLowerCase()) {
        return { success: false, error: `This invitation is for ${row.email}. Sign in with that email to accept it.` }
    }
    if (!row.roleId) return { success: false, error: "This invitation has no role. Ask for a new one." }

    const existing = await db.query.companyMembers.findFirst({ where: eq(companyMembers.userId, userId), columns: { companyId: true } })
    if (existing) {
        return {
            success: false,
            error: existing.companyId === row.companyId ? "You're already in this company." : "You already belong to another company on ShipItHQ.",
        }
    }

    try {
        await withTransaction(async (tx) => {
            // Claimed first and conditionally: a second accept finds nothing to claim.
            const claimed = await tx.update(memberInvitations)
                .set({ status: "ACCEPTED", acceptedAt: new Date() })
                .where(and(
                    eq(memberInvitations.id, row.id),
                    eq(memberInvitations.status, "PENDING"),
                    sql`(${memberInvitations.expiresAt} is null or ${memberInvitations.expiresAt} > now())`,
                ))
                .returning({ id: memberInvitations.id })
            if (claimed.length === 0) throw new Error("INVITE_GONE")

            const role = await tx.query.companyRoles.findFirst({
                where: and(eq(companyRoles.id, row.roleId!), eq(companyRoles.companyId, row.companyId)),
                columns: { id: true, presetKey: true },
            })
            if (!role) throw new Error("ROLE_GONE")
            const legacy = ({ OWNER: "FOUNDER", ADMIN: "ADMIN", RECRUITER: "RECRUITER", INTERVIEWER: "INTERVIEWER" } as const)[role.presetKey as "OWNER"] ?? "RECRUITER"

            const [member] = await tx.insert(companyMembers).values({
                userId,
                companyId: row.companyId,
                email: row.email,
                displayName: session.user.name ?? null,
                role: legacy,
                roleId: role.id,
                inviteStatus: "ACCEPTED",
                acceptedAt: new Date(),
            }).returning({ id: companyMembers.id })
            await tx.update(memberInvitations).set({ resultingMemberId: member!.id }).where(eq(memberInvitations.id, row.id))
        })
        // The team hears who joined (plan/inbox, Team tab); the new member isn't told about themselves.
        await notifyCompany(row.companyId, "manage_team", {
            kind: "MEMBER_JOINED",
            title: "joined your team",
            body: `${row.email} accepted their invitation.`,
            actor: { name: session.user.name || row.email },
            context: { label: "Team", href: "/team" },
            href: "/team",
        }, { except: [userId] }).catch((e: unknown) => console.error("notify MEMBER_JOINED:", e))
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : ""
        if (msg === "INVITE_GONE") return { success: false, error: "This invitation has already been used or has expired." }
        if (msg === "ROLE_GONE") return { success: false, error: "The role on this invitation was removed. Ask for a new invitation." }
        console.error("acceptInvitation:", msg || error)
        return { success: false, error: "Could not accept the invitation" }
    }
}

/**
 * A pending, unexpired invitation for the signed-in email, if any: onboarding
 * offers it instead of the create-a-company form (someone who registered from
 * an invite link lands there after verifying their email).
 */
export async function getMyPendingInvitation(): Promise<{ code: string; companyName: string; roleName: string } | null> {
    const session = await getSession(headers())
    const email = session?.user?.email?.toLowerCase()
    if (!email) return null
    const [row] = await db.select({ code: memberInvitations.inviteCode, companyName: companies.name, roleName: companyRoles.name })
        .from(memberInvitations)
        .innerJoin(companies, eq(companies.id, memberInvitations.companyId))
        .leftJoin(companyRoles, eq(companyRoles.id, memberInvitations.roleId))
        .where(and(
            sql`lower(${memberInvitations.email}) = ${email}`,
            eq(memberInvitations.status, "PENDING"),
            gt(memberInvitations.expiresAt, new Date()),
        ))
        .limit(1)
    return row ? { code: row.code, companyName: row.companyName, roleName: row.roleName ?? "Member" } : null
}
