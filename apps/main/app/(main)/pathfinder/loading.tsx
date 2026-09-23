// Hand-matched to PathfinderDashboard (_components/pathfinder-dashboard.tsx).
//
// The real page is NOT a page-header + stat band + card grid. It is a full-height
// two-panel workspace: a sticky header, a mobile-only tab pill row, a fixed-width
// goals rail (400px at lg, 440px at xl) and a flexible overview panel. The counts
// below are the ones the component actually renders - a six-cell StatBand
// (StatsSection, cols 3, size sm), the two chart cards, and the goal card shape from
// GoalCard.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="flex h-dvh flex-col">
            <ShimmerStyles />

            {/* Header - icon tile, title + sub, QuickActions on the right. */}
            <div className="shrink-0 border-b border-neutral-200/60 bg-white px-4 py-3 dark:border-neutral-800/60 dark:bg-neutral-900/80">
                <div className="mx-auto flex w-full items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shimmer className="h-9 w-9 rounded-xl" />
                        <div className="space-y-1.5">
                            <Shimmer className="h-4 w-24" delay={0.05} />
                            <Shimmer className="h-3 w-36" delay={0.08} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Shimmer className="h-8 w-24 rounded-lg" delay={0.12} />
                        <Shimmer className="h-8 w-24 rounded-lg" delay={0.15} />
                    </div>
                </div>
            </div>

            {/* Mobile tab pills - hidden from lg, exactly as the real row is. */}
            <div className="shrink-0 border-b border-neutral-200/60 bg-white px-4 py-2 lg:hidden dark:border-neutral-800/60 dark:bg-neutral-900/80">
                <div className="flex gap-1 rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-800/50">
                    <Shimmer className="h-7 flex-1 rounded-md" />
                    <Shimmer className="h-7 flex-1 rounded-md" delay={0.05} />
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="mx-auto flex h-full w-full">
                    {/* Goals rail. */}
                    <div className="flex w-full flex-col border-r border-neutral-200/60 bg-white lg:w-[400px] xl:w-[440px] dark:border-neutral-800/60 dark:bg-neutral-900/30">
                        <div className="space-y-2.5 p-4">
                            <Shimmer className="h-3.5 w-28" />
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="rounded-xl border border-neutral-200/60 bg-white p-4 dark:border-neutral-800/60 dark:bg-neutral-900/50"
                                >
                                    <div className="mb-3 flex items-start gap-3">
                                        <Shimmer className="h-8 w-8 shrink-0 rounded-lg" delay={i * 0.05} />
                                        <div className="min-w-0 flex-1 space-y-1.5">
                                            <Shimmer className="h-3.5 w-3/4" delay={i * 0.05} />
                                            <Shimmer className="h-2.5 w-1/3" delay={i * 0.05} />
                                        </div>
                                    </div>
                                    {/* The three counters + streak row. */}
                                    <div className="mb-3 flex items-center gap-3">
                                        {[0, 1, 2].map((j) => (
                                            <Shimmer key={j} className="h-2.5 w-10" delay={i * 0.05} />
                                        ))}
                                        <Shimmer className="ml-auto h-2.5 w-14" delay={i * 0.05} />
                                    </div>
                                    <Shimmer className="mb-1 h-2.5 w-16" delay={i * 0.05} />
                                    <Shimmer className="h-1 w-full rounded-full" delay={i * 0.05} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Overview panel - hidden below lg, same as the real one. */}
                    <div className="hidden flex-1 flex-col lg:flex">
                        <div className="space-y-6 p-6">
                            <Shimmer className="h-3.5 w-20" />

                            {/* StatsSection: a six-cell StatBand, three across, size sm. */}
                            <StatBandSkeleton count={6} cols={3} size="sm" />

                            {/* ActivityChart - label, bordered card, three legend chips. */}
                            <div>
                                <Shimmer className="mb-3 h-3 w-28" />
                                <div className="rounded-xl border border-neutral-200/60 bg-white p-3 dark:border-neutral-800/60 dark:bg-neutral-900/50">
                                    <Shimmer className="h-44 w-full rounded-lg" delay={0.08} />
                                    <div className="mt-2 flex items-center justify-center gap-4">
                                        {[0, 1, 2].map((j) => (
                                            <Shimmer key={j} className="h-2.5 w-14" delay={0.12 + j * 0.03} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* CategoryChart. */}
                            <div>
                                <Shimmer className="mb-3 h-3 w-24" />
                                <div className="rounded-xl border border-neutral-200/60 bg-white p-3 dark:border-neutral-800/60 dark:bg-neutral-900/50">
                                    <div className="flex items-center gap-4">
                                        <Shimmer className="h-32 w-32 shrink-0 rounded-full" delay={0.1} />
                                        <div className="min-w-0 flex-1 space-y-2">
                                            {Array.from({ length: 4 }).map((_, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <Shimmer className="h-2.5 w-2.5 rounded-sm" delay={0.12 + i * 0.03} />
                                                    <Shimmer className="h-3 flex-1" delay={0.12 + i * 0.03} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
