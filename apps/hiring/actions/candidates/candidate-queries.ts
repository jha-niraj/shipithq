"use server"

import { db, companyMembers, jobs, jobApplications, users } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { eq, and, desc, inArray } from "drizzle-orm"
import type { CandidateFilters } from "@/types"

// Re-export for backwards compatibility
export type { CandidateFilters } from "@/types"

// ============================================
// CANDIDATE QUERIES
// ============================================

// Get all candidates (applicants) for the company
export async function getCandidates(filters: CandidateFilters = {}) {
    try {
        const auth = await requirePermission("view_candidates")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // Get company job IDs
        const companyJobsQuery = db
            .select({ id: jobs.id })
            .from(jobs)
            .where(
                filters.jobId
                    ? and(eq(jobs.companyId, member.companyId), eq(jobs.id, filters.jobId))
                    : eq(jobs.companyId, member.companyId)
            )
        const companyJobs = await companyJobsQuery
        const jobIds = companyJobs.map(j => j.id)

        if (jobIds.length === 0) {
            return { success: true, data: [] }
        }

        type AppStatus = "INTERESTED" | "PREPARING" | "APPLIED" | "UNDER_REVIEW" | "SHORTLISTED" | "ASSIGNMENT_SENT" | "ASSIGNMENT_SUBMITTED" | "INTERVIEW_SCHEDULED" | "INTERVIEWED" | "OFFER_EXTENDED" | "HIRED" | "REJECTED" | "WITHDRAWN"
        const whereClause = filters.status && filters.status.length > 0
            ? and(
                inArray(jobApplications.jobId, jobIds),
                inArray(jobApplications.status, filters.status as AppStatus[])
              )
            : inArray(jobApplications.jobId, jobIds)

        const applications = await db.query.jobApplications.findMany({
            where: whereClause,
            with: {
                job: {
                    columns: { id: true, title: true, slug: true }
                }
            },
            orderBy: [desc(jobApplications.createdAt)]
        })

        // Fetch user info separately
        const userIds = [...new Set(applications.map(app => app.userId))]
        const userList = await db
            .select({ id: users.id, name: users.name, email: users.email, image: users.image })
            .from(users)
            .where(inArray(users.id, userIds))
        const userMap = new Map(userList.map(u => [u.id, u]))

        // Format for UI
        const candidates = applications.map(app => {
            const user = userMap.get(app.userId)
            return {
                id: app.id,
                applicationId: app.id,
                userId: app.userId,
                name: user?.name || "Unknown",
                email: user?.email || "",
                image: user?.image ?? null,
                jobId: app.jobId,
                jobTitle: app.job.title,
                jobSlug: app.job.slug,
                status: app.status,
                appliedAt: app.appliedAt || app.createdAt,
                matchScore: app.matchScore,
                currentStage: app.currentStage,
                resumeUrl: app.resumeUrl,
                coverLetter: app.coverLetter
            }
        })

        return { success: true, data: candidates }
    } catch (error) {
        console.error("Error fetching candidates:", error)
        return { success: false, error: "Failed to fetch candidates" }
    }
}

// Get single candidate details
export async function getCandidateDetails(applicationId: string) {
    try {
        const auth = await requirePermission("view_candidates")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const companyJobIds = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        const jobIds = companyJobIds.map(j => j.id)

        const application = await db.query.jobApplications.findFirst({
            where: and(
                eq(jobApplications.id, applicationId),
                inArray(jobApplications.jobId, jobIds.length > 0 ? jobIds : ["__none__"])
            ),
            with: {
                job: {
                    columns: { id: true, title: true, slug: true, status: true, interviewProcessId: true }
                },
                activities: {
                    orderBy: [desc(jobApplications.createdAt)],
                    limit: 10
                }
            }
        })

        if (!application) {
            return { success: false, error: "Candidate not found" }
        }

        // Fetch user info separately
        const user = await db.query.users.findFirst({
            where: eq(users.id, application.userId),
            columns: { id: true, name: true, email: true, image: true }
        })

        return {
            success: true,
            data: {
                ...application,
                user
            }
        }
    } catch (error) {
        console.error("Error fetching candidate details:", error)
        return { success: false, error: "Failed to fetch candidate details" }
    }
}

// Get company's jobs for filter dropdown
export async function getCompanyJobsForFilter() {
    try {
        const auth = await requirePermission("view_candidates")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const jobList = await db
            .select({
                id: jobs.id,
                title: jobs.title,
                status: jobs.status,
                applicationsCount: jobs.applicationsCount
            })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
            .orderBy(desc(jobs.createdAt))

        return { success: true, data: jobList }
    } catch (error) {
        console.error("Error fetching jobs:", error)
        return { success: false, error: "Failed to fetch jobs" }
    }
}

// Get candidate statistics
export async function getCandidateStats() {
    try {
        const auth = await requirePermission("view_candidates")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const companyJobIds = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        const jobIds = companyJobIds.map(j => j.id)

        if (jobIds.length === 0) {
            return {
                success: true,
                data: {
                    total: 0, new: 0, screening: 0, interviewing: 0,
                    offered: 0, hired: 0, rejected: 0, thisWeek: 0
                }
            }
        }

        const applications = await db
            .select({
                status: jobApplications.status,
                appliedAt: jobApplications.appliedAt,
                createdAt: jobApplications.createdAt
            })
            .from(jobApplications)
            .where(inArray(jobApplications.jobId, jobIds))

        const now = new Date()
        const thisWeekStart = new Date(now.setDate(now.getDate() - now.getDay()))

        const stats = {
            total: applications.length,
            new: applications.filter(a => ["INTERESTED", "PREPARING", "APPLIED"].includes(a.status)).length,
            screening: applications.filter(a => ["UNDER_REVIEW", "SHORTLISTED"].includes(a.status)).length,
            interviewing: applications.filter(a => ["INTERVIEW_SCHEDULED", "INTERVIEWED"].includes(a.status)).length,
            offered: applications.filter(a => ["OFFER_EXTENDED"].includes(a.status)).length,
            hired: applications.filter(a => ["HIRED"].includes(a.status)).length,
            rejected: applications.filter(a => ["REJECTED"].includes(a.status)).length,
            thisWeek: applications.filter(a => {
                const date = a.appliedAt || a.createdAt
                return date >= thisWeekStart
            }).length
        }

        return { success: true, data: stats }
    } catch (error) {
        console.error("Error fetching stats:", error)
        return { success: false, error: "Failed to fetch stats" }
    }
}
