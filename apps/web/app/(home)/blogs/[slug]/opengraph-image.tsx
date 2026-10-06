import { BLOG_POSTS, BLOG_SLUGS, BLOG_CATEGORIES } from '@/content/blog'
import { AUTHORS } from '@/content/authors'
import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

/**
 * The social card for one blog post: the same artwork as `cover/route.tsx`, served through
 * the metadata convention so Next writes the `og:image` tag itself.
 *
 * Both exist, and neither is redundant. This one gets a content-hashed URL, which is what a
 * social card wants - the hash busts Facebook's and Twitter's caches when the artwork
 * changes. The `cover` route next door has a stable URL, which is what an `<img src>` wants.
 * Same picture, two different caching needs.
 *
 * The card itself is built in `lib/og.tsx` and NOT drawn here, which is the point. When the
 * two were separate implementations they drifted: this file kept a logo tile reading "B" -
 * the wrong initial, in #0a0a0a on #171717, measured at 1.10:1 - on every social card the
 * blog ever produced, because nothing else rendered it and so nobody looked at it.
 */

export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'ShipItHQ article'

export function generateStaticParams() {
    return BLOG_SLUGS.map((slug) => ({ slug }))
}

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const post = BLOG_POSTS[slug]

    if (!post) {
        return ogImage({ eyebrow: 'The ShipItHQ Blog', title: 'Interviews and engineering careers, written down' })
    }

    return ogImage({
        eyebrow: BLOG_CATEGORIES[post.category],
        title: post.title,
        footer: AUTHORS[post.author]?.name,
    })
}
