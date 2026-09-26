"use server"

import { db, companies, companyMembers, memberInvitations, jobs, jobApplications } from "@repo/db"
import { and, eq, count } from "drizzle-orm"
import { logAdminAudit } from "@/lib/audit-log"
import { checkModuleAccess } from "@/lib/module-access"
import type { PermissionLevel } from "@/lib/navigation"

// ============================================
// HIRING PLATFORM ADMIN SERVER ACTIONS
// ============================================

/**
 * Every function below used to call the shared `checkAdminAccess()` from
 * `admin.action.ts`, which only asks "is this any active admin" - not "does
 * this admin have `hiring` access at all, and does it cover the level this
 * mutation needs." A TEAM_MEMBER with zero modules granted could call
 * `verifyCompany` directly (server actions are reachable from the client
 * bundle regardless of what the UI shows) and it would succeed. See
 * plan/admin/tasks.md, "Found and fixed during ADM-1."
 */
function checkHiringAccess(requiredLevel: PermissionLevel) {
    return checkModuleAccess("hiring", requiredLevel)
}

/**
 * Get hiring platform dashboard stats
 */
export async function getHiringDashboardStats(): Promise<{
    success: true
    data: {
        totalCompanies: number
        verifiedCompanies: number
        pendingVerifications: number
        rejectedVerifications: number
        totalMembers: number
        totalJobs: number
        activeJobs: number
        totalApplications: number
        pendingInvitations: number
    }
} | { success: false; error: string }> {
    try {
        const accessCheck = await checkHiringAccess("read")
        if (!accessCheck.authorized) return { success: false, error: accessCheck.error }
        const [
            totalCompaniesResult,
            verifiedCompaniesResult,
            pendingVerificationsResult,
            rejectedVerificationsResult,
            totalMembersResult,
            totalJobsResult,
            activeJobsResult,
            totalApplicationsResult,
            pendingInvitationsResult,
        ] = await Promise.all([
            db.select({ totalCompanies: count() }).from(companies),
            db.select({ verifiedCompanies: count() }).from(companies).where(eq(companies.verificationStatus, "VERIFIED")),
            // Only claimed companies wait on verification; unclaimed pages and claims are counted apart (HR-6, HR-8).
            db.select({ pendingVerifications: count() }).from(companies).where(and(eq(companies.verificationStatus, "PENDING"), eq(companies.claimStatus, "CLAIMED"))),
            db.select({ rejectedVerifications: count() }).from(companies).where(eq(companies.verificationStatus, "REJECTED")),
            db.select({ totalMembers: count() }).from(companyMembers),
            db.select({ totalJobs: count() }).from(jobs),
            db.select({ activeJobs: count() }).from(jobs).where(eq(jobs.status, "ACTIVE")),
            db.select({ totalApplications: count() }).from(jobApplications),
            db.select({ pendingInvitations: count() }).from(memberInvitations).where(eq(memberInvitations.status, "PENDING")),
        ])
        const totalCompanies = totalCompaniesResult[0]?.totalCompanies ?? 0
        const verifiedCompanies = verifiedCompaniesResult[0]?.verifiedCompanies ?? 0
        const pendingVerifications = pendingVerificationsResult[0]?.pendingVerifications ?? 0
        const rejectedVerifications = rejectedVerificationsResult[0]?.rejectedVerifications ?? 0
        const totalMembers = totalMembersResult[0]?.totalMembers ?? 0
        const totalJobs = totalJobsResult[0]?.totalJobs ?? 0
        const activeJobs = activeJobsResult[0]?.activeJobs ?? 0
        const totalApplications = totalApplicationsResult[0]?.totalApplications ?? 0
        const pendingInvitations = pendingInvitationsResult[0]?.pendingInvitations ?? 0

        return {
            success: true,
            data: {
                totalCompanies,
                verifiedCompanies,
                pendingVerifications,
                rejectedVerifications,
                totalMembers,
                totalJobs,
                activeJobs,
                totalApplications,
                pendingInvitations,
            },
        }
    } catch (error) {
        console.error("Error fetching hiring dashboard stats:", error)
        return { success: false, error: "Failed to fetch hiring dashboard stats" }
    }
}

/**
 * Get companies list with pagination
 */
