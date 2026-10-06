"use client"

import { useId, useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs"
import { cn } from "../../lib/utils"
import type { Sequence, SequenceMessage } from "../../lib/incidents/types"
import { DiagramFrame, HaloText, LINE, Markers, arrowId, type LineTone } from "./kit"

/*
 * A sequence diagram (plan/incidents INC-64): who talked to whom, in what order and when.
 * Actors are columns with dashed lifelines; messages are arrows down the page, their time
 * in the left gutter. Requests are solid, responses dashed, async muted, failures rose and
 * ending in a cross. A cut is a rose line across every lifeline where something stops.
 * With variants, a Normal / Failing switch (the shared tabs) shows either path. `path` fixes one
 * and drops the switch: a page that must not hide content behind a toggle (apps/web stories).
 *
 * `lit` (a message or actor id from the narration) rings that part and dims the rest;
 * `upTo` builds the diagram as the narration reaches its messages.
 */

const COL = 190
const GUTTER = 64
const HEAD = 56
const ROW = 48
const TOP = HEAD + 34

/** 0 ms, 450 ms, 2 s, 30 s, 2 min, 3 h 47 min. */
export function formatAt(ms: number): string {
    if (ms < 1000) return `${ms} ms`
    if (ms < 120_000) return `${+(ms / 1000).toFixed(ms % 1000 ? 1 : 0)} s`
    if (ms < 7_200_000) return `${+(ms / 60_000).toFixed(ms % 60_000 ? 1 : 0)} min`
    const m = Math.round(ms / 60_000)
    return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`
}

export function SequenceDiagram({ sequence, lit = null, upTo, path: fixed }: { sequence: Sequence; lit?: string | null; upTo?: number; path?: "normal" | "failing" }) {
    const uid = useId().replace(/:/g, "")
    const [chosen, setPath] = useState<"normal" | "failing">(sequence.variants ? "failing" : "normal")
    const path = fixed ?? chosen
    const onPath = (only?: "normal" | "failing") => !only || !sequence.variants || only === path
    const all = sequence.messages.filter((m) => onPath(m.only))
    // `upTo` counts in the full message list, the same way the player names messages.
    const shown = upTo === undefined ? all : all.filter((m) => sequence.messages.indexOf(m) <= upTo)
    const cuts = (sequence.cuts ?? []).filter((c) => onPath(c.only))

    const xOf = new Map(sequence.actors.map((a, i) => [a.id, GUTTER + i * COL + COL / 2]))
    const width = GUTTER + sequence.actors.length * COL
    // Rows: one per message, with a gap row where a cut falls between two messages.
    const rows: ({ kind: "msg"; m: SequenceMessage } | { kind: "cut"; at: number; label: string })[] = []
    const pending = [...cuts].sort((a, b) => a.at - b.at)
    shown.forEach((m) => {
        while (pending.length && m.at !== undefined && m.at >= pending[0]!.at) rows.push({ kind: "cut", ...pending.shift()! })
        rows.push({ kind: "msg", m })
    })
    if (upTo === undefined || upTo >= sequence.messages.length - 1) pending.forEach((c) => rows.push({ kind: "cut", ...c }))
    const height = TOP + rows.length * ROW + 16

    const dim = (...ids: string[]) => !!lit && !ids.includes(lit) && "opacity-30"

    return (
        <DiagramFrame caption={sequence.caption}>
            {sequence.variants && (
                <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-[13px] text-neutral-600 dark:text-neutral-400">{path === "normal" ? sequence.variants.normal : sequence.variants.failing}</p>
                    {!fixed && (
                        <Tabs value={path} onValueChange={(v) => setPath(v as "normal" | "failing")}>
                            <TabsList size="sm" fit>
                                <TabsTrigger value="normal">{sequence.tabs?.normal ?? "Normal"}</TabsTrigger>
                                <TabsTrigger value="failing">{sequence.tabs?.failing ?? "Failing"}</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    )}
                </div>
            )}
            <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={sequence.caption ?? "Sequence diagram"} className="h-auto w-full min-w-[34rem]">
                    <defs><Markers uid={uid} /></defs>

                    {sequence.actors.map((a) => {
                        const x = xOf.get(a.id)!
                        return (
                            <g key={a.id} className={cn("transition-opacity duration-300", dim(a.id))}>
                                <line x1={x} y1={HEAD} x2={x} y2={height - 8} strokeDasharray="3 5" strokeWidth={1.2} className={LINE.muted} />
                                {lit === a.id && <rect x={x - COL / 2 + 9} y={-1} width={COL - 18} height={HEAD + 2} rx={16} fill="none" strokeWidth={2} className="stroke-neutral-900 dark:stroke-white" />}
                                <rect x={x - COL / 2 + 14} y={4} width={COL - 28} height={HEAD - 8} rx={12} strokeWidth={1.4} className="fill-white stroke-neutral-300 dark:fill-neutral-950 dark:stroke-neutral-700" />
                                <text x={x} y={a.sub ? 26 : 34} textAnchor="middle" className="fill-neutral-900 text-[13.5px] font-semibold dark:fill-white">{a.label}</text>
                                {a.sub && <text x={x} y={42} textAnchor="middle" className="fill-neutral-500 font-mono text-[10px] dark:fill-neutral-400">{a.sub}</text>}
                            </g>
                        )
                    })}

                    {rows.map((r, i) => {
                        const y = TOP + i * ROW + ROW / 2
                        if (r.kind === "cut") {
                            return (
                                <g key={`c${i}`} className={cn("dk-in", dim("cut"))}>
                                    <line x1={GUTTER - 6} y1={y} x2={width - 6} y2={y} strokeWidth={2} strokeDasharray="8 5" className={LINE.bad} />
                                    <text x={GUTTER - 10} y={y + 4} textAnchor="end" className="fill-rose-600 font-mono text-[10.5px] dark:fill-rose-400">{formatAt(r.at)}</text>
                                    <HaloText x={width - 12} y={y - 8} textAnchor="end" className="fill-rose-600 text-[12px] font-medium dark:fill-rose-400">{r.label}</HaloText>
                                </g>
                            )
                        }
                        const m = r.m
                        const x1 = xOf.get(m.from), x2 = xOf.get(m.to)
                        if (x1 === undefined || x2 === undefined) return null
                        const kind = m.kind ?? "request"
                        const tone: LineTone = kind === "failed" ? "bad" : kind === "async" ? "muted" : "default"
                        const self = m.from === m.to
                        const dir = x2 >= x1 ? 1 : -1
                        const end = self ? x1 : x2 - dir * 4
                        return (
                            <g key={m.id} className={cn("transition-opacity duration-300", upTo !== undefined && "dk-in", dim(m.id))}>
                                {m.at !== undefined && <text x={GUTTER - 10} y={y + 4} textAnchor="end" className="fill-neutral-500 font-mono text-[10.5px] dark:fill-neutral-400">{formatAt(m.at)}</text>}
                                {lit === m.id && <rect x={Math.min(x1, x2) - 10} y={y - 22} width={Math.abs(x2 - x1) + 20 + (self ? 60 : 0)} height={32} rx={10} fill="none" strokeWidth={2} className="stroke-neutral-900 dark:stroke-white" />}
                                {self ? (
                                    <path d={`M${x1} ${y - 6} h40 v14 h-36`} fill="none" strokeWidth={1.6} markerEnd={`url(#${arrowId(uid, tone)})`} className={LINE[tone]} />
                                ) : (
                                    <line x1={x1} y1={y} x2={end} y2={y} strokeWidth={1.6}
                                        strokeDasharray={kind === "response" || kind === "async" ? "6 4" : undefined}
                                        markerEnd={kind === "failed" ? undefined : `url(#${arrowId(uid, tone)})`} className={LINE[tone]} />
                                )}
                                {kind === "failed" && !self && (
                                    <path d={`M${end - 6} ${y - 6} l12 12 M${end + 6} ${y - 6} l-12 12`} strokeWidth={2} className={LINE.bad} />
                                )}
                                <HaloText x={self ? x1 + 48 : (x1 + x2) / 2} y={self ? y + 4 : y - 7} textAnchor={self ? "start" : "middle"}
                                    className={cn("text-[12px]", kind === "failed" ? "fill-rose-600 dark:fill-rose-400" : "fill-neutral-700 dark:fill-neutral-300")}>
                                    {m.label}
                                </HaloText>
                            </g>
                        )
                    })}
                </svg>
            </div>
        </DiagramFrame>
    )
}
