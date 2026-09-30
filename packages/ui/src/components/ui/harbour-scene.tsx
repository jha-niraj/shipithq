"use client"

/*
 * The harbour (plan/jobs-polish JP-27, JP-28): one dusk scene for every full-screen moment.
 * The sun on the horizon, a lighthouse with its beam and blinking lamp, a pier, rolling waves,
 * two birds, and a boat that either LEAVES (signing out: it sails from the pier toward the sun
 * and shrinks away) or ARRIVES (signing in, registering, loading: it sails in from the sun and
 * comes alongside the pier). The 404's lost boat (apps/main components/common/lost-at-sea.tsx)
 * is the same world.
 *
 * Pure SVG and CSS; nothing moves under `prefers-reduced-motion`. The panel is dark in both
 * themes, so its ink is constant (CLAUDE.md); the page around it follows the theme.
 */

import type { ReactNode } from "react"

const W = 600
const H = 320

export type HarbourMode = "leaving" | "arriving"

/** A wave across twice the width, so sliding it one period loops without a seam. */
function wave(y: number, amp: number, period: number) {
    let d = `M0 ${y} Q${period / 4} ${y - amp} ${period / 2} ${y}`
    for (let x = period; x <= W * 2 + period; x += period / 2) d += ` T${x} ${y}`
    return `${d} V${H} H0 Z`
}

const STARS: [number, number][] = [[60, 40], [140, 26], [236, 58], [330, 30], [420, 64], [510, 36], [566, 90], [30, 110]]

const CSS = `
.hbr * { transform-box: fill-box; }
.hbr-sun { animation: hbr-sun 9s ease-in-out infinite alternate; }
@keyframes hbr-sun { from { transform: translateY(-6px) } to { transform: translateY(8px) } }
.hbr-star { animation: hbr-twinkle 3s ease-in-out infinite; transform-origin: center; }
@keyframes hbr-twinkle { 0%, 100% { opacity: .2 } 50% { opacity: .9 } }
.hbr-wave { animation: hbr-roll linear infinite; }
.hbr-w1 { animation-duration: 14s; } .hbr-w2 { animation-duration: 9s; } .hbr-w3 { animation-duration: 6s; }
@keyframes hbr-roll { from { transform: translateX(0) } to { transform: translateX(-120px) } }
.hbr-voyage { transform-box: view-box; transform-origin: 170px 236px; animation: 4.2s cubic-bezier(.4,0,.6,1) infinite; }
.hbr-leaving .hbr-voyage { animation-name: hbr-leave; }
.hbr-arriving .hbr-voyage { animation-name: hbr-arrive; }
@keyframes hbr-leave {
  0%   { transform: translate(0, 0) scale(1); opacity: 0 }
  8%   { opacity: 1 }
  80%  { transform: translate(250px, -34px) scale(.32); opacity: 1 }
  100% { transform: translate(280px, -38px) scale(.26); opacity: 0 }
}
@keyframes hbr-arrive {
  0%   { transform: translate(280px, -38px) scale(.26); opacity: 0 }
  12%  { opacity: 1 }
  78%  { transform: translate(40px, -4px) scale(.92); opacity: 1 }
  92%  { transform: translate(30px, 0) scale(1); opacity: 1 }
  100% { transform: translate(30px, 0) scale(1); opacity: 0 }
}
.hbr-bob { animation: hbr-bob 1.6s ease-in-out infinite alternate; transform-origin: 50% 100%; }
@keyframes hbr-bob { from { transform: translateY(0) rotate(-3deg) } to { transform: translateY(-3px) rotate(3deg) } }
.hbr-wake { animation: hbr-wake 1.2s ease-out infinite; transform-origin: right center; }
@keyframes hbr-wake { from { opacity: .7; transform: scaleX(.4) } to { opacity: 0; transform: scaleX(1.2) } }
.hbr-lamp { animation: hbr-blink 1.4s steps(1, end) infinite; }
@keyframes hbr-blink { 0%, 55% { opacity: 1 } 56%, 100% { opacity: .15 } }
.hbr-beam { transform-box: view-box; transform-origin: 96px 150px; animation: hbr-sweep 4.2s ease-in-out infinite alternate; }
@keyframes hbr-sweep { from { transform: rotate(-6deg) } to { transform: rotate(10deg) } }
.hbr-bird { animation: hbr-fly 12s linear infinite; }
.hbr-bird-2 { animation-duration: 15s; animation-delay: -6s; }
@keyframes hbr-fly { from { transform: translate(-40px, 0) } to { transform: translate(${W + 40}px, -24px) } }
.hbr-flap { animation: hbr-flap .5s ease-in-out infinite alternate; transform-origin: center; }
@keyframes hbr-flap { from { transform: scaleY(1) } to { transform: scaleY(-.6) } }
.hbr-dots span { display: inline-block; animation: hbr-dot 1.2s ease-in-out infinite; }
.hbr-dots span:nth-child(2) { animation-delay: .15s } .hbr-dots span:nth-child(3) { animation-delay: .3s }
@keyframes hbr-dot { 0%, 60%, 100% { opacity: .25 } 30% { opacity: 1 } }
@media (prefers-reduced-motion: reduce) {
  .hbr *, .hbr-dots span { animation: none !important; }
  .hbr-leaving .hbr-voyage { transform: translate(140px, -20px) scale(.6); opacity: 1; }
  .hbr-arriving .hbr-voyage { transform: translate(30px, 0) scale(1); opacity: 1; }
}
`

