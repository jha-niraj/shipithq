import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import SiteHeader from "@/components/site/header"
import SiteFooter from "@/components/site/footer"
import { PageHero } from "@/components/page-hero"
import { Section, TONE, MONO, type Tone } from "@/components/marketing/primitives"
import FaqsAccrodian from "@/components/landingpage/faqs"
import { BLOG_POSTS } from "@/content/blog"
import { TOPIC_HUBS } from "@/content/topic-hubs"
import { HIRING_GUIDE_ART, HIRING_GUIDE_SLUGS } from "@/content/hiring-guides"
import { CardArt, CardArtStyles, type ArtKind } from "@/components/marketing/card-art"
import { HIRING_LINKS } from "@/lib/site"
import { pageMeta } from "@/lib/seo"
import { faqSchema, jsonLd } from "@/lib/schema"

/**
 * shipithq.com/hire/guides (plan/web/revamp REV-83): the hiring guides, for companies.
 * The posts themselves render at /blogs/<slug> through the blog system (covers,
 * sitemap, llms.txt, FAQ markup), with the companies navbar and footer.
 */

export const metadata: Metadata = pageMeta({
    title: "Hiring guides for engineering teams",
    description: "Design a technical interview loop, set pass marks, choose work samples over take-homes and run structured interviews, grounded in selection research.",
    path: "/hire/guides",
})

const TONES: Tone[] = ["blush", "sage", "butter", "mint", "coral"]

export default function HiringGuidesPage() {
    const hub = TOPIC_HUBS.hiring
    const why = new Map(hub.path.map((p) => [p.slug, p.why]))
    const posts = HIRING_GUIDE_SLUGS.map((slug) => ({ slug, post: BLOG_POSTS[slug] })).filter((x) => !!x.post)

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(hub.faqs))} />
            <SiteHeader />
            <main className="bg-neutral-50">
                <PageHero
                    crumbs={[{ name: "Hire", href: "/hire" }, { name: "Guides" }]}
                    eyebrow="Hiring guides"
                    title="Hire engineers on evidence"
                    sub={hub.body[0]}
                    tone="sage"
                    art="guides"
                    ctas={[{ text: "Start hiring free", href: HIRING_LINKS.signup, external: true }, { text: "See the product", href: "/hire" }]}
                />

                <Section eyebrow="Read in order" title="Five guides, one loop">
                    <CardArtStyles />
                    <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {posts.map(({ slug, post }, i) => {
                            const t = TONE[TONES[i % TONES.length]!]
                            return (
                                <li key={slug} className={cn(i === 0 && "md:col-span-2 xl:col-span-1")}>
                                    <Link href={`/blogs/${slug}`} className={cn("group flex h-full flex-col rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1", t.surface, t.ink)}>
                                        <span className="mb-5 flex h-36 items-center justify-center rounded-xl bg-white/45">
                                            <CardArt kind={(HIRING_GUIDE_ART[slug] ?? "guides") as ArtKind} className="max-h-32 transition-transform duration-500 group-hover:scale-[1.05]" />
                                        </span>
                                        <span className="flex items-center justify-between">
                                            <span className={cn(MONO, "text-3xl font-medium tracking-tight")}>{String(i + 1).padStart(2, "0")}</span>
                                            <span className={cn(MONO, "text-[11px] uppercase tracking-[0.14em]", t.muted)}>{post!.readingTime} min</span>
                                        </span>
                                        <span className="mt-8 font-display text-xl font-semibold leading-snug tracking-tight">{post!.title}</span>
                                        <span className={cn("mt-3 flex-1 text-[14px] leading-6", t.muted)}>{why.get(slug) ?? post!.description}</span>
                                        <span className="mt-6 flex items-center justify-between border-t border-neutral-900/15 pt-4 text-sm font-medium">
                                            Read the guide
                                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                                        </span>
                                    </Link>
                                </li>
                            )
                        })}
                    </ol>
                </Section>

                <section className="bg-white">
                    <FaqsAccrodian faqs={hub.faqs} idPrefix="hire-guides-faq" sub="What hiring teams ask about designing an engineering interview." />
                </section>
            </main>
            <SiteFooter audience="companies" />
        </>
    )
}
