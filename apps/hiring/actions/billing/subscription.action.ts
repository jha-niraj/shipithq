"use server"

import { db, companyMembers, companySubscriptions, hiringSends, jobs, interviewProcesses, memberInvitations } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { creditBalance, effectivePlan, ensureGrants } from "@/lib/plan"
import { eq, and, count, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import {
    HIRING_SUBSCRIPTION_PLANS, type HiringSubscriptionPlanType
} from "@/lib/dodopayments"
import type { SubscriptionDetails, UsageStats } from "@/types"

// Types come from @/types: a "use server" file may export only async functions,
// and Turbopack registers an `export type { ... }` list as action exports.

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
    } catch (error: unknown) {
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
        const companyId = auth.ctx.companyId
        // The plan in force and its numbers (plan/hiring-app HA-20), and any grant now owed.
        await ensureGrants(companyId)
        const { limits } = await effectivePlan(companyId)
        const [[live], [sent], [pipes], [members], [invites], credits] = await Promise.all([
            db.select({ n: count() }).from(jobs).where(and(eq(jobs.companyId, companyId), eq(jobs.status, "ACTIVE"))),
            db.select({ n: count() }).from(hiringSends).where(and(eq(hiringSends.companyId, companyId), sql`${hiringSends.createdAt} >= date_trunc('month', now())`)),
            db.select({ n: count() }).from(interviewProcesses).where(and(eq(interviewProcesses.companyId, companyId), eq(interviewProcesses.isTemplate, true), eq(interviewProcesses.isActive, true))),
            db.select({ n: count() }).from(companyMembers).where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.isActive, true))),
            db.select({ n: count() }).from(memberInvitations).where(and(eq(memberInvitations.companyId, companyId), eq(memberInvitations.status, "PENDING"))),
            creditBalance(companyId),
        ])
        return {
            success: true,
            usage: {
                jobsUsed: live?.n ?? 0,
                jobsLimit: limits.maxJobPosts,
                applicationsUsed: sent?.n ?? 0,
                applicationsLimit: limits.maxApplications,
                templatesUsed: pipes?.n ?? 0,
                templatesLimit: limits.maxPipelines,
                teamMembers: (members?.n ?? 0) + (invites?.n ?? 0),
                teamLimit: limits.maxTeamMembers,
                credits,
            },
        }
    } catch (error: unknown) {
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
    } catch (error: unknown) {
        console.error("Cancel subscription error:", error)
        return { success: false, error: "Failed to cancel subscription" }
    }
}
