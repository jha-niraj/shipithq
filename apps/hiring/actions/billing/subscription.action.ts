"use server"

import { db, companyMembers, companySubscriptions, jobs, jobApplications, interviewProcesses } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { eq, and, count, gte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import {
    HIRING_SUBSCRIPTION_PLANS, type HiringSubscriptionPlanType
} from "@/lib/dodopayments"
import type { SubscriptionDetails, UsageStats } from "@/types"

// Re-export types for backward compatibility
export type { SubscriptionDetails, UsageStats }

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Get current subscription for the company
 */
export async function getCurrentSubscription(): Promise<{
    success: boolean
    subscription: SubscriptionDetails | null
    error?: string
}> {
    try {
        const auth = await requirePermission("billing")
        if (!auth.ok) return { success: false, subscription: null, error: auth.error }
        const member = auth.ctx.member

        const subscription = await db.query.companySubscriptions.findFirst({
            where: eq(companySubscriptions.companyId, member.companyId)
        })

        if (!subscription) {
            // Return free plan defaults
            const freePlan = HIRING_SUBSCRIPTION_PLANS.FREE
            return {
                success: true,
                subscription: {
                    id: "free",
                    plan: "FREE",
                    planName: freePlan.name,
                    status: "ACTIVE",
                    maxJobPosts: freePlan.maxJobPosts,
                    maxApplications: freePlan.maxApplications,
                    maxInterviewTemplates: freePlan.maxInterviewTemplates,
                    maxTeamMembers: freePlan.maxTeamMembers,
                    hasAIScreening: freePlan.hasAIScreening,
                    hasCustomAssignments: freePlan.hasCustomAssignments,
                    hasPrioritySupport: freePlan.hasPrioritySupport,
                    hasAPIAccess: freePlan.hasAPIAccess,
                    hasSSO: freePlan.hasSSO,
                    hasWhiteLabel: freePlan.hasWhiteLabel,
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: null,
                    amount: 0,
                    currency: "INR",
                    billingCycle: "monthly"
                }
            }
        }

        const planConfig = HIRING_SUBSCRIPTION_PLANS[subscription.plan as HiringSubscriptionPlanType]

        return {
            success: true,
            subscription: {
                id: subscription.id,
                plan: subscription.plan as HiringSubscriptionPlanType,
                planName: planConfig?.name || subscription.plan,
                status: subscription.status,
                maxJobPosts: subscription.maxJobPosts,
                maxApplications: subscription.maxApplications,
                maxInterviewTemplates: subscription.maxInterviewTemplates,
                maxTeamMembers: subscription.maxTeamMembers,
                hasAIScreening: subscription.hasAIScreening,
                hasCustomAssignments: subscription.hasCustomAssignments,
                hasPrioritySupport: subscription.hasPrioritySupport,
                hasAPIAccess: subscription.hasAPIAccess,
                hasSSO: subscription.hasSSO,
                hasWhiteLabel: subscription.hasWhiteLabel,
                currentPeriodStart: subscription.currentPeriodStart,
                currentPeriodEnd: subscription.currentPeriodEnd,
                amount: subscription.amount,
                currency: subscription.currency,
                billingCycle: subscription.billingCycle
            }
        }
    } catch (error) {
        console.error("Get subscription error:", error)
        return { success: false, subscription: null, error: "Failed to fetch subscription" }
    }
}

/**
 * Get usage statistics for the company
 */
export async function getUsageStats(): Promise<{
    success: boolean
    usage: UsageStats | null
    error?: string
}> {
    try {
        const auth = await requirePermission("billing")
        if (!auth.ok) return { success: false, usage: null, error: auth.error }
        const member = auth.ctx.member

        // Get subscription limits
        const subscription = await db.query.companySubscriptions.findFirst({
            where: eq(companySubscriptions.companyId, member.companyId)
        })

        const limits = subscription || {
            maxJobPosts: HIRING_SUBSCRIPTION_PLANS.FREE.maxJobPosts,
            maxApplications: HIRING_SUBSCRIPTION_PLANS.FREE.maxApplications,
            maxInterviewTemplates: HIRING_SUBSCRIPTION_PLANS.FREE.maxInterviewTemplates,
            maxTeamMembers: HIRING_SUBSCRIPTION_PLANS.FREE.maxTeamMembers
        }

        // Get current month usage
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        // Count applications this month
        const companyJobIds = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        const jobIds = companyJobIds.map(j => j.id)

        let applicationsThisMonth = 0
        if (jobIds.length > 0) {
            const { inArray } = await import("drizzle-orm")
            const appsRows = await db
                .select({ count: count() })
                .from(jobApplications)
                .where(and(
                    inArray(jobApplications.jobId, jobIds),
                    gte(jobApplications.appliedAt, startOfMonth)
                ))
            applicationsThisMonth = appsRows[0]?.count ?? 0
        }

        // Count interview templates
        const interviewTemplatesRows = await db
            .select({ count: count() })
            .from(interviewProcesses)
            .where(eq(interviewProcesses.companyId, member.companyId))

        // Count team members
        const teamMembersRows = await db
            .select({ count: count() })
            .from(companyMembers)
            .where(eq(companyMembers.companyId, member.companyId))

        // Count active jobs
        const activeJobsRows = await db
            .select({ count: count() })
            .from(jobs)
            .where(and(
                eq(jobs.companyId, member.companyId),
                eq(jobs.status, "ACTIVE")
            ))

        return {
            success: true,
            usage: {
                jobsUsed: activeJobsRows[0]?.count ?? 0,
                jobsLimit: limits.maxJobPosts,
                applicationsUsed: applicationsThisMonth,
                applicationsLimit: limits.maxApplications,
                templatesUsed: interviewTemplatesRows[0]?.count ?? 0,
                templatesLimit: limits.maxInterviewTemplates,
                teamMembers: teamMembersRows[0]?.count ?? 0,
                teamLimit: limits.maxTeamMembers
            }
        }
    } catch (error) {
        console.error("Get usage stats error:", error)
        return { success: false, usage: null, error: "Failed to fetch usage stats" }
    }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const auth = await requirePermission("billing")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const subscription = await db.query.companySubscriptions.findFirst({
            where: eq(companySubscriptions.companyId, member.companyId)
        })

        if (!subscription) {
            return { success: false, error: "No active subscription found" }
        }

        if (subscription.plan === "FREE") {
            return { success: false, error: "Cannot cancel free plan" }
        }

        // Mark subscription as cancelled (will remain active until period end)
        await db.update(companySubscriptions)
            .set({
                status: "CANCELLED",
                cancelledAt: new Date()
            })
            .where(eq(companySubscriptions.id, subscription.id))

        revalidatePath("/billing")

        return { success: true }
    } catch (error) {
        console.error("Cancel subscription error:", error)
        return { success: false, error: "Failed to cancel subscription" }
    }
}

