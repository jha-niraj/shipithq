"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { HIRING_PLANS, type HiringPlanKey } from "@repo/pricing"
import { cn } from "@repo/ui/lib/utils"
import { BRAND, HIRING_LINKS } from "@/lib/site"
import { Eyebrow, MONO, Section } from "@/components/marketing/primitives"

/**
 * The hiring plan cards (plan/web/revamp REV-21, REV-95 to REV-97). Every price, limit,
 * credit allowance and feature line comes from HIRING_PLANS in @repo/pricing, the same
 * object apps/hiring's checkout reads.
 *
 * Two toggles: currency (INR / USD) and billing (monthly / yearly, two months free).
 * Switching either replays a short roll-in on the numbers.
 */

const ORDER: HiringPlanKey[] = ["FREE", "PRO", "ENTERPRISE"]
export type Currency = "INR" | "USD"
export type Billing = "monthly" | "yearly"

export function money(n: number, c: Currency) {
    return c === "INR" ? `₹${n.toLocaleString("en-IN")}` : `$${n.toLocaleString("en-US")}`
}

function priceFor(key: HiringPlanKey, currency: Currency, billing: Billing) {
    const p = HIRING_PLANS[key]
    if (key === "ENTERPRISE") return { value: "Custom", unit: "talk to us", note: "Priced to your hiring volume" }
    const monthly = currency === "INR" ? p.priceINR : p.priceUSD
    if (monthly === 0) return { value: money(0, currency), unit: "forever", note: "No card needed" }
    if (billing === "yearly") {
        const yearly = currency === "INR" ? p.priceYearlyINR : p.priceYearlyUSD
        return { value: money(yearly, currency), unit: "per year", note: `${money(monthly * 12 - yearly, currency)} less than paying monthly` }
    }
    return { value: money(monthly, currency), unit: "per month", note: "Billed monthly, cancel any time" }
}

function creditsLine(key: HiringPlanKey) {
    const p = HIRING_PLANS[key]
    if (p.creditsPerMonth > 0) return `${p.creditsPerMonth.toLocaleString("en-IN")} credits every month`
    if (p.creditsOnSignup > 0) return `${p.creditsOnSignup} credits to start`
    return "A credit allowance agreed with you"
}

export function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
    const i = options.findIndex((o) => o.id === value)
    return (
        <div role="group" aria-label={label} className="relative inline-grid rounded-lg border border-neutral-200 bg-white p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
            <span
                aria-hidden
                className="absolute inset-y-0.5 left-0.5 rounded-md bg-neutral-900 transition-transform duration-300 ease-out"
                style={{ width: `calc(${100 / options.length}% - 2px)`, transform: `translateX(${i * 100}%)` }}
            />
            {options.map((o) => (
                <button
                    key={o.id}
                    type="button"
                    aria-pressed={value === o.id}
                    onClick={() => onChange(o.id)}
                    className={cn(MONO, "relative z-10 h-8 cursor-pointer whitespace-nowrap rounded-md px-4 text-[12px] transition-colors duration-300", value === o.id ? "text-white" : "text-neutral-600 hover:text-neutral-900")}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}

export function HirePlanCards() {
    const [currency, setCurrency] = useState<Currency>("INR")
    const [billing, setBilling] = useState<Billing>("monthly")

    return (
        <div>
            <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
                <Toggle label="Billing" value={billing} onChange={setBilling} options={[{ id: "monthly", label: "Monthly" }, { id: "yearly", label: "Yearly · 2 months free" }]} />
                <Toggle label="Currency" value={currency} onChange={setCurrency} options={[{ id: "INR", label: "INR" }, { id: "USD", label: "USD" }]} />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
                {ORDER.map((key, idx) => {
                    const plan = HIRING_PLANS[key]
                    const pro = key === "PRO"
                    const pr = priceFor(key, currency, billing)
                    const href = key === "ENTERPRISE"
                        ? `mailto:${BRAND.email}?subject=${encodeURIComponent("ShipItHQ Hiring: Enterprise")}`
                        : HIRING_LINKS.signup
                    return (
                        <div
                            key={key}
                            className={cn(
                                "sh-reveal flex flex-col rounded-2xl p-7 transition-transform duration-300 hover:-translate-y-1",
                                pro
                                    ? "bg-neutral-950 text-white shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)] lg:-translate-y-2 lg:hover:-translate-y-3"
                                    : key === "FREE" ? "bg-[#BFE3D0] text-neutral-900" : "bg-[#F5E6A8] text-neutral-900",
                            )}
                            style={{ ["--sh-reveal-delay" as string]: `${idx * 0.08}s` }}
                        >
                            <div className="flex items-center justify-between">
                                <Eyebrow className={pro ? "text-neutral-400" : "text-neutral-700"}>{plan.name}</Eyebrow>
                                {pro && <span className={cn(MONO, "rounded-md bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-neutral-950")}>Most teams</span>}
                            </div>
                            <div key={`${currency}-${billing}`} className="mt-6 overflow-hidden">
                                <p className="flex items-baseline gap-2">
                                    <span className="font-display text-5xl font-semibold tracking-tight animate-in fade-in-0 slide-in-from-bottom-4 duration-500 motion-reduce:animate-none">{pr.value}</span>
                                    <span className={cn("text-sm animate-in fade-in-0 duration-700 motion-reduce:animate-none", pro ? "text-neutral-400" : "text-neutral-700")}>{pr.unit}</span>
                                </p>
                                <p className={cn(MONO, "mt-2 text-[11px] uppercase tracking-[0.12em] animate-in fade-in-0 duration-700 motion-reduce:animate-none", pro ? "text-neutral-400" : "text-neutral-700")}>{pr.note}</p>
                            </div>
                            <p className={cn("mt-4 text-[15px]", pro ? "text-neutral-300" : "text-neutral-800")}>{plan.tagline}</p>
                            <p className={cn("mt-5 rounded-lg px-3 py-2 text-[13px] font-medium", pro ? "bg-white/10 text-white" : "bg-white/55 text-neutral-900")}>
                                {creditsLine(key)}
                            </p>
                            <ul className={cn("mt-6 flex-1 space-y-2.5 border-t pt-6", pro ? "border-neutral-800" : "border-neutral-900/15")}>
                                {plan.features.map((f) => (
                                    <li key={f} className={cn("flex gap-2.5 text-[14px] leading-5", pro ? "text-neutral-200" : "text-neutral-800")}>
                                        <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <a
                                href={href}
                                className={cn(
                                    "mt-8 flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
                                    pro ? "bg-white text-neutral-950 hover:bg-neutral-100" : "bg-neutral-900 text-white hover:bg-neutral-800",
                                )}
                            >
                                {key === "ENTERPRISE" ? "Talk to us" : key === "PRO" ? "Start with Pro" : "Start free"}
                                <ArrowRight className="size-4" aria-hidden />
                            </a>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

/** The pricing band on /hire: the cards, and a way to the full page. */
export default function PricingSection() {
    return (
        <Section
            id="pricing"
            eyebrow="Plans"
            title="Start free, upgrade when you hire more"
            sub="Every plan has every round type. Plans differ in how much you can run at once."
            action={
                <Link href="/hire/pricing" className="inline-flex items-center gap-1.5 border-b border-neutral-300 pb-0.5 text-sm font-medium text-neutral-900 hover:border-neutral-900">
                    Compare plans in full <ArrowRight className="size-3.5" />
                </Link>
            }
        >
            <HirePlanCards />
        </Section>
    )
}
