import type { Metadata } from 'next'
import { publishedPosts as allPublished } from '@/content/blog'

// Hiring and placement guides are for companies and universities: they live at
// /hire/guides (REV-83) and /uni/guides (REV-31), and the student index leaves them out.
const publishedPosts = allPublished.filter((p) => p.category !== 'hiring' && p.category !== 'placements')
import { SITE, BRAND } from '@/lib/site'
import { ref, ORG_ID } from '@/lib/schema'
import BlogIndex from './_components/blog-index'

// 38 chars. The template appends " | ShipItHQ" (11), so this must stay under 49 or
// Google truncates the end - which is where the differentiator lives.
const TITLE = 'Developer Blog: Interviews & Careers'
const DESCRIPTION =
    'Practical guides on engineering careers, interview prep, DSA, system design, portfolios and resumes, for CS students and working engineers.'

export const metadata: Metadata = {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: `${SITE}/blogs` },
    openGraph: {
        type: 'website',
        url: `${SITE}/blogs`,
        siteName: BRAND.name,
        title: `${TITLE} | ${BRAND.name}`,
        description: DESCRIPTION,
    },
    twitter: {
        card: 'summary_large_image',
        title: `${TITLE} | ${BRAND.name}`,
        description: DESCRIPTION,
    },
}

export default function BlogsPage() {
    const blogSchema = {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: `${BRAND.name} Blog`,
        description: DESCRIPTION,
        url: `${SITE}/blogs`,
        // A reference, not a second declaration - same fix as the article page. Restating
        // the Organization inline with no `@id` creates an anonymous node alongside the real
        // one from the root layout, and the two drift the first time either changes.
        publisher: ref(ORG_ID),
        blogPost: publishedPosts.map((post) => ({
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.description,
            url: `${SITE}/blogs/${post.slug}`,
            datePublished: post.datePublished,
            dateModified: post.dateModified,
        })),
    }

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blogs` },
        ],
    }

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
            <BlogIndex posts={publishedPosts} />
        </>
    )
}
