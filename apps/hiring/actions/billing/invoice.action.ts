"use server"

import { db, companyMembers, companyPayments, companySubscriptions, companyInvoices } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { eq, and, sum, count, desc } from "drizzle-orm"
import {
    HIRING_SUBSCRIPTION_PLANS, type HiringSubscriptionPlanType
} from "@/lib/dodopayments"
import type { InvoiceLineItem, InvoiceDetails } from "@/types"

// Types come from @/types: a "use server" file may export only async functions,
// and Turbopack registers an `export type { ... }` list as action exports.

// ============================================
// HELPERS
// ============================================

function generateInvoiceNumber(): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `INV-${year}${month}-${random}`
}

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Get all invoices for the company
 */
export async function getInvoices(limit: number = 20): Promise<{
    success: boolean
    invoices: InvoiceDetails[]
    error?: string
}> {
    try {
        const auth = await requirePermission("billing")
        if (!auth.ok) return { success: false, invoices: [], error: auth.error }
        const member = auth.ctx.member

        const invoices = await db.query.companyInvoices.findMany({
            where: eq(companyInvoices.companyId, member.companyId),
            orderBy: [desc(companyInvoices.invoiceDate)],
            limit,
            with: { payment: true }
        })

        return {
            success: true,
            invoices: invoices.map(inv => ({
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                status: inv.status,
                invoiceDate: inv.invoiceDate,
                dueDate: inv.dueDate,
                paidAt: inv.paidAt,
                subtotal: inv.subtotal,
                taxAmount: inv.taxAmount,
                taxRate: inv.taxRate,
                discount: inv.discount,
                totalAmount: inv.totalAmount,
                currency: inv.currency,
                lineItems: (inv.lineItems as unknown as InvoiceLineItem[]) || [],
                billingName: inv.billingName,
                billingEmail: inv.billingEmail,
                billingAddress: inv.billingAddress,
                billingCity: inv.billingCity,
                billingState: inv.billingState,
                billingCountry: inv.billingCountry,
                billingPincode: inv.billingPincode,
                gstNumber: inv.gstNumber,
                pdfUrl: inv.pdfUrl,
                notes: inv.notes,
                paymentId: inv.paymentId,
                paymentStatus: inv.payment.status
            }))
        }
    } catch (error: unknown) {
        console.error("Get invoices error:", error)
        return { success: false, invoices: [], error: "Failed to fetch invoices" }
    }
}

/**
 * Get a single invoice by ID
 */
export async function getInvoiceById(invoiceId: string): Promise<{
    success: boolean
    invoice: InvoiceDetails | null
    error?: string
}> {
    try {
        const auth = await requirePermission("billing")
        if (!auth.ok) return { success: false, invoice: null, error: auth.error }
        const member = auth.ctx.member

        const invoice = await db.query.companyInvoices.findFirst({
            where: and(
                eq(companyInvoices.id, invoiceId),
                eq(companyInvoices.companyId, member.companyId)
            ),
            with: { payment: true }
        })

        if (!invoice) {
            return { success: false, invoice: null, error: "Invoice not found" }
        }

        return {
            success: true,
            invoice: {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                status: invoice.status,
                invoiceDate: invoice.invoiceDate,
                dueDate: invoice.dueDate,
                paidAt: invoice.paidAt,
                subtotal: invoice.subtotal,
                taxAmount: invoice.taxAmount,
                taxRate: invoice.taxRate,
                discount: invoice.discount,
                totalAmount: invoice.totalAmount,
                currency: invoice.currency,
                lineItems: (invoice.lineItems as unknown as InvoiceLineItem[]) || [],
                billingName: invoice.billingName,
                billingEmail: invoice.billingEmail,
                billingAddress: invoice.billingAddress,
                billingCity: invoice.billingCity,
                billingState: invoice.billingState,
                billingCountry: invoice.billingCountry,
                billingPincode: invoice.billingPincode,
                gstNumber: invoice.gstNumber,
                pdfUrl: invoice.pdfUrl,
                notes: invoice.notes,
                paymentId: invoice.paymentId,
                paymentStatus: invoice.payment.status
            }
        }
    } catch (error: unknown) {
        console.error("Get invoice error:", error)
        return { success: false, invoice: null, error: "Failed to fetch invoice" }
    }
}

/**
 * Create an invoice for a payment
 * This should be called when a payment succeeds
 */
