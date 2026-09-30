"use client"

import { useId } from "react"
import { cn } from "@repo/ui/lib/utils"
import type { Flow, FlowNode } from "@/content/incidents/types"
import { BOX, DiagramFrame, HaloText, INK, LINE, LitRing, Markers, SUB, arrowId, type Tone } from "./diagrams/kit"
import { connector } from "./diagrams/layout"

/**
 * A flowchart drawn from data (plan/incidents INC-22; Niraj, 2026-09-26: "keep it to
 * something like a flowchart ... no code"). Nodes are boxes on the chart's own grid;
 * each edge leaves the side of its node that faces the other one. Edges marked
 * `flowing` carry moving dashes, `bad` ones are rose. Drawn with the shared diagram kit
 * (INC-62), so it looks and lights like every other incident diagram.
 */

const W = 170
const H = 58

const box = (n: FlowNode) => ({ x: n.x, y: n.y, w: n.w ?? W, h: n.h ?? H })

/**
 * `lit`: the node the lead is talking about (INC-49): ringed, the rest dimmed.
 * `upTo`: builds the chart as the lead speaks (INC-51): a node with an `order` shows
 * once `upTo` reaches it; nodes without one are always there. Undefined shows all.
 */
export function FlowChart({ flow, className, lit = null, upTo }: { flow: Flow; className?: string; lit?: string | null; upTo?: number }) {
    const uid = useId().replace(/:/g, "")
    const byId = new Map(flow.nodes.map((n) => [n.id, n]))
    const visible = (n: FlowNode) => upTo === undefined || n.order === undefined || n.order <= upTo
    // A pair of opposite edges (open -> counting, counting -> open) is drawn as two parallel lines.
    const pair = new Set(flow.edges.map((e) => `${e.from}>${e.to}`))
    return (
        <DiagramFrame caption={flow.caption} className={className}>
            {/* Never larger than its natural size: a narrow chart would otherwise scale its text up. */}
            <svg viewBox={`-10 -10 ${flow.width + 20} ${flow.height + 20}`} role="img" aria-label={flow.caption ?? "Flowchart"} className="mx-auto h-auto w-full" style={{ maxWidth: flow.width + 20 }}>
                <defs><Markers uid={uid} /></defs>

                {flow.edges.map((e, i) => {
                    const a = byId.get(e.from)
                    const b = byId.get(e.to)
                    if (!a || !b || !visible(a) || !visible(b)) return null
                    const { d, label } = connector(box(a), box(b))
                    const twin = pair.has(`${e.to}>${e.from}`)
                    const sideways = Math.abs(box(b).x - box(a).x) > Math.abs(box(b).y - box(a).y)
                    const shift = twin ? (e.from < e.to ? 9 : -9) : 0
                    return (
                        <g key={i} transform={shift ? (sideways ? `translate(0 ${shift})` : `translate(${shift} 0)`) : undefined}
                            className={cn("transition-opacity duration-300", lit && lit !== e.from && lit !== e.to && "opacity-30")}>
                            <path
                                d={d}
                                fill="none"
                                strokeWidth={1.6}
                                strokeLinejoin="round"
                                markerEnd={`url(#${arrowId(uid, e.bad ? "bad" : "default")})`}
                                strokeDasharray={e.dashed && !e.flowing ? "5 5" : undefined}
                                className={cn(e.bad ? LINE.bad : LINE.default, e.flowing && "dk-flow")}
                            />
                            {e.label && (
                                <HaloText x={label.x} y={label.y} textAnchor={label.anchor}
                                    className={cn("font-mono text-[11px]", e.bad ? "fill-rose-600 dark:fill-rose-400" : "fill-neutral-500 dark:fill-neutral-400")}>
                                    {e.label}
                                </HaloText>
                            )}
                        </g>
                    )
                })}

                {flow.nodes.map((n) => {
                    if (!visible(n)) return null
                    const b = box(n)
                    const tone: Tone = n.tone ?? "default"
                    const r = n.decision ? b.h / 2 : 14
                    return (
                        <g key={n.id} className={cn("transition-opacity duration-300", lit && lit !== n.id && "opacity-35", n.order !== undefined && "dk-in")}>
                            {lit === n.id && <LitRing {...b} r={r} />}
                            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={r}
                                strokeWidth={tone === "strong" ? 2 : 1.4}
                                strokeDasharray={n.decision ? "6 4" : undefined}
                                className={BOX[tone]} />
                            <text x={b.x + b.w / 2} y={n.sub ? b.y + b.h / 2 - 4 : b.y + b.h / 2 + 5} textAnchor="middle" className={cn("text-[14px] font-semibold", INK[tone])}>
                                {n.label}
                            </text>
                            {n.sub && (
                                <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 14} textAnchor="middle" className={cn("font-mono text-[10.5px]", SUB[tone])}>
                                    {n.sub}
                                </text>
                            )}
                        </g>
                    )
                })}
            </svg>
        </DiagramFrame>
    )
}
