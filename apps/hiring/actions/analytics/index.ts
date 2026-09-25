// Analytics Actions - Server actions for analytics/reporting
"use server"

import { db, companyMembers, jobs, jobApplications } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { eq, and, count, sum, gte, lt, inArray, desc, isNotNull } from "drizzle-orm"

// Get comprehensive analytics data
export async function getAnalyticsOverview() {
    try {
        const auth = await requirePermission("view_analytics")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

        // Get company job IDs
        const companyJobIds = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        const jobIds = companyJobIds.map(j => j.id)

        const [totalJobsResult] = await db
            .select({ count: count() })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))

        const [activeJobsResult] = await db
            .select({ count: count() })
            .from(jobs)
            .where(and(eq(jobs.companyId, member.companyId), eq(jobs.status, "ACTIVE")))

        let totalApplications = 0
        let recentApplications = 0
        let previousPeriodApplications = 0
        let hiredCount = 0
        let rejectedCount = 0
        let interviewsScheduled = 0

        if (jobIds.length > 0) {
            const totalAppsRows = await db
                .select({ count: count() })
                .from(jobApplications)
                .where(inArray(jobApplications.jobId, jobIds))

            const recentAppsRows = await db
                .select({ count: count() })
                .from(jobApplications)
                .where(and(
                    inArray(jobApplications.jobId, jobIds),
                    gte(jobApplications.createdAt, thirtyDaysAgo)
                ))

            const prevAppsRows = await db
                .select({ count: count() })
                .from(jobApplications)
                .where(and(
                    inArray(jobApplications.jobId, jobIds),
                    gte(jobApplications.createdAt, sixtyDaysAgo),
                    lt(jobApplications.createdAt, thirtyDaysAgo)
                ))

            const hiredRows = await db
                .select({ count: count() })
                .from(jobApplications)
                .where(and(inArray(jobApplications.jobId, jobIds), eq(jobApplications.status, "HIRED")))

            const rejectedRows = await db
                .select({ count: count() })
                .from(jobApplications)
                .where(and(inArray(jobApplications.jobId, jobIds), eq(jobApplications.status, "REJECTED")))

            const interviewsRows = await db
                .select({ count: count() })
                .from(jobApplications)
                .where(and(
                    inArray(jobApplications.jobId, jobIds),
                    inArray(jobApplications.status, ["INTERVIEW_SCHEDULED", "INTERVIEWED"])
                ))

            totalApplications = totalAppsRows[0]?.count ?? 0
            recentApplications = recentAppsRows[0]?.count ?? 0
            previousPeriodApplications = prevAppsRows[0]?.count ?? 0
            hiredCount = hiredRows[0]?.count ?? 0
            rejectedCount = rejectedRows[0]?.count ?? 0
            interviewsScheduled = interviewsRows[0]?.count ?? 0
        }

        const viewsSumResult = await db
            .select({ total: sum(jobs.viewsCount) })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))

        const applicationChange = previousPeriodApplications > 0
            ? Math.round(((recentApplications - previousPeriodApplications) / previousPeriodApplications) * 100)
            : recentApplications > 0 ? 100 : 0

        // Pipeline data
        let pipeline = {
            applied: 0, reviewing: 0, shortlisted: 0,
            interviewing: 0, offered: 0, hired: hiredCount, rejected: rejectedCount
        }

        if (jobIds.length > 0) {
            const pipelineData = await db.query.jobApplications.findMany({
                where: inArray(jobApplications.jobId, jobIds),
                columns: { status: true }
            })

            const statusCounts = pipelineData.reduce((acc, app) => {
                acc[app.status] = (acc[app.status] || 0) + 1
                return acc
            }, {} as Record<string, number>)

            pipeline = {
                applied: statusCounts["APPLIED"] || 0,
                reviewing: statusCounts["UNDER_REVIEW"] || 0,
                shortlisted: statusCounts["SHORTLISTED"] || 0,
                interviewing: (statusCounts["INTERVIEW_SCHEDULED"] || 0) + (statusCounts["INTERVIEWED"] || 0),
                offered: statusCounts["OFFER_EXTENDED"] || 0,
                hired: hiredCount,
                rejected: rejectedCount
            }
        }

        const topJobs = await db
            .select({
                id: jobs.id,
                title: jobs.title,
                slug: jobs.slug,
                viewsCount: jobs.viewsCount,
                applicationsCount: jobs.applicationsCount,
                status: jobs.status,
                createdAt: jobs.createdAt
            })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
            .orderBy(desc(jobs.applicationsCount))
            .limit(5)

        let avgTimeToHire = 0
        if (jobIds.length > 0) {
            const hiredApplications = await db.query.jobApplications.findMany({
                where: and(
                    inArray(jobApplications.jobId, jobIds),
                    eq(jobApplications.status, "HIRED"),
                    isNotNull(jobApplications.appliedAt)
                ),
                columns: { appliedAt: true, updatedAt: true }
            })

            if (hiredApplications.length > 0) {
                const totalDays = hiredApplications.reduce((sum, app) => {
                    if (app.appliedAt) {
                        const days = Math.ceil((app.updatedAt.getTime() - app.appliedAt.getTime()) / (1000 * 60 * 60 * 24))
                        return sum + days
                    }
                    return sum
                }, 0)
                avgTimeToHire = Math.round(totalDays / hiredApplications.length)
            }
        }

        return {
            success: true,
            data: {
                overview: {
                    totalJobs: totalJobsResult?.count ?? 0,
                    activeJobs: activeJobsResult?.count ?? 0,
                    totalApplications,
                    recentApplications,
                    applicationChange,
                    totalViews: Number(viewsSumResult[0]?.total) || 0,
                    hiredCount,
                    interviewsScheduled,
                    avgTimeToHire: `${avgTimeToHire}d`,
                    conversionRate: totalApplications > 0
                        ? Math.round((hiredCount / totalApplications) * 100)
                        : 0
                },
                pipeline,
                topJobs
            }
        }
    } catch (error) {
        console.error("Error fetching analytics:", error)
        return { success: false, error: "Failed to fetch analytics" }
    }
}

