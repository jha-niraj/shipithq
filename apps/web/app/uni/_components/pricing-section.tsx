import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { UNI_PLANS, UNI_PLAN_ORDER, type UniPlanKey } from "@repo/pricing"
import { cn } from "@repo/ui/lib/utils"
import { Eyebrow, MONO, Section } from "@/components/marketing/primitives"
import { SoonLabel } from "@/components/marketing/soon"
import { money } from "@/lib/money"
import { UNI_PLAN_LINES_NOT_BUILT } from "@/content/uni"

/**
 * The university plan cards (plan/web/revamp REV-30, REV-31; plan/web/story ST-15). Every price,
 * limit and feature line is UNI_PLANS in @repo/pricing. No toggles: INR, USD under it, and the
 * yearly price beside. Checkout is not wired in apps/uni yet (plan/uni UNI-7), so every plan's
 * button is "Talk to us", to the early-access form, and no billing promise is made; plan lines for
 * screens that are not built carry the Soon label.
 */

function prices(key: UniPlanKey) {
    const p = UNI_PLANS[key]
    if (key === "ENTERPRISE") return { value: "Custom", unit: "talk to us", second: null, note: "Priced to your campus" }
    if (p.priceINR === 0) return { value: money(0, "INR"), unit: "forever", second: null, note: "No card needed" }
    const free = Math.round(12 - p.yearlyPriceINR / p.priceINR)
    return {
        value: money(p.priceINR, "INR"), unit: "per month",
        second: `${money(p.priceUSD, "USD")} per month`,
        note: `or ${money(p.yearlyPriceINR, "INR")} (${money(p.yearlyPriceUSD, "USD")}) a year${free > 0 ? ` · ${free} months free` : ""}`,
    }
}

const TALK = "/uni#early-access"

const SURFACE: Record<UniPlanKey, string> = {
    FREE: "bg-[#BFE3D0] text-neutral-900",
    STARTER: "bg-white text-neutral-900 border border-neutral-200",
    GROWTH: "bg-neutral-950 text-white shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)] lg:-translate-y-2 lg:hover:-translate-y-3",
    ENTERPRISE: "bg-[#F5E6A8] text-neutral-900",
}

export function UniPlanCards() {
    return (
        <div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {UNI_PLAN_ORDER.map((key, idx) => {
                    const plan = UNI_PLANS[key]
                    const dark = key === "GROWTH"
                    const pr = prices(key)
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
                            <div className="mt-6">
                                <p className="flex flex-wrap items-baseline gap-x-2">
                                    <span className="font-display text-4xl font-semibold tracking-tight">{pr.value}</span>
                                    <span className={cn("text-sm", dark ? "text-neutral-400" : "text-neutral-700")}>{pr.unit}</span>
                                </p>
                                {pr.second && <p className={cn("mt-1 text-[15px] font-medium tabular-nums", dark ? "text-neutral-200" : "text-neutral-800")}>{pr.second}</p>}
                                <p className={cn(MONO, "mt-2 text-[11px] uppercase tracking-[0.12em]", dark ? "text-neutral-300" : "text-neutral-700")}>{pr.note}</p>
                            </div>
                            <p className={cn("mt-4 text-[15px]", dark ? "text-neutral-300" : "text-neutral-800")}>{plan.description}</p>
                            <ul className={cn("mt-6 flex-1 space-y-2.5 border-t pt-6", dark ? "border-neutral-800" : "border-neutral-900/15")}>
                                {plan.features.map((f) => (
                                    <li key={f} className={cn("flex gap-2.5 text-[14px] leading-5", dark ? "text-neutral-200" : "text-neutral-800")}>
                                        <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                                        <span>{f}{UNI_PLAN_LINES_NOT_BUILT.has(f) && <SoonLabel className="ml-1.5" />}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href={TALK}
                                className={cn(
                                    "mt-8 flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
                                    dark ? "bg-white text-neutral-950 hover:bg-neutral-100" : "bg-neutral-900 text-white hover:bg-neutral-800",
                                )}
                            >
                                Talk to us
                                <ArrowRight className="size-4" aria-hidden />
                            </Link>
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
            sub="Every plan includes designing projects, voice mock interviews and assessments. Plans differ in how many students, faculty and credits they hold. Checkout is not open yet: talk to us to start one."
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
