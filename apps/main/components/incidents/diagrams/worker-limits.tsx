"use client"

import { useReducedMotion } from "framer-motion"
import { cn } from "@repo/ui/lib/utils"

/**
 * Case one's diagram (plan/incidents INC-3): the browser, the connection, the
 * Worker with its CPU budget and `waitUntil` clock, and the Durable Object that
 * writes a status row the page polls.
 *
 * `focus` is the model step on screen; it lights the parts that step is about and
 * sets their motion: CPU ticking while idle or filling while streaming, the
 * `waitUntil` clock sweeping to 30, the connection cut, the poll running. Under
 * reduced motion every part shows its still end state.
 */

const LIT: Record<string, string[]> = {
    browser: ["overview", "connection", "alarm"],
    connection: ["overview", "connection", "cpu-idle", "cpu-stream"],
    worker: ["overview", "cpu", "cpu-idle", "cpu-stream", "waituntil", "connection"],
    cpu: ["overview", "cpu", "cpu-idle", "cpu-stream"],
    waituntil: ["overview", "waituntil"],
    job: ["connection", "cpu-idle", "cpu-stream"],
    alarm: ["alarm"],
    db: ["alarm"],
    poll: ["alarm"],
}

const CONN = "M146 84 H214"
const POLL = "M81 127 V368 H498 V356"
const CLOCK_R = 30
const CLOCK_LEN = 2 * Math.PI * CLOCK_R

