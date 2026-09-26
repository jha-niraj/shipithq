import type { Metadata } from "next"
import { Check, Minus } from "lucide-react"
import { UNI_PLANS, UNI_PLAN_ORDER, type UniPlanKey } from "@repo/pricing"
import { cn } from "@repo/ui/lib/utils"
import SiteHeader from "@/components/site/header"
import SiteFooter from "@/components/site/footer"
import { PageHero } from "@/components/page-hero"
import { MONO, Section, TONE } from "@/components/marketing/primitives"
import { CardArt, CardArtStyles } from "@/components/marketing/card-art"
import { CtaBand } from "@/components/marketing/sections"
import FaqsAccrodian from "@/components/landingpage/faqs"
import { UniPlanCards } from "../_components/pricing-section"
import { BRAND, UNI_LINKS } from "@/lib/site"
import { pageMeta } from "@/lib/seo"
import { faqSchema, jsonLd } from "@/lib/schema"

/**
 * shipithq.com/uni/pricing (plan/web/revamp REV-30, REV-31), built like /hire/pricing:
 * hero with the facts, the plan cards, the full comparison, what credits pay for, what
 * every plan includes, FAQ and the closing band. Every number is UNI_PLANS
 * (decisions: overview, "University plans").
 */

export const metadata: Metadata = pageMeta({
    title: "University plans and pricing",
    description: "ShipItHQ for universities: free for up to 50 students, Starter, Growth and Enterprise. Students, faculty, departments, credits and modules per plan.",
    path: "/uni/pricing",
})

const { FREE: free, STARTER: starter, GROWTH: growth } = UNI_PLANS
const show = (n: number) => (n >= 999999 ? "Unlimited" : n.toLocaleString("en-IN"))

const LIMITS: { label: string; key: "maxStudents" | "maxFaculty" | "maxDepartments" | "maxClassesPerFaculty" | "maxCreditsPerMonth" }[] = [
    { label: "Students", key: "maxStudents" },
    { label: "Faculty", key: "maxFaculty" },
    { label: "Departments", key: "maxDepartments" },
    { label: "Classes per faculty", key: "maxClassesPerFaculty" },
    { label: "Credits a month", key: "maxCreditsPerMonth" },
]

const FLAGS: { label: string; key: "hasAnalytics" | "hasAdvancedReports" | "hasPlacementModule" | "hasCompanyPortal" | "hasCustomBranding" | "hasPrioritySupport" | "hasAPIAccess" | "hasWhiteLabel" }[] = [
    { label: "Analytics", key: "hasAnalytics" },
    { label: "Advanced reports", key: "hasAdvancedReports" },
    { label: "Placement module", key: "hasPlacementModule" },
    { label: "Company portal", key: "hasCompanyPortal" },
    { label: "Custom branding", key: "hasCustomBranding" },
    { label: "Priority support", key: "hasPrioritySupport" },
    { label: "API access", key: "hasAPIAccess" },
    { label: "White-label", key: "hasWhiteLabel" },
]

/** Included on every plan. */
const EVERY_PLAN = [
    "AI-generated projects for any stack and level",
    "Voice mock interviews by category and level",
    "Quizzes and code assessments with deadlines",
    "Six campus roles with permissions you control",
    "Students on their own ShipItHQ accounts",
    "A monthly credit pool for AI work",
]

const FAQS = [
    { question: "What does the Free plan include?", answer: `Enough to try it with one department: up to ${free.maxStudents} students, ${free.maxFaculty} faculty, ${free.maxDepartments} departments, ${free.maxClassesPerFaculty} classes per faculty member and ${free.maxCreditsPerMonth.toLocaleString("en-IN")} credits a month. Projects, mocks and assessments are all included.` },
    { question: "What do credits pay for?", answer: `AI work: generating project briefs, running voice mock interviews and building assessments. The pool refreshes every month: ${starter.maxCreditsPerMonth.toLocaleString("en-IN")} on Starter and ${growth.maxCreditsPerMonth.toLocaleString("en-IN")} on Growth.` },
    { question: "Which plan has the placement module?", answer: "Growth and Enterprise, with company portal access. Analytics start on Starter; advanced reports on Growth." },
    { question: "What does yearly billing save?", answer: `Yearly is the price of ten months: Starter is ₹${starter.yearlyPriceINR.toLocaleString("en-IN")} ($${starter.yearlyPriceUSD}) and Growth ₹${growth.yearlyPriceINR.toLocaleString("en-IN")} ($${growth.yearlyPriceUSD.toLocaleString("en-US")}) a year.` },
    { question: "Do students pay anything?", answer: "Not for the work you assign: it draws on your institution's credits. Students can use the rest of ShipItHQ on their own accounts as usual." },
    { question: "Can we start with one department?", answer: "Yes. Start free or on Starter with one department, and move up as more departments join." },
    { question: "Is there a plan for a university group?", answer: "Enterprise: no limits on students, faculty or departments, API access, white-label options and a dedicated account manager." },
    { question: "Do you send invoices?", answer: "Yes, every payment has an invoice in the billing section of the university app." },
]

