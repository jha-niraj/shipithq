import { ogImage, OG_SIZE } from '@/lib/og'
import { BLOG_POSTS, BLOG_SLUGS, BLOG_CATEGORIES } from '@/content/blog'
import { AUTHORS } from '@/content/authors'

/**
 * The generated cover for one blog post, at a URL that does not move.
 *
 * ── Why this is a route handler and not `opengraph-image.tsx` ──
 *
 * Next serves metadata images from a CONTENT-HASHED path: the build emits
 * `opengraph-image-15eecq?8b117ced`, not `opengraph-image`, and injects that hashed URL
 * into the page metadata itself. That is exactly right for a social card, where the hash
 * busts caches when the artwork changes.
 *
 * It is unusable as an `<img src>`. The grid cards and the article hero need a URL they
 * can write down, and the hashed one is not predictable - `/blogs/<slug>/opengraph-image`
 * 404s, and hardcoding today's hash breaks on the next build that touches the image.
 *
 * A route handler has no hash. `/blogs/<slug>/cover` is the URL today and after every
 * build, so the cards, the article hero, `og:image` and the Article schema can all name
 * the same one - which is the property that made generating a cover per post worth doing.
 *
 * ── Still prerendered ──
 *
 * `force-static` plus `generateStaticParams` means every cover is rendered at BUILD time
 * and served as a static asset, exactly as the metadata convention did. A seventeen-card
 * grid costs seventeen asset reads, not seventeen Worker invocations.
 */

export const dynamic = 'force-static'

export function generateStaticParams() {
    return BLOG_SLUGS.map((slug) => ({ slug }))
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ slug: string }> },
) {
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

/** Re-exported so a caller can reason about the intrinsic size without importing lib/og. */
export const coverSize = OG_SIZE
