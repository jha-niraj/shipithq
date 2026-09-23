/**
 * Artwork for the assistant's empty state.
 *
 * ── Why these are drawn rather than imported ──
 *
 * Four identical text rows give a reader no way to tell the suggestions apart at a glance,
 * so they get read left to right like a list of terms rather than scanned like a menu. Each
 * glyph here says what its suggestion DOES.
 *
 * The assistant's own mark used to live here too. It is `AIMark` in
 * `packages/ui/src/components/ui/ai-mark.tsx` now, shared with the sidebar, the panel header
 * and every reply's avatar (plan/ai-chat, AC-1).
 *
 * Each glyph here says what its suggestion DOES: a page being read, a plan filling in, a
 * design being connected up, blocks being stacked.
 *
 * ── Contract ──
 *
 * Every shape is `currentColor` on a transparent ground, so one file works on both themes
 * with no `dark:` variant and no second asset. Motion is CSS classes from
 * `packages/ui/src/styles/globals.css` (`sh-art-*` for the scale-independent motions,
 * `sh-glyph-*` for the ones re-cut for a 32-unit box) - not a motion library. The panel is
 * already a client component; adding an animation runtime to decorate its empty state is the
 * kind of cost the shared stylesheet exists to avoid. Every one of those classes is switched
 * off under `prefers-reduced-motion`.
 *
 * All four glyphs share a 32x32 viewBox so they optically match at the same rendered size.
 */

export type GlyphKind = "resume" | "plan" | "design" | "build"

/**
 * One 32x32 glyph per suggestion.
 *
 * Stroke widths are 1.5 throughout and `vectorEffect="non-scaling-stroke"` is deliberately
 * NOT used: these render at a fixed 28px, so the stroke scales predictably and staying on the
 * pixel grid matters more than surviving an arbitrary resize.
 */
export function SuggestionGlyph({ kind, className = "" }: { kind: GlyphKind; className?: string }) {
    const stroke = {
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.5,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
    }

    return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
            {kind === "resume" && (
                <>
                    {/* A page being read line by line, then ticked.
                        There WAS a bar sweeping down the page here, and it was wrong: its rest
                        position was y=16, exactly on the middle text line, so the two merged
                        into one fat rule. Under `prefers-reduced-motion` the animation is off
                        and it never moves off it - a glyph that only looks right while it is
                        moving is a glyph that looks broken to the people most likely to need
                        it to be clear. The lines light in sequence instead. */}
                    <rect x="6.5" y="3.5" width="17" height="22" rx="2.5" {...stroke} />
                    <g className="sh-glyph-seq">
                        <path d="M10 10h10" {...stroke} />
                        <path d="M10 14.5h10" {...stroke} />
                        <path d="M10 19h6" {...stroke} />
                    </g>
                    {/* The tick sits over the page's bottom-right corner, so it needs a
                        knockout behind it or the two outlines tangle.

                        The knockout is painted in the TILE's colour, using Tailwind `fill-*`
                        utilities so it follows the theme. That does hard-code a dependency on
                        the container - this glyph is drawn to sit on `bg-neutral-100
                        dark:bg-neutral-800`, which is what the suggestion cards give it. A
                        first attempt used a CSS custom property with `theme(colors.neutral.800)`
                        as the dark value; that is Tailwind v3 syntax and resolves to nothing on
                        v4, so the knockout would have been transparent in dark mode. */}
                    <circle cx="23" cy="24.5" r="6" className="fill-neutral-100 dark:fill-neutral-800" />
                    <g className="sh-art-pulse">
                        <circle cx="23" cy="24.5" r="5" {...stroke} />
                        <path d="M20.6 24.6l1.7 1.7 3.1-3.4" {...stroke} strokeWidth={1.6} />
                    </g>
                </>
            )}

            {kind === "plan" && (
                <>
                    {/* Four weeks, filling in. `sh-art-wave` scales each bar about its own
                        centre with a stagger, so the set reads as a schedule being built up
                        rather than four things blinking together. */}
                    <path d="M5 27h22" {...stroke} opacity={0.4} />
                    <g className="sh-art-wave">
                        <path d="M9 27v-7" {...stroke} strokeWidth={3} />
                        <path d="M14.7 27v-11" {...stroke} strokeWidth={3} />
                        <path d="M20.4 27v-15" {...stroke} strokeWidth={3} />
                        <path d="M26.1 27v-19" {...stroke} strokeWidth={3} />
                    </g>
                </>
            )}

            {kind === "design" && (
                <>
                    {/* Boxes, and the line between them being drawn. */}
                    <rect x="3.5" y="12.5" width="8" height="7" rx="1.8" {...stroke} />
                    <rect x="20.5" y="5" width="8" height="7" rx="1.8" {...stroke} />
                    <rect x="20.5" y="20" width="8" height="7" rx="1.8" {...stroke} />
                    <path
                        className="sh-glyph-draw"
                        d="M11.5 16h4.5V8.5h4.5M16 16v7.5h4.5"
                        {...stroke}
                    />
                </>
            )}

            {kind === "build" && (
                <>
                    {/* Blocks stacking. Same staircase idea as the brand mark, which is a
                        quiet way of saying "a thing you ship". */}
                    <g className="sh-glyph-seq">
                        <rect x="4" y="18.5" width="8.5" height="8.5" rx="1.8" fill="currentColor" />
                        <rect x="14" y="18.5" width="8.5" height="8.5" rx="1.8" fill="currentColor" />
                        <rect x="14" y="9" width="8.5" height="8.5" rx="1.8" fill="currentColor" />
                    </g>
                    {/* The next block - the one the answer is for. Dashed, because it does
                        not exist yet. */}
                    <rect
                        className="sh-art-pulse"
                        x="24"
                        y="4.5"
                        width="8"
                        height="8"
                        rx="1.8"
                        {...stroke}
                        strokeDasharray="3 2.5"
                    />
                </>
            )}
        </svg>
    )
}
