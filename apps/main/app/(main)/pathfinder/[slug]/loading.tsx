// Matches `daily-practice-view.tsx`: a two-pane workspace, not a page column.
//
// It was `mx-auto max-w-7xl px-6 py-8` over a `lg:grid-cols-3` block - a centred
// three-column page. The real screen is a fixed 350px left panel (header, Add
// Task, a three-cell stat band, the task list, and a pinned Start Mock Interview
// button) beside a flexible right pane. The skeleton drew a different page
// entirely, so the whole layout reflowed the moment it was replaced.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export default function Loading() {
    return (
        <div className="flex h-dvh overflow-hidden">
            <ShimmerStyles />

            {/* Left panel - fixed 350px, matching the real one */}
            <div className="flex w-[350px] shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="shrink-0 border-b border-neutral-200 p-4 dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                        <Shimmer className="h-8 w-8 shrink-0 rounded-md" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <Shimmer className="h-4 w-48" delay={0.05} />
                            <Shimmer className="h-3 w-32" delay={0.07} />
                        </div>
                    </div>
                </div>

                <div className="shrink-0 p-3">
                    <Shimmer className="h-9 w-full rounded-lg" delay={0.1} />
                </div>

                {/* SessionStats: a three-cell StatBand, size sm, under a hairline. */}
                <div className="shrink-0 border-b border-neutral-200 p-3 dark:border-neutral-800">
                    <StatBandSkeleton count={3} cols={3} size="sm" />
                </div>

                {/* Task list - takes the remaining height, as the real scroller does */}
                <div className="min-h-0 flex-1 space-y-2 overflow-hidden px-3">
                    <Shimmer className="h-10 w-full rounded-lg" delay={0.16} />
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg p-3">
                            <Shimmer className="h-4 w-4 shrink-0 rounded-full" delay={0.18 + i * 0.03} />
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <Shimmer className="h-4 w-full" delay={0.18 + i * 0.03} />
                                <Shimmer className="h-5 w-28 rounded-full" delay={0.18 + i * 0.03} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pinned to the bottom, like the real Start Mock Interview button */}
                <div className="shrink-0 border-t border-neutral-200 p-3 dark:border-neutral-800">
                    <Shimmer className="h-9 w-full rounded-lg" delay={0.4} />
                </div>
            </div>

            {/* Right pane - the real one shows a centred "Select a Task" empty state
                until something is picked, so the skeleton centres too. */}
            <div className="flex min-w-0 flex-1 items-center justify-center p-8">
                <div className="flex flex-col items-center text-center">
                    <Shimmer className="h-16 w-16 rounded-full" delay={0.2} />
                    <Shimmer className="mt-4 h-5 w-32" delay={0.24} />
                    <Shimmer className="mt-2 h-4 w-64" delay={0.26} />
                </div>
            </div>
        </div>
    )
}
