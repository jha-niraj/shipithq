import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { PageHero } from '@/components/page-hero'
import { Reveal } from '@/components/reveal'
import { SITE, BRAND, APP_LINKS } from '@/lib/site'
import { pageMeta } from '@/lib/seo'
import { breadcrumbSchema, webPageSchema, faqSchema, jsonLd } from '@/lib/schema'
import { FaqAccordion } from '@/components/faq-accordion'
import { COMPARISONS, COMPARISON_SLUGS, getComparison, SOURCING_NOTE } from '../_components/comparisons'

/**
 * One comparison page per alternative.
 *
 * ── The layout is the argument ──
 *
 * `versus` hero, deliberately asymmetric: the title takes seven columns and the aside
 * five, so the two sides are visibly unequal. A balanced 50/50 header would imply the two
 * products are equivalent, which is the one thing a comparison page must not accidentally
 * say before the reader has read a word.
 *
 * Then: what they are good at FIRST, before any argument for us. A comparison that opens
 * by listing the other product's weaknesses reads as an advert and gets closed. This one
 * cannot open that way because the data model puts `creditWhereDue` before `argument`.
 *
 * And a "pick them if" section that is the same size as "pick us if". If that section is
 * ever quietly shortened, this page has stopped being a comparison.
 *
 * ── The source column is visible, not a comment ──
 *
 * Every row prints where it was checked, in the page, for the reader. That is the
 * strictest part of `01-content-truth.md` made visible rather than promised: a claim
 * nobody can check is a claim we should not have made.
 */

export const dynamicParams = false

export function generateStaticParams() {
    return COMPARISON_SLUGS.map((competitor) => ({ competitor }))
}

interface Props { params: Promise<{ competitor: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { competitor } = await params
    const c = getComparison(competitor)
    if (!c) return {}

