import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'
import { publishedPosts } from '@/content/blog'

/**
 * The social card for the blog index.
 *
 * It used to be `/og/blog/blog-index-hero.webp`, a hand-made raster, and it was the last
 * thing holding that directory open after every post cover became generated. Same builder
 * as the posts and the topic hubs now, so the index cannot drift away from what it lists.
 *
 * The metadata convention rather than a `cover` route handler, because nothing renders
 * this one as an `<img>` - it is only ever an `og:image` tag, and there the content hash
 * is a feature.
 */

export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'The ShipItHQ Blog'

export default async function BlogIndexOgImage() {
    return ogImage({
        eyebrow: 'The ShipItHQ Blog',
        title: 'Interviews and engineering careers, written down',
        footer: `${publishedPosts.length} guides`,
    })
}
