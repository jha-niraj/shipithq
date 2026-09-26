import { publishedPosts, BLOG_CATEGORIES } from '@/content/blog'
import { SITE, APP_URL, BRAND } from '@/lib/site'
import { MODULES } from '@/content/modules'

// Curated markdown index for AI/LLM crawlers. The blog section is generated from the
// publish gate so it never goes stale as posts are activated - no manual edit needed.
// This replaced a hand-written public/llms.txt that had already drifted from reality.

export const dynamic = 'force-static'

export async function GET() {
    const byCategory = Object.entries(BLOG_CATEGORIES)
        .map(([key, label]) => {
            const posts = publishedPosts.filter((p) => p.category === key)
            if (posts.length === 0) return null
            const lines = posts.map((p) => `- [${p.title}](${SITE}/blogs/${p.slug}) - ${p.description}`)
            return `### ${label}\n${lines.join('\n')}`
        })
        .filter((section): section is string => section !== null)
        .join('\n\n')

    // Generated from content/modules.ts, where every claim carries its source
    // (plan/web/revamp REV-60). This section used to be hand-written and still
    // described Project Studio and an Open Source Tracker after both were gone.
    const coreFeatures = MODULES.map((m) => [
        `### ${m.name}`,
        m.detail.intro,
        '',
        ...m.detail.different.map((d) => `- ${d.text}`),
        ...m.detail.limits.map((l) => `- Limit: ${l.text}`),
        `- More: ${SITE}/features/${m.id}`,
    ].join('\n')).join('\n\n')

    const body = `# ${BRAND.name} - ${BRAND.tagline}

## What ${BRAND.name} Is

${BRAND.name} is a developer-first platform that helps computer science students and software
engineers master their craft, build a portfolio that stands up to scrutiny, and land their
first or next engineering role. It combines AI-powered career tools, structured interview
practice, and real project work in one place.

**One sentence:** The engineering intelligence suite for people who want to get hired as
software engineers.

## Who It Is For

- CS and engineering students preparing for campus placements or new-grad hiring
- Self-taught developers without a degree who need proof of work
- Working engineers preparing for a job change or a level-up
- Career changers moving into software from another field

## Core Features

${coreFeatures}

## Site Structure

- Home: ${SITE}
- Features: ${SITE}/features
- Pricing: ${SITE}/pricing
- For companies (hiring): ${SITE}/hire (pipelines, questions, jobs, candidates, team: ${SITE}/hire/<name>)
- Hiring guides for companies: ${SITE}/hire/guides
- Ideas (public feature requests): ${SITE}/ideas
- What's new: ${SITE}/changelog
- About: ${SITE}/aboutus
- Contact: ${SITE}/aboutus#contact
- Blog: ${SITE}/blogs
- Terms: ${SITE}/termsofservice
- Privacy: ${SITE}/privacypolicy
- The authenticated product (sign-in, dashboard, all tools): ${APP_URL}

Note: ${SITE} is the public marketing site only. It has no login. All product functionality
lives on the separate application at ${APP_URL}.

## Published Guides

${byCategory}

## Contact

${BRAND.email}
`

    return new Response(body, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    })
}
