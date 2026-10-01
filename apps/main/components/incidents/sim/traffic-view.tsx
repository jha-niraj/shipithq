"use client"

import { useMemo, useState } from "react"
import { Pause, Play, RotateCcw } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { usePlayback } from "../primitives"
import { useProgress } from "../case-progress"
import { useGate } from "../sign-in-gate"
import type { TrafficScenario } from "./schema"
import { runTraffic, verdictFor } from "./traffic-engine"

/**
 * The traffic view (plan/incidents INC-55): pick an attack and a defence, and watch an hour
 * of logins play out. Four numbers that matter (accounts taken, real people refused,
 * guesses stopped, guesses that reached the password check), a minute-by-minute chart,
 * and what it means. A dark constant surface, like the timeline view, so constant ink.
 *
 * Reading is free: it opens on its default run already played. Changing a choice or
 * playing goes through the sign-in gate, as the timeline view does.
 */
const BUCKET = 60

export function TrafficView({ scenario, preset }: { scenario: TrafficScenario; preset?: Record<string, string> }) {
    const { gate } = useGate()
    const { dispatch } = useProgress()
    const [values, setValues] = useState<Record<string, string>>({ ...scenario.defaults, ...preset })
    const result = useMemo(() => runTraffic(scenario, values), [scenario, values])
    const verdict = verdictFor(scenario, values)
    const { t, playing, play, seek } = usePlayback(scenario.duration, 6500)

    const act = (fn: () => void) => gate(() => { fn(); dispatch({ type: "simulatorPlayed" }) }, "simulator")
    const choose = (id: string, value: string) => act(() => { setValues((v) => ({ ...v, [id]: value })); play() })

    // Everything up to the playhead.
    const upTo = result.attempts.filter((x) => x.at <= t)
    const taken = new Set(upTo.filter((x) => x.kind === "attacker" && x.answer === "in").map((x) => x.email)).size
    const refusedPeople = new Set(upTo.filter((x) => x.kind === "user" && x.answer === "refused").map((x) => `${x.actor}:${x.email}`)).size
    const stopped = upTo.filter((x) => x.kind === "attacker" && (x.answer === "refused" || x.answer === "challenged")).length
    const checked = upTo.filter((x) => x.kind === "attacker" && (x.answer === "wrong" || x.answer === "in")).length

    const buckets = useMemo(() => {
        const n = Math.ceil(scenario.duration / BUCKET)
        const out = Array.from({ length: n }, () => ({ checked: 0, stopped: 0, in: 0 }))
        for (const x of result.attempts) {
            if (x.kind !== "attacker") continue
            const b = out[Math.min(n - 1, Math.floor(x.at / BUCKET))]!
            if (x.answer === "in") b.in += 1
            else if (x.answer === "wrong") b.checked += 1
            else b.stopped += 1
        }
        return out
    }, [result, scenario.duration])
    const peak = Math.max(1, ...buckets.map((b) => b.checked + b.stopped + b.in))
    const done = t >= scenario.duration

    return (
        <div className="rounded-[28px] bg-neutral-950 p-4 text-white ring-1 ring-white/10 sm:p-7 dark:ring-white/15">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="max-w-2xl text-[15px] leading-6 text-neutral-200">{scenario.job}</p>
                <button type="button" onClick={() => act(() => (playing ? seek(t) : play()))}
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-neutral-950 transition-transform duration-200 hover:-translate-y-0.5">
                    {playing ? <Pause className="size-4" aria-hidden /> : done ? <RotateCcw className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                    {playing ? "Pause" : done ? "Replay" : "Play"}
                </button>
            </div>

            <div className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {scenario.controls.map((ctrl) => (
                    <fieldset key={ctrl.id} className="min-w-0">
                        <legend className="font-mono text-[10.5px] text-neutral-400">{ctrl.label}</legend>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {ctrl.options.map((o) => {
                                const on = values[ctrl.id] === o.value
                                return (
                                    <button key={o.value} type="button" aria-pressed={on} title={o.hint} onClick={() => choose(ctrl.id, o.value)}
                                        className={cn("rounded-full border px-3 py-1.5 text-[12.5px] leading-none transition-colors",
                                            on ? "border-white bg-white text-neutral-950" : "border-white/15 text-neutral-300 hover:border-white/40 hover:text-white")}>
                                        {o.label}
                                    </button>
                                )
                            })}
                        </div>
                    </fieldset>
                ))}
            </div>

            <dl className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    { label: "Accounts taken", value: taken, bad: taken > 0 },
                    { label: "Real people refused", value: refusedPeople, bad: refusedPeople > 0 },
                    { label: "Guesses stopped", value: stopped },
                    { label: "Guesses checked", value: checked },
                ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                        <dt className="font-mono text-[10.5px] text-neutral-400">{s.label}</dt>
                        <dd className={cn("mt-1 text-2xl font-semibold tabular-nums", s.bad ? "text-rose-400" : "text-white")}>{s.value.toLocaleString("en-US")}</dd>
                    </div>
                ))}
            </dl>

            {/* Minute by minute, the attacker's guesses: checked (grey), stopped (dim), and the right one (rose). */}
            <div className="mt-6">
                <div className="flex h-28 items-end gap-[2px]" role="img" aria-label="Attacker guesses per minute">
                    {buckets.map((b, i) => {
                        const shown = (i + 1) * BUCKET <= t || (i * BUCKET <= t)
                        const total = b.checked + b.stopped + b.in
                        return (
                            <div key={i} className={cn("flex min-w-0 flex-1 flex-col-reverse transition-opacity", !shown && "opacity-10")} style={{ height: `${(total / peak) * 100}%` }}>
                                {b.in > 0 && <span className="w-full bg-rose-500" style={{ flex: Math.max(b.in, total * 0.08) }} />}
                                {b.checked > 0 && <span className="w-full bg-neutral-300" style={{ flex: b.checked }} />}
                                {b.stopped > 0 && <span className="w-full bg-white/15" style={{ flex: b.stopped }} />}
                            </div>
                        )
                    })}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 font-mono text-[10.5px] text-neutral-400">
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-neutral-300" />reached the password check</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-white/25" />stopped before it</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-rose-500" />an account taken</span>
                    <span className="ml-auto tabular-nums">{Math.floor(t / 60)} of {Math.round(scenario.duration / 60)} min</span>
                </div>
            </div>

            <div className={cn("mt-6 rounded-xl bg-white/5 p-4 ring-1 ring-white/10 transition-opacity duration-300", done ? "opacity-100" : "opacity-0")} aria-live="polite">
                <p className="text-[16px] font-semibold">{verdict.headline}</p>
                <p className="mt-1.5 text-[14px] leading-6 text-neutral-300">{verdict.reason}</p>
            </div>

            <p className="mt-5 text-[12px] leading-5 text-neutral-400">{scenario.fidelity}</p>
        </div>
    )
}
