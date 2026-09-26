"use server"

import { db, hiringSends, jobs } from "@repo/db"
import { notPurged } from "@repo/db/hiring-purge"
import { requirePermission } from "@/lib/permissions"
import { eq, and, count, ne } from "drizzle-orm"

// ============================================
// JOB ANALYTICS
// ============================================

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
            })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        // Results received, not old applications (plan/hiring-app HA-23).
        const [received] = await db.select({ n: count() }).from(hiringSends)
            .where(and(eq(hiringSends.companyId, member.companyId), ne(hiringSends.status, "WITHDRAWN"), notPurged))

        const stats = jobList.reduce((acc, job) => {
            acc.total++
            acc.totalViews += job.viewsCount

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

        stats.totalApplications = Number(received?.n ?? 0)
        return { success: true, data: stats }
    } catch (error: unknown) {
        console.error("Error fetching overall job stats:", error)
        return { success: false, error: "Failed to fetch stats" }
    }
}
