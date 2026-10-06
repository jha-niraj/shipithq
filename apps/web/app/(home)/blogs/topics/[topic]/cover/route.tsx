import { ogImage, OG_SIZE } from '@/lib/og'
import { BLOG_CATEGORIES, BLOG_CATEGORY_KEYS, type BlogCategory } from '@/content/blog'

/**
 * The generated cover for a topic hub. Same reasoning as the per-post cover next door:
 * a route handler because the URL has to be writable by hand, `force-static` because the
 * seven hubs never change between builds.
 */

export const dynamic = 'force-static'

export function generateStaticParams() {
    return BLOG_CATEGORY_KEYS.map((topic) => ({ topic }))
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ topic: string }> },
) {
    const { topic } = await params
    const label = BLOG_CATEGORIES[topic as BlogCategory]

    if (!label) {
        return ogImage({ eyebrow: 'The ShipItHQ Blog', title: 'Interviews and engineering careers, written down' })
    }

    return ogImage({ eyebrow: 'Topic', title: label, footer: 'The ShipItHQ Blog' })
}

export const coverSize = OG_SIZE