// Get recruiter performance
export async function getRecruiterPerformance() {
    try {
        const auth = await requirePermission("view_analytics")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const memberList = await db.query.companyMembers.findMany({
            where: eq(companyMembers.companyId, member.companyId)
        })

        const memberIds = memberList.map(m => m.id)

        // Get jobs posted per member
        let jobCountMap = new Map<string, number>()
        let reviewedCountMap = new Map<string, number>()

        if (memberIds.length > 0) {
            const jobCounts = await db
                .select({ postedById: jobs.postedById, cnt: count() })
                .from(jobs)
                .where(and(eq(jobs.companyId, member.companyId), inArray(jobs.postedById, memberIds)))
                .groupBy(jobs.postedById)
            jobCountMap = new Map(jobCounts.map(r => [r.postedById, r.cnt]))

            const reviewedCounts = await db
                .select({ reviewedById: jobApplications.reviewedById, cnt: count() })
                .from(jobApplications)
                .where(and(
                    inArray(jobApplications.reviewedById, memberIds),
                    isNotNull(jobApplications.reviewedById)
                ))
                .groupBy(jobApplications.reviewedById)
            reviewedCountMap = new Map(reviewedCounts.map(r => [r.reviewedById!, r.cnt]))
        }

        const performance = memberList.map(m => ({
            id: m.id,
            name: m.displayName || m.email?.split("@")[0] || "Unknown",
            image: null, // CompanyMember doesn't store image, would need separate User lookup
            role: m.role,
            jobsPosted: jobCountMap.get(m.id) || 0,
            applicationsReviewed: reviewedCountMap.get(m.id) || 0
        }))

        return { success: true, data: performance }
    } catch (error) {
        console.error("Error fetching recruiter performance:", error)
        return { success: false, error: "Failed to fetch performance data" }
    }
}