export async function createInvoiceForPayment(paymentId: string): Promise<{
    success: boolean
    invoiceId?: string
    error?: string
}> {
    try {
        const auth = await requirePermission("billing")
        if (!auth.ok) return { success: false, error: auth.error }

        // Get the payment with company info, only if it belongs to this company
        const payment = await db.query.companyPayments.findFirst({
            where: and(eq(companyPayments.id, paymentId), eq(companyPayments.companyId, auth.ctx.companyId)),
            with: { company: true }
        })

        if (!payment) {
            return { success: false, error: "Payment not found" }
        }

        // Check if invoice already exists
        const existingInvoice = await db.query.companyInvoices.findFirst({
            where: eq(companyInvoices.paymentId, paymentId)
        })

        if (existingInvoice) {
            return { success: true, invoiceId: existingInvoice.id }
        }

        // Get plan info from payment metadata
        const metadata = payment.metadata as { plan?: HiringSubscriptionPlanType; billingCycle?: string } | null
        const plan = metadata?.plan || "PRO"
        const billingCycle = metadata?.billingCycle || "monthly"
        const planConfig = HIRING_SUBSCRIPTION_PLANS[plan]

        // Create line items
        const lineItems: InvoiceLineItem[] = [
            {
                description: `${planConfig.name} Plan - ${billingCycle === "annual" ? "Annual" : "Monthly"} Subscription`,
                quantity: 1,
                unitPrice: payment.amount,
                amount: payment.amount
            }
        ]

        // Calculate tax (18% GST for India)
        const taxRate = payment.currency === "INR" ? 18 : 0
        const subtotal = payment.amount
        const taxAmount = (subtotal * taxRate) / 100
        const totalAmount = subtotal + taxAmount

        // Generate invoice number
        const invoiceNumber = generateInvoiceNumber()

        // Set due date (immediate for already paid)
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 7) // 7 days from now

        // Create invoice
        const insertedInvoices = await db.insert(companyInvoices).values({
            companyId: payment.companyId,
            paymentId: payment.id,
            invoiceNumber,
            status: payment.status === "SUCCEEDED" ? "PAID" : "PENDING",
            lineItems: lineItems as unknown as Record<string, unknown>[],
            subtotal,
            taxAmount,
            taxRate,
            discount: 0,
            totalAmount,
            currency: payment.currency,
            billingName: payment.billingName || payment.company.name,
            billingEmail: payment.billingEmail,
            billingAddress: payment.company.address,
            billingCity: payment.company.city,
            billingState: payment.company.state,
            billingCountry: payment.company.country,
            billingPincode: payment.company.pincode,
            invoiceDate: new Date(),
            dueDate,
            paidAt: payment.status === "SUCCEEDED" ? payment.paidAt : null,
            notes: `Thank you for subscribing to ${planConfig.name} plan.`
        }).returning()

        const invoice = insertedInvoices[0]
        if (!invoice) {
            return { success: false, error: "Failed to create invoice" }
        }

        return { success: true, invoiceId: invoice.id }
    } catch (error: unknown) {
        console.error("Create invoice error:", error)
        return { success: false, error: "Failed to create invoice" }
    }
}

/**
 * Mark invoice as paid
 */
export async function markInvoicePaid(invoiceId: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const auth = await requirePermission("billing")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        await db.update(companyInvoices)
            .set({
                status: "PAID",
                paidAt: new Date()
            })
            .where(and(
                eq(companyInvoices.id, invoiceId),
                eq(companyInvoices.companyId, member.companyId)
            ))

        return { success: true }
    } catch (error: unknown) {
        console.error("Mark invoice paid error:", error)
        return { success: false, error: "Failed to update invoice" }
    }
}

/**
 * Get billing overview (summary data)
 */
export async function getBillingOverview(): Promise<{
    success: boolean
    data: {
        totalSpent: number
        currency: string
        invoiceCount: number
        lastPaymentDate: Date | null
        nextBillingDate: Date | null
    } | null
    error?: string
}> {
    try {
        const auth = await requirePermission("billing")
        if (!auth.ok) return { success: false, data: null, error: auth.error }
        const member = auth.ctx.member

        // Get subscription for next billing date
        const subscription = await db.query.companySubscriptions.findFirst({
            where: eq(companySubscriptions.companyId, member.companyId)
        })

        // Get total from paid invoices
        const paidInvoicesSums = await db
            .select({ total: sum(companyInvoices.totalAmount), cnt: count() })
            .from(companyInvoices)
            .where(and(
                eq(companyInvoices.companyId, member.companyId),
                eq(companyInvoices.status, "PAID")
            ))

        // Get last payment
        const lastPayment = await db.query.companyPayments.findFirst({
            where: and(
                eq(companyPayments.companyId, member.companyId),
                eq(companyPayments.status, "SUCCEEDED")
            ),
            orderBy: [desc(companyPayments.paidAt)]
        })

        return {
            success: true,
            data: {
                totalSpent: Number(paidInvoicesSums[0]?.total) || 0,
                currency: subscription?.currency || "INR",
                invoiceCount: paidInvoicesSums[0]?.cnt || 0,
                lastPaymentDate: lastPayment?.paidAt || null,
                nextBillingDate: subscription?.currentPeriodEnd || null
            }
        }
    } catch (error: unknown) {
        console.error("Get billing overview error:", error)
        return { success: false, data: null, error: "Failed to fetch billing overview" }
    }
}
