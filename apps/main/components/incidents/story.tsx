"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import type { StoryBeat } from "@/content/incidents/types"
import { EASE, Inline, Reveal, Sources, useCase } from "./primitives"
import { useProgress } from "./case-progress"
import { useGate } from "./sign-in-gate"

/**
 * Part one, the incident (plan/incidents INC-3): a vertical timeline of beats that
 * fade in as they arrive. The fork is the one place the reader acts; choosing asks
 * for sign-in when signed out and comes back to `#incident`.
 */
export function Story() {
    const c = useCase()
    return (
        <ol className="relative max-w-[44rem]">
            <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-neutral-200 via-neutral-200 to-transparent dark:from-neutral-800 dark:via-neutral-800" />
            {c.story.map((beat) => (
                <li key={beat.id} className="relative pb-10 pl-9 last:pb-0">
                    <span aria-hidden className={cn(
                        "absolute left-0 top-1.5 size-[15px] rounded-full border-2 bg-white dark:bg-neutral-950",
                        beat.kind === "fork" ? "border-neutral-900 dark:border-white" : beat.kind === "evidence" || beat.kind === "log" ? "border-rose-500" : beat.kind === "thread" ? "border-neutral-900 dark:border-white" : "border-neutral-300 dark:border-neutral-700",
                    )} />
                    <Reveal>
                        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">{beat.at}</p>
                        <div className="mt-2"><Beat beat={beat} /></div>
                    </Reveal>
                </li>
            ))}
        </ol>
    )
}

function Beat({ beat }: { beat: StoryBeat }) {
    switch (beat.kind) {
        case "scene":
            return <p className="text-[17px] leading-8 text-neutral-800 dark:text-neutral-200"><Inline text={beat.text} /></p>
        case "message":
            return (
                <div className="flex items-start gap-3">
                    <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[12px] font-semibold text-white dark:bg-white dark:text-neutral-900">
                        {beat.from.replace(/^(A|The) /, "").slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium text-neutral-500 dark:text-neutral-400">{beat.from}</p>
                        <p className="mt-1 inline-block rounded-2xl rounded-tl-md bg-neutral-100 px-4 py-2.5 text-[16px] leading-7 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
                            <Inline text={beat.text} />
                        </p>
                    </div>
                </div>
            )
        case "thread":
            return (
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-800">
                        <span className="font-mono text-[12px] font-medium text-neutral-900 dark:text-white">{beat.channel}</span>
                        <span className="text-[12px] text-neutral-500 dark:text-neutral-400">{beat.messages.length} messages</span>
                    </div>
                    <ol className="space-y-4 p-4">
                        {beat.messages.map((m, i) => (
                            <li key={i} className="inc-line flex items-start gap-3" style={{ transitionDelay: `${120 + i * 160}ms` }}>
                                <span aria-hidden className={cn(
                                    "flex size-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold",
                                    m.from.includes("developer") ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
                                )}>
                                    {m.from.replace(/^(A|The) /, "").slice(0, 1).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <p className="flex items-baseline gap-2">
                                        <span className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">{m.from}</span>
                                        <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">{m.t}</span>
                                    </p>
                                    <p className="mt-0.5 text-[15.5px] leading-7 text-neutral-800 dark:text-neutral-200"><Inline text={m.text} /></p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            )
        case "log":
            return (
                <div className="overflow-hidden rounded-2xl bg-neutral-950 ring-1 ring-white/10">
                    <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
                        {[0, 1, 2].map((i) => <span key={i} aria-hidden className="size-2 rounded-full bg-white/15" />)}
                        <span className="ml-2 font-mono text-[11px] text-neutral-400">{beat.at}</span>
                    </div>
                    <ol className="space-y-1.5 p-4 font-mono text-[13px] leading-6">
                        {beat.lines.map((l, i) => (
                            <li key={i} className="inc-line flex gap-4" style={{ transitionDelay: `${120 + i * 140}ms` }}>
                                <span className="w-9 shrink-0 text-neutral-400">{l.t}</span>
                                <span className={cn(l.tone === "bad" ? "text-rose-400" : l.tone === "muted" ? "text-neutral-400" : "text-neutral-100")}>{l.text}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )
        case "evidence":
            return (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 dark:border-rose-900/60 dark:bg-rose-950/20">
                    <p className="text-[15px] font-semibold text-neutral-900 dark:text-white">{beat.title}</p>
                    <dl className="mt-3 divide-y divide-rose-200/70 overflow-hidden rounded-xl border border-rose-200/70 bg-white font-mono text-[13px] dark:divide-rose-900/40 dark:border-rose-900/40 dark:bg-neutral-950">
                        {beat.rows.map((r) => (
                            <div key={r.label} className="flex gap-4 px-4 py-2">
                                <dt className="w-16 shrink-0 text-neutral-500">{r.label}</dt>
                                <dd className="text-neutral-900 dark:text-neutral-100">{r.value}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="mt-4 text-[15px] leading-7 text-neutral-800 dark:text-neutral-200"><Inline text={beat.note} /></p>
                    <Sources refs={beat.sources} className="mt-3" />
                </div>
            )
        case "fork":
            return <Fork beat={beat} />
    }
}

function Fork({ beat }: { beat: Extract<StoryBeat, { kind: "fork" }> }) {
    const { progress, dispatch } = useProgress()
    const { gate } = useGate()
    const chosen = progress.fork
    const picked = beat.options.find((o) => o.id === chosen)
    return (
        <div className="rounded-2xl border border-neutral-900 p-5 dark:border-white/80">
            <p className="text-[18px] font-semibold leading-snug text-neutral-900 dark:text-white">{beat.prompt}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {beat.options.map((o) => {
                    const isPicked = o.id === chosen
                    return (
                        <button
                            key={o.id}
                            type="button"
                            disabled={chosen !== null}
                            onClick={() => gate(() => dispatch({ type: "fork", option: o.id }), "incident")}
                            className={cn(
                                "group flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-[14.5px] leading-5 text-neutral-900 transition-[background-color,border-color,opacity,transform] duration-200 dark:text-neutral-100",
                                chosen === null && "border-neutral-200 hover:-translate-y-0.5 hover:border-neutral-900 dark:border-neutral-800 dark:hover:border-white",
                                isPicked && "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900",
                                chosen !== null && !isPicked && "border-neutral-200 opacity-45 dark:border-neutral-800",
                            )}
                        >
                            <span>{o.label}</span>
                            {isPicked ? <Check className="size-4 shrink-0" aria-hidden /> : chosen === null && <ArrowRight className="size-4 shrink-0 -translate-x-1 opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />}
                        </button>
                    )
                })}
            </div>
            <AnimatePresence initial={false}>
                {picked && (
                    <motion.div
                        key="after"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="overflow-hidden"
                    >
                        <p className="pt-4 text-[15.5px] leading-7 text-neutral-700 dark:text-neutral-300"><Inline text={picked.consequence} /></p>
                        <p className="mt-3 border-t border-neutral-200 pt-3 text-[15.5px] font-medium text-neutral-900 dark:border-neutral-800 dark:text-white">{beat.after}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