export async function getCompanies(page = 1, limit = 20, status?: string) {
    try {
        const accessCheck = await checkHiringAccess("read")
        if (!accessCheck.authorized) return { success: false, error: accessCheck.error }
        const offset = (page - 1) * limit

        const whereClause = status && status !== "all"
            ? eq(companies.verificationStatus, status as "PENDING" | "VERIFIED" | "REJECTED")
            : undefined

        const [companyList, totalResult] = await Promise.all([
            db.query.companies.findMany({
                where: whereClause,
                offset,
                limit,
                orderBy: (t, { desc }) => [desc(t.createdAt)],
                with: {
                    members: true,
                }
            }),
            db.select({ total: count() }).from(companies).where(whereClause)
        ])
        const total = totalResult[0]?.total ?? 0

        return {
            success: true,
            data: companyList,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        }
    } catch (error) {
        console.error("Error fetching companies:", error)
        return { success: false, error: "Failed to fetch companies" }
    }
}

/**
 * Get pending company verifications
 */
export async function getPendingCompanyVerifications() {
    try {
        const accessCheck = await checkHiringAccess("read")
        if (!accessCheck.authorized) return { success: false, error: accessCheck.error }
        const pendingCompanies = await db.query.companies.findMany({
            // Self-serve sign-ups only. An unclaimed page (HR-6) is unverified by
            // nature, and a page with a claim (HR-8) is decided in the Claims
            // section, where approving also makes the claimant its Owner.
            where: and(eq(companies.verificationStatus, "PENDING"), eq(companies.claimStatus, "CLAIMED")),
            orderBy: (t, { asc }) => [asc(t.createdAt)],
            with: {
                members: true,
            }
        })

        return { success: true, data: pendingCompanies }
    } catch (error) {
        console.error("Error fetching pending verifications:", error)
        return { success: false, error: "Failed to fetch pending verifications" }
    }
}

/**
 * Verify a company
 */
// `verifiedBy` comes from the session, not from the caller: the argument this
// used to take let any admin with hiring write access put another admin's id
// on a verification (found in plan/hiring-rounds HR-6).
export async function verifyCompany(companyId: string) {
    try {
        const accessCheck = await checkHiringAccess("write")
        if (!accessCheck.authorized) return { success: false, error: accessCheck.error }
        // A page nobody owns is never verified here: that goes through a claim (HR-8).
        const [company] = await db.update(companies)
            .set({
                verificationStatus: "VERIFIED",
                verifiedAt: new Date(),
                verifiedBy: accessCheck.adminAccess.userId,
            })
            .where(and(eq(companies.id, companyId), eq(companies.claimStatus, "CLAIMED")))
            .returning()
        if (!company) return { success: false, error: "That company has no owner yet. Approve its claim instead." }

        const adminAccessId = accessCheck.adminAccess.id
        if (company) {
            await logAdminAudit({
                adminId: adminAccessId,
                action: "UPDATE",
                module: "hiring",
                resourceType: "Company",
                resourceId: companyId,
                description: `Verified company: ${company.name}`,
            })
        }

        return { success: true, data: company }
    } catch (error) {
        console.error("Error verifying company:", error)
        return { success: false, error: "Failed to verify company" }
    }
}

/**
 * Reject a company verification
 */
// `reason` has no column to land in - the `company` table has no rejection-reason
// field, unlike `university` (see rejectUniversityVerification). Recorded in the
// audit log instead, which needs no schema change and is the only place it was
// going before this fix: the reject dialog collected a reason and this function
// silently discarded it, called with only (companyId, adminUserId).
export async function rejectCompanyVerification(companyId: string, reason?: string) {
    try {
        const accessCheck = await checkHiringAccess("write")
        if (!accessCheck.authorized) return { success: false, error: accessCheck.error }
        const [company] = await db.update(companies)
            .set({
                verificationStatus: "REJECTED",
                verifiedBy: accessCheck.adminAccess.userId,
            })
            .where(eq(companies.id, companyId))
            .returning()

        const adminAccessId = accessCheck.adminAccess.id
        if (company) {
            await logAdminAudit({
                adminId: adminAccessId,
                action: "UPDATE",
                module: "hiring",
                resourceType: "Company",
                resourceId: companyId,
                description: `Rejected company: ${company.name}${reason ? ` - ${reason}` : ""}`,
                metadata: reason ? { reason } : undefined,
            })
        }

        return { success: true, data: company }
    } catch (error) {
        console.error("Error rejecting company:", error)
        return { success: false, error: "Failed to reject company" }
    }
}

// getCompanyById, getCompanyMembers, getJobs, getJobApplications,
// getMemberInvitations and getHiringRecentActivity removed (2026-08-24,
// approved by Niraj): each backed a Jobs/Members/Applications/Invitations/
// Analytics page that was never built, and the hiring overview page
// (app/(console)/hiring/_components/hiring-overview-client.tsx) had its
// dead links to those routes removed in the same pass. `getHiringDashboardStats`
// above still counts members/jobs/applications/invitations for the overview's
// stat tiles, so the `companyMembers`, `jobs`, `jobApplications` and
// `memberInvitations` imports stay.
