import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Calendar, Clock } from 'lucide-react'
import {
    BLOG_POSTS,
    BLOG_SLUGS,
    BLOG_CATEGORIES,
    getRelatedPosts,
    isPublished,
} from '@/content/blog'
import { AUTHORS, AUTHOR_PAGE_URL } from '@/content/authors'
import { getPostContent } from '@/lib/blog-renderer'
import { SITE, APP_LINKS, BRAND, abs } from '@/lib/site'
import { ref, ORG_ID } from '@/lib/schema'
import { Reveal } from '@/components/reveal'
import { AuthorByline } from '@/components/author-byline'
import { KeyTakeaways } from '../_components/key-takeaways'
import { FaqSection } from '../_components/faq-section'
import { RelatedPosts } from '../_components/related-posts'
import { PostCover } from '../_components/post-cover'

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
    return BLOG_SLUGS.map((slug) => ({ slug }))
}

// Every post is prerendered at build time, and an unknown slug must 404 without ever
// entering the render path. This matters specifically for the Cloudflare Workers deploy:
// lib/blog-renderer.ts reads the markdown off disk with `fs`, which exists during the
// build but NOT inside the Worker at runtime. Pinning dynamicParams to false guarantees
// that code can never be reached on-demand in production.
export const dynamicParams = false

const fullDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const post = BLOG_POSTS[slug]
    if (!post) return {}

    const url = `${SITE}/blogs/${slug}`
    const author = AUTHORS[post.author]

    return {
        title: { absolute: `${post.pageTitle} | ${BRAND.name}` },
        description: post.description,
        keywords: [...post.keywords],
        authors: [{ name: author.name, url: AUTHOR_PAGE_URL }],
        // Drafted-ahead posts are real, working pages so internal links never 404, but
        // they stay out of the index until their slug is activated.
        robots: isPublished(slug) ? undefined : { index: false, follow: true },
        alternates: { canonical: url },
        openGraph: {
            type: 'article',
            url,
            siteName: BRAND.name,
            locale: 'en_US',
            title: post.pageTitle,
            description: post.description,
            publishedTime: post.datePublished,
            modifiedTime: post.dateModified,
            authors: [author.name],
            section: BLOG_CATEGORIES[post.category],
            tags: [...post.keywords],
        },
        twitter: {
            card: 'summary_large_image',
            title: post.pageTitle,
            description: post.description,
        },
    }
}

