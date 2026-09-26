import "server-only"

import { db, companyPayments, companySubscriptions } from "@repo/db"
import { eq, or } from "drizzle-orm"
import { HIRING_SUBSCRIPTION_PLANS, type HiringSubscriptionPlanType } from "@/lib/dodopayments"
import type { WebhookPaymentData } from "@/types"

/*
 * Moved out of actions/billing/payment.action.ts (HA-6). As an export of a
 * "use server" file it was a public server action: any signed-in (or signed-out)
 * browser could call it with any payment id and status "succeeded" and upgrade
 * a company's plan. It has no user session to check a permission against, so
 * it lives here, callable only from server code (the Dodo webhook route).
 */

/**
 * Handle webhook payment event from DodoPayments
 * This should be called from a webhook API route
 */
export async function handlePaymentWebhook(data: WebhookPaymentData): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const { paymentId, amount, currency, status, metadata } = data

        // Find company by payment checkout session
        const payment = await db.query.companyPayments.findFirst({
            where: or(
                eq(companyPayments.dodoPaymentId, paymentId),
                eq(companyPayments.dodoCheckoutSessionId, paymentId)
            )
        })

        if (!payment) {
            console.error("Webhook: Payment not found:", paymentId)
            return { success: false, error: "Payment not found" }
        }

        const plan = (metadata?.plan || "PRO") as HiringSubscriptionPlanType
        const billingCycle = metadata?.billingCycle || "monthly"

        const paymentStatus = status === "succeeded" ? "SUCCEEDED" :
            status === "failed" ? "FAILED" : "PENDING"

        // Update payment record
        await db.update(companyPayments)
            .set({
                status: paymentStatus,
                dodoPaymentId: paymentId,
                paidAt: status === "succeeded" ? new Date() : undefined,
                failedAt: status === "failed" ? new Date() : undefined
            })
            .where(eq(companyPayments.id, payment.id))

        // If payment succeeded, update subscription
        if (status === "succeeded") {
            const planConfig = HIRING_SUBSCRIPTION_PLANS[plan]
            if (planConfig) {
                const periodEnd = new Date()
                periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === "annual" ? 12 : 1))

                const subData = {
                    plan,
                    status: "ACTIVE" as const,
                    amount,
                    currency,
                    billingCycle,
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: periodEnd,
                    maxJobPosts: planConfig.maxJobPosts,
                    maxApplications: planConfig.maxApplications,
                    maxInterviewTemplates: planConfig.maxInterviewTemplates,
                    maxTeamMembers: planConfig.maxTeamMembers,
                    hasAIScreening: planConfig.hasAIScreening,
                    hasCustomAssignments: planConfig.hasCustomAssignments,
                    hasPrioritySupport: planConfig.hasPrioritySupport,
                    hasAPIAccess: planConfig.hasAPIAccess,
                    hasSSO: planConfig.hasSSO,
                    hasWhiteLabel: planConfig.hasWhiteLabel
                }

                const existingSub = await db.query.companySubscriptions.findFirst({
                    where: eq(companySubscriptions.companyId, payment.companyId)
                })

                if (existingSub) {
                    await db.update(companySubscriptions)
                        .set(subData)
                        .where(eq(companySubscriptions.companyId, payment.companyId))
                } else {
                    await db.insert(companySubscriptions).values({
                        companyId: payment.companyId,
                        ...subData
                    })
                }
            }
        }

        return { success: true }
    } catch (error: unknown) {
        console.error("Payment webhook error:", error)
        return { success: false, error: "Webhook processing failed" }
    }
}
