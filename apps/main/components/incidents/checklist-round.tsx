"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Check, Trophy, X } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { INCIDENT_XP } from "@/content/incidents"
import { EASE, Inline, Reveal, Sources, XpPop, useCase } from "./primitives"
import { useProgress } from "./case-progress"
import { useGate } from "./sign-in-gate"

/**
 * Part six (plan/incidents INC-3): the checklist to take to work, the
 * spot-the-failure round built from the docs' failure signatures, and the lines
 * the case ends on.
 */

export function Checklist() {
    const c = useCase()
    const { progress, dispatch } = useProgress()
    const { gate } = useGate()
    const done = progress.checklist.length
    return (
        <div className="max-w-[44rem]">
            <Reveal>
                <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Before you deploy</h3>
                    <p className="font-mono text-[12px] tabular-nums text-neutral-500 dark:text-neutral-400">{done} of {c.checklist.length}</p>
                </div>
            </Reveal>
            <ul className="mt-5 divide-y divide-neutral-200 overflow-hidden rounded-3xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                {c.checklist.map((item) => {
                    const on = progress.checklist.includes(item.id)
                    return (
                        <li key={item.id}>
                            <button
                                type="button"
                                role="checkbox"
                                aria-checked={on}
                                onClick={() => gate(() => dispatch({ type: "check", item: item.id }), "checklist")}
                                className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                            >
                                <span className={cn(
                                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-[background-color,border-color] duration-200",
                                    on ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 dark:border-neutral-700",
                                )}>
                                    <Check className={cn("size-3.5 transition-[opacity,transform] duration-200", on ? "scale-100 opacity-100" : "scale-50 opacity-0")} aria-hidden />
                                </span>
                                <span className="min-w-0">
                                    <span className={cn("block text-[15.5px] leading-6 transition-colors", on ? "text-neutral-500 dark:text-neutral-400" : "text-neutral-900 dark:text-white")}><Inline text={item.text} /></span>
                                    <span className="mt-0.5 block text-[13.5px] leading-6 text-neutral-500 dark:text-neutral-400"><Inline text={item.why} /></span>
                                </span>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export function Round() {
    const c = useCase()
    const { progress, derived, dispatch } = useProgress()
    const { gate } = useGate()
    const firstOpen = c.round.findIndex((r) => !(r.id in progress.round))
    const [index, setIndex] = useState(firstOpen === -1 ? c.round.length : firstOpen)
    const [earned, setEarned] = useState(false)

    const item = c.round[index]
    const picked = item ? progress.round[item.id] : undefined
    const finished = index >= c.round.length
    const perfect = derived.roundDone && derived.roundRight === c.round.length

    const answer = (itemId: string, option: string) => gate(() => {
        // The perfect-round XP pops the moment the last answer makes it perfect, not
        // when a finished round is loaded again.
        const rest = c.round.filter((r) => r.id !== itemId)
        const last = rest.every((r) => r.id in progress.round)
        const allRight = rest.every((r) => progress.round[r.id] === r.answer) && option === c.round.find((r) => r.id === itemId)?.answer
        dispatch({ type: "round", item: itemId, option })
        if (last && allRight) setEarned(true)
    }, "checklist")

    return (
        <div className="max-w-[44rem]">
            <Reveal>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">Spot the failure</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Name the cause from the symptom</h3>
                <p className="mt-2 text-[15px] leading-7 text-neutral-600 dark:text-neutral-400">
                    {c.round.length} real signatures. Get every one right first time for +{INCIDENT_XP.perfectRound} XP.
                </p>
            </Reveal>

            <div className="mt-6 flex gap-1.5" aria-hidden>
                {c.round.map((r, i) => {
                    const a = progress.round[r.id]
                    return <span key={r.id} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", a === undefined ? (i === index ? "bg-neutral-400 dark:bg-neutral-600" : "bg-neutral-200 dark:bg-neutral-800") : a === r.answer ? "bg-neutral-900 dark:bg-white" : "bg-rose-400")} />
                })}
            </div>

            <div className="relative mt-5 min-h-[22rem]">
                <AnimatePresence mode="wait" initial={false}>
                    {!finished && item ? (
                        <motion.article
                            key={item.id}
                            id="round"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: 0.3, ease: EASE }}
                            className="rounded-3xl bg-neutral-950 p-6 text-white ring-1 ring-white/10 sm:p-7"
                        >
                            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">Symptom {index + 1} of {c.round.length}</p>
                            <p className="mt-3 font-mono text-[16px] leading-7 text-neutral-100 sm:text-[17px]">&ldquo;<Inline text={item.symptom} />&rdquo;</p>
                            <div className="mt-6 grid gap-2">
                                {item.options.map((o) => {
                                    const isPick = picked === o.id
                                    const isAnswer = picked !== undefined && o.id === item.answer
                                    return (
                                        <button
                                            key={o.id}
                                            type="button"
                                            disabled={picked !== undefined}
                                            onClick={() => answer(item.id, o.id)}
                                            className={cn(
                                                "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-[14.5px] leading-6 transition-[background-color,border-color,opacity] duration-200",
                                                picked === undefined && "border-white/15 hover:border-white/50",
                                                isAnswer && "border-white/60 bg-white/10 text-white",
                                                isPick && !isAnswer && "border-rose-400/60 bg-rose-500/10 text-rose-200",
                                                picked !== undefined && !isAnswer && !isPick && "border-white/10 opacity-40",
                                            )}
                                        >
                                            <Inline text={o.label} />
                                            {isAnswer ? <Check className="size-4 shrink-0" aria-hidden /> : isPick ? <X className="size-4 shrink-0" aria-hidden /> : null}
                                        </button>
                                    )
                                })}
                            </div>
                            <AnimatePresence initial={false}>
                                {picked !== undefined && (
                                    <motion.div key="why" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
                                        <p className="pt-5 text-[14.5px] leading-6 text-neutral-300"><Inline text={item.explanation} /></p>
                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                            <Sources refs={item.sources} dark />
                                            <button
                                                type="button"
                                                onClick={() => setIndex((i) => i + 1)}
                                                className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-neutral-950 transition-transform duration-200 hover:-translate-y-0.5"
                                            >
                                                {index + 1 < c.round.length ? "Next symptom" : "See the score"} <ArrowRight className="size-4" aria-hidden />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.article>
                    ) : (
                        <motion.div
                            key="score"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, ease: EASE }}
                            className="rounded-3xl border border-neutral-200 p-6 sm:p-7 dark:border-neutral-800"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p className="flex items-center gap-2 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                                    <Trophy className={cn("size-5", perfect ? "text-neutral-900 dark:text-white" : "text-neutral-400")} aria-hidden />
                                    {derived.roundRight} of {c.round.length}{perfect ? ": a perfect round" : ""}
                                </p>
                                <XpPop amount={INCIDENT_XP.perfectRound} show={earned} />
                            </div>
                            <ul className="mt-5 space-y-2">
                                {c.round.map((r) => {
                                    const ok = progress.round[r.id] === r.answer
                                    return (
                                        <li key={r.id} className="flex items-start gap-3 text-[14px] leading-6">
                                            <span className={cn("mt-1 flex size-4 shrink-0 items-center justify-center rounded-full text-white", ok ? "bg-neutral-900 dark:bg-white" : "bg-rose-400")}>
                                                {ok ? <Check className="size-2.5" aria-hidden /> : <X className="size-2.5" aria-hidden />}
                                            </span>
                                            <span className="text-neutral-700 dark:text-neutral-300"><Inline text={r.symptom} /></span>
                                        </li>
                                    )
                                })}
                            </ul>
                            <button type="button" onClick={() => setIndex(0)} className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                                <ArrowLeft className="size-3.5" aria-hidden /> Look back through them
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

export function Closing() {
    const c = useCase()
    const { derived } = useProgress()
    return (
        <section className="border-t border-neutral-200 pb-10 pt-16 dark:border-neutral-800">
            <div className="max-w-[44rem] space-y-5">
                {c.closing.map((line, i) => (
                    <Reveal key={i} delay={i * 120}>
                        <p className="text-2xl font-semibold leading-snug tracking-tight text-neutral-900 sm:text-[1.75rem] dark:text-white"><Inline text={line} /></p>
                    </Reveal>
                ))}
            </div>
            <Reveal delay={400} className="mt-12 flex flex-wrap items-center gap-3">
                {derived.complete && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-neutral-900 dark:bg-white px-3 py-1.5 text-sm font-medium text-white">
                        <Check className="size-4" aria-hidden /> Case complete · +{INCIDENT_XP.completion} XP
                    </span>
                )}
                <Link href="/incidents" className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-900 dark:border-neutral-700 dark:text-white dark:hover:border-white">
                    <ArrowLeft className="size-4" aria-hidden /> All incidents
                </Link>
            </Reveal>
        </section>
    )
}