export function WorkerLimitsDiagram({ focus, className }: { focus: string; className?: string }) {
    const reduced = useReducedMotion()
    const lit = (part: string) => (LIT[part] ?? []).includes(focus)
    const g = (part: string) => ({ style: { opacity: lit(part) ? 1 : 0.18, transition: "opacity .45s cubic-bezier(.2,.7,.2,1)" } })
    const cut = focus === "connection"
    const streaming = focus === "cpu-stream"

    return (
        <svg viewBox="0 0 560 384" role="img" aria-label="The browser, the Worker's CPU budget and waitUntil clock, and a Durable Object writing a status row" className={cn("h-auto w-full", className)}>
            <defs>
                <pattern id="inc-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                    <line x1="0" y1="0" x2="0" y2="6" className="stroke-neutral-900/10 dark:stroke-white/10" strokeWidth="3" />
                </pattern>
            </defs>

            {/* Browser */}
            <g {...g("browser")}>
                <rect x="16" y="40" width="130" height="88" rx="14" className="fill-white stroke-neutral-300 dark:fill-neutral-900 dark:stroke-neutral-700" strokeWidth="1.5" />
                <line x1="16" y1="62" x2="146" y2="62" className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="1.5" />
                {[30, 40, 50].map((x) => <circle key={x} cx={x} cy="51" r="3" className="fill-neutral-300 dark:fill-neutral-700" />)}
                <text x="81" y="94" textAnchor="middle" className="fill-neutral-900 text-[14px] font-semibold dark:fill-white">Browser</text>
                <text x="81" y="112" textAnchor="middle" className="fill-neutral-500 font-mono text-[10px]">{cut ? "refreshed" : "waiting"}</text>
            </g>

            {/* The connection */}
            <g {...g("connection")}>
                <path d={CONN} className={cut ? "stroke-rose-500" : "stroke-neutral-900 dark:stroke-white"} strokeWidth="2" strokeDasharray={cut ? "4 5" : undefined} fill="none" />
                {cut ? (
                    <g className="stroke-rose-500" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="173" y1="77" x2="187" y2="91" />
                        <line x1="187" y1="77" x2="173" y2="91" />
                    </g>
                ) : !reduced && [0, 0.6].map((d) => (
                    <circle key={d} r="3.5" className="fill-neutral-900 dark:fill-white">
                        <animateMotion dur="1.2s" begin={`${d}s`} repeatCount="indefinite" path={CONN} />
                    </circle>
                ))}
                <text x="180" y="70" textAnchor="middle" className={cn("font-mono text-[9.5px]", cut ? "fill-rose-500" : "fill-neutral-500")}>{cut ? "closed" : "open"}</text>
            </g>

            {/* The Worker */}
            <g {...g("worker")}>
                <rect x="214" y="20" width="330" height="206" rx="18" className="fill-neutral-50 stroke-neutral-300 dark:fill-neutral-900/60 dark:stroke-neutral-700" strokeWidth="1.5" />
                <text x="234" y="44" className="fill-neutral-500 font-mono text-[10px] uppercase tracking-[0.14em]">Worker · the request</text>
            </g>

            {/* CPU budget */}
            <g {...g("cpu")}>
                <text x="234" y="76" className="fill-neutral-900 text-[12px] font-semibold dark:fill-white">CPU time</text>
                <text x="404" y="76" textAnchor="end" className={cn("font-mono text-[10px]", streaming ? "fill-rose-500" : "fill-neutral-500")}>30 s budget</text>
                <rect x="234" y="84" width="170" height="12" rx="6" className="fill-neutral-200 dark:fill-neutral-800" />
                <rect
                    x="234" y="84" width="170" height="12" rx="6"
                    className={cn("inc-anim", streaming ? "fill-rose-500" : "fill-neutral-900 dark:fill-white")}
                    style={{
                        transformBox: "fill-box",
                        transformOrigin: "left center",
                        transform: reduced ? `scaleX(${streaming ? 1 : focus === "cpu-idle" ? 0.04 : 0.35})` : focus === "cpu-idle" || streaming ? undefined : "scaleX(.35)",
                        animation: reduced ? "none" : focus === "cpu-idle" ? "inc-cpu-idle 1.4s ease-in-out infinite" : streaming ? "inc-cpu-stream 4.5s cubic-bezier(.4,0,.6,1) infinite" : "none",
                    }}
                />
                <text x="234" y="114" className="fill-neutral-500 font-mono text-[9.5px]">
                    {focus === "cpu-idle" ? "awaiting the network: parked" : streaming ? "parsing every chunk: spending" : "counts executing JavaScript only"}
                </text>
            </g>

            {/* The job running inside the request */}
            <g {...g("job")}>
                <rect x="234" y="140" width="170" height="54" rx="10" className={cn(cut ? "fill-rose-50 stroke-rose-400 dark:fill-rose-950/40" : "fill-white stroke-neutral-300 dark:fill-neutral-950 dark:stroke-neutral-700")} strokeWidth="1.5" />
                {!cut && <rect x="234" y="140" width="170" height="54" rx="10" fill="url(#inc-hatch)" />}
                <text x="319" y="164" textAnchor="middle" className={cn("text-[12px] font-semibold", cut ? "fill-rose-600" : "fill-neutral-900 dark:fill-white")}>{cut ? "Your job: gone" : "Your job"}</text>
                <text x="319" y="181" textAnchor="middle" className="fill-neutral-500 font-mono text-[9.5px]">{cut ? "no catch, no row written" : "lives as long as the request"}</text>
            </g>

            {/* waitUntil clock */}
            <g {...g("waituntil")}>
                <circle cx="474" cy="112" r={CLOCK_R} className="fill-none stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="6" />
                <circle
                    cx="474" cy="112" r={CLOCK_R} fill="none" strokeWidth="6" strokeLinecap="round"
                    className={cn("inc-anim", focus === "waituntil" ? "stroke-rose-500" : "stroke-neutral-900 dark:stroke-white")}
                    transform="rotate(-90 474 112)"
                    style={{
                        strokeDasharray: CLOCK_LEN,
                        ["--len" as string]: CLOCK_LEN,
                        strokeDashoffset: reduced || focus !== "waituntil" ? CLOCK_LEN * 0.4 : undefined,
                        animation: !reduced && focus === "waituntil" ? "inc-sweep 4s linear infinite" : "none",
                    }}
                />
                <text x="474" y="116" textAnchor="middle" className="fill-neutral-900 font-mono text-[11px] font-semibold dark:fill-white">30 s</text>
                <text x="474" y="162" textAnchor="middle" className="fill-neutral-900 text-[11.5px] font-semibold dark:fill-white">waitUntil</text>
                <text x="474" y="177" textAnchor="middle" className="fill-neutral-500 font-mono text-[9.5px]">wall clock</text>
            </g>

            {/* Durable Object alarm */}
            <g {...g("alarm")}>
                <rect x="214" y="258" width="210" height="96" rx="18" className="fill-white stroke-neutral-900 dark:fill-neutral-900 dark:stroke-white" strokeWidth="1.5" />
                <text x="236" y="288" className="fill-neutral-900 text-[13px] font-semibold dark:fill-white">Durable Object</text>
                <text x="236" y="307" className="fill-neutral-500 font-mono text-[10.5px]">alarm(): no client attached</text>
                <text x="236" y="334" className="fill-emerald-600 font-mono text-[10px] dark:fill-emerald-400">survives a closed tab</text>
                <path d="M424 306 H452" className="stroke-neutral-900 dark:stroke-white" strokeWidth="1.5" />
                <path d="M446 301 L452 306 L446 311" className="fill-none stroke-neutral-900 dark:stroke-white" strokeWidth="1.5" />
            </g>

            {/* Status row */}
            <g {...g("db")}>
                <path d="M456 272 v68 a42 10 0 0 0 84 0 v-68" className="fill-white stroke-neutral-900 dark:fill-neutral-900 dark:stroke-white" strokeWidth="1.5" />
                <ellipse cx="498" cy="272" rx="42" ry="10" className="fill-neutral-100 stroke-neutral-900 dark:fill-neutral-800 dark:stroke-white" strokeWidth="1.5" />
                <text x="498" y="305" textAnchor="middle" className="fill-neutral-900 text-[11.5px] font-semibold dark:fill-white">status</text>
                <text x="498" y="321" textAnchor="middle" className="fill-emerald-600 font-mono text-[10px] dark:fill-emerald-400">done</text>
            </g>

            {/* The page polls the row */}
            <g {...g("poll")}>
                <path d={POLL} fill="none" className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth="1.5" strokeDasharray="3 5" />
                <text x="92" y="362" className="fill-neutral-500 font-mono text-[10px]">the page polls the row</text>
                {!reduced && focus === "alarm" && (
                    <circle r="3.5" className="fill-neutral-900 dark:fill-white">
                        <animateMotion dur="2.4s" repeatCount="indefinite" path={POLL} />
                    </circle>
                )}
            </g>
        </svg>
    )
}

/** Diagrams by the id a case names in `model.diagram`. */
export const DIAGRAMS: Record<string, (p: { focus: string; className?: string }) => React.ReactNode> = {
    "worker-limits": WorkerLimitsDiagram,
}
