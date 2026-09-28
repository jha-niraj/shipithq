"use client"

import { useEffect, useRef, useState } from "react"
import { ExternalLink, Github } from "lucide-react"
import {
    ContributionGraph, ContributionGraphBlock, ContributionGraphCalendar,
    ContributionGraphFooter, ContributionGraphLegend, ContributionGraphTotalCount,
    type Activity,
} from "@repo/ui/components/contribution-graph"
import { Shimmer } from "@repo/ui/components/skeleton-kit"
import { cn } from "@repo/ui/lib/utils"

/**
 * The GitHub year as the same monochrome graph as the ShipItHQ activity above it
 * (plan/home HOME-10): block size measured to fill the card, a tooltip on hover.
 */

const MARGIN = 3
const WEEKS = 53
const CARD = "rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950"
const TEXT = "text-xs text-neutral-600 dark:text-neutral-400"
const LEVELS = cn(
    'data-[level="0"]:fill-neutral-100 dark:data-[level="0"]:fill-neutral-800',
    'data-[level="1"]:fill-neutral-300 dark:data-[level="1"]:fill-neutral-700',
    'data-[level="2"]:fill-neutral-500 dark:data-[level="2"]:fill-neutral-500',
    'data-[level="3"]:fill-neutral-700 dark:data-[level="3"]:fill-neutral-300',
    'data-[level="4"]:fill-neutral-900 dark:data-[level="4"]:fill-neutral-100',
)

function useBlockSize() {
    const ref = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState(12)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const measure = () => setSize(Math.max(10, Math.min(18, Math.floor((el.clientWidth + MARGIN) / WEEKS) - MARGIN)))
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    return { ref, size }
}

function Header({ username }: { username: string }) {
    return (
        <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900/10 dark:bg-white/10">
                    <Github className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
                </div>
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">GitHub</span>
            </div>
            <a href={`https://github.com/${username}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                @{username} <ExternalLink className="size-3" />
            </a>
        </div>
    )
}

export function GitHubCalendarCard({ username, days, total, failed }: { username: string; days: Activity[]; total: number; failed: boolean }) {
    const { ref, size } = useBlockSize()
    const [hover, setHover] = useState<{ d: Activity; x: number; y: number } | null>(null)

    if (failed || days.length === 0) {
        return (
            <div className={CARD}>
                <Header username={username} />
                <p className={TEXT}>GitHub didn&apos;t answer just now, so your contributions aren&apos;t shown. They come back on the next visit.</p>
            </div>
        )
    }

    const show = (d: Activity, el: Element) => {
        const box = ref.current?.getBoundingClientRect()
        const r = el.getBoundingClientRect()
        if (!box) return
        setHover({ d, x: Math.max(80, Math.min(box.width - 80, r.left + r.width / 2 - box.left)), y: r.top - box.top })
    }

    return (
        <div className={CARD}>
            <Header username={username} />
            <div ref={ref} className="relative">
                <ContributionGraph data={days} blockSize={size} blockMargin={MARGIN} blockRadius={2} fontSize={12} className="mx-auto">
                    <ContributionGraphCalendar title={`GitHub contributions in the last year: ${total}`} className="text-neutral-600 dark:text-neutral-400">
                        {({ activity, dayIndex, weekIndex }) => (
                            <ContributionGraphBlock
                                activity={activity} dayIndex={dayIndex} weekIndex={weekIndex}
                                onPointerEnter={(e) => show(activity, e.currentTarget)}
                                onPointerLeave={() => setHover(null)}
                                className={LEVELS}
                            />
                        )}
                    </ContributionGraphCalendar>
                    <ContributionGraphFooter className="mt-2 items-center">
                        <ContributionGraphTotalCount>
                            {() => <span className={TEXT}>{total.toLocaleString("en")} contributions in the last year</span>}
                        </ContributionGraphTotalCount>
                        <ContributionGraphLegend className={TEXT}>
                            {({ level }) => (
                                <svg width={Math.min(size, 12)} height={Math.min(size, 12)} aria-hidden>
                                    <rect className={LEVELS} data-level={level} width={Math.min(size, 12)} height={Math.min(size, 12)} rx={2} ry={2} />
                                </svg>
                            )}
                        </ContributionGraphLegend>
                    </ContributionGraphFooter>
                </ContributionGraph>
                {hover && (
                    <div role="tooltip" className="pointer-events-none absolute z-20 w-max -translate-x-1/2 -translate-y-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md dark:border-neutral-800 dark:bg-neutral-900" style={{ left: hover.x, top: hover.y - 6 }}>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {new Date(`${hover.d.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">{hover.d.count ? `${hover.d.count} contribution${hover.d.count === 1 ? "" : "s"}` : "No contributions"}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export function GitHubCalendarSkeleton() {
    return (
        <div className={CARD} aria-busy aria-label="Loading GitHub contributions">
            <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900/10 dark:bg-white/10"><Github className="h-4 w-4 text-neutral-900 dark:text-neutral-100" /></div>
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">GitHub</span>
            </div>
            <Shimmer className="aspect-[53/8] w-full rounded-md" />
            <Shimmer className="mt-3 h-3 w-48" />
        </div>
    )
}
