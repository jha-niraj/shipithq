"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Lock, X } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import type { PredictQuestion } from "@/content/incidents/types"
import { INCIDENT_XP } from "@/content/incidents"
import { EASE, Inline, Reveal, Sources, XpPop, useCase, usePlayback } from "./primitives"
import { SimTimeline, effectiveValues, stopsAt } from "./simulator"
import { useProgress } from "./case-progress"
import { useGate } from "./sign-in-gate"

/**
 * Part four, predict then reveal (plan/incidents INC-3). Pick an answer and lock it:
 * the choice is final (that is what "first try" means for XP). The situation then
 * plays on a small simulator, and only when the run is decided does the answer
 * expand in place. Nothing jumps: the reveal grows below the card's own content.
 */
export function Predict() {
    const c = useCase()
    const { progress, derived } = useProgress()
    return (
        <div className="max-w-[44rem]">
            <Reveal>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
                    <div className="flex flex-1 gap-1.5" aria-hidden>
                        {c.predict.map((q) => {
                            const a = progress.predictions[q.id]
                            return <span key={q.id} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", a === undefined ? "bg-neutral-200 dark:bg-neutral-800" : a === q.answer ? "bg-emerald-500" : "bg-rose-400")} />
                        })}
                    </div>
                    <p className="shrink-0 font-mono text-[12px] tabular-nums text-neutral-600 dark:text-neutral-400">
                        {derived.predictionsRight} of {c.predict.length} right
                    </p>
                </div>
            </Reveal>
            <ol className="mt-8 space-y-8">
                {c.predict.map((q, i) => <li key={q.id}><Question q={q} n={i + 1} total={c.predict.length} /></li>)}
            </ol>
        </div>
    )
}

function Question({ q, n, total }: { q: PredictQuestion; n: number; total: number }) {
    const c = useCase()
    const { progress, dispatch } = useProgress()
    const { gate } = useGate()
    const locked = progress.predictions[q.id]
    const [pending, setPending] = useState<string | null>(null)
    const [justEarned, setJustEarned] = useState(false)
    const run = useMemo(() => c.simulator.simulate(effectiveValues(c.simulator, q.scenario)), [c.simulator, q.scenario])
    const { t, play } = usePlayback(c.simulator.duration, 4200)
    const step = `predict-${q.id}`

    const revealed = locked !== undefined && t >= stopsAt(run, c.simulator.duration)
    const right = locked === q.answer
    const selected = locked ?? pending

    const lock = () => gate(() => {
        if (!pending || locked) return
        dispatch({ type: "predict", question: q.id, option: pending })
        if (pending === q.answer) setJustEarned(true)
        play()
    }, step)

    return (
        <Reveal id={step} className="scroll-mt-16">
            <article className={cn(
                "rounded-3xl border p-5 transition-colors duration-300 sm:p-6",
                !revealed ? "border-neutral-200 dark:border-neutral-800" : right ? "border-emerald-300 dark:border-emerald-800" : "border-rose-300 dark:border-rose-900",
            )}>
                <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Call {n} of {total}</p>
                    <div className="flex items-center gap-2">
                        <XpPop amount={INCIDENT_XP.prediction} show={justEarned && revealed} />
                        {revealed && (
                            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px]", right ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300")}>
                                {right ? <Check className="size-3" aria-hidden /> : <X className="size-3" aria-hidden />}
                                {right ? "Right" : "Not quite"}
                            </span>
                        )}
                    </div>
                </div>
                <p className="mt-3 text-[15px] leading-7 text-neutral-600 dark:text-neutral-400"><Inline text={q.setup} /></p>
                <h3 className="mt-1 text-xl font-semibold leading-snug tracking-tight text-neutral-900 dark:text-white"><Inline text={q.prompt} /></h3>

                <div role="radiogroup" aria-label={q.prompt} className="mt-5 grid gap-2">
                    {q.options.map((o) => {
                        const isSel = selected === o.id
                        const isAnswer = revealed && o.id === q.answer
                        const isWrongPick = revealed && isSel && !right
                        return (
                            <button
                                key={o.id}
                                type="button"
                                role="radio"
                                aria-checked={isSel}
                                disabled={locked !== undefined}
                                onClick={() => gate(() => setPending(o.id), step)}
                                className={cn(
                                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-[15px] leading-6 transition-[background-color,border-color,opacity] duration-200",
                                    "text-neutral-900 dark:text-neutral-100",
                                    locked === undefined && !isSel && "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600",
                                    locked === undefined && isSel && "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900",
                                    locked !== undefined && !revealed && (isSel ? "border-neutral-900 dark:border-white" : "border-neutral-200 opacity-50 dark:border-neutral-800"),
                                    isAnswer && "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40",
                                    isWrongPick && "border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30",
                                    revealed && !isAnswer && !isWrongPick && "border-neutral-200 opacity-50 dark:border-neutral-800",
                                )}
                            >
                                <span className={cn(
                                    "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                                    isAnswer ? "border-emerald-600 bg-emerald-600 text-white" : isWrongPick ? "border-rose-500 bg-rose-500 text-white" : isSel ? "border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white" : "border-neutral-300 dark:border-neutral-700",
                                )}>
                                    {isAnswer ? <Check className="size-3" aria-hidden /> : isWrongPick ? <X className="size-3" aria-hidden /> : isSel && <span className="size-1.5 rounded-full bg-white dark:bg-neutral-900" />}
                                </span>
                                <Inline text={o.label} />
                            </button>
                        )
                    })}
                </div>

                {locked === undefined && (
                    <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">One answer. It locks, then plays.</p>
                        <button
                            type="button"
                            disabled={!pending}
                            onClick={lock}
                            className="inline-flex h-10 items-center gap-2 rounded-full bg-neutral-900 px-5 text-sm font-medium text-white transition-[opacity,transform] duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-35 dark:bg-white dark:text-neutral-900"
                        >
                            <Lock className="size-3.5" aria-hidden /> Lock it in
                        </button>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {locked !== undefined && (
                        <motion.div
                            key="play"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            transition={{ duration: 0.4, ease: EASE }}
                            className="overflow-hidden"
                        >
                            <div className="mt-5 rounded-2xl bg-neutral-950 p-4 text-white ring-1 ring-white/10">
                                <SimTimeline run={run} duration={c.simulator.duration} t={t} compact />
                            </div>
                            <AnimatePresence initial={false}>
                                {revealed && (
                                    <motion.div
                                        key="why"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        transition={{ duration: 0.4, ease: EASE }}
                                        className="overflow-hidden"
                                    >
                                        <p className="pt-4 text-[15.5px] leading-7 text-neutral-800 dark:text-neutral-200"><Inline text={q.explanation} /></p>
                                        <Sources refs={q.sources} className="mt-3" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
            </article>
        </Reveal>
    )
}