/**
 * Check if company can perform action based on subscription limits
 */
export async function checkSubscriptionLimit(action: 'job' | 'application' | 'template' | 'member'): Promise<{
    allowed: boolean
    message?: string
    currentUsage?: number
    limit?: number
}> {
    try {
        const auth = await requirePermission("billing")
        if (!auth.ok) return { allowed: false, message: auth.error }

        const usageResult = await getUsageStats()
        if (!usageResult.success || !usageResult.usage) {
            return { allowed: false, message: "Failed to check limits" }
        }

        const usage = usageResult.usage

        switch (action) {
            case 'job':
                if (usage.jobsUsed >= usage.jobsLimit) {
                    return {
                        allowed: false,
                        message: `Job post limit reached (${usage.jobsLimit}). Please upgrade your plan.`,
                        currentUsage: usage.jobsUsed,
                        limit: usage.jobsLimit
                    }
                }
                break
            case 'application':
                if (usage.applicationsUsed >= usage.applicationsLimit) {
                    return {
                        allowed: false,
                        message: `Monthly application limit reached (${usage.applicationsLimit}). Please upgrade your plan.`,
                        currentUsage: usage.applicationsUsed,
                        limit: usage.applicationsLimit
                    }
                }
                break
            case 'template':
                if (usage.templatesUsed >= usage.templatesLimit) {
                    return {
                        allowed: false,
                        message: `Interview template limit reached (${usage.templatesLimit}). Please upgrade your plan.`,
                        currentUsage: usage.templatesUsed,
                        limit: usage.templatesLimit
                    }
                }
                break
            case 'member':
                if (usage.teamMembers >= usage.teamLimit) {
                    return {
                        allowed: false,
                        message: `Team member limit reached (${usage.teamLimit}). Please upgrade your plan.`,
                        currentUsage: usage.teamMembers,
                        limit: usage.teamLimit
                    }
                }
                break
        }

        return { allowed: true }
    } catch (error) {
        console.error("Check subscription limit error:", error)
        return { allowed: false, message: "Failed to check subscription limits" }
    }
}
