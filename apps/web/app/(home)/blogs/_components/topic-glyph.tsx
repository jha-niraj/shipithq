import type { BlogCategory } from '@/content/blog'

/**
 * One drawn glyph per blog topic.
 *
 * The topic hubs were a row of identical grey pills, which made seven differently-scoped
 * places look like one undifferentiated list. "Career", "Interview Prep" and "DSA &
 * Practice" all mean "things about getting a job" until you have read them properly; a
 * distinct shape per hub does the separating that the labels cannot do on their own.
 *
 * ── STATIC SVG ON PURPOSE - no framer-motion, no `use client` ──
 *
 * The version these are modelled on animates each path drawing itself, which is lovely and
 * costs a client component plus the animation runtime on a page whose Lighthouse score is
 * decided by main-thread JavaScript. These render on the server, ship zero JS, and are in
 * the HTML for crawlers. Do not convert them to motion components.
 *
 * ── `currentColor` throughout ──
 *
 * A glyph inherits the surrounding text colour, so it needs no second palette for dark
 * mode and cannot drift from the monochrome rule. This is also why it replaced raster art:
 * a `.webp` of a grey diagram is a fixed colour forever, and on a dark page it is a pale
 * rectangle that nobody drew.
 *
 * ── Decorative by default ──
 *
 * The glyph sits beside a text label that already names the topic, so it is `aria-hidden`
 * and announces nothing. A screen reader hearing "DSA and Practice, image, binary tree"
 * has been told the same thing twice.
 */

const S = {
    stroke: 'currentColor',
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 2,
} as const

function InterviewPrep() {
    // Two speech bubbles, one answering the other. A conversation with a shape to it.
    return (
        <>
            <path d="M8 12 h20 a3 3 0 0 1 3 3 v10 a3 3 0 0 1 -3 3 H16 l-6 5 v-5 H8 a3 3 0 0 1 -3 -3 V15 a3 3 0 0 1 3 -3 z" {...S} />
            <path d="M37 20 h4 a2.5 2.5 0 0 1 2.5 2.5 v9 a2.5 2.5 0 0 1 -2.5 2.5 h-1 v4 l-5 -4 h-6 a2.5 2.5 0 0 1 -2.5 -2.5 v-2" {...S} />
        </>
    )
}

function Career() {
    // Three rising steps with a marker on the top one. The ladder, not a generic arrow.
    return (
        <>
            <path d="M6 40 h10 V30 h10 V20 h10 V10 h6" {...S} />
            <circle cx="39" cy="10" r="3.4" fill="currentColor" />
            <path d="M6 40 h36" {...S} strokeWidth={2} opacity={0.45} />
        </>
    )
}

function Resume() {
    // A page of ruled lines with one tick: the document, and the screen it has to pass.
    return (
        <>
            <path d="M12 6 h16 l8 8 v28 a2 2 0 0 1 -2 2 H12 a2 2 0 0 1 -2 -2 V8 a2 2 0 0 1 2 -2 z" {...S} />
            <path d="M28 6 v8 h8" {...S} />
            <path d="M16 22 h10 M16 28 h14 M16 34 h6" {...S} />
            <path d="M31 33.5 l2.4 2.4 L38.5 31" {...S} />
        </>
    )
}

function Dsa() {
    // A binary tree. The one shape that says "data structures" without a word on it.
    return (
        <>
            <path d="M24 13 L14 25 M24 13 L34 25 M14 25 L9 36 M14 25 L19 36" {...S} />
            <circle cx="24" cy="10" r="4" {...S} />
            <circle cx="14" cy="27" r="4" {...S} />
            <circle cx="34" cy="27" r="4" {...S} />
            <circle cx="9" cy="38" r="3.2" fill="currentColor" />
            <circle cx="19" cy="38" r="3.2" fill="currentColor" />
        </>
    )
}

function Portfolio() {
    // A browser chrome with something live inside it - a deployed thing, not a repo.
    return (
        <>
            <rect x="6" y="9" width="36" height="30" rx="3" {...S} />
            <path d="M6 17 H42" {...S} />
            <circle cx="11" cy="13" r="1.4" fill="currentColor" />
            <circle cx="16" cy="13" r="1.4" fill="currentColor" />
            <path d="M14 32 l6 -7 l5 5 l4 -5 l5 7" {...S} />
        </>
    )
}

function OpenSource() {
    // A branch leaving a trunk and merging back. A contribution, drawn.
    return (
        <>
            <path d="M16 12 V36" {...S} />
            <path d="M16 20 h9 a7 7 0 0 1 7 7 v3" {...S} />
            <circle cx="16" cy="9" r="3.6" {...S} />
            <circle cx="16" cy="39" r="3.6" {...S} />
            <circle cx="32" cy="34" r="3.6" fill="currentColor" />
        </>
    )
}

function AiTools() {
    // A prompt caret in a terminal frame, with the assist above it.
    return (
        <>
            <rect x="6" y="11" width="36" height="26" rx="3" {...S} />
            <path d="M13 20 l5 4 l-5 4" {...S} />
            <path d="M23 29 h11" {...S} />
            <path d="M32 8 l1.6 3.6 L37 13 l-3.4 1.4 L32 18 l-1.6 -3.6 L27 13 l3.4 -1.4 z" fill="currentColor" stroke="none" />
        </>
    )
}

function Hiring() {
    // A candidate card with a check, on a small ladder of rounds.
    return (
        <>
            <rect x="8" y="10" width="24" height="28" rx="3" {...S} />
            <circle cx="20" cy="19" r="4" {...S} />
            <path d="M13 31 a7 6 0 0 1 14 0" {...S} />
            <path d="M34 26 l3 3 l6 -7" {...S} />
        </>
    )
}

function Placements() {
    // A mortarboard with its tassel: a batch heading into the season.
    return (
        <>
            <path d="M6 18 L24 10 L42 18 L24 26 z" {...S} />
            <path d="M14 22 v8 c0 3 5 5 10 5 s10 -2 10 -5 v-8" {...S} />
            <path d="M42 18 v9" {...S} />
            <circle cx="42" cy="30" r="2" fill="currentColor" />
        </>
    )
}

const GLYPHS: Record<BlogCategory, () => React.ReactElement> = {
    'interview-prep': InterviewPrep,
    'career': Career,
    'resume': Resume,
    'dsa': Dsa,
    'portfolio': Portfolio,
    'open-source': OpenSource,
    'ai-tools': AiTools,
    'hiring': Hiring,
    'placements': Placements,
}

export function TopicGlyph({
    category,
    className = 'h-6 w-6',
}: {
    category: BlogCategory
    className?: string
}) {
    const Glyph = GLYPHS[category]
    if (!Glyph) return null

    return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
            <Glyph />
        </svg>
    )
}

export default TopicGlyph
