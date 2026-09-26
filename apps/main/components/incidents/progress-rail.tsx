"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Check } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { useProgress } from "./case-progress"

/**
 * The six parts of a case as a sticky rail on the left at lg, lit by the section in
 * the middle of the viewport, each ticked once done (plan/incidents INC-3). Below lg
 * it becomes a thin bar under the header naming the part you are in.
 */

export const PARTS = [
    { id: "incident", label: "The incident" },
    { id: "model", label: "The model" },
    { id: "simulator", label: "The simulator" },
    { id: "predict", label: "Make the call" },
    { id: "fix", label: "The fix" },
    { id: "checklist", label: "Checklist and round" },
] as const

function useActivePart() {
    const [active, setActive] = useState<string>(PARTS[0].id)
    useEffect(() => {
        const els = PARTS.map((p) => document.getElementById(p.id)).filter((e): e is HTMLElement => !!e)
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
        }, { rootMargin: "-40% 0px -55% 0px" })
        els.forEach((el) => io.observe(el))
        return () => io.disconnect()
    }, [])
    return active
}

/**
 * `mobile` renders the thin bar shown under the cover below xl; without it, the sticky
 * right-hand index shown from xl.
 */
export function ProgressRail({ mobile = false }: { mobile?: boolean }) {
    const active = useActivePart()
    const { derived } = useProgress()
    const reduced = useReducedMotion()
    const done = PARTS.filter((p) => derived.sections[p.id]).length
    const activeIndex = PARTS.findIndex((p) => p.id === active)

    const go = (id: string) => (e: React.MouseEvent) => {
        e.preventDefault()
        document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
        history.replaceState(null, "", `#${id}`)
    }

    if (mobile) {
        return (
            <div className="sticky top-0 z-20 -mx-4 mt-4 border-b border-neutral-200/80 bg-white/85 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 xl:hidden dark:border-neutral-800/80 dark:bg-neutral-950/85">
                <div className="flex h-11 items-center justify-between gap-3 text-[12.5px]">
                    <span className="truncate font-medium text-neutral-900 dark:text-white">
                        <span className="mr-2 font-mono text-neutral-500">{String(activeIndex + 1).padStart(2, "0")}</span>
                        {PARTS[activeIndex]?.label}
                    </span>
                    <span className="shrink-0 font-mono tabular-nums text-neutral-500">{done}/{PARTS.length} done</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-0.5">
                    <div className="h-full origin-left bg-neutral-900 transition-transform duration-500 dark:bg-white" style={{ transform: `scaleX(${(activeIndex + 1) / PARTS.length})` }} />
                </div>
            </div>
        )
    }

    return (
        <nav aria-label="Case parts" className="hidden xl:block">
            <div className="sticky top-6 pt-2">
                <p className="px-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">On this case</p>
                <ol className="relative mt-3 space-y-0.5 border-l border-neutral-200 dark:border-neutral-800">
                    {PARTS.map((p, i) => {
                        const on = p.id === active
                        const ticked = derived.sections[p.id]
                        return (
                            <li key={p.id} className="relative">
                                {on && (
                                    <motion.span
                                        layoutId="inc-rail"
                                        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 36 }}
                                        className="absolute -left-px inset-y-0 w-0.5 rounded-full bg-neutral-900 dark:bg-white"
                                    />
                                )}
                                <a
                                    href={`#${p.id}`}
                                    onClick={go(p.id)}
                                    aria-current={on ? "step" : undefined}
                                    className={cn("flex items-center gap-2.5 py-1.5 pl-4 pr-2 text-[13px] transition-colors", on ? "font-medium text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white")}
                                >
                                    <span className={cn(
                                        "flex size-[18px] shrink-0 items-center justify-center rounded-full font-mono text-[9.5px] transition-colors duration-300",
                                        ticked ? "bg-emerald-600 text-white" : on ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "border border-neutral-300 dark:border-neutral-700",
                                    )}>
                                        {ticked ? <Check className="size-2.5" aria-hidden /> : i + 1}
                                    </span>
                                    {p.label}
                                </a>
                            </li>
                        )
                    })}
                </ol>
                <div className="mt-6 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                    <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
                        <span>Progress</span>
                        <span className="tabular-nums">{done}/{PARTS.length}</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div className="h-full origin-left rounded-full bg-emerald-600 transition-transform duration-500" style={{ transform: `scaleX(${done / PARTS.length})` }} />
                    </div>
                    <dl className="mt-4 space-y-1.5 text-[12.5px]">
                        <div className="flex justify-between"><dt className="text-neutral-500 dark:text-neutral-400">Calls right</dt><dd className="font-mono tabular-nums text-neutral-900 dark:text-white">{derived.predictionsRight}</dd></div>
                        <div className="flex justify-between"><dt className="text-neutral-500 dark:text-neutral-400">Round</dt><dd className="font-mono tabular-nums text-neutral-900 dark:text-white">{derived.roundDone ? derived.roundRight : "-"}</dd></div>
                    </dl>
                </div>
            </div>
        </nav>
    )
}