export default async function BlogPostPage({ params }: Props) {
    const { slug } = await params
    const post = BLOG_POSTS[slug]
    if (!post) notFound()

    const author = AUTHORS[post.author]
    const category = post.category
    const related = getRelatedPosts(slug, 3)
    const html = await getPostContent(slug)
    const url = `${SITE}/blogs/${slug}`

    // E-E-A-T: the full Person object is reused as the Article author and also emitted as
    // a standalone node. jobTitle, knowsAbout and sameAs are the authority signals.
    const personSchema = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: author.name,
        jobTitle: author.role,
        description: author.bio,
        knowsAbout: [...author.knowsAbout],
        sameAs: [...author.sameAs],
        url: AUTHOR_PAGE_URL,
        image: abs(author.image),
    }

    const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.description,
        datePublished: post.datePublished,
        dateModified: post.dateModified,
        // The post's own generated cover, at the stable route-handler URL rather than the
        // content-hashed metadata one - schema.org `image` has to be a URL that keeps working.
        image: abs(`/blogs/${slug}/cover`),
        url,
        articleSection: BLOG_CATEGORIES[category],
        keywords: post.keywords.join(', '),
        inLanguage: 'en',
        author: {
            '@type': 'Person',
            name: author.name,
            jobTitle: author.role,
            knowsAbout: [...author.knowsAbout],
            sameAs: [...author.sameAs],
            url: AUTHOR_PAGE_URL,
        },
        // A REFERENCE, not a second declaration.
        //
        // This used to restate the whole Organization inline with no `@id`, which made it an
        // anonymous node - a second, unlinked company on the same page as the real one from
        // the root layout. The two would have drifted the first time the logo or the name
        // changed in one place, and a parser had no way to know they were the same company.
        publisher: ref(ORG_ID),
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    }

    const articleBreadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blogs` },
            { '@type': 'ListItem', position: 3, name: BLOG_CATEGORIES[category], item: `${SITE}/blogs/topics/${category}` },
            { '@type': 'ListItem', position: 4, name: post.title, item: url },
        ],
    }

    const faqSchema = post.faqs.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
    } : null

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleBreadcrumb) }} />
            {faqSchema && (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            )}

            <div className="min-h-screen bg-white dark:bg-neutral-950">
                <div className="mx-auto max-w-5xl px-6 pt-10">
                    <nav aria-label="Breadcrumb" className="mb-8">
                        <ol className="flex flex-wrap items-center gap-2 text-[13px] text-neutral-500 dark:text-neutral-400">
                            <li><Link href="/" className="transition-colors hover:text-neutral-900 dark:hover:text-white">Home</Link></li>
                            <li aria-hidden className="text-neutral-500 dark:text-neutral-400">/</li>
                            <li><Link href="/blogs" className="transition-colors hover:text-neutral-900 dark:hover:text-white">Blog</Link></li>
                            <li aria-hidden className="text-neutral-500 dark:text-neutral-400">/</li>
                            <li>
                                <Link href={`/blogs/topics/${category}`} className="transition-colors hover:text-neutral-900 dark:hover:text-white">
                                    {BLOG_CATEGORIES[category]}
                                </Link>
                            </li>
                        </ol>
                    </nav>

                    <header>
                        <Link
                            href={`/blogs/topics/${category}`}
                            className="mb-5 inline-flex items-center rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-neutral-600 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-600"
                        >
                            {BLOG_CATEGORIES[category]}
                        </Link>

                        <h1 className="mb-5 text-3xl font-bold leading-[1.15] tracking-tight text-neutral-900 dark:text-white md:text-[2.6rem]">
                            {post.title}
                        </h1>

                        <p className="mb-8 text-lg leading-relaxed text-neutral-500 dark:text-neutral-400">
                            {post.description}
                        </p>

                        <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-t border-neutral-100 py-5 dark:border-neutral-800">
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                By <span className="font-semibold text-neutral-900 dark:text-white">{author.name}</span>
                                <span className="text-neutral-500 dark:text-neutral-400"> · {author.role}</span>
                            </p>
                            <div className="flex items-center gap-4 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" aria-hidden />
                                    <time dateTime={post.datePublished}>{fullDate(post.datePublished)}</time>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" aria-hidden />
                                    {post.readingTime} min read
                                </span>
                            </div>
                        </div>
                    </header>
                </div>

                <Reveal className="mx-auto mb-12 max-w-5xl px-6">
                    <PostCover slug={slug} title={post.title} category={category} priority />
                </Reveal>

                <div className="mx-auto max-w-5xl px-6 pb-16">
                    <KeyTakeaways takeaways={post.takeaways} />

                    <article className="blog-content" dangerouslySetInnerHTML={{ __html: html }} />

                    <FaqSection faqs={post.faqs} />

                    <Reveal className="mt-16 rounded-2xl border border-neutral-800 bg-neutral-950 p-8 text-center dark:bg-neutral-900">
                        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                            {BRAND.name}
                        </p>
                        <h2 className="mb-3 text-2xl font-bold tracking-tight text-white">
                            Stop reading about it. Start practising.
                        </h2>
                        <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                            AI mock interviews, DSA practice, real projects, a resume builder with an ATS check and incident cases -
                            in one place, free to start.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <a
                                href={APP_LINKS.signup}
                                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
                            >
                                Get started free <ArrowRight className="h-4 w-4" aria-hidden />
                            </a>
                            <Link
                                href="/pricing"
                                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
                            >
                                See pricing
                            </Link>
                        </div>
                    </Reveal>

                    <Reveal className="mt-16">
                        <AuthorByline authorKey={post.author} dateModified={fullDate(post.dateModified)} />
                    </Reveal>

                    <div className="mt-8">
                        <Link
                            href="/blogs"
                            className="font-mono text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                        >
                            ← Back to all posts
                        </Link>
                    </div>
                </div>

                {related.length > 0 && (
                    <Reveal className="mx-auto max-w-6xl px-6 pb-24">
                        <div className="border-t border-neutral-200 dark:border-neutral-800">
                            <RelatedPosts posts={related} />
                        </div>
                    </Reveal>
                )}
            </div>
        </>
    )
}
