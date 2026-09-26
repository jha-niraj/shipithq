import { cn } from "@repo/ui/lib/utils"

/**
 * An Incidents badge as an animated medal (plan/incidents INC-12). Earned: an ink
 * hexagon whose ring draws itself, a glyph that settles in, and a light sweep across
 * the face. Locked: the same shape in a faint dashed outline, still. CSS only; reduced
 * motion shows the finished medal.
 */

const MOTION = `
.bm * { transform-box: fill-box; }
@keyframes bm-ring { from { stroke-dashoffset: 260; } to { stroke-dashoffset: 0; } }
@keyframes bm-glyph { 0% { transform: scale(.6) rotate(-12deg); opacity: 0; } 100% { transform: scale(1) rotate(0); opacity: 1; } }
@keyframes bm-sweep { 0%, 55% { transform: translateX(-90px) rotate(20deg); } 100% { transform: translateX(110px) rotate(20deg); } }
@keyframes bm-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
.bm-ring { stroke-dasharray: 260; animation: bm-ring 1.4s cubic-bezier(.2,.7,.2,1) both; }
.bm-glyph { transform-origin: center; animation: bm-glyph .7s .5s cubic-bezier(.3,1.4,.5,1) both; }
.bm-sweep { animation: bm-sweep 3.6s ease-in-out infinite; }
.bm-float { animation: bm-float 4s ease-in-out infinite; }
.group:hover .bm-float { animation-duration: 1.6s; }
@media (prefers-reduced-motion: reduce) { .bm * { animation: none !important; } }
`

export function BadgeMedalStyles() {
    return <style>{MOTION}</style>
}

export type BadgeGlyph = "siren" | "target" | "eye" | "flame" | "topic"

const GLYPHS: Record<BadgeGlyph, React.ReactElement> = {
    siren: <path d="M-10 6 v-6 a10 10 0 0 1 20 0 v6 z M-14 10 h28 M0 -18 v-4 M-14 -12 l-3 -3 M14 -12 l3 -3" />,
    target: <><circle r={12} /><circle r={6} /><path d="M0 0 l14 -14 M9 -14 h5 v5" /></>,
    eye: <><path d="M-15 0 c8 -12 22 -12 30 0 c-8 12 -22 12 -30 0 z" /><circle r={4.5} /></>,
    flame: <path d="M0 -15 c7 7 11 12 11 18 a11 11 0 0 1 -22 0 c0 -5 3 -8 6 -11 c0 4 2 6 5 6 c0 -5 -2 -9 0 -13 z" />,
    topic: <><rect x={-12} y={-12} width={24} height={24} rx={5} /><path d="M-6 0 l4 4 l8 -8" /></>,
}

export function BadgeMedal({ glyph, earned, className }: { glyph: BadgeGlyph; earned: boolean; className?: string }) {
    const hex = "M60 8 L105 34 L105 86 L60 112 L15 86 L15 34 Z"
    return (
        <svg viewBox="0 0 120 120" aria-hidden className={cn("bm", className)}>
            <defs>
                <clipPath id={`bm-clip-${glyph}`}><path d={hex} /></clipPath>
            </defs>
            <g className={earned ? "bm-float" : undefined}>
                {earned ? (
                    <>
                        <path d={hex} className="fill-neutral-900 dark:fill-white" />
                        <path d={hex} fill="none" strokeWidth={3} className="bm-ring stroke-neutral-400" />
                        <g clipPath={`url(#bm-clip-${glyph})`}>
                            <rect className="bm-sweep" x={20} y={-20} width={26} height={160} fill="white" opacity={0.18} />
                        </g>
                        <g className="bm-glyph" transform="translate(60 60)">
                            <g fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="stroke-white dark:stroke-neutral-900">{GLYPHS[glyph]}</g>
                        </g>
                    </>
                ) : (
                    <>
                        <path d={hex} fill="none" strokeWidth={1.8} strokeDasharray="5 5" className="stroke-neutral-300 dark:stroke-neutral-700" />
                        <g transform="translate(60 60)" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="stroke-neutral-300 dark:stroke-neutral-700">{GLYPHS[glyph]}</g>
                    </>
                )}
            </g>
        </svg>
    )
}
