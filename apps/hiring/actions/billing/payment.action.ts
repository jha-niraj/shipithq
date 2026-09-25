"use server"

import { db, companyMembers, companyPayments, companySubscriptions } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { eq, and, or, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import {
    dodoClient, HIRING_SUBSCRIPTION_PLANS, getDodoPayment, type HiringSubscriptionPlanType
} from "@/lib/dodopayments"
import type { PaymentRecord, WebhookPaymentData } from "@/types"

// Re-export types for backward compatibility
export type { PaymentRecord, WebhookPaymentData }

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Get payment history for the company
 */
export async function getPaymentHistory(limit: number = 10): Promise<{
    success: boolean
    payments: PaymentRecord[]
    error?: string
}> {
    try {
        const auth = await requirePermission("billing")
        if (!auth.ok) return { success: false, payments: [], error: auth.error }
        const member = auth.ctx.member

        const payments = await db.query.companyPayments.findMany({
            where: eq(companyPayments.companyId, member.companyId),
            orderBy: [desc(companyPayments.createdAt)],
            limit
        })

        return {
            success: true,
            payments: payments.map(p => ({
                id: p.id,
                amount: p.amount,
                currency: p.currency,
                status: p.status,
                createdAt: p.createdAt,
                description: p.description,
                paidAt: p.paidAt
            }))
        }
    } catch (error) {
        console.error("Get payment history error:", error)
        return { success: false, payments: [], error: "Failed to fetch payment history" }
    }
}

/**
 * Verify a payment and activate subscription
 */
export async function verifyPayment(paymentId: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const auth = await requirePermission("billing")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // Get payment record from database
        const payment = await db.query.companyPayments.findFirst({
            where: and(
                eq(companyPayments.dodoPaymentId, paymentId),
                eq(companyPayments.companyId, member.companyId)
            ),
            with: { subscription: true }
        })

        if (!payment) {
            return { success: false, error: "Payment not found" }
        }

        // If already succeeded, return success
        if (payment.status === "SUCCEEDED") {
            return { success: true }
        }

        // Verify payment with DodoPayments
        if (!dodoClient) {
            return { success: false, error: "Payment system not configured" }
        }

        const paymentDetails = await getDodoPayment(paymentId)

        if (paymentDetails.status === "succeeded") {
            // Update payment status
            await db.update(companyPayments)
                .set({ status: "SUCCEEDED", paidAt: new Date() })
                .where(eq(companyPayments.id, payment.id))

            // Activate or update subscription if metadata contains plan info
            const metadata = payment.metadata as { plan?: HiringSubscriptionPlanType; billingCycle?: string } | null
            const plan = metadata?.plan || "PRO"
            const billingCycle = metadata?.billingCycle || "monthly"
            const planConfig = HIRING_SUBSCRIPTION_PLANS[plan]

            if (planConfig) {
                const periodEnd = new Date()
                periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === "annual" ? 12 : 1))

                const existingSub = await db.query.companySubscriptions.findFirst({
                    where: eq(companySubscriptions.companyId, member.companyId)
                })

                const subData = {
                    plan,
                    status: "ACTIVE" as const,
                    amount: payment.amount,
                    currency: payment.currency,
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

                if (existingSub) {
                    await db.update(companySubscriptions)
                        .set(subData)
                        .where(eq(companySubscriptions.companyId, member.companyId))
                } else {
                    await db.insert(companySubscriptions).values({
                        companyId: member.companyId,
                        ...subData
                    })
                }
            }

            // Create invoice for the payment
            const { createInvoiceForPayment } = await import("./invoice.action")
            await createInvoiceForPayment(payment.id)

            revalidatePath("/billing")
            return { success: true }
        }

        if (paymentDetails.status === "failed") {
            await db.update(companyPayments)
                .set({ status: "FAILED", failedAt: new Date() })
                .where(eq(companyPayments.id, payment.id))
            return { success: false, error: "Payment failed" }
        }

        // Still pending
        return { success: false, error: "Payment is still processing" }
    } catch (error) {
        console.error("Verify payment error:", error)
        return { success: false, error: "Failed to verify payment" }
    }
}
