"use server"

import { db, companyMembers, companyPayments, companySubscriptions } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { CountryCode } from "@/lib/dodopayments"
import {
    dodoClient, HIRING_SUBSCRIPTION_PLANS, type HiringSubscriptionPlanType,
    createDodoCheckoutSession, getDodoPayment
} from "@/lib/dodopayments"

// ============================================
// TYPES
// ============================================

interface CreateCheckoutInput {
    plan: HiringSubscriptionPlanType
    returnUrl: string
    currency: 'INR' | 'USD'
    amount: number
}

interface CreateCheckoutResult {
    success: boolean
    sessionUrl?: string
    sessionId?: string
    error?: string
}

interface VerifyCheckoutInput {
    sessionId: string
}

interface VerifyCheckoutResult {
    success: boolean
    subscription?: {
        plan: string
        maxJobPosts: number
        maxApplications: number
        maxTeamMembers: number
    }
    error?: string
}

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Create a checkout session for subscription upgrade
 */
export async function createCheckoutSession(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    try {
        const auth = await requirePermission("billing")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const planConfig = HIRING_SUBSCRIPTION_PLANS[input.plan]
        if (!planConfig) {
            return { success: false, error: "Invalid plan" }
        }

        if (input.plan === 'FREE') {
            return { success: false, error: "Cannot checkout for free plan" }
        }

        if (input.plan === 'ENTERPRISE') {
            return { success: false, error: "Enterprise plan requires contacting sales" }
        }

        if (!dodoClient) {
            return { success: false, error: "Payment system not configured" }
        }

        // Create checkout session with Dodo Payments (RECOMMENDED approach per docs)
        const countryCode = (member.company.country || "IN") as CountryCode
        const checkoutSession = await createDodoCheckoutSession({
            product_cart: [
                {
                    product_id: planConfig.dodoProductId || "",
                    quantity: 1
                }
            ],
            customer: {
                email: member.email || "",
                name: member.displayName || member.company.name
            },
            return_url: input.returnUrl,
            billing: {
                city: member.company.city || "Unknown",
                country: countryCode,
                state: member.company.state || "Unknown",
                street: member.company.address || "Unknown",
                zipcode: member.company.pincode || "000000"
            },
            metadata: {
                companyId: member.companyId,
                plan: input.plan,
                currency: input.currency
            }
        })

        // Store pending payment record
        await db.insert(companyPayments).values({
            companyId: member.companyId,
            dodoCheckoutSessionId: checkoutSession.session_id,
            amount: input.amount,
            currency: input.currency,
            status: "PENDING",
            description: `Subscription upgrade to ${planConfig.name}`,
            metadata: {
                plan: input.plan
            }
        })

        return {
            success: true,
            sessionUrl: checkoutSession.checkout_url || undefined,
            sessionId: checkoutSession.session_id
        }
    } catch (error: unknown) {
        console.error("Create checkout error:", error)
        return { success: false, error: "Failed to create checkout session" }
    }
}

/**
 * Verify checkout session after completion
 */
export async function verifyCheckoutSession(input: VerifyCheckoutInput): Promise<VerifyCheckoutResult> {
    try {
        const auth = await requirePermission("billing")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // Find the payment record
        const payment = await db.query.companyPayments.findFirst({
            where: and(
                eq(companyPayments.dodoCheckoutSessionId, input.sessionId),
                eq(companyPayments.companyId, member.companyId)
            )
        })

        if (!payment) {
            return { success: false, error: "Payment not found" }
        }

        if (payment.status === "SUCCEEDED") {
            // Already verified
            const subscription = await db.query.companySubscriptions.findFirst({
                where: eq(companySubscriptions.companyId, member.companyId)
            })

            if (subscription) {
                return {
                    success: true,
                    subscription: {
                        plan: subscription.plan,
                        maxJobPosts: subscription.maxJobPosts,
                        maxApplications: subscription.maxApplications,
                        maxTeamMembers: subscription.maxTeamMembers
                    }
                }
            }
        }

        // Verify with Dodo Payments using the helper
        const paymentDetails = await getDodoPayment(input.sessionId)

        if (paymentDetails.status === "succeeded") {
            const metadata = payment.metadata as { plan?: HiringSubscriptionPlanType }
            const plan = metadata?.plan || "PRO"
            const planConfig = HIRING_SUBSCRIPTION_PLANS[plan]

            // Update payment status
            await db.update(companyPayments)
                .set({
                    status: "SUCCEEDED",
                    dodoPaymentId: paymentDetails.payment_id,
                    paidAt: new Date()
                })
                .where(eq(companyPayments.id, payment.id))

            // Create or update subscription
            const subData = {
                plan,
                status: "ACTIVE" as const,
                dodoSubscriptionId: paymentDetails.payment_id,
                maxJobPosts: planConfig.maxJobPosts,
                maxApplications: planConfig.maxApplications,
                maxInterviewTemplates: planConfig.maxInterviewTemplates,
                maxTeamMembers: planConfig.maxTeamMembers,
                hasAIScreening: planConfig.hasAIScreening,
                hasCustomAssignments: planConfig.hasCustomAssignments,
                hasPrioritySupport: planConfig.hasPrioritySupport,
                hasAPIAccess: planConfig.hasAPIAccess,
                hasSSO: planConfig.hasSSO,
                hasWhiteLabel: planConfig.hasWhiteLabel,
                amount: payment.amount,
                currency: payment.currency,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            }

            const existingSub = await db.query.companySubscriptions.findFirst({
                where: eq(companySubscriptions.companyId, member.companyId)
            })

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

            revalidatePath("/billing")

            return {
                success: true,
                subscription: {
                    plan: planConfig.name,
                    maxJobPosts: planConfig.maxJobPosts,
                    maxApplications: planConfig.maxApplications,
                    maxTeamMembers: planConfig.maxTeamMembers
                }
            }
        } else if (paymentDetails.status === "failed") {
            await db.update(companyPayments)
                .set({
                    status: "FAILED",
                    failedAt: new Date()
                })
                .where(eq(companyPayments.id, payment.id))
            return { success: false, error: "Payment failed" }
        }

        return { success: false, error: "Payment is still processing" }
    } catch (error: unknown) {
        console.error("Verify payment error:", error)
        return { success: false, error: "Failed to verify payment" }
    }
}
