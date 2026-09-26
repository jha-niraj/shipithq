"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { UNI_PLANS, UNI_PLAN_ORDER, type UniPlanKey } from "@repo/pricing"
import { cn } from "@repo/ui/lib/utils"
import { BRAND, UNI_LINKS } from "@/lib/site"
import { Eyebrow, MONO, Section } from "@/components/marketing/primitives"
import { Toggle, money, type Billing, type Currency } from "@/app/hire/_components/pricing-section"

/**
 * The university plan cards (plan/web/revamp REV-30, REV-31). Every price, limit and
 * feature line is UNI_PLANS in @repo/pricing, the object apps/uni's checkout reads.
 * The same two toggles as /hire: currency and billing (yearly is ten months).
 */

function priceFor(key: UniPlanKey, currency: Currency, billing: Billing) {
    const p = UNI_PLANS[key]
    if (key === "ENTERPRISE") return { value: "Custom", unit: "talk to us", note: "Priced to your campus" }
    const monthly = currency === "INR" ? p.priceINR : p.priceUSD
    if (monthly === 0) return { value: money(0, currency), unit: "forever", note: "No card needed" }
    if (billing === "yearly") {
        const yearly = currency === "INR" ? p.yearlyPriceINR : p.yearlyPriceUSD
        return { value: money(yearly, currency), unit: "per year", note: `${money(monthly * 12 - yearly, currency)} less than paying monthly` }
    }
    return { value: money(monthly, currency), unit: "per month", note: "Billed monthly, cancel any time" }
}

const SURFACE: Record<UniPlanKey, string> = {
    FREE: "bg-[#BFE3D0] text-neutral-900",
    STARTER: "bg-white text-neutral-900 border border-neutral-200",
    GROWTH: "bg-neutral-950 text-white shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)] lg:-translate-y-2 lg:hover:-translate-y-3",
    ENTERPRISE: "bg-[#F5E6A8] text-neutral-900",
}

export function UniPlanCards() {
    const [currency, setCurrency] = useState<Currency>("INR")
    const [billing, setBilling] = useState<Billing>("monthly")

    return (
        <div>
            <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
                <Toggle label="Billing" value={billing} onChange={setBilling} options={[{ id: "monthly", label: "Monthly" }, { id: "yearly", label: "Yearly · 2 months free" }]} />
                <Toggle label="Currency" value={currency} onChange={setCurrency} options={[{ id: "INR", label: "INR" }, { id: "USD", label: "USD" }]} />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {UNI_PLAN_ORDER.map((key, idx) => {
                    const plan = UNI_PLANS[key]
                    const dark = key === "GROWTH"
                    const pr = priceFor(key, currency, billing)
                    const href = key === "ENTERPRISE"
                        ? `mailto:${BRAND.email}?subject=${encodeURIComponent("ShipItHQ for universities: Enterprise")}`
                        : UNI_LINKS.signup
                    return (
                        <div
                            key={key}
                            className={cn("sh-reveal flex flex-col rounded-2xl p-7 transition-transform duration-300 hover:-translate-y-1", SURFACE[key])}
                            style={{ ["--sh-reveal-delay" as string]: `${idx * 0.08}s` }}
                        >
                            <div className="flex items-center justify-between">
                                <Eyebrow className={dark ? "text-neutral-400" : "text-neutral-700"}>{plan.name}</Eyebrow>
                                {dark && <span className={cn(MONO, "rounded-md bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-neutral-950")}>Most campuses</span>}
                            </div>
                            <div key={`${currency}-${billing}`} className="mt-6 overflow-hidden">
                                <p className="flex flex-wrap items-baseline gap-x-2">
                                    <span className="font-display text-4xl font-semibold tracking-tight animate-in fade-in-0 slide-in-from-bottom-4 duration-500 motion-reduce:animate-none">{pr.value}</span>
                                    <span className={cn("text-sm", dark ? "text-neutral-400" : "text-neutral-700")}>{pr.unit}</span>
                                </p>
                                <p className={cn(MONO, "mt-2 text-[11px] uppercase tracking-[0.12em]", dark ? "text-neutral-400" : "text-neutral-700")}>{pr.note}</p>
                            </div>
                            <p className={cn("mt-4 text-[15px]", dark ? "text-neutral-300" : "text-neutral-800")}>{plan.description}</p>
                            <ul className={cn("mt-6 flex-1 space-y-2.5 border-t pt-6", dark ? "border-neutral-800" : "border-neutral-900/15")}>
                                {plan.features.map((f) => (
                                    <li key={f} className={cn("flex gap-2.5 text-[14px] leading-5", dark ? "text-neutral-200" : "text-neutral-800")}>
                                        <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <a
                                href={href}
                                className={cn(
                                    "mt-8 flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
                                    dark ? "bg-white text-neutral-950 hover:bg-neutral-100" : "bg-neutral-900 text-white hover:bg-neutral-800",
                                )}
                            >
                                {key === "ENTERPRISE" ? "Talk to us" : key === "FREE" ? "Start free" : `Start with ${plan.name}`}
                                <ArrowRight className="size-4" aria-hidden />
                            </a>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

/** The pricing band on /uni: the cards, and a way to the full page. */
export default function UniPricingSection() {
    return (
        <Section
            id="pricing"
            eyebrow="Plans"
            title="Start with one department, grow to the whole campus"
            sub="Every plan includes projects, mock interviews and assessments. Plans differ in how many students, faculty and credits they hold."
            action={
                <Link href="/uni/pricing" className="inline-flex items-center gap-1.5 border-b border-neutral-300 pb-0.5 text-sm font-medium text-neutral-900 hover:border-neutral-900">
                    Compare plans in full <ArrowRight className="size-3.5" />
                </Link>
            }
        >
            <UniPlanCards />
        </Section>
    )
}
