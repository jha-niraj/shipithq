"use server"

import { requirePermission } from "@/lib/permissions"
import { RANGES, loadAnalytics, type AnalyticsData, type RangeWeeks } from "@/lib/analytics"

/*
 * The company's analytics (plan/hiring-app HA-21), for members with "view
 * analytics". The numbers come from results and round attempts, counted in
 * lib/analytics.ts.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

export async function getAnalytics(weeks: number): Promise<Result<AnalyticsData>> {
    const auth = await requirePermission("view_analytics")
    if (!auth.ok) return { success: false, error: auth.error }
    const range = (RANGES as readonly number[]).includes(weeks) ? (weeks as RangeWeeks) : 12
    try {
        return { success: true, data: await loadAnalytics(auth.ctx.companyId, range) }
    } catch (error: unknown) {
        console.error("getAnalytics:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the analytics" }
    }
}