/** The scene on its night panel. `mode` decides which way the boat sails. */
export function HarbourScene({ mode, className = "" }: { mode: HarbourMode; className?: string }) {
    return (
        <div className={`w-full overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-950 dark:border-neutral-800 ${className}`}>
            <style>{CSS}</style>
            <svg viewBox={`0 0 ${W} ${H}`} aria-hidden className={`hbr hbr-${mode} block h-auto w-full text-white`}>
                <defs>
                    <radialGradient id="hbr-sun-glow">
                        <stop offset="0" stopColor="currentColor" stopOpacity=".35" />
                        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="hbr-beam" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="currentColor" stopOpacity=".4" />
                        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                    <clipPath id="hbr-sky"><rect width={W} height="236" /></clipPath>
                    <clipPath id="hbr-tower"><polygon points="84,236 108,236 104,158 88,158" /></clipPath>
                </defs>

                {STARS.map(([x, y], i) => <circle key={i} className="hbr-star" cx={x} cy={y} r="1.2" fill="currentColor" style={{ animationDelay: `${i * 0.4}s` }} />)}

                {/* The sun on the horizon, clipped by the sea */}
                <g clipPath="url(#hbr-sky)">
                    <g className="hbr-sun">
                        <circle cx="450" cy="236" r="90" fill="url(#hbr-sun-glow)" />
                        <circle cx="450" cy="236" r="34" fill="currentColor" opacity=".9" />
                        {[222, 214, 206].map((y, i) => <rect key={y} x="410" y={y} width="80" height={2 + i} fill="black" opacity=".55" />)}
                    </g>
                </g>

                <g className="hbr-bird" opacity=".7"><path className="hbr-flap" d="M0 80 q6 -6 12 0 q6 -6 12 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></g>
                <g className="hbr-bird hbr-bird-2" opacity=".5"><path className="hbr-flap" d="M0 110 q5 -5 10 0 q5 -5 10 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></g>

                {/* The lighthouse, its beam out to sea */}
                <g className="hbr-beam"><polygon points="96,150 640,110 640,196" fill="url(#hbr-beam)" /></g>
                <path d="M60 248 q20 -18 40 -14 q26 -4 44 14 z" fill="currentColor" opacity=".35" />
                <polygon points="84,236 108,236 104,158 88,158" fill="currentColor" opacity=".9" />
                <g clipPath="url(#hbr-tower)" fill="black" opacity=".55"><rect x="80" y="176" width="32" height="10" /><rect x="80" y="206" width="32" height="10" /></g>
                <rect x="84" y="154" width="24" height="4" fill="currentColor" />
                <rect x="89" y="140" width="14" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <polygon points="86,141 106,141 96,130" fill="currentColor" />
                <circle className="hbr-lamp" cx="96" cy="147" r="4" fill="currentColor" />

                {/* The pier */}
                <rect x="120" y="238" width="70" height="4" fill="currentColor" opacity=".6" />
                {[126, 146, 166, 184].map((x) => <rect key={x} x={x} y="242" width="3" height="16" fill="currentColor" opacity=".45" />)}

                <path className="hbr-wave hbr-w1" d={wave(240, 4, 120)} fill="currentColor" opacity=".05" />

                {/* The boat: faces the way it sails (arriving, it turns toward the pier) */}
                <g className="hbr-voyage">
                    <g transform={mode === "arriving" ? "translate(344 0) scale(-1 1)" : undefined}>
                        <g className="hbr-bob">
                            <path className="hbr-wake" d="M130 244 h-30 M128 250 h-22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <line x1="170" y1="238" x2="170" y2="190" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M172 194 L172 234 L200 234 Z" fill="currentColor" opacity=".92" />
                            <path d="M168 200 L168 234 L148 234 Z" fill="currentColor" opacity=".55" />
                            <path d="M170 190 l11 3 l-11 3 z" fill="currentColor" />
                            <path d="M140 238 H204 L195 250 H149 Z" fill="currentColor" />
                        </g>
                    </g>
                </g>

                <path className="hbr-wave hbr-w2" d={wave(252, 6, 120)} fill="currentColor" opacity=".06" />
                <path className="hbr-wave hbr-w3" d={wave(262, 5, 120)} fill="currentColor" opacity=".07" />
                <path className="hbr-wave hbr-w3" d={wave(262, 5, 120).replace(/ V.*$/, "")} fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".45" />
            </svg>
        </div>
    )
}

/**
 * The scene centred on a full-screen overlay, a title with animated dots and a note under it.
 * `children` go between the scene and the title (the loader's logo and wordmark).
 */
export function HarbourScreen({ mode, title, note, children, fullScreen = true, className = "" }: {
    mode: HarbourMode
    title?: string
    note?: string
    children?: ReactNode
    fullScreen?: boolean
    className?: string
}) {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={title ?? "Loading ShipItHQ"}
            className={`${fullScreen ? "fixed inset-0 z-[100]" : "relative w-full py-12"} flex items-center justify-center bg-white px-4 dark:bg-black ${className}`}
        >
            <div className="flex w-full max-w-lg flex-col items-center text-center">
                <HarbourScene mode={mode} />
                {children}
                {title && (
                    <p className="mt-8 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                        {title}<span className="hbr-dots" aria-hidden><span>.</span><span>.</span><span>.</span></span>
                    </p>
                )}
                {note && <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">{note}</p>}
            </div>
        </div>
    )
}