export default function UniPricingPage() {
    const col = (k: UniPlanKey) => k === "GROWTH" && "bg-neutral-50"
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(FAQS))} />
            <SiteHeader />
            <main className="bg-neutral-50">
                <PageHero
                    crumbs={[{ name: "Universities", href: "/uni" }, { name: "Pricing" }]}
                    eyebrow="University plans"
                    title="Start with a department. Grow to the campus."
                    sub="Every plan includes projects, voice mock interviews and assessments. Plans differ in how many students, faculty and departments they hold, the credits for AI work, and the modules that come with them."
                    tone="blush"
                    art="pricing"
                    ctas={[{ text: "Set up your campus", href: UNI_LINKS.signup, external: true }, { text: "Compare plans", href: "#compare" }]}
                    facts={[
                        { value: "₹0", label: "To start" },
                        { value: String(free.maxStudents), label: "Students on Free" },
                        { value: growth.maxStudents.toLocaleString("en-IN"), label: "Students on Growth" },
                        { value: "2", label: "Months free, yearly" },
                    ]}
                />

                <Section eyebrow="Plans" title="Pick a plan">
                    <UniPlanCards />
                </Section>

                <Section id="compare" eyebrow="Compare" title="Every plan, line by line" className="pt-0 md:pt-0">
                    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
                        <table className="w-full min-w-[46rem] text-left text-[15px]">
                            <thead>
                                <tr className="border-b border-neutral-200">
                                    <th className="p-5 font-medium text-neutral-600">Limits</th>
                                    {UNI_PLAN_ORDER.map((k) => <th key={k} className={cn("p-5 font-display text-lg font-semibold text-neutral-900", col(k))}>{UNI_PLANS[k].name}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {LIMITS.map((r) => (
                                    <tr key={r.label}>
                                        <td className="p-5 text-neutral-700">{r.label}</td>
                                        {UNI_PLAN_ORDER.map((k) => <td key={k} className={cn(MONO, "p-5 font-medium text-neutral-900", col(k))}>{show(UNI_PLANS[k][r.key])}</td>)}
                                    </tr>
                                ))}
                                {FLAGS.map((r) => (
                                    <tr key={r.label}>
                                        <td className="p-5 text-neutral-700">{r.label}</td>
                                        {UNI_PLAN_ORDER.map((k) => (
                                            <td key={k} className={cn("p-5", col(k))}>
                                                {UNI_PLANS[k][r.key] ? <Check className="size-4 text-neutral-900" aria-label="Included" /> : <Minus className="size-4 text-neutral-400" aria-label="Not included" />}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>

                <Section eyebrow="Credits" title="What your credits pay for" className="pt-0 md:pt-0">
                    <CardArtStyles />
                    <div className="grid gap-4 md:grid-cols-3">
                        {[
                            { tone: "blush" as const, art: "uni-classes" as const, title: "Project briefs", body: "AI writes a project for the stack, type and level a faculty member picks, so each batch gets fresh work." },
                            { tone: "ink" as const, art: "mock" as const, title: "Voice mock interviews", body: "Mocks by category and level, taken by students at any hour, without booking a faculty member." },
                            { tone: "sage" as const, art: "uni-analytics" as const, title: "Assessments", body: "Quizzes and code tests generated for a language and difficulty, with a time limit." },
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

                <Section eyebrow="On every plan" title="The core work is never paywalled" className="pt-0 md:pt-0">
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
                    <FaqsAccrodian faqs={FAQS} idPrefix="uni-pricing-faq" sub="Plans, credits, placements and billing." contact={BRAND.email} />
                </section>

                <CtaBand
                    title={<>Your next batch, <br className="hidden sm:block" />ready on evidence.</>}
                    sub={`Start free for up to ${free.maxStudents} students. Move up when more departments join.`}
                    primary={{ text: "Set up your campus", href: UNI_LINKS.signup }}
                    secondary={{ text: "Talk to us", href: `mailto:${BRAND.email}` }}
                    words={["Free to start", "Starter", "Growth", "Enterprise", "Yearly saves two months", "Invoices"]}
                />
            </main>
            <SiteFooter audience="universities" />
        </>
    )
}