    return pageMeta({
        title: `${c.title} - Honest Comparison`,
        description: c.description,
        path: `/compare/${c.slug}`,
        // Its own generated versus card, not the shared home image. Ten links shared to
        // the same social preview is ten posts that look like one.
        image: `/compare/${c.slug}/cover`,
    })
}

export default async function ComparePage({ params }: Props) {
    const { competitor } = await params
    const c = getComparison(competitor)
    if (!c) notFound()

    const others = COMPARISONS.filter((x) => x.slug !== c.slug)

    const crumbs = breadcrumbSchema(
        [{ name: 'Compare', path: '/compare' }],
        { name: c.title, path: `/compare/${c.slug}` },
    )
    const page = webPageSchema({
        url: `${SITE}/compare/${c.slug}`,
        name: c.title,
        description: c.description,
        breadcrumb: crumbs['@id'],
    })

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(crumbs)} />
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(page)} />
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(c.faqs))} />

            <PageHero
                variant="versus"
                tone="coral"
                crumbs={[{ name: 'Compare', href: '/compare' }, { name: c.title }]}
                eyebrow="Compare"
                title={<>{c.title}</>}
                sub={c.stance}
                ctas={[
                    { text: 'Start free', href: APP_LINKS.signup, external: true },
                    { text: 'See all features', href: '/features' },
                ]}
                aside={
                    c.vendorUrl ? (
                        <a
                            href={c.vendorUrl}
                            rel="noopener noreferrer nofollow"
                            target="_blank"
                            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-neutral-800 underline decoration-neutral-900/30 underline-offset-4 transition-colors hover:decoration-neutral-900"
                        >
                            Check any of this on {c.name} yourself
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </a>
                    ) : (
                        // Category comparisons have no single vendor to link. Saying so is
                        // better than an empty column or a link to something arbitrary.
                        <p className="text-sm leading-relaxed text-neutral-700">
                            This one compares an approach rather than a company, so there is no
                            single site to check it against.
                        </p>
                    )
                }
            />

            <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-24">
                <Reveal as="section" className="scroll-mt-28">
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
                        What {c.name} is genuinely good at
                    </h2>
                    <div className="mt-5 space-y-4">
                        {c.creditWhereDue.map((p) => (
                            <p key={p.slice(0, 32)} className="text-[17px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                                {p}
                            </p>
                        ))}
                    </div>
                </Reveal>

                <Reveal as="section" className="mt-16 border-t border-neutral-200 pt-16 dark:border-neutral-800">
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
                        Where the gap actually is
                    </h2>
                    <div className="mt-5 space-y-4">
                        {c.argument.map((p) => (
                            <p key={p.slice(0, 32)} className="text-[17px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                                {p}
                            </p>
                        ))}
                    </div>
                </Reveal>

                <Reveal as="section" className="mt-16 border-t border-neutral-200 pt-16 dark:border-neutral-800">
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
                        Side by side
                    </h2>

                    {/* Wide content scrolls inside its own container, never the page. Six
                        columns of prose cannot fit 360px and the fallback must not be the
                        document scrolling sideways - see docs/responsiveness.md. */}
                    <div className="mt-8 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-neutral-300 dark:border-neutral-700">
                                    <th scope="col" className="w-[22%] py-3 pr-4 font-semibold text-neutral-900 dark:text-white">
                                        &nbsp;
                                    </th>
                                    <th scope="col" className="w-[30%] py-3 pr-4 font-semibold text-neutral-900 dark:text-white">
                                        {BRAND.name}
                                    </th>
                                    <th scope="col" className="w-[30%] py-3 pr-4 font-semibold text-neutral-900 dark:text-white">
                                        {c.name}
                                    </th>
                                    <th scope="col" className="w-[18%] py-3 font-semibold text-neutral-900 dark:text-white">
                                        Read more
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {c.rows.map((r) => (
                                    <tr key={r.dimension} className="border-b border-neutral-200 align-top dark:border-neutral-800">
                                        <th scope="row" className="py-4 pr-4 font-medium text-neutral-900 dark:text-white">
                                            {r.dimension}
                                        </th>
                                        <td className="py-4 pr-4 leading-relaxed text-neutral-700 dark:text-neutral-300">{r.ours}</td>
                                        <td className="py-4 pr-4 leading-relaxed text-neutral-600 dark:text-neutral-400">{r.theirs}</td>
                                        {/* A link, not a file path.
                                            This column used to print repository paths -
                                            `apps/main/app/(main)/practice` - onto a public
                                            page. That published our directory structure and
                                            gave the reader nothing they could act on. The
                                            sourcing discipline is unchanged and now lives in
                                            the data file where reviewers can check it. */}
                                        <td className="py-4 text-[13px] leading-relaxed">
                                            {r.learnMore ? (
                                                <Link
                                                    href={r.learnMore.href}
                                                    className="inline-flex items-center gap-1 font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-900 dark:text-white dark:decoration-neutral-700 dark:hover:decoration-white"
                                                >
                                                    {r.learnMore.label}
                                                </Link>
                                            ) : (
                                                <span className="text-neutral-500 dark:text-neutral-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="mt-6 border-l-2 border-neutral-900 py-1 pl-5 text-[15px] leading-relaxed text-neutral-600 dark:border-white dark:text-neutral-400">
                        {SOURCING_NOTE}
                    </p>
                </Reveal>

                {/* The long-form argument. Added after a manual pass found these pages thin
                    next to the rest of the site - a table and two short blocks is a
                    comparison chart, not a comparison. */}
                {c.deepDive.map((section) => (
                    <Reveal
                        as="section"
                        key={section.heading}
                        className="mt-16 border-t border-neutral-200 pt-16 dark:border-neutral-800"
                    >
                        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
                            {section.heading}
                        </h2>
                        <div className="mt-5 max-w-3xl space-y-4">
                            {section.body.map((para) => (
                                <p key={para.slice(0, 32)} className="text-[17px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                                    {para}
                                </p>
                            ))}
                        </div>
                    </Reveal>
                ))}

                <Reveal as="section" className="mt-16 grid gap-8 border-t border-neutral-200 pt-16 dark:border-neutral-800 md:grid-cols-2">
                    {/* Them first, and the same size. A comparison page whose "pick them"
                        column is shorter than its "pick us" column is an advert wearing a
                        comparison's clothes. */}
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                            Pick {c.name} if
                        </h2>
                        <ul className="mt-4 space-y-3">
                            {c.pickThemIf.map((p) => (
                                <li key={p.slice(0, 32)} className="border-l-2 border-neutral-200 pl-4 text-[15px] leading-relaxed text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                            Pick {BRAND.name} if
                        </h2>
                        <ul className="mt-4 space-y-3">
                            {c.pickUsIf.map((p) => (
                                <li key={p.slice(0, 32)} className="border-l-2 border-neutral-900 pl-4 text-[15px] leading-relaxed text-neutral-700 dark:border-white dark:text-neutral-300">
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </div>
                </Reveal>

                {/* Rendered, not only marked up - Google requires the FAQPage answer to
                    match what a visitor sees, and an assistant quoting the page needs the
                    text in the HTML. details/summary rather than an accordion, because an
                    accordion would cost a client component on a page that has none. */}
                <Reveal as="section" className="mt-16 border-t border-neutral-200 pt-16 dark:border-neutral-800">
                    <h2 className="mb-8 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
                        Common questions
                    </h2>
                    {/* Same accordion as the landing page - see the note in
                        components/faq-accordion.tsx. */}
                    <FaqAccordion faqs={c.faqs} idPrefix={`compare-${c.slug}`} />
                </Reveal>

                <Reveal className="mt-20 rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-12 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
                        Most people end up using both.
                    </h2>
                    <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                        You start with 100 credits and no card, so you can find out which half of your preparation is actually the weak one.
                    </p>
                    <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                        <a
                            href={APP_LINKS.signup}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-neutral-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                        >
                            Start free <ArrowRight className="h-4 w-4" aria-hidden />
                        </a>
                        {others.map((o) => (
                            <Link
                                key={o.slug}
                                href={`/compare/${o.slug}`}
                                className="inline-flex min-h-11 items-center rounded-full border border-neutral-300 px-6 text-sm font-semibold text-neutral-800 transition-colors hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
                            >
                                vs {o.name}
                            </Link>
                        ))}
                    </div>
                </Reveal>
            </div>
        </>
    )
}
