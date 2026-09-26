import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { UNI_PLANS, UNI_PLAN_ORDER } from "@repo/pricing"
import SiteHeader from "@/components/site/header"
import SiteFooter from "@/components/site/footer"
import { FeatureDetail } from "@/components/marketing/feature-detail"
import { UNI_FEATURES, UNI_MODULES, uniFeatureBySlug } from "@/content/uni"
import { BRAND, SITE, UNI_LINKS } from "@/lib/site"
import { pageMeta } from "@/lib/seo"
import { breadcrumbSchema, faqSchema, jsonLd, webPageSchema } from "@/lib/schema"

/**
 * One university module in depth, shipithq.com/uni/<slug> (plan/web/revamp REV-31):
 * the same layout as the student and hiring feature pages. Limits by plan come from
 * UNI_PLANS.
 */

export const dynamicParams = false

export function generateStaticParams() {
    return UNI_FEATURES.map((f) => ({ feature: f.slug }))
}

const show = (n: number) => (n >= 999999 ? "Unlimited" : n.toLocaleString("en-IN"))
const row = (label: string, key: "maxStudents" | "maxFaculty" | "maxDepartments" | "maxClassesPerFaculty" | "maxCreditsPerMonth") => ({
    label, values: UNI_PLAN_ORDER.map((k) => (k === "ENTERPRISE" ? "Unlimited" : show(UNI_PLANS[k][key]))),
})
const flag = (label: string, key: "hasAnalytics" | "hasAdvancedReports" | "hasPlacementModule" | "hasCompanyPortal") => ({
    label, values: UNI_PLAN_ORDER.map((k) => (UNI_PLANS[k][key] ? "Yes" : "-")),
})

const PLAN_LIMITS: Record<string, { label: string; values: string[] }[]> = {
    students: [row("Students", "maxStudents"), row("Departments", "maxDepartments"), row("Credits a month", "maxCreditsPerMonth")],
    assignments: [row("Classes per faculty", "maxClassesPerFaculty"), row("Credits a month", "maxCreditsPerMonth")],
    faculty: [row("Faculty", "maxFaculty"), row("Departments", "maxDepartments")],
    placements: [flag("Placement module", "hasPlacementModule"), flag("Company portal", "hasCompanyPortal"), row("Students", "maxStudents")],
    analytics: [flag("Analytics", "hasAnalytics"), flag("Advanced reports", "hasAdvancedReports")],
}

export async function generateMetadata({ params }: { params: Promise<{ feature: string }> }): Promise<Metadata> {
    const f = uniFeatureBySlug((await params).feature)
    const card = UNI_MODULES.find((m) => m.id === f?.card)
    if (!f || !card) return {}
    return pageMeta({ title: `${card.name} for universities`, description: f.intro.slice(0, 158), path: `/uni/${f.slug}` })
}

export default async function UniFeaturePage({ params }: { params: Promise<{ feature: string }> }) {
    const f = uniFeatureBySlug((await params).feature)
    const card = UNI_MODULES.find((m) => m.id === f?.card)
    if (!f || !card) notFound()

    const crumbs = breadcrumbSchema([{ name: "Universities", path: "/uni" }], { name: card.name, path: `/uni/${f.slug}` })
    const page = webPageSchema({ url: `${SITE}/uni/${f.slug}`, name: `${card.name} | ${BRAND.name} for universities`, description: f.intro, breadcrumb: crumbs["@id"] })

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(crumbs)} />
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(page)} />
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(f.faqs))} />
            <SiteHeader />
            <FeatureDetail
                crumbs={[{ name: "Universities", href: "/uni" }, { name: card.name }]}
                kind={card.kind}
                name={card.name}
                headline={f.headline}
                intro={f.intro}
                tone={card.tone}
                art={card.id}
                meta={card.meta}
                ctas={[
                    { text: "Set up your campus", href: UNI_LINKS.signup, external: true },
                    { text: "See plans", href: "/uni/pricing" },
                ]}
                steps={f.steps}
                different={f.different}
                limits={f.limits}
                faqs={f.faqs}
                others={UNI_MODULES.filter((m) => m.id !== card.id)}
                finalCta={{ text: "Set up your campus", href: UNI_LINKS.signup }}
                planLimits={PLAN_LIMITS[f.slug]}
                planNames={UNI_PLAN_ORDER.map((k) => UNI_PLANS[k].name)}
                pricingHref="/uni/pricing"
                othersTitle="The rest of ShipItHQ for universities"
            />
            <SiteFooter audience="universities" />
        </>
    )
}
