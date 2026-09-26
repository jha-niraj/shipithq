import type { Metadata } from "next"
import { Check, Minus } from "lucide-react"
import { HIRING_AI_LIMITS, HIRING_PLANS, HIRING_PLAN_LIMITS, UNLIMITED, type HiringPlanKey } from "@repo/pricing"
import { cn } from "@repo/ui/lib/utils"
import SiteHeader from "@/components/site/header"
import SiteFooter from "@/components/site/footer"
import { PageHero } from "@/components/page-hero"
import { MONO, Section, TONE } from "@/components/marketing/primitives"
import { CardArt, CardArtStyles } from "@/components/marketing/card-art"
import { CtaBand } from "@/components/marketing/sections"
import FaqsAccrodian from "@/components/landingpage/faqs"
import { HirePlanCards } from "../_components/pricing-section"
import { BRAND, HIRING_LINKS } from "@/lib/site"
import { pageMeta } from "@/lib/seo"
import { faqSchema, jsonLd } from "@/lib/schema"

/**
 * shipithq.com/hire/pricing (plan/web/revamp REV-96), built like /pricing: hero with the
 * facts, the plan cards (currency and billing toggles), the full comparison, how company
 * credits work, what every plan includes, FAQ, and the closing band. Every number is
 * HIRING_PLANS / HIRING_AI_LIMITS in @repo/pricing (decisions: overview, "Hiring plans").
 */

export const metadata: Metadata = pageMeta({
    title: "Hiring plans and pricing",
    description: "ShipItHQ Hiring plans: start free, Pro for teams hiring every month, or Enterprise. Jobs, pipelines, team members, roles and credits per plan.",
    path: "/hire/pricing",
})

const ORDER: HiringPlanKey[] = ["FREE", "PRO", "ENTERPRISE"]
const pro = HIRING_PLANS.PRO
const free = HIRING_PLANS.FREE

const show = (n: number) => (n >= UNLIMITED ? "Unlimited" : n.toLocaleString("en-IN"))

/** Included on every plan: nothing here is gated by plan today. */
const EVERY_PLAN = [
    "Aptitude, coding (DSA), system design and voice rounds",
    "Hard and advisory gates, pass marks and time limits",
    "The 320-question aptitude pool and 12 design prompts",
    "Candidate board from Applied to Hired",
    "Take-home assignments with scores and feedback",
    "Company email sign-up and custom roles",
]

const FAQS = [
    { question: "What does the Free plan include?", answer: `Everything you need to hire for one role: ${free.maxJobPosts} active job, ${free.maxPipelines} interview pipeline, up to ${free.maxApplications} applicants a month, ${free.maxTeamMembers} team members and ${free.maxCustomRoles} custom role, plus ${free.creditsOnSignup} credits to start. Every round type is included.` },
    { question: "What do company credits pay for?", answer: `AI work beyond the free daily allowance: each company gets ${HIRING_AI_LIMITS.pipelineDraftsPerDay} AI pipeline drafts and ${HIRING_AI_LIMITS.aptitudeGenerationsPerDay} aptitude generations a day for free, and credits cover more than that. Pro includes ${pro.creditsPerMonth.toLocaleString("en-IN")} credits every month.` },
    { question: "Do candidates cost us anything to apply?", answer: "No. Candidates pay for their own round attempts with their own ShipItHQ credits, so applying to your job never spends yours." },
    { question: "What does yearly billing save?", answer: `Yearly Pro is ₹${pro.priceYearlyINR.toLocaleString("en-IN")} ($${pro.priceYearlyUSD}), the price of ten months: two months free compared with paying monthly.` },
    { question: "What counts as an active job?", answer: "A published job that is open to applicants. Drafts, paused and closed jobs do not count, so you can prepare the next role before the last one closes." },
    { question: "What is a custom role?", answer: "A role you define with its own permissions, beyond the Owner. For example, interviewers who can score candidates but not see salary notes." },
    { question: "Can I change plans later?", answer: "Yes. Change your plan any time from billing in the hiring app, and upgrade when you start hiring more." },
    { question: "Do you send invoices?", answer: "Yes, every payment has an invoice in the billing section of the hiring app." },
]

