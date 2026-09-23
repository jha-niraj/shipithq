"use client"

import { useId } from "react"
import { cn } from "../../lib/utils"

/**
 * The ShipItHQ AI mark, in the two sizes the product uses. Ported from gurukulhq's
 * `saathi-mark.tsx` (plan/ai-chat, AC-1) with the brand gold replaced by `currentColor`:
 * the palette is monochrome, so the mark is ink - black on light, white on dark - and
 * takes its colour from wherever it sits.
 */

/** Four-point spark centred at (cx, cy). Control points at the centre pull each side
 *  in, which is what makes a spark rather than a diamond. */
const spark = (cx: number, cy: number, r: number) =>
    `M ${cx} ${cy - r} Q ${cx} ${cy} ${cx + r} ${cy} Q ${cx} ${cy} ${cx} ${cy + r} ` +
    `Q ${cx} ${cy} ${cx - r} ${cy} Q ${cx} ${cy} ${cx} ${cy - r} Z`

/**
 * The small mark, STATIC: a chat header, a reply's avatar, a nav button.
 *
 * Two sparks rather than one. A lone four-point star is every assistant's icon; the
 * smaller second spark makes it a pair, and it still reads at 14px, where rings would
 * collapse into a smudge.
 */
export function AIGlyph({ size = 22, className }: { size?: number; className?: string }) {
    return (
        <span className={cn("inline-flex shrink-0", className)} style={{ width: size, height: size }} aria-hidden>
            <svg viewBox="0 0 24 24" width={size} height={size} role="presentation" fill="currentColor">
                <path d={spark(10, 13.5, 8.5)} />
                <path d={spark(18.5, 5.5, 4.2)} fillOpacity="0.6" />
            </svg>
        </span>
    )
}

/**
 * The animated mark, for the empty conversation. Use at 40px and up; below that use
 * `AIGlyph`.
 *
 * Ambient, not attention-seeking: a dashed ring and a solid ring turning very slowly in
 * opposite directions, an arc tracing the inner ring, and the two sparks breathing at the
 * centre. Slow enough to read as "idle, listening" rather than "loading". All motion is in
 * one scoped <style>, so `prefers-reduced-motion` stops every part of it in one place.
 */
export function AIMark({ size = 44, className }: { size?: number; className?: string }) {
    // Scoped ids so two marks on one screen cannot share (and fight over) a keyframe.
    const uid = useId().replace(/[^a-zA-Z0-9]/g, "")
    const spin = `aiSpin-${uid}`
    const spinRev = `aiSpinRev-${uid}`
    const trace = `aiTrace-${uid}`
    const breathe = `aiBreathe-${uid}`
    const mid = 2 * Math.PI * 38

    return (
        <div className={cn("shrink-0 text-neutral-900 dark:text-white", className)} style={{ width: size, height: size }}>
            <style>{`
                @keyframes ${spin} { to { transform: rotate(360deg); } }
                @keyframes ${spinRev} { to { transform: rotate(-360deg); } }
                @keyframes ${trace} { to { stroke-dashoffset: ${-mid}; } }
                @keyframes ${breathe} { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
                .${spin} { animation: ${spin} 54s linear infinite; transform-origin: 60px 60px; }
                .${spinRev} { animation: ${spinRev} 38s linear infinite; transform-origin: 60px 60px; }
                .${trace} { animation: ${trace} 26s linear infinite; }
                .${breathe} { animation: ${breathe} 7s ease-in-out infinite; transform-origin: 60px 60px; }
                @media (prefers-reduced-motion: reduce) {
                    .${spin}, .${spinRev}, .${trace}, .${breathe} { animation: none; }
                }
            `}</style>
            <svg viewBox="0 0 120 120" width={size} height={size} role="presentation" aria-hidden="true">
                <circle className={spin} cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="2 8" />
                <circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1.5" />
                <circle
                    className={trace}
                    cx="60" cy="60" r="38" fill="none"
                    stroke="currentColor" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round"
                    strokeDasharray={`${mid * 0.22} ${mid * 0.78}`}
                />
                <g className={spinRev}>
                    <circle cx="60" cy="6" r="2.6" fill="currentColor" />
                    <circle cx="106.8" cy="87" r="1.8" fill="currentColor" opacity="0.4" />
                    <circle cx="13.2" cy="87" r="1.8" fill="currentColor" opacity="0.4" />
                </g>
                {/* The two sparks of AIGlyph, centred in the rings. */}
                <g className={breathe} fill="currentColor">
                    <path d={spark(56, 64, 17)} />
                    <path d={spark(73, 48, 8.4)} fillOpacity="0.6" />
                </g>
            </svg>
        </div>
    )
}
