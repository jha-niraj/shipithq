"use server"

import { db, companyMembers, jobs, jobApplications } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { eq, and, count, gte, inArray } from "drizzle-orm"

// ============================================
// JOB ANALYTICS
// ============================================

export async function getJobStats(jobId: string) {
    try {
        const auth = await requirePermission("view_analytics")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const job = await db.query.jobs.findFirst({
            where: and(eq(jobs.id, jobId), eq(jobs.companyId, member.companyId)),
            columns: {
                id: true,
                title: true,
                viewsCount: true,
                applicationsCount: true
            },
            with: {
                applications: {
                    columns: { status: true }
                }
            }
        })

        if (!job) {
            return { success: false, error: "Job not found" }
        }

        // Calculate status breakdown
        const statusCounts = job.applications.reduce((acc, app) => {
            acc[app.status] = (acc[app.status] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        return {
            success: true,
            data: {
                views: job.viewsCount,
                totalApplications: job.applications.length,
                conversionRate: job.viewsCount > 0
                    ? ((job.applications.length / job.viewsCount) * 100).toFixed(1)
                    : 0,
                statusBreakdown: statusCounts
            }
        }
    } catch (error) {
        console.error("Error fetching job stats:", error)
        return { success: false, error: "Failed to fetch job stats" }
    }
}

export async function getJobsOverview() {
    try {
        const auth = await requirePermission("view_analytics")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const allJobIds = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        const jobIds = allJobIds.map(j => j.id)

        const totalJobsRows = await db
            .select({ count: count() })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))

        const activeJobsRows = await db
            .select({ count: count() })
            .from(jobs)
            .where(and(eq(jobs.companyId, member.companyId), eq(jobs.status, "ACTIVE")))

        let totalApplications = 0
        let recentApplications = 0
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
                    gte(jobApplications.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
                ))

            totalApplications = totalAppsRows[0]?.count ?? 0
            recentApplications = recentAppsRows[0]?.count ?? 0
        }

        return {
            success: true,
            data: {
                totalJobs: totalJobsRows[0]?.count ?? 0,
                activeJobs: activeJobsRows[0]?.count ?? 0,
                totalApplications,
                recentApplications
            }
        }
    } catch (error) {
        console.error("Error fetching jobs overview:", error)
        return { success: false, error: "Failed to fetch overview" }
    }
}

// Get overall job stats for the jobs page
export async function getOverallJobStats() {
    try {
        const auth = await requirePermission("view_analytics")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const jobList = await db
            .select({
                status: jobs.status,
                viewsCount: jobs.viewsCount,
                applicationsCount: jobs.applicationsCount
            })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))

        const stats = jobList.reduce((acc, job) => {
            acc.total++
            acc.totalViews += job.viewsCount
            acc.totalApplications += job.applicationsCount

            switch (job.status) {
                case "ACTIVE":
                    acc.active++
                    break
                case "PAUSED":
                    acc.paused++
                    break
                case "DRAFT":
                    acc.draft++
                    break
                case "CLOSED":
                    acc.closed++
                    break
            }

            return acc
        }, {
            total: 0,
            active: 0,
            paused: 0,
            draft: 0,
            closed: 0,
            totalViews: 0,
            totalApplications: 0
        })

        return { success: true, data: stats }
    } catch (error) {
        console.error("Error fetching overall job stats:", error)
        return { success: false, error: "Failed to fetch stats" }
    }
}
