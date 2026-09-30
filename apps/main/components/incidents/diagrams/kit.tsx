"use client"

import { cn } from "@repo/ui/lib/utils"

/*
 * The incidents diagram kit (plan/incidents INC-62): what every diagram shares, so the
 * system map, sequences, timelines, dashboards, causal chains, state diagrams and the
 * flowchart look, build and light the same way.
 *
 *  - Tones: default, strong, bad (rose), good (emerald), muted. Monochrome otherwise, with
 *    dark pairs; nothing else is coloured.
 *  - Lit: the part the narration is on (a `say` block's `focus`, "block:part") is ringed and
 *    everything else dims; nothing lit means nothing dims.
 *  - Build-in: parts with an `order` fade in as the narration reaches them.
 *  - Motion stops under `prefers-reduced-motion`.
 */

export type Tone = "default" | "strong" | "bad" | "good" | "muted"

/** Box fill and stroke per tone (SVG classes). */
export const BOX: Record<Tone, string> = {
    default: "fill-white stroke-neutral-300 dark:fill-neutral-950 dark:stroke-neutral-700",
    strong: "fill-neutral-900 stroke-neutral-900 dark:fill-white dark:stroke-white",
    bad: "fill-rose-50 stroke-rose-500 dark:fill-rose-950/60",
    good: "fill-emerald-50 stroke-emerald-600 dark:fill-emerald-950/50 dark:stroke-emerald-500",
    muted: "fill-transparent stroke-neutral-300 dark:stroke-neutral-700",
}

/** The main label's fill per tone. */
export const INK: Record<Tone, string> = {
    default: "fill-neutral-900 dark:fill-white",
    strong: "fill-white dark:fill-neutral-900",
    bad: "fill-rose-700 dark:fill-rose-300",
    good: "fill-emerald-700 dark:fill-emerald-300",
    muted: "fill-neutral-500 dark:fill-neutral-400",
}

/** The small second line's fill per tone. */
export const SUB: Record<Tone, string> = {
    default: "fill-neutral-500 dark:fill-neutral-400",
    strong: "fill-neutral-300 dark:fill-neutral-600",
    bad: "fill-rose-600/80 dark:fill-rose-300/80",
    good: "fill-emerald-700/80 dark:fill-emerald-300/80",
    muted: "fill-neutral-500 dark:fill-neutral-400",
}

/** Line stroke per kind. */
export const LINE = {
    default: "stroke-neutral-400 dark:stroke-neutral-500",
    bad: "stroke-rose-500",
    good: "stroke-emerald-600 dark:stroke-emerald-500",
    muted: "stroke-neutral-300 dark:stroke-neutral-700",
} as const
export type LineTone = keyof typeof LINE

/** Motion shared by every diagram: flowing dashes, fade-in, a pulse for the broken part. */
export const KIT_MOTION = `
@keyframes dk-dash { to { stroke-dashoffset: -20; } }
.dk-flow { stroke-dasharray: 6 4; animation: dk-dash 1s linear infinite; }
@keyframes dk-in { from { opacity: 0; } to { opacity: 1; } }
.dk-in { animation: dk-in 0.4s ease-out both; }
@keyframes dk-pulse { 0%, 100% { opacity: .35; } 50% { opacity: .9; } }
.dk-pulse { animation: dk-pulse 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .dk-flow, .dk-in, .dk-pulse { animation: none; } }
`

/** Dim everything that isn't lit, once something is. */
export function dimClass(lit: string | null | undefined, ...ids: (string | undefined)[]): string | false {
    return !!lit && !ids.includes(lit) && "opacity-35"
}

/** The arrowheads a diagram uses, one per line tone, named by `arrowId`. */
export function Markers({ uid }: { uid: string }) {
    return (
        <>
            {(Object.keys(LINE) as LineTone[]).map((t) => (
                <marker key={t} id={arrowId(uid, t)} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0 0 L10 5 L0 10 z" className={t === "bad" ? "fill-rose-500" : t === "good" ? "fill-emerald-600 dark:fill-emerald-500" : t === "muted" ? "fill-neutral-300 dark:fill-neutral-700" : "fill-neutral-500 dark:fill-neutral-400"} />
                </marker>
            ))}
        </>
    )
}
export const arrowId = (uid: string, t: LineTone = "default") => `dk-arrow-${t}-${uid}`

/** The frame every diagram sits in, with its caption. */
export function DiagramFrame({ caption, className, children, compact = false }: { caption?: string; className?: string; children: React.ReactNode; compact?: boolean }) {
    return (
        <figure className={cn(
            "overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-900/40",
            compact ? "p-3" : "p-4 sm:p-6",
            className,
        )}>
            <style>{KIT_MOTION}</style>
            {children}
            {caption && <figcaption className="mt-3 text-center text-[13px] text-neutral-500 dark:text-neutral-400">{caption}</figcaption>}
        </figure>
    )
}

/** A box's ring when it is the part being talked about. */
export function LitRing({ x, y, w, h, r }: { x: number; y: number; w: number; h: number; r: number }) {
    return <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={r + 5} fill="none" strokeWidth={2} className="stroke-neutral-900 dark:stroke-white" />
}

/** A label that stays readable over lines: a halo in the frame's background. */
export function HaloText({ className, ...props }: React.SVGProps<SVGTextElement>) {
    return <text paintOrder="stroke" strokeWidth={5} strokeLinejoin="round" className={cn("stroke-neutral-50 dark:stroke-neutral-900", className)} {...props} />
}
