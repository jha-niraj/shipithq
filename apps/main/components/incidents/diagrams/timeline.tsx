"use client"

import { cn } from "@repo/ui/lib/utils"
import type { IncidentTimeline, TimelineEvent } from "@/content/incidents/types"
import { DiagramFrame, HaloText } from "./kit"
import { formatRel, formatSpan, useScrub } from "./scrub"

/*
 * The incident timeline (plan/incidents INC-65): the incident's own clock. Events sit on
 * one line in order, evenly spaced (an incident mixes seconds and days, so a true scale
 * crushes the interesting part); a jump much larger than the rest shows a break mark.
 * Spans under the line (time to detect, to mitigate, to resolve) carry their durations.
 * Kinds: a change (square), a signal (hollow), an action, comms, a mistake (rose) and the
 * resolution (emerald). Tapping an event scrubs a dashboard in the same chapter to it.
 * A narrow card shows the same events as a list.
 */

const W = 820
const PAD = 70
const AXIS = 150
/** The width of one character at the label size, for fitting labels. */
const CHAR = 6.7

const KIND_LABEL: Record<TimelineEvent["kind"], string> = {
    change: "Change", signal: "Signal", action: "Action", comms: "Comms", mistake: "Wrong turn", resolution: "Resolved",
}

function dot(kind: TimelineEvent["kind"]) {
    return {
        mistake: "fill-rose-500 stroke-rose-500",
        resolution: "fill-emerald-600 stroke-emerald-600 dark:fill-emerald-500 dark:stroke-emerald-500",
        signal: "fill-white stroke-neutral-900 dark:fill-neutral-950 dark:stroke-white",
        change: "fill-neutral-900 stroke-neutral-900 dark:fill-white dark:stroke-white",
        action: "fill-neutral-900 stroke-neutral-900 dark:fill-white dark:stroke-white",
        comms: "fill-neutral-400 stroke-neutral-400 dark:fill-neutral-500 dark:stroke-neutral-500",
    }[kind]
}

