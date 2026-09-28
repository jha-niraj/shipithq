import * as React from "react"

import { cn } from "../../lib/utils"

/*
 * A company's mark (plan/jobs-polish JP-15): its logo when it may show one, otherwise one of
 * 16 small animated monochrome SVG marks. A company always gets the same mark, picked by a
 * hash of its id (or its name, for a company request), so it is recognisable across pages
 * and visits. The marks loop slowly, faster while the card (any `.group` ancestor) or the
 * mark is hovered, and stand still under `prefers-reduced-motion`. See COMPANY-MARK.md.
 *
 * Pure SVG and CSS keyframes: no JS animation loop, `currentColor` everywhere, so the tile's
 * text colour is the mark's ink in both themes.
 */

export const COMPANY_MARK_COUNT = 16

/** FNV-1a, 32 bit: stable, fast, and spreads short ids well across 16 buckets. */
export function companyMarkIndex(seed: string): number {
    let h = 0x811c9dc5
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i)
        h = Math.imul(h, 0x01000193)
    }
    return (h >>> 0) % COMPANY_MARK_COUNT
}

// Durations are `base * --cm-scale`; hover drops the scale to speed the loop up.
const CSS = `
.cm{--cm-scale:1}
.cm:hover,.group:hover .cm{--cm-scale:.4}
.cm *{transform-box:fill-box;transform-origin:center}
.cm .spin{animation:cm-spin calc(9s*var(--cm-scale)) linear infinite}
.cm .spin-r{animation:cm-spin calc(12s*var(--cm-scale)) linear infinite reverse}
.cm .spin-f{animation:cm-spin calc(5s*var(--cm-scale)) linear infinite}
.cm .orbit{transform-origin:24px 24px;transform-box:view-box;animation:cm-spin calc(6s*var(--cm-scale)) linear infinite}
.cm .orbit-r{transform-origin:24px 24px;transform-box:view-box;animation:cm-spin calc(9s*var(--cm-scale)) linear infinite reverse}
.cm .pulse{animation:cm-pulse calc(2.4s*var(--cm-scale)) ease-in-out infinite}
.cm .bar{transform-origin:bottom;animation:cm-bar calc(1.8s*var(--cm-scale)) ease-in-out infinite}
.cm .ring{animation:cm-ring calc(3.6s*var(--cm-scale)) ease-out infinite}
.cm .drift{animation:cm-drift calc(4s*var(--cm-scale)) linear infinite}
.cm .draw{stroke-dasharray:var(--cm-len) var(--cm-len);animation:cm-draw calc(4.8s*var(--cm-scale)) ease-in-out infinite}
.cm .bob{animation:cm-bob calc(1.6s*var(--cm-scale)) ease-in-out infinite}
.cm .slide{animation:cm-slide calc(3s*var(--cm-scale)) ease-in-out infinite}
.cm .breathe{animation:cm-breathe calc(3s*var(--cm-scale)) ease-in-out infinite}
@keyframes cm-spin{to{transform:rotate(360deg)}}
@keyframes cm-pulse{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes cm-bar{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
@keyframes cm-ring{0%{transform:scale(.3);opacity:1}100%{transform:scale(1);opacity:0}}
@keyframes cm-drift{to{transform:translateX(-16px)}}
@keyframes cm-draw{0%{stroke-dashoffset:var(--cm-len)}50%{stroke-dashoffset:0}100%{stroke-dashoffset:calc(var(--cm-len)*-1)}}
@keyframes cm-bob{0%,100%{transform:translateY(3px)}50%{transform:translateY(-3px)}}
@keyframes cm-slide{0%,100%{transform:translateX(-4px)}50%{transform:translateX(4px)}}
@keyframes cm-breathe{0%,100%{transform:scale(.8)}50%{transform:scale(1.08)}}
@media (prefers-reduced-motion:reduce){.cm *{animation:none!important}}
`

