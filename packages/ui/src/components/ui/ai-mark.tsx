"use client"

import { useId } from "react"
import { cn } from "../../lib/utils"

/**
 * The ShipItHQ AI mark, in the two sizes the product uses. Ported from gurukulhq's
 * `saathi-mark.tsx` (plan/ai-chat, AC-1) with the brand gold replaced by `currentColor`:
 * the palette is monochrome, so the mark is ink - black on light, white on dark - and
 * takes its colour from wherever it sits.
 */

/*
 * The Orbit (Niraj, 2026-09-24, replacing the two sparks): a solid dot with a thin
 * ring around it, broken at the upper right. A four-point star is every assistant's
 * icon; a core with something in orbit reads as "a thing that works around your
 * project", and both parts stay crisp from 14px up because neither has points.
 */

/** The ring's dash pattern for radius `r`: one arc, and a gap of `gapDeg` degrees
 *  (widened by the round caps' width so the visible gap is the one asked for). */
function brokenRing(r: number, gapDeg: number, stroke: number) {
    const c = 2 * Math.PI * r
    const gap = (c * gapDeg) / 360 + stroke
    return `${c - gap} ${gap}`
}

/**
 * The small mark, STATIC: a chat header, a reply's avatar, a nav button.
 * Circles start drawing at three o'clock, so the gap ends there: the ring is open
 * from about one to three o'clock.
 */
export function AIGlyph({ size = 22, className }: { size?: number; className?: string }) {
    return (
        <span className={cn("inline-flex shrink-0", className)} style={{ width: size, height: size }} aria-hidden>
            <svg viewBox="0 0 24 24" width={size} height={size} role="presentation">
                <circle cx="12" cy="12" r="3.4" fill="currentColor" />
                <circle
                    cx="12" cy="12" r="8.6" fill="none"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                    strokeDasharray={brokenRing(8.6, 58, 1.8)}
                />
            </svg>
        </span>
    )
}

/**
 * The same mark sized by class, like a lucide icon (`className="h-4 w-4"`), for
 * icon slots that take a component: a rail button, a tab's icon map.
 */
export function AIIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} role="presentation" aria-hidden="true">
            <circle cx="12" cy="12" r="3.4" fill="currentColor" />
            <circle
                cx="12" cy="12" r="8.6" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                strokeDasharray={brokenRing(8.6, 58, 1.8)}
            />
        </svg>
    )
}

/**
 * The animated mark, for the empty conversation. Use at 40px and up; below that use
 * `AIGlyph`.
 *
 * Ambient, not attention-seeking: the broken ring turns very slowly around the core,
 * a faint dashed ring turns the other way outside it, and the core breathes. Slow
 * enough to read as "idle, listening" rather than "loading". All motion is in one
 * scoped <style>, so `prefers-reduced-motion` stops every part of it in one place.
 */
export function AIMark({ size = 44, className }: { size?: number; className?: string }) {
    // Scoped ids so two marks on one screen cannot share (and fight over) a keyframe.
    const uid = useId().replace(/[^a-zA-Z0-9]/g, "")
    const spin = `aiSpin-${uid}`
    const spinRev = `aiSpinRev-${uid}`
    const breathe = `aiBreathe-${uid}`

    return (
        <div className={cn("shrink-0 text-neutral-900 dark:text-white", className)} style={{ width: size, height: size }}>
            <style>{`
                @keyframes ${spin} { to { transform: rotate(360deg); } }
                @keyframes ${spinRev} { to { transform: rotate(-360deg); } }
                @keyframes ${breathe} { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
                .${spin} { animation: ${spin} 30s linear infinite; transform-origin: 60px 60px; }
                .${spinRev} { animation: ${spinRev} 54s linear infinite; transform-origin: 60px 60px; }
                .${breathe} { animation: ${breathe} 7s ease-in-out infinite; transform-origin: 60px 60px; }
                @media (prefers-reduced-motion: reduce) {
                    .${spin}, .${spinRev}, .${breathe} { animation: none; }
                }
            `}</style>
            <svg viewBox="0 0 120 120" width={size} height={size} role="presentation" aria-hidden="true">
                <circle className={spinRev} cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="2 8" />
                {/* AIGlyph, scaled by 5. */}
                <circle
                    className={spin}
                    cx="60" cy="60" r="43" fill="none"
                    stroke="currentColor" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={brokenRing(43, 58, 6)}
                />
                <circle className={breathe} cx="60" cy="60" r="17" fill="currentColor" />
            </svg>
        </div>
    )
}
