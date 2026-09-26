"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Ban, CheckCircle2, Pause, Play, RotateCcw, XCircle } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import type { LaneState, SimRun, SimValues, SimulatorSpec } from "@/content/incidents/types"
import { EASE, Sources, useCase, usePlayback } from "./primitives"
import { useProgress } from "./case-progress"
import { useGate } from "./sign-in-gate"

/**
 * Part three, the simulator (plan/incidents INC-3): a large dark panel, the same in
 * both themes (a constant surface, so constant ink). Controls on top; one lane per
 * actor on a shared timeline; marks for the events and the limits; a verdict that
 * says what ended the run and which section of the docs says so.
 *
 * It opens on the default run already played, so a signed-out reader sees a full
 * result. Changing a control, playing or scrubbing is an action and goes through the
 * sign-in gate (Niraj, 2026-09-26: reading is free, any action asks).
 */

/** Resolve a control value that is unavailable in this combination to its first allowed option. */
export function effectiveValues(spec: SimulatorSpec, v: SimValues): SimValues {
    const out = { ...v }
    for (const c of spec.controls) {
        const opt = c.options.find((o) => o.value === out[c.id])
        const blocked = opt?.disabledWhen && Object.entries(opt.disabledWhen).every(([k, val]) => out[k] === val)
        if (blocked) out[c.id] = c.options[0]!.value
    }
    return out
}

export function Simulator() {
    const c = useCase()
    const spec = c.simulator
    const { gate } = useGate()
    const { dispatch } = useProgress()
    const [values, setValues] = useState<SimValues>(spec.defaults)
    const eff = useMemo(() => effectiveValues(spec, values), [spec, values])
    const run = useMemo(() => spec.simulate(eff), [spec, eff])
    const { t, playing, play, seek } = usePlayback(spec.duration, 6500)

    const act = (fn: () => void) => gate(() => {
        fn()
        dispatch({ type: "simulatorPlayed" })
    }, "simulator")

    const change = (id: string, value: string) => act(() => {
        setValues((v) => ({ ...v, [id]: value }))
        play()
    })

    return (
        <div className="rounded-[28px] bg-neutral-950 p-4 text-white ring-1 ring-white/10 sm:p-7 dark:ring-white/15">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">The job</p>
                    <p className="mt-1 text-[15px] text-neutral-200">{spec.job}</p>
                </div>
                <button
                    type="button"
                    onClick={() => act(() => (playing ? seek(t) : play()))}
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-neutral-950 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                    {playing ? <Pause className="size-4" aria-hidden /> : t >= spec.duration ? <RotateCcw className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                    {playing ? "Pause" : t >= spec.duration ? "Replay" : "Play"}
                </button>
            </div>

            <div className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                {spec.controls.map((ctrl) => (
                    <fieldset key={ctrl.id} className="min-w-0">
                        <legend className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-neutral-400">{ctrl.label}</legend>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {ctrl.options.map((o) => {
                                const disabled = !!o.disabledWhen && Object.entries(o.disabledWhen).every(([k, val]) => eff[k] === val)
                                const on = eff[ctrl.id] === o.value
                                return (
                                    <button
                                        key={o.value}
                                        type="button"
                                        aria-pressed={on}
                                        disabled={disabled}
                                        title={disabled ? o.disabledReason : o.hint}
                                        onClick={() => change(ctrl.id, o.value)}
                                        className={cn(
                                            "rounded-full border px-3 py-1.5 text-[12.5px] leading-none transition-[background-color,border-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                                            on ? "border-white bg-white text-neutral-950" : "border-white/15 text-neutral-300 hover:border-white/40 hover:text-white",
                                            disabled && "cursor-not-allowed border-dashed opacity-40 hover:border-white/15 hover:text-neutral-300",
                                        )}
                                    >
                                        {o.label}
                                    </button>
                                )
                            })}
                        </div>
                    </fieldset>
                ))}
            </div>

            <div className="mt-8">
                <SimTimeline run={run} duration={spec.duration} t={t} onSeek={(v) => act(() => seek(v))} />
            </div>

            <Verdict run={run} show={t >= stopsAt(run, spec.duration)} />

            <p className="mt-5 text-[12px] leading-5 text-neutral-400">{spec.fidelity}</p>
        </div>
    )
}

