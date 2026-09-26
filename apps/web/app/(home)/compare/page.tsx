import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PageHero } from '@/components/page-hero'
import { Reveal } from '@/components/reveal'
import { SITE, BRAND, APP_LINKS } from '@/lib/site'
import { pageMeta } from '@/lib/seo'
import { breadcrumbSchema, webPageSchema, jsonLd } from '@/lib/schema'
import { COMPARISONS } from './_components/comparisons'

/**
 * The comparison index.
 *
 * A `ledger` hero here, not `versus` - the individual comparison pages own that variant,
 * and this page is a list rather than an argument between two things. Four public pages,
 * four different compositions on the same surface.
 */

export const metadata: Metadata = pageMeta({
    title: 'Compare ShipItHQ vs the Alternatives',
    description:
        'Honest comparisons with the tools people use to prepare for engineering interviews. No competitor prices quoted from memory, every claim sourced.',
    path: '/compare',
})

const crumbs = breadcrumbSchema([], { name: 'Compare', path: '/compare' })

const page = webPageSchema({
    url: `${SITE}/compare`,
    name: `Compare | ${BRAND.name}`,
    description: 'How ShipItHQ compares to the alternatives, with the sourcing shown.',
    breadcrumb: crumbs['@id'],
})

export default function CompareIndexPage() {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(crumbs)} />
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(page)} />

            <PageHero
                variant="ledger"
                tone="sand"
                art="compare"
                eyebrow="Compare"
                title={<>We will tell you when to use the other one.</>}
                sub="Every comparison here opens with what the alternative is genuinely good at, and none of them quote a competitor's price - because prices change and comparison pages do not."
                ctas={[
                    { text: 'Start free', href: APP_LINKS.signup, external: true },
                    { text: 'See all features', href: '/features' },
                ]}
                facts={[
                    { value: `${COMPARISONS.length}`, label: 'Comparisons' },
                    { value: '0', label: 'Prices quoted from memory' },
                    { value: '100', label: 'Free credits at signup' },
                    { value: 'Never', label: 'Credit expiry' },
                ]}
            />

            <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-24">
                <div className="grid gap-5 sm:grid-cols-2">
                    {COMPARISONS.map((c, i) => (
                        <Reveal key={c.slug} delay={Math.min(i * 0.05, 0.3)} className="flex">
                            {/* Same shape as a blog card: the generated cover on top, then
                                the copy. The cards used to be text-only in a bordered box,
                                which made a ten-card grid a wall of identical rectangles -
                                the exact failure the blog index had before its covers. */}
                            <Link
                                href={`/compare/${c.slug}`}
                                className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900/40 dark:hover:border-neutral-600"
                            >
                                <div className="overflow-hidden border-b border-neutral-200 dark:border-neutral-800">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={`/compare/${c.slug}/cover`}
                                        alt={c.title}
                                        width={1200}
                                        height={630}
                                        loading={i < 2 ? 'eager' : 'lazy'}
                                        className="aspect-[1200/630] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                                    />
                                </div>
                                <div className="flex flex-1 flex-col p-6">
                                    <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                                        Comparison
                                    </p>
                                    <h2 className="mb-3 text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                                        {c.title}
                                    </h2>
                                    <p className="mb-6 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                                        {c.stance}
                                    </p>
                                    <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-white">
                                        Read the comparison
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                                    </span>
                                </div>
                            </Link>
                        </Reveal>
                    ))}
                </div>

                {/* The sourcing rule, said in public. It is also the reason there are two
                    comparison pages here and not six: a page we cannot source is a page we
                    do not ship, and that is a slower way to build this section. */}
                <Reveal className="mt-16 rounded-2xl border border-neutral-200 p-8 dark:border-neutral-800">
                    <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                        How these are written
                    </h2>
                    <ul className="mt-5 space-y-4 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                        <li className="border-l-2 border-neutral-200 pl-4 dark:border-neutral-800">
                            <span className="font-semibold text-neutral-900 dark:text-white">What they are good at goes first. </span>
                            Before any argument for us. If the case only works when the other product is described badly, it is not a case.
                        </li>
                        <li className="border-l-2 border-neutral-200 pl-4 dark:border-neutral-800">
                            <span className="font-semibold text-neutral-900 dark:text-white">Every row says where it was checked. </span>
                            Ours name the file in our own codebase. Theirs name the page and the date it was read.
                        </li>
                        <li className="border-l-2 border-neutral-200 pl-4 dark:border-neutral-800">
                            <span className="font-semibold text-neutral-900 dark:text-white">No competitor prices. </span>
                            Not approximate ones either. An out-of-date figure that happens to favour us is the most dishonest thing a comparison page can contain, and it is also the easiest to end up with by accident.
                        </li>
                        <li className="border-l-2 border-neutral-200 pl-4 dark:border-neutral-800">
                            <span className="font-semibold text-neutral-900 dark:text-white">There is a &ldquo;pick them if&rdquo; section, the same size as ours. </span>
                            If that section ever gets quietly shortened, the page has stopped being a comparison.
                        </li>
                    </ul>
                </Reveal>
            </div>
        </>
    )
}
