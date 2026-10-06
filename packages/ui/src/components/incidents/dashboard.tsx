"use client"

import { useRef } from "react"
import { cn } from "../../lib/utils"
import type { Dashboard as DashboardData } from "../../lib/incidents/types"
import { DiagramFrame } from "./kit"
import { formatRel, useScrub } from "./scrub"

/*
 * What on-call saw (plan/incidents INC-66): two to four small charts on one time axis,
 * the bad series in rose, markers where things happened. Move across a chart (or tap a
 * timeline event in the same chapter) and a line marks that moment on every chart with
 * each value read out. The numbers are illustrative, shaped from the case's sources, and
 * the caption always says so.
 */

const W = 360
const H = 120
const L = 34
const B = 18

function interpolate(points: [number, number][], at: number): number | null {
    if (!points.length) return null
    if (at <= points[0]![0]) return points[0]![1]
    for (let i = 1; i < points.length; i++) {
        const [t1, v1] = points[i]!, [t0, v0] = points[i - 1]!
        if (at <= t1) return v0 + ((v1 - v0) * (at - t0)) / Math.max(1, t1 - t0)
    }
    return points[points.length - 1]![1]
}

const fmt = (v: number) => (v >= 100 ? Math.round(v).toLocaleString("en") : +v.toFixed(1))

/** `hint`: the line under the charts before a moment is picked; the default assumes a timeline beside it (the case player). */
export function DashboardView({ dashboard, lit = null, hint = "Move across a chart, or tap a moment on the timeline." }: { dashboard: DashboardData; lit?: string | null; hint?: string }) {
    const { at, setAt } = useScrub()
    const all = dashboard.series.flatMap((s) => s.points.map((p) => p[0]))
    const t0 = Math.min(0, ...all), t1 = Math.max(...all, ...(dashboard.markers ?? []).map((m) => m.at))
    const x = (t: number) => L + ((t - t0) / Math.max(1, t1 - t0)) * (W - L - 8)
    const toTime = (px: number) => t0 + ((px - L) / (W - L - 8)) * (t1 - t0)

    return (
        <DiagramFrame caption={`${dashboard.caption ? `${dashboard.caption} ` : ""}Illustrative numbers, shaped from the sources.`} className="@container">
            <div className="grid gap-3 @xl:grid-cols-2">
                {dashboard.series.map((s) => (
                    <Chart key={s.id} s={s} x={x} toTime={toTime} span={[t0, t1]} markers={dashboard.markers ?? []} at={at} setAt={setAt}
                        lit={lit} dim={!!lit && lit !== s.id && !(dashboard.markers ?? []).some((m) => m.id === lit)} />
                ))}
            </div>
            <p className="mt-2 text-center text-[12px] text-neutral-500 dark:text-neutral-400">
                {at === null ? hint : `At ${formatRel(at)}`}
            </p>
        </DiagramFrame>
    )
}

function Chart({ s, x, toTime, span, markers, at, setAt, lit, dim }: {
    s: DashboardData["series"][number]
    span: [number, number]
    x: (t: number) => number
    toTime: (px: number) => number
    markers: NonNullable<DashboardData["markers"]>
    at: number | null
    setAt: (t: number | null) => void
    lit: string | null
    dim: boolean
}) {
    const ref = useRef<SVGSVGElement>(null)
    const max = Math.max(1, ...s.points.map((p) => p[1])) * 1.15
    const y = (v: number) => H - B - (v / max) * (H - B - 10)
    const line = s.points.map((p, i) => `${i ? "L" : "M"}${x(p[0])} ${y(p[1])}`).join(" ")
    const area = s.points.length ? `${line} L${x(s.points[s.points.length - 1]![0])} ${H - B} L${x(s.points[0]![0])} ${H - B} Z` : ""
    const value = at === null ? interpolate(s.points, s.points[s.points.length - 1]?.[0] ?? 0) : interpolate(s.points, at)

    const scrub = (clientX: number) => {
        const r = ref.current?.getBoundingClientRect()
        if (!r) return
        setAt(Math.round(toTime(((clientX - r.left) / r.width) * W)))
    }

    return (
        <div className={cn("rounded-xl bg-white p-3 ring-1 transition-opacity duration-300 dark:bg-neutral-950", lit === s.id ? "ring-2 ring-neutral-900 dark:ring-white" : "ring-neutral-200 dark:ring-neutral-800", dim && "opacity-35")}>
            <div className="flex items-baseline justify-between gap-2">
                <p className="text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200">{s.name}</p>
                <p className={cn("font-mono text-[13px] font-semibold tabular-nums", s.bad ? "text-rose-600 dark:text-rose-400" : "text-neutral-900 dark:text-white")}>
                    {value === null ? "-" : fmt(value)} <span className="text-[10.5px] font-normal text-neutral-500">{s.unit}</span>
                </p>
            </div>
            <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="mt-1 h-auto w-full touch-none select-none" role="img" aria-label={`${s.name}, ${s.unit}`}
                onPointerMove={(e) => scrub(e.clientX)} onPointerDown={(e) => scrub(e.clientX)}>
                {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={L} x2={W - 8} y1={y(max * f)} y2={y(max * f)} strokeWidth={1} className="stroke-neutral-100 dark:stroke-neutral-900" />)}
                <text x={L - 6} y={y(max / 1.15) + 4} textAnchor="end" className="fill-neutral-400 font-mono text-[9.5px]">{fmt(max / 1.15)}</text>
                <text x={L - 6} y={H - B + 3} textAnchor="end" className="fill-neutral-400 font-mono text-[9.5px]">0</text>
                <line x1={L} x2={W - 8} y1={H - B} y2={H - B} strokeWidth={1} className="stroke-neutral-200 dark:stroke-neutral-800" />
                <text x={L} y={H - 4} className="fill-neutral-400 font-mono text-[9px]">{formatRel(span[0])}</text>
                <text x={W - 8} y={H - 4} textAnchor="end" className="fill-neutral-400 font-mono text-[9px]">{formatRel(span[1])}</text>
                {markers.map((m) => (
                    <g key={m.id}>
                        <line x1={x(m.at)} x2={x(m.at)} y1={6} y2={H - B} strokeWidth={lit === m.id ? 2 : 1} strokeDasharray="3 3" className={lit === m.id ? "stroke-neutral-900 dark:stroke-white" : "stroke-neutral-400 dark:stroke-neutral-600"} />
                        <text x={x(m.at) + 3} y={12} className="fill-neutral-500 font-mono text-[9px] dark:fill-neutral-400">{m.label}</text>
                    </g>
                ))}
                <path d={area} className={s.bad ? "fill-rose-500/10" : "fill-neutral-900/5 dark:fill-white/5"} />
                <path d={line} fill="none" strokeWidth={1.8} strokeLinejoin="round" className={s.bad ? "stroke-rose-500" : "stroke-neutral-800 dark:stroke-neutral-200"} />
                {at !== null && (
                    <g>
                        <line x1={x(at)} x2={x(at)} y1={4} y2={H - B} strokeWidth={1.4} className="stroke-neutral-900 dark:stroke-white" />
                        {value !== null && <circle cx={x(at)} cy={y(value)} r={3.5} className={s.bad ? "fill-rose-500" : "fill-neutral-900 dark:fill-white"} />}
                    </g>
                )}
            </svg>
        </div>
    )
}
