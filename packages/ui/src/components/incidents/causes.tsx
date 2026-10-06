"use client"

import { useId, useState } from "react"
import { cn } from "../../lib/utils"
import type { CausalChain, Flow, StateDiagram } from "../../lib/incidents/types"
import { FlowChart } from "./flow-chart"
import { BOX, DiagramFrame, LINE, LitRing, Markers, arrowId, type Tone } from "./kit"
import { layered } from "../../lib/incidents/layout"

/*
 * Why it happened (plan/incidents INC-67). A causal chain reads right to left: the latent
 * weaknesses and contributing factors feed the trigger, and the trigger produced the
 * symptom people saw. Tap a cause for its detail. A narrow card lists the same chain.
 * The state diagram shows a record's states; the one it got stuck in is rose.
 */

const COLS: readonly string[] = ["Symptom", "Trigger", "Contributing", "Latent weakness"]
const CW = 190
const GAP = 46
const CH = 58
const RG = 18
const TOP = 34

export function CausalChainView({ causes, lit = null }: { causes: CausalChain; lit?: string | null }) {
    const uid = useId().replace(/:/g, "")
    const [open, setOpen] = useState<string | null>(null)
    const columns = [[causes.symptom], [causes.trigger], causes.contributing, causes.latent]
    const tallest = Math.max(...columns.map((c) => c.length))
    const height = TOP + tallest * CH + (tallest - 1) * RG + 10
    const width = COLS.length * CW + (COLS.length - 1) * GAP
    const pos = new Map<string, { x: number; y: number }>()
    columns.forEach((col, c) => {
        const colH = col.length * CH + (col.length - 1) * RG
        const top = TOP + (height - TOP - 10 - colH) / 2
        col.forEach((it, r) => pos.set(it.id, { x: c * (CW + GAP), y: top + r * (CH + RG) }))
    })
    const tone = (c: number): Tone => (c === 0 ? "bad" : c === 1 ? "strong" : "default")
    const edges: { from: string; to: string; dashed?: boolean }[] = [
        { from: causes.trigger.id, to: causes.symptom.id },
        ...causes.contributing.map((c) => ({ from: c.id, to: causes.trigger.id })),
        ...causes.latent.map((l) => ({ from: l.id, to: causes.trigger.id, dashed: true })),
    ]
    const all = columns.flat()
    const shown = all.find((c) => c.id === (lit ?? open))

    return (
        <DiagramFrame caption={causes.caption} className="@container">
            <svg viewBox={`-6 -4 ${width + 12} ${height + 8}`} role="img" aria-label={causes.caption ?? "Causal chain"} className="hidden h-auto w-full @2xl:block">
                <defs><Markers uid={uid} /></defs>
                {COLS.map((label, c) => (
                    <text key={label} x={c * (CW + GAP) + CW / 2} y={14} textAnchor="middle" className="fill-neutral-500 text-[11px] font-medium dark:fill-neutral-400">{label}</text>
                ))}
                {edges.map((e, i) => {
                    const a = pos.get(e.from), b = pos.get(e.to)
                    if (!a || !b) return null
                    const x1 = a.x, y1 = a.y + CH / 2, x2 = b.x + CW + 4, y2 = b.y + CH / 2
                    const mid = (x1 + x2) / 2
                    return (
                        <path key={i} d={`M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`} fill="none" strokeWidth={1.5}
                            strokeDasharray={e.dashed ? "5 5" : undefined} markerEnd={`url(#${arrowId(uid)})`}
                            className={cn(LINE.default, "transition-opacity duration-300", lit && lit !== e.from && lit !== e.to && "opacity-25")} />
                    )
                })}
                {columns.map((col, c) => col.map((it) => {
                    const p = pos.get(it.id)!
                    const t = tone(c)
                    return (
                        <g key={it.id} role="button" tabIndex={0} aria-label={`${COLS[c] ?? ""}: ${it.label}`} onClick={() => setOpen(open === it.id ? null : it.id)}
                            onKeyDown={(k) => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); setOpen(open === it.id ? null : it.id) } }}
                            className={cn("cursor-pointer transition-opacity duration-300 focus:outline-none", lit && lit !== it.id && "opacity-35")}>
                            {(lit === it.id || open === it.id) && <LitRing x={p.x} y={p.y} w={CW} h={CH} r={14} />}
                            <rect x={p.x} y={p.y} width={CW} height={CH} rx={14} strokeWidth={t === "strong" ? 2 : 1.4} strokeDasharray={c === 3 ? "5 4" : undefined} className={BOX[t]} />
                            <foreignObject x={p.x + 10} y={p.y + 6} width={CW - 20} height={CH - 12}>
                                <div className={cn("flex h-full items-center justify-center text-center text-[12.5px] font-semibold leading-tight", t === "strong" ? "text-white dark:text-neutral-900" : t === "bad" ? "text-rose-700 dark:text-rose-300" : "text-neutral-900 dark:text-white")}>
                                    {it.label}
                                </div>
                            </foreignObject>
                        </g>
                    )
                }))}
            </svg>

            <ol className="space-y-2 @2xl:hidden">
                {columns.map((col, c) => (
                    <li key={COLS[c]}>
                        <p className="mb-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{c > 0 && "because of "}{(COLS[c] ?? "").toLowerCase()}</p>
                        <ul className="space-y-1.5">
                            {col.map((it) => (
                                <li key={it.id} className={cn("rounded-xl border px-3 py-2 text-[13px]", c === 0 ? "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300" : "border-neutral-200 text-neutral-900 dark:border-neutral-800 dark:text-white", lit === it.id && "ring-2 ring-neutral-900 dark:ring-white", lit && lit !== it.id && "opacity-40")}>
                                    <span className="font-medium">{it.label}</span>
                                    {it.detail && <span className="mt-0.5 block text-[12px] text-neutral-600 dark:text-neutral-400">{it.detail}</span>}
                                </li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ol>

            {shown?.detail && (
                <p className="mt-3 hidden rounded-xl bg-white p-3 text-[13px] text-neutral-700 ring-1 ring-neutral-200 @2xl:block dark:bg-neutral-950 dark:text-neutral-300 dark:ring-neutral-800">
                    <span className="block font-medium text-neutral-900 dark:text-white">{shown.label}</span>
                    {shown.detail}
                </p>
            )}
            <p className="mt-2 hidden text-center text-[12px] text-neutral-500 @2xl:block dark:text-neutral-400">Tap a cause for the detail. Dashed: a weakness that was there all along.</p>
        </DiagramFrame>
    )
}

/** A state diagram, laid out left to right and drawn as a flowchart; the stuck state in rose. */
export function StateDiagramView({ states, lit = null }: { states: StateDiagram; lit?: string | null }) {
    const { placed, width, height } = layered(states.states, states.transitions, { w: 176, h: 58, gapX: 120, gapY: 34 })
    const flow: Flow = {
        width, height, caption: states.caption,
        nodes: states.states.map((s) => ({
            id: s.id, label: s.label, sub: s.id === states.stuck ? (s.sub ?? "stuck here") : s.sub,
            x: placed.get(s.id)!.x, y: placed.get(s.id)!.y, w: placed.get(s.id)!.w, h: placed.get(s.id)!.h, tone: s.id === states.stuck ? "bad" as const : "default" as const,
        })),
        edges: states.transitions.map((t) => ({ from: t.from, to: t.to, label: t.label, bad: t.bad, dashed: t.bad })),
    }
    return <FlowChart flow={flow} lit={lit} />
}

