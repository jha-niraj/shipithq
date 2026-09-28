"use client"

import { Check, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/components/ui/dropdown-menu"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { cn } from "@repo/ui/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs"

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

/** Header tabs: the header itself is passed in, the tabs sit on its right. */
export function IndexTabs({ header, cases, badges, initial, badgeCount }: { header: ReactNode; cases: ReactNode; badges: ReactNode; initial: "cases" | "badges"; badgeCount: string }) {
    const [tab, setTab] = useState(initial)
    const change = (t: "cases" | "badges") => { setTab(t); setParam("tab", t === "cases" ? null : t) }
    return (
        <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {header}
                {/* The shared tabs, unstyled (CLAUDE.md tabs rule, plan/jobs-polish JP-20). */}
                <Tabs value={tab} onValueChange={(v) => change(v as "cases" | "badges")}>
                    <TabsList variant="segmented" size="sm" fit aria-label="Incidents">
                        <TabsTrigger value="cases">Cases</TabsTrigger>
                        <TabsTrigger value="badges">Badges<span className="ml-1.5 tabular-nums opacity-60">{badgeCount}</span></TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            <AnimatePresence mode="wait" initial={false}>
                <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                    {tab === "cases" ? cases : badges}
                </motion.div>
            </AnimatePresence>
        </>
    )
}

/**
 * Topic tabs (Niraj, 2026-09-28): a full-width bar, as many tabs as fit, sharing the width,
 * and the rest under
 * "More". It measures every tab once (in a hidden row) and the space it has, and
 * re-fits on resize. A topic picked from "More" names itself on the button, so the
 * choice stays visible.
 */
export function TopicTabs({ topics, panels, initial }: { topics: { id: string; label: string; count: number }[]; panels: Record<string, ReactNode>; initial: string }) {
    const [topic, setTopic] = useState(initial)
    const change = (t: string) => { setTopic(t); setParam("topic", t === topics[0]?.id ? null : t) }
    const reduced = useReducedMotion()
    const box = useRef<HTMLDivElement>(null)
    const measure = useRef<Array<HTMLButtonElement | null>>([])
    const [fit, setFit] = useState(topics.length)

    useLayoutEffect(() => {
        const el = box.current
        if (!el) return
        const MORE = 112 // the "More" button, with its gap
        const refit = () => {
            const room = el.clientWidth - 8 // the tablist's padding
            const widths = measure.current.map((b) => (b?.offsetWidth ?? 0) + 4)
            const total = widths.reduce((a, b) => a + b, 0)
            if (total <= room) { setFit(topics.length); return }
            let used = 0
            let n = 0
            for (const w of widths) {
                if (used + w > room - MORE) break
                used += w
                n++
            }
            setFit(Math.max(1, n))
        }
        refit()
        const ro = new ResizeObserver(refit)
        ro.observe(el)
        return () => ro.disconnect()
    }, [topics])

    const shown = topics.slice(0, fit)
    const more = topics.slice(fit)
    const inMore = more.find((t) => t.id === topic)

    const tabClass = (on: boolean) => cn("relative flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-colors",
        on ? "text-white dark:text-neutral-900" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white")
    const count = (n: number, on: boolean) => <span className={cn("relative font-mono text-[10.5px] tabular-nums", on ? "text-white/70 dark:text-neutral-900/60" : "text-neutral-400")}>{n}</span>

    return (
        <div>
            <div ref={box} className="relative">
                {/* The measuring row: every tab at its natural width, never seen. */}
                <div aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex whitespace-nowrap">
                    {topics.map((t, i) => (
                        <button key={t.id} tabIndex={-1} ref={(el) => { measure.current[i] = el }} className={tabClass(false)}>
                            <span>{t.label}</span>{count(t.count, false)}
                        </button>
                    ))}
                </div>
                <div role="tablist" aria-label="Topics" className="flex w-full rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-950">
                    {shown.map((t) => {
                        const on = t.id === topic
                        return (
                            <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => change(t.id)} className={cn(tabClass(on), "flex-1 justify-center")}>
                                {on && <motion.span layoutId="seg-topics" transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }} className="absolute inset-0 rounded-lg bg-neutral-900 dark:bg-white" />}
                                <span className="relative">{t.label}</span>
                                {count(t.count, on)}
                            </button>
                        )
                    })}
                    {more.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button type="button" role="tab" aria-selected={!!inMore} className={cn(tabClass(!!inMore), "flex-1 justify-center")}>
                                    {inMore && <motion.span layoutId="seg-topics" transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }} className="absolute inset-0 rounded-lg bg-neutral-900 dark:bg-white" />}
                                    <span className="relative">{inMore ? inMore.label : `More ${more.length}`}</span>
                                    <ChevronDown className="relative size-3.5 opacity-70" aria-hidden />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-60">
                                {more.map((t) => (
                                    <DropdownMenuItem key={t.id} onClick={() => change(t.id)} className="flex items-center gap-2">
                                        <Check className={cn("size-3.5", t.id === topic ? "opacity-100" : "opacity-0")} aria-hidden />
                                        <span className="flex-1">{t.label}</span>
                                        <span className="font-mono text-[10.5px] tabular-nums text-neutral-400">{t.count}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
            <AnimatePresence mode="wait" initial={false}>
                <motion.div key={topic} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="mt-5">
                    {panels[topic]}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
