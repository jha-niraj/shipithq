import { UNI_PLANS } from "@repo/pricing";
// Keep dodoClient as null for backward compat check in checkout.action.ts
export const dodoClient = process.env.DODO_PAYMENTS_API_KEY ? true : null;

// Subscription plan configurations for University Platform
// Field names match Prisma schema: UniversitySubscription model
/**
 * The plans themselves live in @repo/pricing (`UNI_PLANS`, plan/web/revamp REV-30), so
 * the website's /uni/pricing and this checkout can never disagree. This file only adds
 * the payment product ids, which come from the environment.
 */
export const UNIVERSITY_SUBSCRIPTION_PLANS = {
    FREE: { ...UNI_PLANS.FREE, dodoProductIdMonthly: null, dodoProductIdYearly: null },
    STARTER: {
        ...UNI_PLANS.STARTER,
        dodoProductIdMonthly: process.env.DODO_UNI_STARTER_MONTHLY_ID || null,
        dodoProductIdYearly: process.env.DODO_UNI_STARTER_YEARLY_ID || null,
    },
    GROWTH: {
        ...UNI_PLANS.GROWTH,
        dodoProductIdMonthly: process.env.DODO_UNI_GROWTH_MONTHLY_ID || null,
        dodoProductIdYearly: process.env.DODO_UNI_GROWTH_YEARLY_ID || null,
    },
    ENTERPRISE: { ...UNI_PLANS.ENTERPRISE, dodoProductIdMonthly: null, dodoProductIdYearly: null },
} as const;

export type UniversitySubscriptionPlanType = keyof typeof UNIVERSITY_SUBSCRIPTION_PLANS;

// Helper to get plan by name
export function getUniversityPlanConfig(plan: UniversitySubscriptionPlanType) {
    return UNIVERSITY_SUBSCRIPTION_PLANS[plan];
}

// Helper to get price based on currency and billing cycle
export function getUniversityPlanPrice(
    plan: UniversitySubscriptionPlanType, 
    currency: 'INR' | 'USD',
    billingCycle: 'monthly' | 'yearly' = 'monthly'
) {
    const config = UNIVERSITY_SUBSCRIPTION_PLANS[plan];
    if (billingCycle === 'yearly') {
        return currency === 'INR' ? config.yearlyPriceINR : config.yearlyPriceUSD;
    }
    return currency === 'INR' ? config.priceINR : config.priceUSD;
}

// Helper to get Dodo product ID
export function getDodoProductId(
    plan: UniversitySubscriptionPlanType,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
) {
    const config = UNIVERSITY_SUBSCRIPTION_PLANS[plan];
    return billingCycle === 'yearly' 
        ? config.dodoProductIdYearly 
        : config.dodoProductIdMonthly;
}

// Helper to check if plan has a feature
export function planHasFeature(
    plan: UniversitySubscriptionPlanType,
    feature: keyof Omit<typeof UNIVERSITY_SUBSCRIPTION_PLANS.STARTER, 
        'name' | 'description' | 'priceINR' | 'priceUSD' | 'yearlyPriceINR' | 'yearlyPriceUSD' | 
        'billingCycle' | 'dodoProductIdMonthly' | 'dodoProductIdYearly' | 'features' | 'isPopular'>
) {
    return UNIVERSITY_SUBSCRIPTION_PLANS[plan][feature];
}

// Get plan limits (match Prisma schema fields)
export function getPlanLimits(plan: UniversitySubscriptionPlanType) {
    const config = UNIVERSITY_SUBSCRIPTION_PLANS[plan];
    return {
        maxStudents: config.maxStudents,
        maxFaculty: config.maxFaculty,
        maxDepartments: config.maxDepartments,
        maxClassesPerFaculty: config.maxClassesPerFaculty,
        maxCreditsPerMonth: config.maxCreditsPerMonth,
    };
}

// Get plan features as boolean map (match Prisma schema fields)
export function getPlanFeatures(plan: UniversitySubscriptionPlanType) {
    const config = UNIVERSITY_SUBSCRIPTION_PLANS[plan];
    return {
        hasAnalytics: config.hasAnalytics,
        hasAdvancedReports: config.hasAdvancedReports,
        hasPlacementModule: config.hasPlacementModule,
        hasCompanyPortal: config.hasCompanyPortal,
        hasAPIAccess: config.hasAPIAccess,
        hasPrioritySupport: config.hasPrioritySupport,
        hasWhiteLabel: config.hasWhiteLabel,
        hasCustomBranding: config.hasCustomBranding,
    };
}

