"use client"

import { useState, type ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { cn } from "@repo/ui/lib/utils"

/**
 * The Incidents index's tabs (plan/incidents INC-12): Cases and Badges on the right of
 * the header, and the topic tabs inside Cases. Panels are rendered on the server and
 * passed in; switching keeps the URL in step (`?tab=`, `?topic=`) without a reload, so
 * a shared link opens the same tab.
 */

function setParam(key: string, value: string | null) {
    const url = new URL(window.location.href)
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
    window.history.replaceState(null, "", url)
}

export function Segmented<T extends string>({ value, options, onChange, label, className }: {
    value: T
    options: { id: T; label: string; count?: number }[]
    onChange: (v: T) => void
    label: string
    className?: string
}) {
    const reduced = useReducedMotion()
    return (
        <div role="tablist" aria-label={label} className={cn("inline-flex rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-950", className)}>
            {options.map((o) => {
                const on = o.id === value
                return (
                    <button
                        key={o.id}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => onChange(o.id)}
                        className={cn("relative flex h-8 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-colors", on ? "text-white dark:text-neutral-900" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white")}
                    >
                        {on && <motion.span layoutId={`seg-${label}`} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }} className="absolute inset-0 rounded-lg bg-neutral-900 dark:bg-white" />}
                        <span className="relative">{o.label}</span>
                        {o.count !== undefined && <span className={cn("relative font-mono text-[10.5px] tabular-nums", on ? "text-white/70 dark:text-neutral-900/60" : "text-neutral-400")}>{o.count}</span>}
                    </button>
                )
            })}
        </div>
    )
}

/** Header tabs: the header itself is passed in, the tabs sit on its right. */
export function IndexTabs({ header, cases, badges, initial, badgeCount }: { header: ReactNode; cases: ReactNode; badges: ReactNode; initial: "cases" | "badges"; badgeCount: string }) {
    const [tab, setTab] = useState(initial)
    const change = (t: "cases" | "badges") => { setTab(t); setParam("tab", t === "cases" ? null : t) }
    return (
        <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {header}
                <Segmented label="Incidents" value={tab} onChange={change} options={[{ id: "cases", label: "Cases" }, { id: "badges", label: `Badges ${badgeCount}` }]} />
            </div>
            <AnimatePresence mode="wait" initial={false}>
                <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                    {tab === "cases" ? cases : badges}
                </motion.div>
            </AnimatePresence>
        </>
    )
}

export function TopicTabs({ topics, panels, initial }: { topics: { id: string; label: string; count: number }[]; panels: Record<string, ReactNode>; initial: string }) {
    const [topic, setTopic] = useState(initial)
    const change = (t: string) => { setTopic(t); setParam("topic", t === topics[0]?.id ? null : t) }
    return (
        <div>
            <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                <Segmented label="Topics" value={topic} onChange={change} options={topics.map((t) => ({ id: t.id, label: t.label, count: t.count }))} />
            </div>
            <AnimatePresence mode="wait" initial={false}>
                <motion.div key={topic} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="mt-5">
                    {panels[topic]}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
