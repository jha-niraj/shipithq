import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { creditPackages, paymentConfig, SIGNUP_GRANT_CREDITS } from "@repo/pricing"
import { cn } from "@repo/ui/lib/utils"
import { APP_LINKS } from "@/lib/site"
import { MODULES } from "@/content/modules"
import { Eyebrow, MONO, OutlineCta, Section, TONE, type Tone } from "@/components/marketing/primitives"
import { CardArt, CardArtStyles } from "@/components/marketing/card-art"

/**
 * The pricing strip on the landing page (plan/web/revamp REV-15, REV-90). ShipItHQ
 * sells credit packs, not subscriptions, so the three cards are: the free grant, the
 * packs, and a custom amount. Pack prices come from @repo/pricing, the same source the
 * checkout charges from; what credits buy comes from the per-module costs in
 * content/modules.ts (sourced from apps/main/lib/credits/pricing.ts).
 */

/** A few real prices, in the order a new user usually meets them. */
const BUYS: { module: string; label: string }[] = [
    { module: "ai", label: "ATS score" },
    { module: "ai", label: "Cover letter" },
    { module: "mock", label: "A voice mock session" },
    { module: "ai", label: "Tailor to a job description" },
    { module: "projects", label: "Sprint quiz" },
    { module: "projects", label: "Sprint mock interview" },
]

export function PricingStrip() {
    const packs = creditPackages.filter((p) => p.slug !== "free")
    const cheapest = packs.reduce((a, b) => (b.inr < a.inr ? b : a))
    const largest = packs.reduce((a, b) => (b.credits > a.credits ? b : a))
    const popular = packs.find((p) => p.popular) ?? largest

    const buys = BUYS.flatMap((b) => {
        const cost = MODULES.find((m) => m.id === b.module)?.detail.costs?.find((c) => c.label === b.label)
        return cost ? [{ label: b.label, credits: cost.credits }] : []
    })

    const cards: {
        label: string; price: string; unit: string; line: string; tone: Tone; points: string[]
        cta: { text: string; href: string; app: boolean }; featured?: boolean; badge?: string
    }[] = [
        {
            label: "To start",
            price: "Free",
            unit: `${SIGNUP_GRANT_CREDITS} credits`,
            line: "Every new account gets them once: enough to genuinely try the product.",
            tone: "mint",
            points: ["No card needed", "Spend them on any module", "Parsing a resume upload is free"],
            cta: { text: "Create an account", href: APP_LINKS.signup, app: true },
        },
        {
            label: "Credit packs",
            price: `₹${cheapest.inr}`,
            unit: `for ${cheapest.credits} credits`,
            line: `Packs from ${cheapest.credits} to ${largest.credits} credits. Credits never expire.`,
            tone: "ink",
            points: [
                `${packs.length} packs, ₹${cheapest.inr} to ₹${largest.inr}`,
                `Most popular: ${popular.credits} credits for ₹${popular.inr}`,
                "No subscription, nothing to cancel",
            ],
            featured: true,
            badge: "Most popular",
            cta: { text: "See every pack", href: "/pricing", app: false },
        },
        {
            label: "Custom",
            price: `₹${paymentConfig.baseRateINR}`,
            unit: "per credit",
            line: `Any amount from ${paymentConfig.minCredits} to ${paymentConfig.maxCredits} credits.`,
            tone: "butter",
            points: ["Buy exactly what you need", `${paymentConfig.minCredits} credits minimum`, "Same balance as the packs"],
            cta: { text: "How pricing works", href: "/pricing", app: false },
        },
    ]

    return (
        <Section
            eyebrow="Plans"
            title="Pay for what you use"
            sub="No subscription. Buy credits once, spend them when you actually practise, build or interview."
            action={<OutlineCta href="/pricing">View full pricing</OutlineCta>}
        >
            <CardArtStyles />
            <div className="grid gap-4 lg:grid-cols-3">
                {cards.map((c, i) => {
                    const t = TONE[c.tone]
                    const dark = c.tone === "ink"
                    const body = (
                        <>
                            <div className="flex items-center justify-between gap-2">
                                <Eyebrow className={t.muted}>{c.label}</Eyebrow>
                                {c.badge && (
                                    <span className={cn(MONO, "rounded-md bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-neutral-950")}>{c.badge}</span>
                                )}
                            </div>
                            <p className="mt-6 flex items-baseline gap-2">
                                <span className="font-display text-5xl font-semibold tracking-tight">{c.price}</span>
                                <span className={cn("text-sm", t.muted)}>{c.unit}</span>
                            </p>
                            <p className={cn("mt-3 text-[15px] leading-6", dark ? "text-neutral-300" : "text-neutral-800")}>{c.line}</p>
                            <ul className={cn("mt-6 flex-1 space-y-2.5 border-t pt-6", t.rule)}>
                                {c.points.map((p) => (
                                    <li key={p} className="flex gap-2.5 text-[14px] leading-5">
                                        <Check aria-hidden className="mt-0.5 size-4 shrink-0" />
                                        <span className={dark ? "text-neutral-200" : "text-neutral-800"}>{p}</span>
                                    </li>
                                ))}
                            </ul>
                            <span className={cn("mt-8 flex items-center justify-between border-t pt-4 text-sm font-medium", t.rule)}>
                                {c.cta.text}
                                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                            </span>
                        </>
                    )
                    const className = cn(
                        "group flex h-full flex-col rounded-2xl p-7 transition-transform duration-300 hover:-translate-y-1",
                        t.surface, t.ink,
                        c.featured && "shadow-[0_24px_48px_-24px_rgba(0,0,0,0.55)] lg:-translate-y-2 lg:hover:-translate-y-3",
                    )
                    return (
                        <div key={c.label} className="sh-reveal" style={{ ["--sh-reveal-delay" as string]: `${i * 0.08}s` }}>
                            {c.cta.app
                                ? <a href={c.cta.href} className={className}>{body}</a>
                                : <Link href={c.cta.href} className={className}>{body}</Link>}
                        </div>
                    )
                })}
            </div>

            {/* What credits buy: real prices, so "100 credits" means something. */}
            {buys.length > 0 && (
                <div className="mt-4 grid items-center gap-6 rounded-2xl border border-neutral-200 bg-white p-6 md:grid-cols-[10rem_1fr] md:p-7">
                    <div className="hidden md:block">
                        <CardArt kind="pricing" className="max-h-28" />
                    </div>
                    <div>
                        <p className={cn(MONO, "text-[11px] uppercase tracking-[0.16em] text-neutral-600")}>What credits buy</p>
                        <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                            {buys.map((b) => (
                                <li key={b.label} className="flex items-baseline justify-between gap-3 border-b border-dashed border-neutral-200 pb-2 text-[14px]">
                                    <span className="text-neutral-700">{b.label}</span>
                                    <span className={cn(MONO, "shrink-0 font-medium text-neutral-900")}>{b.credits} credits</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </Section>
    )
}
