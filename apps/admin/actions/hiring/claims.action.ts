"use server"

import { and, desc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import {
    db, companies, companyClaims, companyMembers, companyRoles, notifyUser, withTransaction,
    ROLE_PRESETS, type RolePresetKey,
} from "@repo/db"
import { checkModuleAccess } from "@/lib/module-access"
import { logAdminAudit } from "@/lib/audit-log"
import { sendCompanyClaimEmail } from "@/lib/emails/company-claim"

/*
 * Claims on company pages (plan/hiring-rounds HR-8). Someone whose work email
 * matches an unclaimed page's domain claims it; here an admin approves (they
 * become the page's Owner and the company is VERIFIED) or rejects (the page goes
 * back to UNCLAIMED and they are told why).
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

const HIRING_URL = process.env.NEXT_PUBLIC_HIRING_URL || "https://hire.shipithq.com"

export interface ClaimRow {
    id: string
    company: { id: string; name: string; slug: string; websiteDomain: string | null }
    claimant: { name: string | null; email: string }
    jobTitle: string
    linkedinUrl: string | null
    note: string | null
    /** The claim email's domain (or a subdomain of it) is the page's domain. */
    domainMatches: boolean
    /** Earlier rejected claims on this company, any claimant. */
    earlierRejections: { email: string; reason: string | null; at: Date }[]
    createdAt: Date
}

const emailDomain = (email: string) => email.split("@")[1]?.toLowerCase() ?? ""
const matches = (email: string, domain: string | null) => {
    if (!domain) return false
    const d = emailDomain(email)
    return d === domain || d.endsWith(`.${domain}`)
}

export async function listCompanyClaims(): Promise<Result<ClaimRow[]>> {
    const access = await checkModuleAccess("hiring", "read")
    if (!access.authorized) return { success: false, error: access.error }
    try {
        const pending = await db.query.companyClaims.findMany({
            where: eq(companyClaims.status, "PENDING"),
            orderBy: [companyClaims.createdAt],
            with: {
                company: { columns: { id: true, name: true, slug: true, websiteDomain: true } },
                user: { columns: { name: true } },
            },
        })
        const companyIds = pending.map((c) => c.companyId)
        const rejected = companyIds.length
            ? await db.select({ companyId: companyClaims.companyId, email: companyClaims.email, reason: companyClaims.rejectReason, at: companyClaims.decidedAt })
                .from(companyClaims)
                .where(and(inArray(companyClaims.companyId, companyIds), eq(companyClaims.status, "REJECTED")))
                .orderBy(desc(companyClaims.decidedAt))
            : []
        return {
            success: true,
            data: pending.map((c) => ({
                id: c.id,
                company: c.company,
                claimant: { name: c.user?.name ?? null, email: c.email },
                jobTitle: c.jobTitle,
                linkedinUrl: c.linkedinUrl,
                note: c.note,
                domainMatches: matches(c.email, c.company.websiteDomain),
                earlierRejections: rejected.filter((r) => r.companyId === c.companyId).map((r) => ({ email: r.email, reason: r.reason, at: r.at ?? c.createdAt })),
                createdAt: c.createdAt,
            })),
        }
    } catch (error: unknown) {
        console.error("listCompanyClaims:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the claims" }
    }
}

/**
 * Approve a claim: the claimant becomes the Owner of the existing page, which
 * keeps its jobs, followers and profile, and the company is VERIFIED. All in
 * one transaction, so a failure never leaves a verified company with no owner.
 */
