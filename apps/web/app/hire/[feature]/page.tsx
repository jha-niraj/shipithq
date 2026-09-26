import type { Metadata } from "next"
import { notFound } from "next/navigation"
import SiteHeader from "@/components/site/header"
import SiteFooter from "@/components/site/footer"
import { FeatureDetail } from "@/components/marketing/feature-detail"
import { HIRE_FEATURES, HIRE_MODULES, hireFeatureBySlug } from "@/content/hire"
import { BRAND, HIRING_LINKS, SITE } from "@/lib/site"
import { pageMeta } from "@/lib/seo"
import { HIRING_AI_LIMITS, HIRING_PLANS, UNLIMITED } from "@repo/pricing"

const fmt = (n: number) => (n >= UNLIMITED ? "Unlimited" : n.toLocaleString("en-IN"))
const row = (label: string, key: "maxJobPosts" | "maxPipelines" | "maxApplications" | "maxTeamMembers" | "maxCustomRoles") => ({
    label,
    values: [fmt(HIRING_PLANS.FREE[key]), fmt(HIRING_PLANS.PRO[key]), fmt(HIRING_PLANS.ENTERPRISE[key])] as [string, string, string],
})

/** Each feature's own limits by plan (REV-98), all from HIRING_PLANS. */
const PLAN_LIMITS: Record<string, { label: string; values: [string, string, string] }[]> = {
    pipelines: [row("Interview pipelines", "maxPipelines"), { label: "AI drafts a day, free", values: [String(HIRING_AI_LIMITS.pipelineDraftsPerDay), String(HIRING_AI_LIMITS.pipelineDraftsPerDay), "Custom"] }],
    questions: [{ label: "AI generations a day, free", values: [String(HIRING_AI_LIMITS.aptitudeGenerationsPerDay), String(HIRING_AI_LIMITS.aptitudeGenerationsPerDay), "Custom"] }, row("Interview pipelines", "maxPipelines")],
    jobs: [row("Active jobs", "maxJobPosts"), row("Applicants a month", "maxApplications")],
    candidates: [row("Applicants a month", "maxApplications"), row("Active jobs", "maxJobPosts")],
    team: [row("Team members", "maxTeamMembers"), row("Custom roles", "maxCustomRoles")],
}
import { FEATURE_EXTRAS } from "@/content/feature-extras"
import { breadcrumbSchema, faqSchema, jsonLd, webPageSchema } from "@/lib/schema"

/**
 * One hiring feature in depth, shipithq.com/hire/<slug> (plan/web/revamp REV-82): its
 * own page for search, the same layout as the student feature pages.
 */

export const dynamicParams = false

export function generateStaticParams() {
    return HIRE_FEATURES.map((f) => ({ feature: f.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ feature: string }> }): Promise<Metadata> {
    const f = hireFeatureBySlug((await params).feature)
    const card = HIRE_MODULES.find((m) => m.id === `hire-${f?.slug}`)
    if (!f || !card) return {}
    return pageMeta({ title: `${card.name} for hiring teams`, description: f.intro.slice(0, 158), path: `/hire/${f.slug}` })
}

export default async function HireFeaturePage({ params }: { params: Promise<{ feature: string }> }) {
    const f = hireFeatureBySlug((await params).feature)
    const card = HIRE_MODULES.find((m) => m.id === `hire-${f?.slug}`)
    if (!f || !card) notFound()

    const crumbs = breadcrumbSchema([{ name: "Hire", path: "/hire" }], { name: card.name, path: `/hire/${f.slug}` })
    const page = webPageSchema({ url: `${SITE}/hire/${f.slug}`, name: `${card.name} | ${BRAND.name} Hiring`, description: f.intro, breadcrumb: crumbs["@id"] })

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(crumbs)} />
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(page)} />
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema([...f.faqs, ...(FEATURE_EXTRAS[card.id]?.moreFaqs ?? [])]))} />
            <SiteHeader />
            <FeatureDetail
                crumbs={[{ name: "Hire", href: "/hire" }, { name: card.name }]}
                kind={card.kind}
                name={card.name}
                headline={f.headline}
                intro={f.intro}
                tone={card.tone}
                art={card.id}
                meta={card.meta}
                ctas={[
                    { text: "Start hiring free", href: HIRING_LINKS.signup, external: true },
                    { text: "See plans", href: "/hire/pricing" },
                ]}
                steps={f.steps}
                different={f.different}
                limits={f.limits}
                faqs={f.faqs}
                others={HIRE_MODULES.filter((m) => m.id !== card.id)}
                finalCta={{ text: "Start hiring free", href: HIRING_LINKS.signup }}
                planLimits={PLAN_LIMITS[f.slug]}
                othersTitle="The rest of ShipItHQ Hiring"
            />
            <SiteFooter audience="companies" />
        </>
    )
}
