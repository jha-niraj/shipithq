/**
 * Billing Types
 * All billing-related types for subscriptions, payments, and invoices
 */

import type { HiringSubscriptionPlanType } from "@/lib/dodopayments"

// ============================================
// INVOICE TYPES
// ============================================

export interface InvoiceLineItem {
    description: string
    quantity: number
    unitPrice: number
    amount: number
}

export interface InvoiceDetails {
    id: string
    invoiceNumber: string
    status: string
    invoiceDate: Date
    dueDate: Date | null
    paidAt: Date | null
    
    // Amounts
    subtotal: number
    taxAmount: number
    taxRate: number
    discount: number
    totalAmount: number
    currency: string
    
    // Line items
    lineItems: InvoiceLineItem[]
    
    // Billing info
    billingName: string | null
    billingEmail: string | null
    billingAddress: string | null
    billingCity: string | null
    billingState: string | null
    billingCountry: string | null
    billingPincode: string | null
    gstNumber: string | null
    
    // PDF
    pdfUrl: string | null
    notes: string | null
    
    // Payment info
    paymentId: string
    paymentStatus: string
}

// ============================================
// PAYMENT TYPES
// ============================================

export interface PaymentRecord {
    id: string
    amount: number
    currency: string
    status: string
    createdAt: Date
    description?: string | null
    paidAt?: Date | null
}

export interface WebhookPaymentData {
    paymentId: string
    subscriptionId?: string
    customerId: string
    amount: number
    currency: string
    status: string
    metadata?: Record<string, string>
}

// ============================================
// SUBSCRIPTION TYPES
// ============================================

export interface SubscriptionDetails {
    id: string
    plan: HiringSubscriptionPlanType
    planName: string
    status: string
    maxJobPosts: number
    maxApplications: number
    maxInterviewTemplates: number
    maxTeamMembers: number
    hasAIScreening: boolean
    hasCustomAssignments: boolean
    hasPrioritySupport: boolean
    hasAPIAccess: boolean
    hasSSO: boolean
    hasWhiteLabel: boolean
    currentPeriodStart: Date
    currentPeriodEnd: Date | null
    amount: number
    currency: string
    billingCycle: string
}

export interface UsageStats {
    jobsUsed: number
    jobsLimit: number
    applicationsUsed: number
    applicationsLimit: number
    templatesUsed: number
    templatesLimit: number
    teamMembers: number
    teamLimit: number
    /** Company credits (plan/hiring-app HA-20). */
    credits: number
}

// ============================================
// BILLING OVERVIEW
// ============================================

export interface BillingOverview {
    totalSpent: number
    invoicesCount: number
    pendingInvoices: number
    lastPaymentDate: Date | null
}

// ============================================
// STATUS TYPES
// ============================================

export type PaymentStatus = 
    | "SUCCEEDED" 
    | "PENDING" 
    | "PROCESSING" 
    | "FAILED" 
    | "REFUNDED" 
    | "CANCELLED"

export type InvoiceStatus = 
    | "PAID" 
    | "PENDING" 
    | "DRAFT" 
    | "OVERDUE" 
    | "CANCELLED" 
    | "REFUNDED"

export type SubscriptionStatus = 
    | "ACTIVE" 
    | "CANCELLED" 
    | "PAST_DUE" 
    | "INCOMPLETE"