export async function approveCompanyClaim(claimId: string): Promise<Result<null>> {
    const access = await checkModuleAccess("hiring", "write")
    if (!access.authorized) return { success: false, error: access.error }
    try {
        const claim = await db.query.companyClaims.findFirst({
            where: eq(companyClaims.id, claimId),
            with: { company: true, user: { columns: { id: true, name: true, email: true } } },
        })
        if (!claim || claim.status !== "PENDING") return { success: false, error: "That claim has already been decided." }
        if (!claim.user) return { success: false, error: "The claimant's account no longer exists. Reject the claim." }
        // Checked again now: the account's email can change after the claim was made.
        if (!matches(claim.user.email, claim.company.websiteDomain)) {
            return { success: false, error: `${claim.user.email} no longer matches ${claim.company.websiteDomain}. Reject the claim.` }
        }
        const member = await db.query.companyMembers.findFirst({ where: eq(companyMembers.userId, claim.userId), columns: { id: true } })
        if (member) return { success: false, error: "The claimant has joined another company since. Reject the claim." }

        await withTransaction(async (tx) => {
            const [decided] = await tx.update(companyClaims)
                .set({ status: "APPROVED", decidedAt: new Date(), decidedByUserId: access.adminAccess.userId })
                .where(and(eq(companyClaims.id, claimId), eq(companyClaims.status, "PENDING")))
                .returning({ id: companyClaims.id })
            if (!decided) throw new Error("CLAIM_ALREADY_DECIDED")

            await tx.update(companies).set({
                claimStatus: "CLAIMED",
                verificationStatus: "VERIFIED",
                verifiedAt: new Date(),
                verifiedBy: access.adminAccess.userId,
                createdByUserId: claim.userId,
            }).where(eq(companies.id, claim.companyId))

            // A scraped page has no roles yet: the fixed Owner and the three presets (HA-6).
            let ownerRoleId = (await tx.select({ id: companyRoles.id }).from(companyRoles)
                .where(and(eq(companyRoles.companyId, claim.companyId), eq(companyRoles.isOwner, true))).limit(1))[0]?.id
            if (!ownerRoleId) {
                const roles = await tx.insert(companyRoles).values(
                    (Object.keys(ROLE_PRESETS) as RolePresetKey[]).map((key) => ({
                        companyId: claim.companyId,
                        name: ROLE_PRESETS[key].name,
                        permissions: ROLE_PRESETS[key].permissions,
                        isOwner: key === "OWNER",
                        presetKey: key,
                        updatedAt: new Date(),
                    })),
                ).returning({ id: companyRoles.id, presetKey: companyRoles.presetKey })
                ownerRoleId = roles.find((r) => r.presetKey === "OWNER")?.id
            }
            if (!ownerRoleId) throw new Error("Failed to create the Owner role")

            await tx.insert(companyMembers).values({
                userId: claim.userId,
                companyId: claim.companyId,
                email: claim.user!.email,
                displayName: claim.user!.name,
                role: "FOUNDER",
                roleId: ownerRoleId,
                jobTitle: "OTHER",
                inviteStatus: "ACCEPTED",
                acceptedAt: new Date(),
                permissions: ["view_jobs", "post_jobs", "view_applications", "review_candidates", "manage_members", "manage_company", "manage_billing"],
            })

            await notifyUser(claim.userId, {
                platform: "HIRING",
                kind: "CLAIM_APPROVED",
                severity: "SUCCESS",
                title: `You're the Owner of ${claim.company.name}`,
                body: "Your claim is approved and the page is verified. Invite your team and start hiring.",
                context: { label: claim.company.name, href: "/company" },
                href: "/company",
            }, tx)
        })

        await sendCompanyClaimEmail(claim.user.email, { kind: "approved", companyName: claim.company.name, url: `${HIRING_URL}/home` })
        await logAdminAudit({
            adminId: access.adminAccess.id, action: "UPDATE", module: "hiring", resourceType: "Company", resourceId: claim.companyId,
            description: `Approved ${claim.user.email}'s claim on ${claim.company.name}: now Owner, company verified`,
            metadata: { claimId },
        })
        revalidatePath("/hiring/companies/verification")
        return { success: true, data: null }
    } catch (error: unknown) {
        const text = error instanceof Error ? error.message : String(error)
        if (text.includes("CLAIM_ALREADY_DECIDED")) return { success: false, error: "That claim has already been decided." }
        console.error("approveCompanyClaim:", text)
        return { success: false, error: "Could not approve the claim" }
    }
}

/** Reject a claim: the page goes back to UNCLAIMED, and the claimant is told why. */
export async function rejectCompanyClaim(claimId: string, reason: string): Promise<Result<null>> {
    const access = await checkModuleAccess("hiring", "write")
    if (!access.authorized) return { success: false, error: access.error }
    const why = reason.trim().replace(/\s+/g, " ").slice(0, 300)
    if (why.length < 5) return { success: false, error: "Say briefly why; the claimant sees it." }
    try {
        const claim = await db.query.companyClaims.findFirst({
            where: eq(companyClaims.id, claimId),
            with: { company: { columns: { id: true, name: true } } },
        })
        if (!claim || claim.status !== "PENDING") return { success: false, error: "That claim has already been decided." }
        await withTransaction(async (tx) => {
            const [decided] = await tx.update(companyClaims)
                .set({ status: "REJECTED", rejectReason: why, decidedAt: new Date(), decidedByUserId: access.adminAccess.userId })
                .where(and(eq(companyClaims.id, claimId), eq(companyClaims.status, "PENDING")))
                .returning({ id: companyClaims.id })
            if (!decided) throw new Error("CLAIM_ALREADY_DECIDED")
            await tx.update(companies).set({ claimStatus: "UNCLAIMED" })
                .where(and(eq(companies.id, claim.companyId), eq(companies.claimStatus, "CLAIM_PENDING")))
        })
        await sendCompanyClaimEmail(claim.email, { kind: "rejected", companyName: claim.company.name, reason: why, url: `${HIRING_URL}/onboarding` })
        await logAdminAudit({
            adminId: access.adminAccess.id, action: "UPDATE", module: "hiring", resourceType: "Company", resourceId: claim.companyId,
            description: `Rejected ${claim.email}'s claim on ${claim.company.name}: ${why}`,
            metadata: { claimId },
        })
        revalidatePath("/hiring/companies/verification")
        return { success: true, data: null }
    } catch (error: unknown) {
        const text = error instanceof Error ? error.message : String(error)
        if (text.includes("CLAIM_ALREADY_DECIDED")) return { success: false, error: "That claim has already been decided." }
        console.error("rejectCompanyClaim:", text)
        return { success: false, error: "Could not reject the claim" }
    }
}