const d = (s: number) => ({ animationDelay: `calc(${s}s * var(--cm-scale))` }) as React.CSSProperties
const S = { fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" } as const

/** The 16 marks, each drawn in a 48 x 48 box. Names are for COMPANY-MARK.md and tests. */
const MARKS: { name: string; draw: React.ReactNode }[] = [
    { name: "orbit", draw: <><circle cx="24" cy="24" r="14" {...S} opacity=".35" /><circle cx="24" cy="24" r="4" fill="currentColor" /><g className="orbit"><circle cx="38" cy="24" r="3.5" fill="currentColor" /></g></> },
    {
        name: "grid pulse",
        draw: <>{[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <circle key={`${r}${c}`} className="pulse" style={d((r + c) * 0.25)} cx={12 + c * 12} cy={12 + r * 12} r="3.5" fill="currentColor" />))}</>,
    },
    {
        name: "waves",
        // The path is two wavelengths longer than the box and drifts by one: a seamless loop.
        draw: <g className="drift"><path {...S} d="M0 20 q4 -6 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0" /><path {...S} opacity=".45" d="M0 30 q4 6 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0" /></g>,
    },
    { name: "equaliser", draw: <>{[0, 1, 2, 3].map((i) => <rect key={i} className="bar" style={d(i * 0.2)} x={10 + i * 8} y="12" width="5" height="24" rx="2.5" fill="currentColor" />)}</> },
    { name: "rings", draw: <>{[0, 1, 2].map((i) => <circle key={i} className="ring" style={d(i * 1.2)} cx="24" cy="24" r="17" {...S} />)}<circle cx="24" cy="24" r="3" fill="currentColor" /></> },
    { name: "diamond", draw: <><g className="spin"><rect x="11" y="11" width="26" height="26" rx="3" {...S} transform="rotate(45 24 24)" /></g><g className="spin-r"><rect x="19" y="19" width="10" height="10" rx="1.5" fill="currentColor" /></g></> },
    {
        name: "spiral",
        draw: <g className="orbit-r">{Array.from({ length: 7 }, (_, i) => {
            const a = i * 0.95, r = 4 + i * 2.3
            return <circle key={i} cx={24 + r * Math.cos(a)} cy={24 + r * Math.sin(a)} r={1.4 + i * 0.3} fill="currentColor" opacity={0.35 + i * 0.1} />
        })}</g>,
    },
    { name: "stack", draw: <>{[0, 1, 2].map((i) => <rect key={i} className="slide" style={d(i * 0.35)} x="12" y={13 + i * 8} width="24" height="5" rx="2.5" fill="currentColor" opacity={1 - i * 0.25} />)}</> },
    { name: "radar", draw: <><circle cx="24" cy="24" r="15" {...S} opacity=".35" /><circle cx="24" cy="24" r="8" {...S} opacity=".35" /><g className="orbit"><path {...S} d="M24 24 L24 9" /></g><circle cx="24" cy="24" r="2.5" fill="currentColor" /></> },
    { name: "hexagon", draw: <><path className="draw" style={{ "--cm-len": 90 } as React.CSSProperties} {...S} d="M24 9 L37 16.5 L37 31.5 L24 39 L11 31.5 L11 16.5 Z" /><circle className="pulse" cx="24" cy="24" r="3.5" fill="currentColor" /></> },
    { name: "triangles", draw: <><g className="spin"><path {...S} d="M24 10 L37 33 L11 33 Z" /></g><g className="spin-r"><path {...S} opacity=".45" d="M24 38 L11 15 L37 15 Z" /></g></> },
    { name: "heartbeat", draw: <><path {...S} opacity=".25" d="M6 26 H16 L20 16 L26 34 L30 22 L33 26 H42" /><path className="draw" style={{ "--cm-len": 64 } as React.CSSProperties} {...S} d="M6 26 H16 L20 16 L26 34 L30 22 L33 26 H42" /></> },
    {
        name: "checker",
        draw: <>{[[12, 12, 0], [26, 12, 1.2], [12, 26, 1.2], [26, 26, 0]].map(([x, y, s], i) => <rect key={i} className="pulse" style={d(s!)} x={x} y={y} width="10" height="10" rx="2" fill="currentColor" />)}</>,
    },
    { name: "arcs", draw: <><g className="spin-f"><path {...S} d="M24 8 A16 16 0 0 1 40 24" /></g><g className="spin"><path {...S} opacity=".7" d="M24 13 A11 11 0 0 1 35 24" /></g><g className="spin-r"><path {...S} opacity=".45" d="M24 18 A6 6 0 0 1 30 24" /></g></> },
    { name: "plus", draw: <><g className="spin"><path {...S} strokeWidth="4" d="M24 12 V36 M12 24 H36" /></g><g className="breathe"><circle cx="24" cy="24" r="16" {...S} opacity=".3" /></g></> },
    { name: "bounce", draw: <>{[0, 1, 2].map((i) => <circle key={i} className="bob" style={d(i * 0.2)} cx={14 + i * 10} cy="24" r="4" fill="currentColor" />)}</> },
]

export interface CompanyMarkProps {
    /** The company's id; its name for a company request. Picks the mark. */
    seed: string
    /** The company's name, for the logo's alt text and the mark's label. */
    name: string
    /** An uploaded logo. Pass it only when the company may show one (`companyTrust(...).showLogo`). */
    logoUrl?: string | null
    /** Pixels, square. */
    size?: number
    /** Fill the parent box instead (a responsive frame that sizes itself); `size` then only sets the corner radius. */
    fill?: boolean
    className?: string
}

export function CompanyMark({ seed, name, logoUrl, size = 48, fill = false, className }: CompanyMarkProps) {
    const radius = Math.round(size * 0.24)
    const dims: React.CSSProperties = fill ? { width: "100%", height: "100%", borderRadius: radius } : { width: size, height: size, borderRadius: radius }
    const box = cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-neutral-200 bg-neutral-100 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
        className,
    )
    if (logoUrl) {
        return (
            <span className={box} style={dims}>
                {/* eslint-disable-next-line @next/next/no-img-element -- packages/ui has no next/image; the logo is a small public R2 object */}
                <img src={logoUrl} alt={name} className="h-full w-full object-cover" loading="lazy" />
            </span>
        )
    }
    const mark = MARKS[companyMarkIndex(seed || name)]!
    return (
        <span className={cn("cm", box)} style={dims} role="img" aria-label={`${name} (no logo yet)`}>
            <style href="company-mark" precedence="default">{CSS}</style>
            <svg viewBox="0 0 48 48" className="h-[70%] w-[70%]" aria-hidden>
                {mark.draw}
            </svg>
        </span>
    )
}

/** The mark names in order, for the gallery in COMPANY-MARK.md. */
export const COMPANY_MARK_NAMES = MARKS.map((m) => m.name)