/** When a run's outcome is decided: the moment it dies, or the end of the timeline. */
export function stopsAt(run: SimRun, duration: number): number {
    return run.verdict === "completes" ? duration : run.end
}

// ── The timeline ───────────────────────────────────────────────────────────

const SEG: Record<LaneState, string> = {
    wait: "bg-white/20 text-neutral-200",
    run: "inc-running bg-white text-neutral-950",
    idle: "border border-dashed border-white/20 text-neutral-400",
    background: "bg-white/10 text-neutral-300",
    done: "bg-white/25 text-white",
    dead: "bg-rose-500/20 text-rose-300",
    never: "border border-dashed border-rose-400/50 text-rose-300",
}

/** Lanes on one time axis, drawn up to the playhead `t`. Used by the simulator and each prediction. */
export function SimTimeline({ run, duration, t, onSeek, compact = false }: { run: SimRun; duration: number; t: number; onSeek?: (v: number) => void; compact?: boolean }) {
    const pct = (s: number) => `${(Math.max(0, Math.min(duration, s)) / duration) * 100}%`
    const ticks = [0, 30, 60, 90, duration].filter((v, i, a) => v <= duration && a.indexOf(v) === i)
    const label = Math.round(t)

    return (
        <div className={cn("select-none", compact ? "text-[11px]" : "text-[12px]")}>
            <div className="flex">
                <div className={cn("shrink-0", compact ? "w-16" : "w-20 sm:w-24")} />
                <div className="relative flex-1">
                    {/* Axis */}
                    <div className="relative h-5">
                        {ticks.map((v) => (
                            <span key={v} className={cn("absolute -translate-x-1/2 font-mono text-[10px]", v === 30 ? "text-white" : "text-neutral-400")} style={{ left: pct(v) }}>
                                {v}s
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            <div className="relative space-y-2">
                {run.lanes.map((lane) => (
                    <div key={lane.id} className="flex items-center">
                        <div className={cn("shrink-0 pr-3 font-mono uppercase tracking-[0.1em] text-neutral-400", compact ? "w-16 text-[9.5px]" : "w-20 text-[10.5px] sm:w-24")}>{lane.label}</div>
                        <div className={cn("relative flex-1 overflow-hidden rounded-lg bg-white/[0.04]", compact ? "h-7" : "h-10")}>
                            {lane.segments.map((s, i) => {
                                const visibleTo = Math.min(s.to, t)
                                if (visibleTo <= s.from) return null
                                return (
                                    <div
                                        key={i}
                                        className={cn("absolute inset-y-1 flex items-center overflow-hidden rounded-md px-2 transition-[width] duration-75", SEG[s.state])}
                                        style={{ left: pct(s.from), width: `calc(${pct(visibleTo)} - ${pct(s.from)} - 2px)` }}
                                    >
                                        {!compact && s.label && <span className="truncate whitespace-nowrap text-[11.5px]">{s.label}</span>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}

                {/* The 30 s line, the events and the playhead, across every lane. */}
                <div className={cn("pointer-events-none absolute inset-y-0 right-0", compact ? "left-16" : "left-20 sm:left-24")} aria-hidden>
                    <span className="absolute inset-y-0 w-px bg-white/25" style={{ left: pct(30) }} />
                    {run.marks.map((m, i) => t >= m.at && (
                        <span key={i} className={cn("absolute inset-y-0 w-px", m.tone === "bad" ? "bg-rose-400" : "bg-neutral-500")} style={{ left: pct(m.at) }} />
                    ))}
                    <span className="absolute -inset-y-1.5 w-0.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]" style={{ left: pct(t) }} />
                </div>
            </div>

            {/* Event labels, under the lanes so they never cover a segment. */}
            {!compact && run.marks.length > 0 && (
                <div className="mt-2 flex">
                    <div className="w-20 shrink-0 sm:w-24" />
                    <div className="relative h-6 flex-1">
                        {run.marks.map((m, i) => (
                            <span
                                key={i}
                                className={cn(
                                    "absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[10px] transition-opacity duration-300",
                                    m.tone === "bad" ? "bg-rose-500/15 text-rose-300" : "bg-white/10 text-neutral-400",
                                    t >= m.at ? "opacity-100" : "opacity-0",
                                )}
                                style={{ left: pct(m.at) }}
                            >
                                {m.label}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {run.meter && !compact && <Meter run={run} t={t} />}

            {onSeek && (
                <div className="mt-4 flex items-center gap-3">
                    <label htmlFor="inc-scrub" className="w-20 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.1em] text-neutral-400 sm:w-24">Time</label>
                    <input
                        id="inc-scrub"
                        type="range"
                        min={0}
                        max={duration}
                        step={0.5}
                        value={t}
                        onChange={(e) => onSeek(Number(e.target.value))}
                        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
                        aria-valuetext={`${label} seconds`}
                    />
                    <span className="w-12 text-right font-mono text-[12px] tabular-nums text-neutral-300">{label}s</span>
                </div>
            )}
        </div>
    )
}

function Meter({ run, t }: { run: SimRun; t: number }) {
    const m = run.meter!
    const used = Math.min(t, run.end || t) * m.rate
    const frac = Math.min(1, used / m.budget)
    const spent = frac >= 1
    return (
        <div className="mt-4 flex items-center gap-3">
            <span className="w-20 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.1em] text-neutral-400 sm:w-24">{m.label}</span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                    className={cn("absolute inset-y-0 left-0 origin-left rounded-full transition-colors duration-300", spent ? "bg-rose-400" : "bg-white")}
                    style={{ width: "100%", transform: `scaleX(${Math.max(frac, 0.004)})` }}
                />
            </div>
            <span className={cn("w-24 text-right font-mono text-[11px] tabular-nums", spent ? "text-rose-300" : "text-neutral-400")}>
                {used < 1 ? used.toFixed(2) : Math.round(used)} / {m.budget} s
            </span>
        </div>
    )
}

// ── The verdict ────────────────────────────────────────────────────────────

const VERDICT = {
    completes: { icon: CheckCircle2, tone: "text-white", ring: "ring-white/25 bg-white/[0.06]" },
    killed: { icon: XCircle, tone: "text-rose-300", ring: "ring-rose-400/30 bg-rose-500/[0.06]" },
    evicted: { icon: XCircle, tone: "text-rose-300", ring: "ring-rose-400/30 bg-rose-500/[0.06]" },
    "never-runs": { icon: Ban, tone: "text-rose-300", ring: "ring-rose-400/30 bg-rose-500/[0.06]" },
} as const

/** The run's result. The box keeps its height while playing, so nothing below it moves. */
export function Verdict({ run, show }: { run: SimRun; show: boolean }) {
    const v = VERDICT[run.verdict]
    const Icon = v.icon
    return (
        <div className="relative mt-6 min-h-[9.5rem] sm:min-h-[8rem]">
            <AnimatePresence mode="wait" initial={false}>
                {show ? (
                    <motion.div
                        key={run.headline + run.end}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className={cn("rounded-2xl p-4 ring-1 sm:p-5", v.ring)}
                    >
                        <p className={cn("flex items-center gap-2 text-[16px] font-semibold", v.tone)}>
                            <Icon className="size-5 shrink-0" aria-hidden />
                            {run.headline}
                        </p>
                        <p className="mt-2 text-[14.5px] leading-6 text-neutral-200"><InlineDark text={run.reason} /></p>
                        <Sources refs={run.sources} dark className="mt-3" />
                    </motion.div>
                ) : (
                    <motion.p
                        key="playing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex h-full items-center rounded-2xl border border-dashed border-white/10 p-5 font-mono text-[12px] text-neutral-400"
                    >
                        Running the timeline...
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    )
}

/** Inline code on the dark panel. */
export function InlineDark({ text }: { text: string }) {
    return (
        <>
            {text.split(/(`[^`]+`)/g).map((p, i) =>
                p.length > 1 && p.startsWith("`") && p.endsWith("`")
                    ? <code key={i} className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[0.86em] text-white">{p.slice(1, -1)}</code>
                    : p,
            )}
        </>
    )
}
