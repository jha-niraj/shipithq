"use client"

import { useState } from "react"
import { HIRING_LINKS } from "@/lib/site"
import { motion } from "framer-motion"
import {
    Check, Briefcase, Users, FileText, Sparkles, Shield, Zap, Building2
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Switch } from "@repo/ui/components/ui/switch"
import { cn } from "@repo/ui/lib/utils"

const plans = [
    {
        id: "FREE",
        name: "Free",
        price: { INR: "₹0", USD: "$0" },
        desc: "Perfect for small teams just getting started with hiring",
        features: [
            { text: "3 active job posts", icon: Briefcase },
            { text: "Up to 50 applications/month", icon: Users },
            { text: "1 interview process template", icon: FileText },
            { text: "Basic candidate management", icon: Users },
            { text: "Email support", icon: Building2 },
        ],
        cta: "Get Started",
        highlight: false,
    },
    {
        id: "PRO",
        name: "Pro",
        price: { INR: "₹3,999", USD: "$49" },
        desc: "For growing companies with active hiring needs",
        features: [
            { text: "10 active job posts", icon: Briefcase },
            { text: "Up to 500 applications/month", icon: Users },
            { text: "5 interview process templates", icon: FileText },
            { text: "AI-powered resume screening", icon: Sparkles },
            { text: "Custom take-home assignments", icon: FileText },
            { text: "Team collaboration (5 members)", icon: Building2 },
            { text: "Priority support", icon: Zap },
        ],
        cta: "Upgrade to Pro",
        highlight: true,
    },
    {
        id: "ENTERPRISE",
        name: "Enterprise",
        price: { INR: "Custom", USD: "Custom" },
        desc: "For large organizations with complex hiring needs",
        features: [
            { text: "Unlimited job posts", icon: Briefcase },
            { text: "Unlimited applications", icon: Users },
            { text: "Unlimited interview templates", icon: FileText },
            { text: "Dedicated account manager", icon: Users },
            { text: "SSO/SAML authentication", icon: Shield },
            { text: "API access", icon: Zap },
            { text: "SLA guarantee", icon: Shield },
            { text: "Unlimited team members", icon: Building2 },
        ],
        cta: "Contact Sales",
        highlight: false,
    },
]

export default function PricingSection() {
    const [currency, setCurrency] = useState<"INR" | "USD">("INR")

    const handlePlanClick = (planId: string) => {
        if (planId === "ENTERPRISE") {
            window.open("mailto:sales@shipithq.com?subject=Enterprise%20Plan%20Inquiry", "_blank")
            return
        }

        if (planId === "FREE") {
            window.location.href = HIRING_LINKS.signup
            return
        }

        // This site has no auth (apps/web/CLAUDE.md): the hiring app's sign-in
        // takes the visitor to billing afterwards, signed in or not.
        window.location.href = `${HIRING_LINKS.signin}?callbackUrl=${encodeURIComponent(`/billing?plan=${planId}&currency=${currency}`)}`
    }

    return (
        <section id="pricing" className="py-32 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-6">

                <div className="flex flex-col items-center text-center mb-16">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                        Pricing Plans
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-neutral-900 dark:text-white mb-4">
                        Simple, Transparent Pricing
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mb-8">
                        Choose the plan that fits your hiring needs. Upgrade or downgrade anytime.
                    </p>
                    <div className="flex items-center gap-3 p-1 pr-4 pl-4 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                        <span className={cn("text-xs font-bold", currency === "INR" ? "text-neutral-900 dark:text-white" : "text-neutral-400")}>INR</span>
                        <Switch checked={currency === "USD"} onCheckedChange={(c) => setCurrency(c ? "USD" : "INR")} />
                        <span className={cn("text-xs font-bold", currency === "USD" ? "text-neutral-900 dark:text-white" : "text-neutral-400")}>USD</span>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {
                        plans.map((plan, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    "relative p-8 rounded-3xl flex flex-col h-full border transition-all duration-300",
                                    plan.highlight
                                        ? "bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-black shadow-2xl"
                                        : "bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                                )}
                            >
                                {
                                    plan.highlight && (
                                        <div className="absolute top-4 right-4">
                                            <div className="bg-white dark:bg-black text-black dark:text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                                Most Popular
                                            </div>
                                        </div>
                                    )
                                }
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                                    <p className={cn("text-sm", plan.highlight ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-500")}>
                                        {plan.desc}
                                    </p>
                                </div>
                                <div className="mb-8">
                                    <span className="text-4xl font-bold tracking-tighter">
                                        {currency === "INR" ? plan.price.INR : plan.price.USD}
                                    </span>
                                    {plan.price.INR !== "Custom" && <span className="text-sm opacity-60">/month</span>}
                                </div>
                                <ul className="space-y-4 mb-8 flex-1">
                                    {
                                        plan.features.map((feat, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm font-medium">
                                                <Check className={cn("w-4 h-4", plan.highlight ? "text-white dark:text-black" : "text-neutral-900 dark:text-white")} />
                                                {feat.text}
                                            </li>
                                        ))
                                    }
                                </ul>
                                <Button
                                    onClick={() => handlePlanClick(plan.id)}
                                    className={cn(
                                        "cursor-pointer w-full rounded-full font-bold h-12",
                                        plan.highlight
                                            ? "bg-white text-black hover:bg-neutral-200 dark:bg-black dark:text-white dark:hover:bg-neutral-800"
                                            : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                                    )}
                                >
                                    {plan.cta}
                                </Button>
                            </motion.div>
                        ))
                    }
                </div>
            </div>
        </section>
    )
}