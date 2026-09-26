"use client"

import { useId } from "react"
import { cn } from "@repo/ui/lib/utils"
import type { Flow, FlowNode } from "@/content/incidents/types"

/**
 * A flowchart drawn from data (plan/incidents INC-22; Niraj, 2026-09-26: "keep it to
 * something like a flowchart ... no code"). Nodes are boxes on the chart's own grid;
 * each edge leaves the side of its node that faces the other one. Edges marked
 * `flowing` carry moving dashes, `bad` ones are rose. Monochrome with dark pairs;
 * reduced motion keeps every edge, still.
 */

const W = 170
const H = 58

const MOTION = `
@keyframes fc-dash { to { stroke-dashoffset: -20; } }
.fc-flow { stroke-dasharray: 6 4; animation: fc-dash 1s linear infinite; }
@media (prefers-reduced-motion: reduce) { .fc-flow { animation: none; } }
`

type Box = { x: number; y: number; w: number; h: number }

const box = (n: FlowNode): Box => ({ x: n.x, y: n.y, w: n.w ?? W, h: n.h ?? H })
const cx = (b: Box) => b.x + b.w / 2
const cy = (b: Box) => b.y + b.h / 2

/** The point on a box's border facing another box. */
function anchor(a: Box, b: Box): { x: number; y: number } {
    const dx = cx(b) - cx(a)
    const dy = cy(b) - cy(a)
    if (Math.abs(dx) * a.h > Math.abs(dy) * a.w) return { x: dx > 0 ? a.x + a.w : a.x, y: cy(a) }
    return { x: cx(a), y: dy > 0 ? a.y + a.h : a.y }
}

export function FlowChart({ flow, className }: { flow: Flow; className?: string }) {
    const id = useId().replace(/:/g, "")
    const byId = new Map(flow.nodes.map((n) => [n.id, n]))
    return (
        <figure className={cn("overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50/60 p-4 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900/40", className)}>
            <style>{MOTION}</style>
            <svg viewBox={`-10 -10 ${flow.width + 20} ${flow.height + 20}`} role="img" aria-label={flow.caption ?? "Flowchart"} className="h-auto w-full">
                <defs>
                    <marker id={`fc-arrow-${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M0 0 L10 5 L0 10 z" className="fill-neutral-500 dark:fill-neutral-400" />
                    </marker>
                    <marker id={`fc-arrow-bad-${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M0 0 L10 5 L0 10 z" className="fill-rose-500" />
                    </marker>
                </defs>

                {flow.edges.map((e, i) => {
                    const a = byId.get(e.from)
                    const b = byId.get(e.to)
                    if (!a || !b) return null
                    const p = anchor(box(a), box(b))
                    const q = anchor(box(b), box(a))
                    // A gentle elbow when the two ends are not aligned.
                    const midX = (p.x + q.x) / 2
                    const d = Math.abs(p.y - q.y) < 2 || Math.abs(p.x - q.x) < 2
                        ? `M${p.x} ${p.y} L${q.x} ${q.y}`
                        : p.x === box(a).x || p.x === box(a).x + box(a).w
                            ? `M${p.x} ${p.y} L${midX} ${p.y} L${midX} ${q.y} L${q.x} ${q.y}`
                            : `M${p.x} ${p.y} L${p.x} ${(p.y + q.y) / 2} L${q.x} ${(p.y + q.y) / 2} L${q.x} ${q.y}`
                    return (
                        <g key={i}>
                            <path
                                d={d}
                                fill="none"
                                strokeWidth={1.6}
                                strokeLinejoin="round"
                                markerEnd={`url(#${e.bad ? "fc-arrow-bad" : "fc-arrow"}-${id})`}
                                strokeDasharray={e.dashed && !e.flowing ? "5 5" : undefined}
                                className={cn(e.bad ? "stroke-rose-500" : "stroke-neutral-400 dark:stroke-neutral-500", e.flowing && "fc-flow")}
                            />
                            {e.label && (
                                <text x={midX} y={(p.y + q.y) / 2 - 7} textAnchor="middle" className={cn("font-mono text-[11px]", e.bad ? "fill-rose-600 dark:fill-rose-400" : "fill-neutral-500 dark:fill-neutral-400")}>
                                    {e.label}
                                </text>
                            )}
                        </g>
                    )
                })}

                {flow.nodes.map((n) => {
                    const b = box(n)
                    const tone = n.tone ?? "default"
                    return (
                        <g key={n.id}>
                            <rect
                                x={b.x} y={b.y} width={b.w} height={b.h} rx={n.decision ? b.h / 2 : 14}
                                strokeWidth={tone === "strong" ? 2 : 1.4}
                                strokeDasharray={n.decision ? "6 4" : undefined}
                                className={cn(
                                    tone === "strong" && "fill-neutral-900 stroke-neutral-900 dark:fill-white dark:stroke-white",
                                    tone === "bad" && "fill-rose-50 stroke-rose-500 dark:fill-rose-950/60",
                                    tone === "muted" && "fill-transparent stroke-neutral-300 dark:stroke-neutral-700",
                                    tone === "default" && "fill-white stroke-neutral-300 dark:fill-neutral-950 dark:stroke-neutral-700",
                                )}
                            />
                            <text x={cx(b)} y={n.sub ? cy(b) - 4 : cy(b) + 5} textAnchor="middle" className={cn(
                                "text-[14px] font-semibold",
                                tone === "strong" ? "fill-white dark:fill-neutral-900" : tone === "bad" ? "fill-rose-700 dark:fill-rose-300" : tone === "muted" ? "fill-neutral-500 dark:fill-neutral-400" : "fill-neutral-900 dark:fill-white",
                            )}>
                                {n.label}
                            </text>
                            {n.sub && (
                                <text x={cx(b)} y={cy(b) + 14} textAnchor="middle" className={cn("font-mono text-[10.5px]", tone === "strong" ? "fill-neutral-300 dark:fill-neutral-600" : "fill-neutral-500 dark:fill-neutral-400")}>
                                    {n.sub}
                                </text>
                            )}
                        </g>
                    )
                })}
            </svg>
            {flow.caption && <figcaption className="mt-3 text-center text-[13px] text-neutral-500 dark:text-neutral-400">{flow.caption}</figcaption>}
        </figure>
    )
}
