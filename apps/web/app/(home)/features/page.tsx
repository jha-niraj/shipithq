import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { PageHero } from '@/components/page-hero'
import { Reveal } from '@/components/reveal'
import { PageToc } from '@/components/page-toc'
import { SITE, BRAND, APP_LINKS } from '@/lib/site'
import { pageMeta } from '@/lib/seo'
import { breadcrumbSchema, webPageSchema, jsonLd } from '@/lib/schema'
import { FEATURE_MODULES } from './_components/feature-modules'
import { MODULES } from '@/content/modules'

/** Modules with a detail page at /features/<id> (plan/web/revamp REV-12). Credits has none. */
const DETAIL_IDS = new Set<string>(MODULES.map((m) => m.id))

/**
 * The "what do I actually get" page.
 *
 * ── Its layout is deliberately not the other pages' layout ──
 *
 * About is a `statement` hero over centred grids. Pricing is a `ledger` hero over column
 * grids. If this page were a third stack of centred sections, six public pages would read
 * as one template with the words swapped, which is the specific complaint this work
 * started from.
 *
 * So: a `split` hero, and then a body that is a two-column reading layout with a sticky
 * index. That shape is not decoration - it is the right one for a page of six anchored
 * sections that the navbar dropdown deep-links into, because the index doubles as the
 * "you are here" the dropdown cannot show.
 *
 * The sticky column is CSS `position: sticky`. No scrollspy, no observer, no
 * `use client` - a highlighted current section would cost a client component on a page
 * whose whole argument is that the product is fast.
 *
 * ── Everything factual is in `_components/feature-modules.ts` ──
 *
 * Including where each claim was verified. This file is layout; that file is the
 * contract. See the note at the top of it.
 */

export const metadata: Metadata = pageMeta({
    title: 'Features',
    description:
        'Practice with code that runs in a real Linux container, projects with interviews written from your own build, voice mocks, ATS resume tooling and a job tracker.',
    path: '/features',
})

const crumbs = breadcrumbSchema([], { name: 'Features', path: '/features' })

const page = webPageSchema({
    url: `${SITE}/features`,
    name: `Features | ${BRAND.name}`,
    description: 'Every module in ShipItHQ, what each one does, and what each one is not.',
    breadcrumb: crumbs['@id'],
})

// ItemList rather than SoftwareApplication. `SoftwareApplication` requires an
// `aggregateRating` or a `review` to be eligible for a rich result, and there are no real
// reviews on this page - inventing one risks a manual action, which is why apps/web's own
// CLAUDE.md forbids it.
const featureSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${BRAND.name} features`,
    itemListElement: FEATURE_MODULES.map((m, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: m.name,
        description: m.summary,
        url: `${SITE}/features#${m.id}`,
    })),
}

