"use client"

import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { useEffect, useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
    CreditCard, Check, ArrowRight, Briefcase, Users, FileText,
    Sparkles, Building2, AlertCircle,
    Receipt, Download, Wallet, CalendarCheck, CalendarClock
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import Loading from "./loading"
import { 
    Dialog, DialogContent, DialogDescription, DialogHeader, 
    DialogTitle, DialogFooter 
} from "@repo/ui/components/ui/dialog"
import { Alert, AlertDescription } from "@repo/ui/components/ui/alert"
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@repo/ui/components/ui/accordion"
import {
    Tabs, TabsContent, TabsList, TabsTrigger,
} from "@repo/ui/components/ui/tabs"
import { 
    HIRING_SUBSCRIPTION_PLANS, type HiringSubscriptionPlanType 
} from "@/lib/dodopayments"
import { 
    getCurrentSubscription, getUsageStats, cancelSubscription,
    type SubscriptionDetails, type UsageStats
} from "@/actions/billing/subscription.action"
import { 
    createCheckoutSession 
} from "@/actions/billing/checkout.action"
import { 
    getPaymentHistory, type PaymentRecord
} from "@/actions/billing/payment.action"
import {
    getInvoices, getBillingOverview,
    type InvoiceDetails
} from "@/actions/billing/invoice.action"

// ============================================
// COMPONENTS
// ============================================

/**
 * One usage meter as a StatBand cell. An unlimited allowance keeps the full
 * track the old card drew, and shows "used / ∞" as before.
 */
function usageItem(label: string, used: number, limit: number, icon: StatBandItem["icon"]): StatBandItem {
    const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0
    const isUnlimited = limit >= 999999
    return {
        icon,
        label,
        value: isUnlimited ? `${used} / ∞` : `${used}/${limit}`,
        progress: isUnlimited ? 100 : percentage,
    }
}

function PricingCard({ 
    planKey, 
    currentPlan,
    onSelectPlan,
    isPending,
    currency = "INR"
}: { 
    planKey: HiringSubscriptionPlanType
    currentPlan: HiringSubscriptionPlanType
    onSelectPlan: (plan: HiringSubscriptionPlanType) => void
    isPending: boolean
    currency: "INR" | "USD"
}) {
    const plan = HIRING_SUBSCRIPTION_PLANS[planKey]
    const isPro = planKey === "PRO"
    const isCurrent = planKey === currentPlan
    const price = currency === "INR" ? plan.priceINR : plan.priceUSD
    const priceSymbol = currency === "INR" ? "₹" : "$"

    return (
        <div
            className={`relative rounded-2xl overflow-hidden ${
                isPro
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xl'
                    : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800'
            }`}
        >
            {planKey === "PRO" && (
                <div className="absolute top-4 right-4">
                    <Badge className="bg-white text-neutral-900 hover:bg-white dark:bg-neutral-900 dark:text-white">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Most Popular
                    </Badge>
                </div>
            )}
            {isCurrent && (
                <div className="absolute top-4 right-4">
                    <Badge variant="outline" className={`${
                        isPro 
                            ? 'border-white text-white' 
                            : 'border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
                    }`}>
                        Current Plan
                    </Badge>
                </div>
            )}

            <div className="p-6">
                <div className="mb-6">
                    <h3 className={`font-semibold text-lg ${
                        isPro ? 'text-white dark:text-neutral-900' : 'text-neutral-900 dark:text-neutral-100'
                    }`}>
                        {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mt-2">
                        <span className={`text-4xl font-bold ${
                            isPro ? 'text-white dark:text-neutral-900' : 'text-neutral-900 dark:text-neutral-100'
                        }`}>
                            {planKey === "ENTERPRISE" ? "Custom" : `${priceSymbol}${price.toLocaleString()}`}
                        </span>
                        {planKey !== "ENTERPRISE" && (
                            <span className={isPro ? 'text-white/60 dark:text-neutral-500' : 'text-neutral-500'}>
                                /month
                            </span>
                        )}
                    </div>
                </div>

                <ul className="space-y-3 mb-6">
                    {plan.features.slice(0, 6).map((feature, j) => (
                        <li key={j} className="flex items-start gap-2.5">
                            <div className={`p-1 rounded-full mt-0.5 ${
                                isPro ? 'bg-white/20 dark:bg-neutral-200' : 'bg-neutral-100 dark:bg-neutral-800/30'
                            }`}>
                                <Check className={`h-3 w-3 ${
                                    isPro ? 'text-white dark:text-neutral-900' : 'text-neutral-800 dark:text-neutral-100'
                                }`} />
                            </div>
                            <span className={`text-sm ${
                                isPro ? 'text-white/90 dark:text-neutral-700' : 'text-neutral-600 dark:text-neutral-300'
                            }`}>
                                {feature}
                            </span>
                        </li>
                    ))}
                </ul>

                <Button
                    className={`w-full ${
                        isPro
                            ? 'bg-white text-neutral-900 hover:bg-white/90 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800'
                            : isCurrent
                                ? 'bg-neutral-100 text-neutral-500 hover:bg-neutral-100 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-400'
                                : 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200'
                    }`}
                    disabled={isCurrent || isPending}
                    onClick={() => onSelectPlan(planKey)}
                >
                    {isPending && <InlineLoader size="sm" className="mr-2" />}
                    {isCurrent 
                        ? 'Current Plan' 
                        : planKey === 'ENTERPRISE' 
                            ? 'Contact Sales' 
                            : planKey === 'FREE'
                                ? 'Downgrade'
                                : 'Upgrade Now'
                    }
                    {!isCurrent && !isPending && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
            </div>
        </div>
    )
}

function InvoiceRow({ invoice }: { invoice: InvoiceDetails }) {
    const statusColors = {
        PAID: 'text-neutral-800 bg-neutral-100 dark:text-neutral-100 dark:bg-neutral-800/30',
        PENDING: 'text-neutral-800 bg-neutral-100 dark:text-neutral-100 dark:bg-neutral-800/30',
        DRAFT: 'text-neutral-600 bg-neutral-100 dark:text-neutral-400 dark:bg-neutral-800',
        VOID: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
        UNCOLLECTIBLE: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
    }

    return (
        <div className="flex items-center justify-between py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
            <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <Receipt className="h-4 w-4 text-neutral-500" />
                </div>
                <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {invoice.invoiceNumber}
                    </p>
                    <p className="text-xs text-neutral-500">
                        {new Date(invoice.invoiceDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {invoice.currency === 'INR' ? '₹' : '$'}{invoice.totalAmount.toLocaleString()}
                </span>
                <Badge className={statusColors[invoice.status as keyof typeof statusColors] || statusColors.PENDING}>
                    {invoice.status}
                </Badge>
                {invoice.pdfUrl && (
                    <Button variant="ghost" size="sm" asChild>
                        <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                        </a>
                    </Button>
                )}
            </div>
        </div>
    )
}

function PaymentRow({ payment }: { payment: PaymentRecord }) {
    const statusColors = {
        SUCCEEDED: 'text-neutral-800 bg-neutral-100 dark:text-neutral-100 dark:bg-neutral-800/30',
        PENDING: 'text-neutral-800 bg-neutral-100 dark:text-neutral-100 dark:bg-neutral-800/30',
        FAILED: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
        PROCESSING: 'text-neutral-800 bg-neutral-100 dark:text-neutral-100 dark:bg-neutral-800/30',
        REFUNDED: 'text-neutral-600 bg-neutral-100 dark:text-neutral-400 dark:bg-neutral-800',
        CANCELLED: 'text-neutral-600 bg-neutral-100 dark:text-neutral-400 dark:bg-neutral-800',
    }

    return (
        <div className="flex items-center justify-between py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
            <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <CreditCard className="h-4 w-4 text-neutral-500" />
                </div>
                <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {payment.description || 'Subscription Payment'}
                    </p>
                    <p className="text-xs text-neutral-500">
                        {new Date(payment.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {payment.currency === 'INR' ? '₹' : '$'}{payment.amount.toLocaleString()}
                </span>
                <Badge className={statusColors[payment.status as keyof typeof statusColors] || statusColors.PENDING}>
                    {payment.status}
                </Badge>
            </div>
        </div>
    )
}

// FAQ Data
const faqs = [
    {
        question: "Can I change plans anytime?",
        answer: "Yes! You can upgrade or downgrade your plan at any time. When you upgrade, you'll be charged the prorated amount for the remaining period. When you downgrade, the change will take effect at the end of your current billing period."
    },
    {
        question: "What happens if I exceed my limits?",
        answer: "We'll notify you when you're approaching your limits (at 80% usage). If you reach your limit, you can still view existing data but won't be able to create new items until you upgrade or wait for your limit to reset at the start of the next billing period."
    },
    {
        question: "Do you offer refunds?",
        answer: "Yes, we offer a 14-day money-back guarantee on all paid plans. If you're not satisfied within the first 14 days, contact our support team for a full refund. After 14 days, refunds are handled on a case-by-case basis."
    },
    {
        question: "How does Enterprise pricing work?",
        answer: "Enterprise pricing is customized based on your organization's specific needs, including the number of users, job posts, and additional features like SSO, API access, and dedicated support. Contact our sales team for a personalized quote."
    },
    {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit and debit cards (Visa, Mastercard, American Express), UPI, net banking, and wallets for Indian customers. International customers can pay via credit/debit cards and PayPal."
    },
    {
        question: "Is my payment information secure?",
        answer: "Absolutely. We use industry-standard encryption and never store your complete card details on our servers. All payments are processed through secure, PCI-DSS compliant payment gateways."
    },
]

// ============================================
// MAIN COMPONENT
// ============================================

export default function BillingPage() {
    const searchParams = useSearchParams()
    const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null)
    const [usage, setUsage] = useState<UsageStats | null>(null)
    const [payments, setPayments] = useState<PaymentRecord[]>([])
    const [invoices, setInvoices] = useState<InvoiceDetails[]>([])
    const [billingOverview, setBillingOverview] = useState<{
        totalSpent: number
        currency: string
        invoiceCount: number
        lastPaymentDate: Date | null
        nextBillingDate: Date | null
    } | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currency, setCurrency] = useState<"INR" | "USD">("INR")
    
    // Dialog states
    const [upgradeDialog, setUpgradeDialog] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<HiringSubscriptionPlanType | null>(null)
    const [cancelDialog, setCancelDialog] = useState(false)
    
    const [isPending, startTransition] = useTransition()

    // Handle URL params for plan selection
    useEffect(() => {
        const planParam = searchParams.get('plan') as HiringSubscriptionPlanType | null
        const currencyParam = searchParams.get('currency') as "INR" | "USD" | null
        
        if (currencyParam) {
            setCurrency(currencyParam)
        }
        
        if (planParam && planParam !== 'FREE' && planParam !== 'ENTERPRISE') {
            setSelectedPlan(planParam)
            setUpgradeDialog(true)
        }
    }, [searchParams])

    // Load data
    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true)
                const [subResult, usageResult, paymentsResult, invoicesResult, overviewResult] = await Promise.all([
                    getCurrentSubscription(),
                    getUsageStats(),
                    getPaymentHistory(10),
                    getInvoices(10),
                    getBillingOverview(),
                ])

                if (subResult.success && subResult.subscription) {
                    setSubscription(subResult.subscription)
                    setCurrency(subResult.subscription.currency as "INR" | "USD")
                }
                if (usageResult.success && usageResult.usage) {
                    setUsage(usageResult.usage)
                }
                if (paymentsResult.success) {
                    setPayments(paymentsResult.payments)
                }
                if (invoicesResult.success) {
                    setInvoices(invoicesResult.invoices)
                }
                if (overviewResult.success && overviewResult.data) {
                    setBillingOverview(overviewResult.data)
                }
            } catch (err: unknown) {
                setError("Failed to load billing information")
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    const handleSelectPlan = (plan: HiringSubscriptionPlanType) => {
        if (plan === "ENTERPRISE") {
            window.open("mailto:sales@shipithq.com?subject=Enterprise%20Plan%20Inquiry", "_blank")
            return
        }
        if (plan === "FREE" && subscription?.plan !== "FREE") {
            setCancelDialog(true)
            return
        }
        setSelectedPlan(plan)
        setUpgradeDialog(true)
    }

    const handleUpgrade = async () => {
        if (!selectedPlan) return

        startTransition(async () => {
            try {
                const planConfig = HIRING_SUBSCRIPTION_PLANS[selectedPlan]
                const price = currency === "INR" ? planConfig.priceINR : planConfig.priceUSD

                const result = await createCheckoutSession({
                    plan: selectedPlan,
                    returnUrl: `${window.location.origin}/billing?success=true`,
                    currency,
                    amount: price,
                })

                if (result.success && result.sessionUrl) {
                    window.location.href = result.sessionUrl
                } else {
                    setError(result.error || "Failed to create checkout session")
                }
            } catch (err: unknown) {
                setError("An unexpected error occurred")
                console.error(err)
            }
        })
    }

    const handleCancelSubscription = async () => {
        startTransition(async () => {
            const result = await cancelSubscription()
            if (result.success) {
                setCancelDialog(false)
                // Reload subscription data
                const subResult = await getCurrentSubscription()
                if (subResult.success && subResult.subscription) {
                    setSubscription(subResult.subscription)
                }
            } else {
                setError(result.error || "Failed to cancel subscription")
            }
        })
    }

    if (loading) {
        return <Loading />
    }

    const currentPlan = (subscription?.plan || "FREE") as HiringSubscriptionPlanType

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader
                title="Billing & Subscription"
                subtitle="Manage your subscription, view invoices, and track usage"
            />

            {/* Error Alert */}
            {error && (
                <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-600 dark:text-red-400">
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            {/* Current Plan Banner */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-neutral-900 to-neutral-800 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl p-6 text-white"
            >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <p className="text-white/60 text-sm mb-1">Current Plan</p>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            {subscription?.planName || "Free"}
                            <Badge className="bg-white/20 text-white hover:bg-white/20 text-xs">
                                {subscription?.status || "Active"}
                            </Badge>
                        </h2>
                        <p className="text-white/60 text-sm mt-2">
                            {subscription?.currentPeriodEnd 
                                ? `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                                : "You're using the free tier. Upgrade to unlock more features."
                            }
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className={`border-white/30 ${currency === 'INR' ? 'bg-white/20' : 'bg-transparent'} text-white hover:bg-white/20`}
                            onClick={() => setCurrency("INR")}
                        >
                            ₹ INR
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className={`border-white/30 ${currency === 'USD' ? 'bg-white/20' : 'bg-transparent'} text-white hover:bg-white/20`}
                            onClick={() => setCurrency("USD")}
                        >
                            $ USD
                        </Button>
                    </div>
                </div>

            </motion.div>

            {/* Billing Overview Stats */}
            {billingOverview && (
                <StatBand
                    cols={4}
                    items={[
                        {
                            icon: Wallet,
                            label: "Total Spent",
                            value: `${billingOverview.currency === 'INR' ? '₹' : '$'}${billingOverview.totalSpent.toLocaleString()}`,
                        },
                        { icon: Receipt, label: "Invoices", value: billingOverview.invoiceCount },
                        {
                            icon: CalendarCheck,
                            label: "Last Payment",
                            value: billingOverview.lastPaymentDate
                                ? new Date(billingOverview.lastPaymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : '-',
                        },
                        {
                            icon: CalendarClock,
                            label: "Next Billing",
                            value: billingOverview.nextBillingDate
                                ? new Date(billingOverview.nextBillingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : '-',
                        },
                    ]}
                />
            )}

            {/* Usage Stats */}
            {usage && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Usage This Month</h2>
                    <StatBand
                        cols={4}
                        items={[
                            usageItem("Active Jobs", usage.jobsUsed, usage.jobsLimit, Briefcase),
                            usageItem("Applications", usage.applicationsUsed, usage.applicationsLimit, Users),
                            usageItem("Interview Templates", usage.templatesUsed, usage.templatesLimit, FileText),
                            usageItem("Team Members", usage.teamMembers, usage.teamLimit, Building2),
                        ]}
                    />
                </motion.div>
            )}

            {/* Available Plans */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Available Plans</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(["FREE", "PRO", "ENTERPRISE"] as HiringSubscriptionPlanType[]).map((planKey) => (
                        <PricingCard 
                            key={planKey}
                            planKey={planKey}
                            currentPlan={currentPlan}
                            onSelectPlan={handleSelectPlan}
                            isPending={isPending}
                            currency={currency}
                        />
                    ))}
                </div>
            </motion.div>

            {/* Transactions Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <Tabs defaultValue="invoices" className="w-full">
                    <TabsList className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                        <TabsTrigger value="invoices" className="data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900">
                            <Receipt className="h-4 w-4 mr-2" />
                            Invoices
                        </TabsTrigger>
                        <TabsTrigger value="payments" className="data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Payments
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="invoices" className="mt-4">
                        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
                            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Invoice History</h3>
                            {invoices.length > 0 ? (
                                <div>
                                    {invoices.map((invoice) => (
                                        <InvoiceRow key={invoice.id} invoice={invoice} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Receipt className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                                    <p className="text-neutral-500">No invoices yet</p>
                                    <p className="text-sm text-neutral-400 mt-1">Invoices will appear here after your first payment</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="payments" className="mt-4">
                        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
                            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Payment History</h3>
                            {payments.length > 0 ? (
                                <div>
                                    {payments.map((payment) => (
                                        <PaymentRow key={payment.id} payment={payment} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <CreditCard className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                                    <p className="text-neutral-500">No payments yet</p>
                                    <p className="text-sm text-neutral-400 mt-1">Payments will appear here after your first transaction</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </motion.div>

            {/* Subscription Management */}
            {subscription && subscription.plan !== "FREE" && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6"
                >
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Subscription Management</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-neutral-500 mb-1">Plan</p>
                            <p className="font-medium text-neutral-900 dark:text-neutral-100">{subscription.planName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-neutral-500 mb-1">Amount</p>
                            <p className="font-medium text-neutral-900 dark:text-neutral-100">
                                {subscription.currency === 'INR' ? '₹' : '$'}{subscription.amount}/{subscription.billingCycle}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-neutral-500 mb-1">Status</p>
                            <Badge className={subscription.status === 'ACTIVE' ? 'bg-neutral-100 text-neutral-700' : 'bg-neutral-100 text-neutral-700'}>
                                {subscription.status}
                            </Badge>
                        </div>
                        {subscription.currentPeriodEnd && (
                            <div>
                                <p className="text-sm text-neutral-500 mb-1">Next Billing Date</p>
                                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                        <Button 
                            variant="outline" 
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                            onClick={() => setCancelDialog(true)}
                        >
                            Cancel Subscription
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* FAQ Section with Accordion */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl p-6"
            >
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Frequently Asked Questions</h3>
                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                        <AccordionItem key={index} value={`item-${index}`} className="border-neutral-200 dark:border-neutral-800">
                            <AccordionTrigger className="text-left text-neutral-900 dark:text-neutral-100 hover:no-underline">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-neutral-600 dark:text-neutral-400">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </motion.div>

            {/* Upgrade Dialog */}
            <Dialog open={upgradeDialog} onOpenChange={setUpgradeDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Upgrade to {selectedPlan ? HIRING_SUBSCRIPTION_PLANS[selectedPlan].name : ''}</DialogTitle>
                        <DialogDescription>
                            You&apos;ll be redirected to complete your payment securely.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedPlan && (
                        <div className="py-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-neutral-500">Plan</span>
                                <span className="font-semibold">{HIRING_SUBSCRIPTION_PLANS[selectedPlan].name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-neutral-500">Amount</span>
                                <span className="font-semibold">
                                    {currency === 'INR' ? '₹' : '$'}
                                    {currency === 'INR' 
                                        ? HIRING_SUBSCRIPTION_PLANS[selectedPlan].priceINR.toLocaleString()
                                        : HIRING_SUBSCRIPTION_PLANS[selectedPlan].priceUSD
                                    }/month
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-neutral-500">Features</span>
                                <span className="text-sm text-neutral-600">{HIRING_SUBSCRIPTION_PLANS[selectedPlan].features.length} features included</span>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUpgradeDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpgrade} disabled={isPending}>
                            {isPending && <InlineLoader size="sm" className="mr-2" />}
                            Proceed to Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Dialog */}
            <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Cancel Subscription</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel your subscription? You&apos;ll lose access to premium features at the end of your billing period.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelDialog(false)}>
                            Keep Subscription
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleCancelSubscription}
                            disabled={isPending}
                        >
                            {isPending && <InlineLoader size="sm" className="mr-2" />}
                            Cancel Subscription
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
