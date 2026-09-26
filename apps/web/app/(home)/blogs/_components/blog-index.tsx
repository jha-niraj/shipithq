import { PageHero } from "@/components/page-hero"
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Reveal, RevealItem } from '@/components/reveal'
import { PostCard } from './post-card'
import { TopicGlyph } from './topic-glyph'
import { BLOG_CATEGORIES, BLOG_CATEGORY_KEYS, type BlogPostWithSlug } from '@/content/blog'

/**
 * The blog index. Server component.
 *
 * ── It used to be `BlogsClient`, and the filter was the reason ──
 *
 * The page carried `"use client"`, `useState`, `useMemo` and framer-motion to power one
 * thing: a row of category pills that filtered the grid in place. Everything else - a
 * featured card, seventeen post cards and a topic row - was static markup paying for that.
 *
 * The pills are now **links to the topic hubs**, and the whole component is a server
 * component. That is not a compromise to remove JavaScript; it is the better design, for
 * three reasons:
 *
 * **The hubs are real pages now.** Each one carries an introduction, an ordered reading
 * path and answered questions (see `content/topic-hubs.ts`). Filtering in place sent a
 * reader to a subset of this grid; a link sends them somewhere that actually helps.
 *
 * **A client-side filter produced no URL.** There was no way to link to "the DSA posts",
 * which is exactly what `/blogs/topics/dsa` is for. The old code even said so - its comment
 * called the topic links at the bottom "the real, crawlable URLs" while the pills above
 * them were not.
 *
 * **It stops this page competing with its own hubs.** A filtered view of `/blogs` and
 * `/blogs/topics/dsa` are the same content at two URLs, and the hubs are the pages we
 * decided should carry the cluster (SEO-44).
 *
 * The scroll reveals are `Reveal`, which ships no JavaScript.
 */

interface Props {
    posts: BlogPostWithSlug[]
}

function publishDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function BlogIndex({ posts }: Props) {
    // Only link categories that actually have published posts, so the row never sends a
    // reader to an empty hub.
    const present = new Set(posts.map((p) => p.category))
    const categories = BLOG_CATEGORY_KEYS.filter((k) => present.has(k))

    const featured = posts.find((p) => p.featured) ?? posts[0]
    const rest = posts.filter((p) => p.slug !== featured?.slug)

    return (
        <div className="min-h-screen bg-neutral-50 font-sans">
            {/* The shared hero (plan/web/revamp REV-80). */}
            <PageHero
                eyebrow="The ShipItHQ blog"
                title="Guides for getting hired as an engineer"
                sub={`Interview prep, DSA, portfolios, resumes and careers, written to be useful rather than to rank. ${posts.length} guides and counting.`}
                tone="butter"
                art="guides"
            />

            {/* Topic links, not filters. Each one is a real page with its own introduction
                and reading path - see the note at the top of this file. */}
            <nav aria-label="Browse by topic" className="mx-auto max-w-7xl px-6 pt-8">
                <div className="flex flex-wrap items-center gap-2">
                    {categories.map((key) => (
                        <Link
                            key={key}
                            href={`/blogs/topics/${key}`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-200 px-4 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-white"
                        >
                            <TopicGlyph category={key} className="h-4 w-4" />
                            {BLOG_CATEGORIES[key]}
                        </Link>
                    ))}
                </div>
            </nav>

            <div className="mx-auto max-w-7xl px-6 py-10 pb-24">
                {featured && (
                    <Reveal className="mb-14">
                        <Link
                            href={`/blogs/${featured.slug}`}
                            className="group grid overflow-hidden rounded-3xl border border-neutral-200 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600 lg:grid-cols-2 lg:items-center"
                        >
                            {/* The featured cover loads eagerly: it is the largest thing above
                                the fold and is almost certainly this page's LCP element.

                                NO `h-full` on the image. It had one, and combined with
                                `aspect-[1200/630] object-cover` that cropped the cover
                                horizontally - the grid row is as tall as the copy column, so
                                `h-full` stretched the image past its own ratio and `object-cover`
                                cut the sides off. The title on the artwork lost its first
                                character and read "he STAR Method...".

                                The box is already exactly the source ratio, so `object-cover`
                                now crops nothing. `lg:items-center` on the grid is what keeps
                                the shorter column vertically centred instead. */}
                            <div className="overflow-hidden border-b border-neutral-200 dark:border-neutral-800 lg:border-b-0 lg:border-r">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={`/blogs/${featured.slug}/cover`}
                                    alt={featured.title}
                                    width={1200}
                                    height={630}
                                    loading="eager"
                                    fetchPriority="high"
                                    className="aspect-[1200/630] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                                />
                            </div>
                            <div className="flex flex-col justify-center p-8 md:p-12">
                                <div className="mb-5 flex flex-wrap items-center gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                                        <TopicGlyph category={featured.category} className="h-3.5 w-3.5" />
                                        {BLOG_CATEGORIES[featured.category]}
                                    </span>
                                    <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                                        {publishDate(featured.datePublished)} · {featured.readingTime} min read
                                    </span>
                                </div>
                                {/* Unlike the grid cards, the featured one DOES print its title.
                                    The cover sits beside the copy here rather than above it, so
                                    the two are read together, and a column of description with
                                    no headline reads as a stray paragraph. */}
                                <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-neutral-900 group-hover:text-neutral-800 dark:text-white dark:group-hover:text-neutral-100">
                                    {featured.title}
                                </h2>
                                <p className="mb-6 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                                    {featured.description}
                                </p>
                                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-white">
                                    Read the guide
                                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                                </span>
                            </div>
                        </Link>
                    </Reveal>
                )}

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {rest.map((post, i) => (
                        <RevealItem key={post.slug} index={i} step={0.04} className="flex">
                            {/* Every grid cover is lazy, including the first row. The featured
                                card above is full-bleed and is this page's LCP element; the grid
                                starts below the fold behind it, so marking the first three eager
                                would put a few hundred KB of covers in front of the one image
                                the score is actually measured on. */}
                            <PostCard post={post} />
                        </RevealItem>
                    ))}
                </div>

                <Reveal className="mt-20 border-t border-neutral-200 pt-8 dark:border-neutral-800">
                    <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                        Every topic
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {BLOG_CATEGORY_KEYS.map((key) => (
                            <Link
                                key={key}
                                href={`/blogs/topics/${key}`}
                                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-200 px-4 text-sm text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-white"
                            >
                                <TopicGlyph category={key} className="h-4 w-4" />
                                {BLOG_CATEGORIES[key]}
                            </Link>
                        ))}
                    </div>
                </Reveal>
            </div>

        </div>
    )
}