export default function FeaturesPage() {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(featureSchema)} />
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(crumbs)} />
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(page)} />

            <PageHero
                variant="split"
                tone="mint"
                eyebrow="Features"
                title={<>Six things, and each one does what it says.</>}
                sub="No module on this page is coming soon, in beta, or a route you cannot reach after signing up. Where something has a limit, the limit is written next to it."
                ctas={[
                    { text: 'Start free', href: APP_LINKS.signup, external: true },
                    { text: 'See pricing', href: '/pricing' },
                ]}
                aside={
                    <ul className="grid gap-px overflow-hidden rounded-2xl border border-neutral-900/15 bg-neutral-900/15">
                        {FEATURE_MODULES.map((m) => (
                            <li key={m.id} className="bg-white/70 backdrop-blur-sm">
                                <a
                                    href={`#${m.id}`}
                                    className="flex min-h-11 items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-white"
                                >
                                    <span className="text-sm font-semibold text-neutral-900">{m.name}</span>
                                    <span className="hidden text-xs text-neutral-700 sm:block">{m.summary.split(',')[0]}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                }
            />

            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
                <div className="grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
                    {/* The index. `hidden lg:block` because below lg it would push the first
                        section a full screen down, and the hero already lists the same six
                        as tappable links - so nothing is lost on a phone.

                        It tracks the current section now. This shipped CSS-only with a note
                        saying a scrollspy "would cost a client component on a page whose whole
                        argument is that the product is fast" - which traded the wrong thing. A
                        contents list answers two questions, what is here and where am I, and
                        without an active state it answers only the first. The budget exists to
                        stop decoration, not to stop a control doing its job. */}
                    <PageToc
                        items={FEATURE_MODULES.map((m) => ({ id: m.id, label: m.name }))}
                        className="hidden lg:block"
                    />

                    <div className="min-w-0">
                        {FEATURE_MODULES.map((m, i) => (
                            <Reveal
                                as="section"
                                key={m.id}
                                // The id is on the SECTION now, not on a zero-height div
                                // inside it. Both work as a scroll anchor; only the section
                                // has a box an IntersectionObserver can watch.
                                id={m.id}
                                // scroll-mt clears the sticky navbar, so an anchor lands with
                                // the heading below it.
                                className={`scroll-mt-28 ${i > 0 ? 'mt-20 border-t border-neutral-200 pt-20 dark:border-neutral-800' : ''}`}
                            >
                                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                                    {String(i + 1).padStart(2, '0')}
                                </p>
                                <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
                                    {m.name}
                                </h2>
                                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
                                    {m.summary}
                                </p>

                                <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                                    <div className="min-w-0 space-y-4">
                                        {m.body.map((para) => (
                                            <p key={para.slice(0, 32)} className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                                                {para}
                                            </p>
                                        ))}
                                    </div>

                                    <div className="min-w-0">
                                        <ul className="space-y-2.5">
                                            {m.points.map((p) => (
                                                <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden />
                                                    {p}
                                                </li>
                                            ))}
                                        </ul>

                                        {m.costs && (
                                            <dl className="mt-6 space-y-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                                                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
                                                    What it costs
                                                </p>
                                                {m.costs.map((c) => (
                                                    <div key={c.label} className="flex items-baseline justify-between gap-4 text-sm">
                                                        <dt className="text-neutral-600 dark:text-neutral-400">{c.label}</dt>
                                                        <dd className="shrink-0 font-medium tabular-nums text-neutral-900 dark:text-white">
                                                            {c.credits === 0 ? 'Free' : `${c.credits} credits`}
                                                        </dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        )}
                                    </div>
                                </div>

                                {/* The scope line gets its own block rather than a footnote,
                                    because it is the most useful sentence in the section and a
                                    reader deciding between this and a course needs it before
                                    they sign up, not after. */}
                                <p className="mt-8 border-l-2 border-neutral-900 py-1 pl-5 text-[15px] leading-relaxed text-neutral-600 dark:border-white dark:text-neutral-400">
                                    <span className="font-semibold text-neutral-900 dark:text-white">What it is not. </span>
                                    {m.scope}
                                </p>
                                {DETAIL_IDS.has(m.id) && (
                                    <Link
                                        href={`/features/${m.id}`}
                                        className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-900 underline-offset-4 hover:underline dark:text-white"
                                    >
                                        How {m.name.toLowerCase()} works, step by step
                                        <ArrowRight className="h-4 w-4" aria-hidden />
                                    </Link>
                                )}
                            </Reveal>
                        ))}
                    </div>
                </div>

                <Reveal className="mt-24 rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-12 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
                        100 credits, no card, nothing to cancel.
                    </h2>
                    <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                        Enough to run a few practice sets, score a resume and generate a cover letter before you decide whether any of this is for you.
                    </p>
                    <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                        <a
                            href={APP_LINKS.signup}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-neutral-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                        >
                            Start free <ArrowRight className="h-4 w-4" aria-hidden />
                        </a>
                        <Link
                            href="/pricing"
                            className="inline-flex min-h-11 items-center rounded-full border border-neutral-300 px-6 text-sm font-semibold text-neutral-800 transition-colors hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
                        >
                            What credits cost
                        </Link>
                    </div>
                </Reveal>
            </div>
        </>
    )
}
