"use client"

import { motion } from "framer-motion"
import { CreditCard, Check, ArrowRight, Coins, Users, BookOpen, Zap } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import Link from "next/link"
import { UNI_PLANS, UNI_PLAN_ORDER } from "@repo/pricing"

/**
 * The plans shown here are UNI_PLANS from @repo/pricing, the same object the checkout
 * (lib/dodopayments.ts) and shipithq.com/uni/pricing read (plan/web/revamp REV-30).
 * The per-student prices this page used to hardcode are retired. The buttons are not
 * wired to checkout yet: that is part of the uni core work (REV-33).
 */
const plans = UNI_PLAN_ORDER.map((key) => {
    const p = UNI_PLANS[key]
    return {
        name: p.name,
        price: key === "ENTERPRISE" ? "Custom" : p.priceINR === 0 ? "Free" : `₹${p.priceINR.toLocaleString("en-IN")}`,
        suffix: key === "ENTERPRISE" || p.priceINR === 0 ? "" : "/month",
        description: p.description,
        features: [...p.features],
        popular: "isPopular" in p && p.isPopular === true,
        current: false,
    }
})

export default function BillingPage() {
    return (
        <div className="min-h-full p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white">
                    Billing & Credits
                </h1>
                <p className="text-neutral-500 mt-1">
                    Manage your subscription and credit balance
                </p>
            </div>

            {/* Credit Balance */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-neutral-800 to-neutral-700 rounded-2xl p-6 mb-8 text-white"
            >
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-neutral-200 text-sm mb-1">Credit Balance</p>
                        <h2 className="text-4xl font-bold flex items-center gap-2">
                            <Coins className="w-8 h-8" />
                            0 <span className="text-lg font-normal text-neutral-200">credits</span>
                        </h2>
                        <p className="text-neutral-200 text-sm mt-2">
                            0 credits allocated to students
                        </p>
                    </div>
                    <Button className="rounded-xl bg-white text-neutral-700 hover:bg-neutral-50">
                        <Zap className="w-4 h-4 mr-2" />
                        Buy Credits
                    </Button>
                </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8"
            >
                <StatBand
                    cols={3}
                    items={[
                        { icon: Users, label: "Students", value: 0, hint: "verified students" },
                        { icon: Coins, label: "Used This Month", value: 0, hint: "credits consumed" },
                        { icon: BookOpen, label: "Assignments", value: 0, hint: "assignments created" },
                    ]}
                />
            </motion.div>

            {/* Current Plan */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 mb-8"
            >
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-neutral-500 text-sm mb-1">Current Plan</p>
                        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            Starter <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100">Trial</span>
                        </h2>
                        <p className="text-neutral-500 text-sm mt-2">
                            30-day free trial • Upgrade anytime
                        </p>
                    </div>
                    <Link href="#plans">
                        <Button variant="outline" className="rounded-xl">
                            Upgrade Plan
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                </div>
            </motion.div>

            {/* Plans Grid */}
            <div id="plans" className="scroll-mt-8">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">Available Plans</h2>
                <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 xl:grid-cols-4">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                            className={`relative bg-white dark:bg-neutral-950 border rounded-2xl p-6 ${plan.popular
                                ? "border-neutral-900 shadow-lg shadow-neutral-900/10"
                                : "border-neutral-200 dark:border-neutral-800"
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-neutral-800 to-neutral-800 text-white text-xs font-bold px-3 py-1 rounded-full">
                                    POPULAR
                                </div>
                            )}
                            <div className="mb-6">
                                <h3 className="font-bold text-lg text-neutral-900 dark:text-white">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mt-2">
                                    <span className="text-3xl font-bold text-neutral-900 dark:text-white">{plan.price}</span>
                                    <span className="text-neutral-500">{plan.suffix}</span>
                                </div>
                                <p className="text-sm text-neutral-500 mt-2">{plan.description}</p>
                            </div>
                            <ul className="space-y-3 mb-6">
                                {plan.features.map((feature, j) => (
                                    <li key={j} className="flex items-start gap-2 text-sm">
                                        <Check className="w-4 h-4 text-neutral-900 mt-0.5 shrink-0" />
                                        <span className="text-neutral-600 dark:text-neutral-400">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <Button
                                variant={plan.current ? "outline" : "default"}
                                className={`w-full rounded-xl ${plan.popular
                                    ? "bg-gradient-to-r from-neutral-800 to-neutral-800 hover:from-neutral-700 hover:to-neutral-700 text-white"
                                    : ""
                                    }`}
                                disabled={plan.current}
                            >
                                {plan.current ? "Current Plan" : "Upgrade"}
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Payment Methods */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
            >
                <h2 className="font-bold text-lg text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-neutral-800" />
                    Payment Methods
                </h2>
                <p className="text-neutral-500 text-sm mb-4">
                    No payment methods on file. Add one when you upgrade.
                </p>
                <Button variant="outline" className="rounded-xl">
                    Add Payment Method
                </Button>
            </motion.div>
        </div>
    )
}
