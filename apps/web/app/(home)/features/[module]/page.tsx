import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { APP_LINKS, APP_URL, BRAND, SITE } from "@/lib/site"
import { pageMeta } from "@/lib/seo"
import { FEATURE_EXTRAS } from "@/content/feature-extras"
import { breadcrumbSchema, faqSchema, jsonLd, webPageSchema } from "@/lib/schema"
import { MODULES, moduleById } from "@/content/modules"
import { FeatureDetail } from "@/components/marketing/feature-detail"
import { moduleCards } from "@/components/home/modules"

/**
 * One student module in depth (plan/web/revamp REV-12, REV-81), rendered by the
 * shared FeatureDetail. Every step, difference, limit and price comes from
 * content/modules.ts, where each carries the product file that proves it.
 */

export const dynamicParams = false

export function generateStaticParams() {
    return MODULES.map((m) => ({ module: m.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }): Promise<Metadata> {
    const m = moduleById((await params).module)
    if (!m) return {}
    return pageMeta({ title: m.name, description: m.detail.intro.slice(0, 158), path: `/features/${m.id}` })
}

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
    const m = moduleById((await params).module)
    if (!m) notFound()

    const crumbs = breadcrumbSchema([{ name: "Features", path: "/features" }], { name: m.name, path: `/features/${m.id}` })
    const page = webPageSchema({ url: `${SITE}/features/${m.id}`, name: `${m.name} | ${BRAND.name}`, description: m.detail.intro, breadcrumb: crumbs["@id"] })

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(crumbs)} />
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(page)} />
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema([...m.detail.faqs, ...(FEATURE_EXTRAS[m.id]?.moreFaqs ?? [])]))} />
            <FeatureDetail
                crumbs={[{ name: "Features", href: "/features" }, { name: m.name }]}
                kind={m.kind}
                name={m.name}
                headline={m.detail.headline}
                intro={m.detail.intro}
                tone={m.tone}
                art={m.id}
                meta={m.meta.map((x) => x.text)}
                ctas={[
                    { text: "Start free", href: APP_LINKS.signup, external: true },
                    { text: `Open ${m.name.toLowerCase()} in the app`, href: `${APP_URL}${m.detail.appPath}`, external: true },
                ]}
                steps={m.detail.steps.map((s) => s.text)}
                different={m.detail.different.map((d) => d.text)}
                limits={m.detail.limits.map((l) => l.text)}
                costs={m.detail.costs}
                faqs={m.detail.faqs}
                others={moduleCards().filter((c) => c.id !== m.id)}
                finalCta={{ text: "Start free", href: APP_LINKS.signup }}
                othersTitle="The rest of ShipItHQ"
            />
        </>
    )
}