// Compare plans for upgrade/downgrade
export function comparePlans(
    currentPlan: UniversitySubscriptionPlanType,
    newPlan: UniversitySubscriptionPlanType
): 'upgrade' | 'downgrade' | 'same' {
    const planOrder: Record<UniversitySubscriptionPlanType, number> = {
        FREE: 0,
        STARTER: 1,
        GROWTH: 2,
        ENTERPRISE: 3,
    };
    
    const currentOrder = planOrder[currentPlan];
    const newOrder = planOrder[newPlan];
    
    if (newOrder > currentOrder) return 'upgrade';
    if (newOrder < currentOrder) return 'downgrade';
    return 'same';
}

// ============================================
// DODO PAYMENTS API HELPERS
// Following official Dodo Payments documentation:
// https://docs.dodopayments.com/llms.txt
// ============================================

export type CountryCode = string

export interface DodoCustomer {
    email: string;
    name: string;
    phone_number?: string;
}

export interface DodoBilling {
    city: string;
    country: CountryCode;
    state: string;
    street: string;
    zipcode: string;
}

export interface DodoProductCartItem {
    product_id: string;
    quantity: number;
}

export interface CreateCheckoutSessionOptions {
    product_cart: DodoProductCartItem[];
    customer: DodoCustomer;
    return_url: string;
    billing?: DodoBilling;
    metadata?: Record<string, string>;
    // For subscription products - optional trial period
    subscription_data?: {
        trial_period_days?: number;
    };
}

export interface CreatePaymentLinkOptions {
    product_cart: DodoProductCartItem[];
    customer: DodoCustomer;
    billing: DodoBilling;
    return_url?: string;
    metadata?: Record<string, string>;
}

function getDodoBaseUrl(): string {
    return process.env.NODE_ENV === 'production'
        ? 'https://live.dodopayments.com'
        : 'https://test.dodopayments.com'
}

function getDodoHeaders() {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY
    if (!apiKey) throw new Error('DODO_PAYMENTS_API_KEY is not set')
    return {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    }
}

/**
 * Create a Checkout Session (RECOMMENDED approach per Dodo docs)
 *
 * Use Checkout Sessions to create a secure, hosted checkout experience.
 * Sessions are valid for 24 hours by default.
 *
 * For subscriptions, you can include subscription_data with trial_period_days.
 *
 * @returns Session with checkout_url to redirect customer
 */
export async function createDodoCheckoutSession(options: CreateCheckoutSessionOptions) {
    const res = await fetch(`${getDodoBaseUrl()}/checkouts`, {
        method: 'POST',
        headers: getDodoHeaders(),
        body: JSON.stringify({
            product_cart: options.product_cart,
            customer: options.customer,
            return_url: options.return_url,
            ...(options.billing && { billing: options.billing }),
            ...(options.metadata && { metadata: options.metadata }),
            ...(options.subscription_data && { subscription_data: options.subscription_data }),
        }),
    })
    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Dodo Payments checkout error ${res.status}: ${err}`)
    }
    const session = await res.json() as { checkout_url?: string; session_id?: string }
    return {
        checkout_url: session.checkout_url,
        session_id: session.session_id,
        raw: session,
    }
}

/**
 * Create a Dynamic Payment Link
 *
 * Use when you need a shareable payment link.
 * Note: Checkout Sessions are recommended for most use cases.
 *
 * IMPORTANT: Must pass payment_link: true to get the payment link URL.
 */
export async function createDodoPaymentLink(options: CreatePaymentLinkOptions) {
    const res = await fetch(`${getDodoBaseUrl()}/payments`, {
        method: 'POST',
        headers: getDodoHeaders(),
        body: JSON.stringify({
            payment_link: true,
            product_cart: options.product_cart,
            customer: options.customer,
            billing: options.billing,
            ...(options.return_url && { return_url: options.return_url }),
            ...(options.metadata && { metadata: options.metadata }),
        }),
    })
    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Dodo Payments payment link error ${res.status}: ${err}`)
    }
    const payment = await res.json() as { payment_id?: string; payment_link?: string }
    return {
        payment_id: payment.payment_id,
        payment_link: payment.payment_link,
        raw: payment,
    }
}

/**
 * Retrieve payment details by ID
 * Used to verify payment status after customer returns from checkout.
 */
export async function getDodoPayment(paymentId: string) {
    const res = await fetch(`${getDodoBaseUrl()}/payments/${paymentId}`, {
        headers: getDodoHeaders(),
    })
    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Dodo Payments retrieve error ${res.status}: ${err}`)
    }
    return res.json() as Promise<{ payment_id?: string; status?: string; [key: string]: unknown }>
}
export async function getDodoCustomerPortalUrl(customerId: string): Promise<string> {
    const res = await fetch(`${getDodoBaseUrl()}/customers/${customerId}/customer-portal/sessions`, {
        method: 'POST',
        headers: getDodoHeaders(),
    })
    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Dodo customer portal error ${res.status}: ${err}`)
    }
    const data = await res.json() as { url?: string; link?: string }
    return data.url || data.link || ''
}