export function Timeline({ timeline, lit = null }: { timeline: IncidentTimeline; lit?: string | null }) {
    const { at, setAt } = useScrub()
    const events = [...timeline.events].sort((a, b) => a.at - b.at)
    const step = events.length > 1 ? (W - PAD * 2) / (events.length - 1) : 0
    const xOf = new Map(events.map((e, i) => [e.id, PAD + i * step]))
    // A break mark where a gap is far larger than the typical one.
    const gaps = events.slice(1).map((e, i) => e.at - events[i]!.at)
    const typical = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] ?? 0
    const spans = timeline.spans ?? []
    const height = AXIS + (spans.length ? 78 + spans.length * 34 : 70)
    const dim = (id: string) => !!lit && lit !== id && "opacity-30"
    const current = at === null ? null : events.reduce<TimelineEvent | null>((best, e) => (e.at <= at ? e : best), null)

    return (
        <DiagramFrame caption={timeline.caption} className="@container">
            {timeline.start && <p className="mb-3 text-[12.5px] text-neutral-600 dark:text-neutral-400">T+0 is {timeline.start}.</p>}

            <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={timeline.caption ?? "Incident timeline"} className="hidden h-auto w-full @xl:block">
                <line x1={PAD - 20} y1={AXIS} x2={W - PAD + 20} y2={AXIS} strokeWidth={1.5} className="stroke-neutral-300 dark:stroke-neutral-700" />
                {events.slice(1).map((e, i) => gaps[i]! > typical * 8 && typical > 0 ? (
                    <path key={`b${e.id}`} d={`M${(xOf.get(e.id)! + xOf.get(events[i]!.id)!) / 2 - 5} ${AXIS + 7} l6 -14 M${(xOf.get(e.id)! + xOf.get(events[i]!.id)!) / 2 + 1} ${AXIS + 7} l6 -14`} strokeWidth={1.5} className="stroke-neutral-400 dark:stroke-neutral-500" />
                ) : null)}

                {events.map((e, i) => {
                    const x = xOf.get(e.id)!
                    const up = i % 2 === 0
                    const on = current?.id === e.id
                    // Labels on one side are two steps apart: each gets that much room (the full
                    // text is one tap away), and is kept inside the frame.
                    const room = Math.max(10, Math.floor((events.length > 2 ? 2 * step - 18 : W - PAD * 2) / CHAR))
                    const text = e.label.length > room ? `${e.label.slice(0, room - 1).trimEnd()}...` : e.label
                    const half = (Math.max(text.length, formatRel(e.at).length) * CHAR) / 2
                    const tx = Math.min(Math.max(x, 6 + half), W - 6 - half)
                    const anchor = "middle"
                    return (
                        <g key={e.id} role="button" tabIndex={0} aria-label={`${formatRel(e.at)}: ${e.label}`}
                            onClick={() => setAt(e.at)} onKeyDown={(k) => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); setAt(e.at) } }}
                            className={cn("cursor-pointer transition-opacity duration-300 focus:outline-none", dim(e.id))}>
                            <line x1={x} y1={up ? AXIS - 70 : AXIS + 8} x2={x} y2={up ? AXIS - 8 : AXIS + 28} strokeWidth={1} className="stroke-neutral-300 dark:stroke-neutral-700" />
                            {(lit === e.id || on) && <circle cx={x} cy={AXIS} r={13} fill="none" strokeWidth={2} className="stroke-neutral-900 dark:stroke-white" />}
                            {e.kind === "change" || e.kind === "action"
                                ? <rect x={x - 6} y={AXIS - 6} width={12} height={12} rx={2} strokeWidth={2} className={dot(e.kind)} />
                                : <circle cx={x} cy={AXIS} r={6.5} strokeWidth={2} className={dot(e.kind)} />}
                            <text x={tx} y={up ? AXIS - 92 : AXIS + 44} textAnchor={anchor} className={cn("font-mono text-[10.5px]", e.kind === "mistake" ? "fill-rose-600 dark:fill-rose-400" : "fill-neutral-500 dark:fill-neutral-400")}>{formatRel(e.at)}</text>
                            <HaloText x={tx} y={up ? AXIS - 76 : AXIS + 60} textAnchor={anchor} className={cn("text-[12px] font-medium", e.kind === "mistake" ? "fill-rose-700 dark:fill-rose-300" : e.kind === "resolution" ? "fill-emerald-700 dark:fill-emerald-300" : "fill-neutral-900 dark:fill-white")}>
                                {text}
                            </HaloText>
                        </g>
                    )
                })}

                {spans.map((s, i) => {
                    const a = events.find((e) => e.id === s.from), b = events.find((e) => e.id === s.to)
                    if (!a || !b) return null
                    const x1 = xOf.get(a.id)!, x2 = xOf.get(b.id)!
                    const y = AXIS + 78 + i * 34
                    return (
                        <g key={s.id} className={cn("transition-opacity duration-300", dim(s.id))}>
                            <path d={`M${x1} ${y - 8} v8 H${x2} v-8`} fill="none" strokeWidth={lit === s.id ? 2.4 : 1.5} className="stroke-neutral-500 dark:stroke-neutral-400" />
                            <HaloText x={(x1 + x2) / 2} y={y + 16} textAnchor="middle" className="fill-neutral-700 text-[12px] dark:fill-neutral-300">
                                {s.label}: <tspan className="font-semibold fill-neutral-900 dark:fill-white">{formatSpan(b.at - a.at)}</tspan>
                            </HaloText>
                        </g>
                    )
                })}
            </svg>

            {/* A narrow card: the same events as a list. */}
            <ol className="space-y-3 @xl:hidden">
                {events.map((e) => (
                    <li key={e.id}>
                        <button type="button" onClick={() => setAt(e.at)} className={cn("flex w-full gap-3 rounded-xl p-2 text-left transition-opacity", (lit === e.id || current?.id === e.id) && "bg-neutral-100 dark:bg-neutral-900", dim(e.id))}>
                            <span className={cn("w-16 shrink-0 font-mono text-[11px]", e.kind === "mistake" ? "text-rose-600 dark:text-rose-400" : "text-neutral-500")}>{formatRel(e.at)}</span>
                            <span className="min-w-0">
                                <span className="block text-[13.5px] font-medium text-neutral-900 dark:text-white">{e.label}</span>
                                <span className="block text-[12px] text-neutral-500 dark:text-neutral-400">{KIND_LABEL[e.kind]}{e.detail ? `: ${e.detail}` : ""}</span>
                            </span>
                        </button>
                    </li>
                ))}
                {spans.map((s) => {
                    const a = events.find((e) => e.id === s.from), b = events.find((e) => e.id === s.to)
                    return a && b ? <li key={s.id} className="border-t border-neutral-200 pt-2 text-[13px] text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">{s.label}: <b>{formatSpan(b.at - a.at)}</b></li> : null
                })}
            </ol>

            {current && (
                <p className="mt-3 hidden rounded-xl bg-white p-3 text-[13px] text-neutral-700 ring-1 ring-neutral-200 @xl:block dark:bg-neutral-950 dark:text-neutral-300 dark:ring-neutral-800">
                    <span className="font-mono text-[11px] text-neutral-500">{formatRel(current.at)} · {KIND_LABEL[current.kind]}</span>
                    <span className="mt-0.5 block font-medium text-neutral-900 dark:text-white">{current.label}</span>
                    {current.detail && <span className="mt-0.5 block">{current.detail}</span>}
                </p>
            )}
        </DiagramFrame>
    )
}