export default function HirePricingPage() {
    const creditsRow = ORDER.map((k) => {
        const p = HIRING_PLANS[k]
        return p.creditsPerMonth > 0 ? `${p.creditsPerMonth.toLocaleString("en-IN")} / month` : p.creditsOnSignup > 0 ? `${p.creditsOnSignup} once` : "Custom"
    })

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(FAQS))} />
            <SiteHeader />
            <main className="bg-neutral-50">
                <PageHero
                    crumbs={[{ name: "Hire", href: "/hire" }, { name: "Pricing" }]}
                    eyebrow="Hiring plans"
                    title="Start free. Pay when you hire more."
                    sub="Every plan has every round type and the whole question bank. Plans differ only in how much you run at once: jobs, pipelines, applicants, your team, and the credits that pay for extra AI work."
                    tone="mint"
                    art="pricing"
                    ctas={[{ text: "Start hiring free", href: HIRING_LINKS.signup, external: true }, { text: "Compare plans", href: "#compare" }]}
                    facts={[
                        { value: "₹0", label: "To start" },
                        { value: `${free.creditsOnSignup}`, label: "Credits on Free" },
                        { value: pro.creditsPerMonth.toLocaleString("en-IN"), label: "Credits a month on Pro" },
                        { value: "2", label: "Months free, yearly" },
                    ]}
                />

                <Section eyebrow="Plans" title="Pick a plan">
                    <HirePlanCards />
                </Section>

                {/* ── Full comparison ── */}
                <Section id="compare" eyebrow="Compare" title="Every plan, line by line" className="pt-0 md:pt-0">
                    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
                        <table className="w-full min-w-[40rem] text-left text-[15px]">
                            <thead>
                                <tr className="border-b border-neutral-200">
                                    <th className="p-5 font-medium text-neutral-600">Limits</th>
                                    {ORDER.map((k) => (
                                        <th key={k} className={cn("p-5 font-display text-lg font-semibold text-neutral-900", k === "PRO" && "bg-neutral-50")}>{HIRING_PLANS[k].name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {HIRING_PLAN_LIMITS.map((row) => (
                                    <tr key={row.label}>
                                        <td className="p-5 text-neutral-700">{row.label}</td>
                                        {ORDER.map((k) => (
                                            <td key={k} className={cn(MONO, "p-5 font-medium text-neutral-900", k === "PRO" && "bg-neutral-50")}>{show(HIRING_PLANS[k][row.key] as number)}</td>
                                        ))}
                                    </tr>
                                ))}
                                <tr>
                                    <td className="p-5 text-neutral-700">Credits</td>
                                    {creditsRow.map((c, i) => (
                                        <td key={i} className={cn(MONO, "p-5 font-medium text-neutral-900", i === 1 && "bg-neutral-50")}>{c}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="p-5 text-neutral-700">Help setting up pipelines</td>
                                    {ORDER.map((k) => (
                                        <td key={k} className={cn("p-5", k === "PRO" && "bg-neutral-50")}>
                                            {k === "ENTERPRISE" ? <Check className="size-4 text-neutral-900" aria-label="Included" /> : <Minus className="size-4 text-neutral-400" aria-label="Not included" />}
                                        </td>
                                    ))}
                                </tr>
                                {EVERY_PLAN.map((f) => (
                                    <tr key={f}>
                                        <td className="p-5 text-neutral-700">{f}</td>
                                        {ORDER.map((k) => (
                                            <td key={k} className={cn("p-5", k === "PRO" && "bg-neutral-50")}><Check className="size-4 text-neutral-900" aria-label="Included" /></td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>

                {/* ── How credits work ── */}
                <Section eyebrow="Credits" title="What your credits pay for" className="pt-0 md:pt-0">
                    <CardArtStyles />
                    <div className="grid gap-4 md:grid-cols-3">
                        {[
                            { tone: "blush" as const, art: "ai" as const, title: "Free every day", body: `${HIRING_AI_LIMITS.pipelineDraftsPerDay} AI pipeline drafts and ${HIRING_AI_LIMITS.aptitudeGenerationsPerDay} aptitude generations a day, on every plan, at no cost.` },
                            { tone: "ink" as const, art: "pricing" as const, title: "Credits for more", body: `Past the daily allowance, AI drafts and generations spend credits. Free starts with ${free.creditsOnSignup}; Pro adds ${pro.creditsPerMonth.toLocaleString("en-IN")} every month.` },
                            { tone: "sage" as const, art: "hire-candidates" as const, title: "Candidates pay their own way", body: "Candidates spend their own credits on round attempts, so an applicant never costs you anything." },
                        ].map((c, i) => {
                            const t = TONE[c.tone]
                            const dark = c.tone === "ink"
                            return (
                                <div key={c.title} className={cn("sh-reveal flex flex-col rounded-2xl p-6", t.surface, t.ink)} style={{ ["--sh-reveal-delay" as string]: `${i * 0.08}s` }}>
                                    <div className="flex h-36 items-center justify-center"><CardArt kind={c.art} dark={dark} className="max-h-32" /></div>
                                    <h3 className="mt-6 text-lg font-semibold tracking-tight">{c.title}</h3>
                                    <p className={cn("mt-2 text-[15px] leading-6", dark ? "text-neutral-300" : "text-neutral-800")}>{c.body}</p>
                                </div>
                            )
                        })}
                    </div>
                </Section>

                {/* ── Every plan ── */}
                <Section eyebrow="On every plan" title="Nothing important is paywalled" className="pt-0 md:pt-0">
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {EVERY_PLAN.map((f, i) => (
                            <li key={f} className="sh-reveal flex gap-3 rounded-2xl border border-neutral-200 bg-white p-5 text-[15px] leading-6 text-neutral-800" style={{ ["--sh-reveal-delay" as string]: `${(i % 3) * 0.06}s` }}>
                                <Check className="mt-1 size-4 shrink-0" aria-hidden />
                                {f}
                            </li>
                        ))}
                    </ul>
                </Section>

                <section id="faq" className="bg-white">
                    <FaqsAccrodian faqs={FAQS} idPrefix="hire-pricing-faq" sub="Plans, credits, candidates and billing." contact={BRAND.email} />
                </section>

                <CtaBand
                    title={<>Hire your next engineer <br className="hidden sm:block" />on evidence.</>}
                    sub="Start free with one job and one pipeline. Upgrade when you are hiring every month."
                    primary={{ text: "Start hiring free", href: HIRING_LINKS.signup }}
                    secondary={{ text: "Talk to us", href: `mailto:${BRAND.email}` }}
                    words={["1 job free", "Pro for teams", "Yearly saves two months", "Every round type", "Custom roles", "Invoices"]}
                />
            </main>
            <SiteFooter audience="companies" />
        </>
    )
}
