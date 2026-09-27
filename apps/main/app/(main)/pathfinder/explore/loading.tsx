// Matches `page.tsx`: the Pathfinder header with its tabs, the search and filter
// row, then the card grid.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="w-full pb-6">
            <ShimmerStyles />
            <div className="border-b border-neutral-200 px-page py-3 dark:border-neutral-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                        <Shimmer className="h-6 w-32" />
                        <Shimmer className="h-4 w-72" delay={0.04} />
                    </div>
                    <Shimmer className="h-8 w-64 rounded-lg" delay={0.06} />
                </div>
            </div>
            <div className="px-page pt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Shimmer className="h-9 w-full rounded-md sm:w-72" delay={0.08} />
                    <div className="flex gap-1.5">
                        {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} className="h-8 w-20 rounded-full" delay={0.1 + i * 0.02} />)}
                    </div>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                            <div className="flex items-start gap-3">
                                <Shimmer className="size-10 shrink-0 rounded-xl" delay={i * 0.04} />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <Shimmer className="h-4 w-3/4" delay={i * 0.04} />
                                    <Shimmer className="h-3 w-1/2" delay={i * 0.04} />
                                </div>
                            </div>
                            <Shimmer className="mt-3 h-3 w-full" delay={i * 0.04} />
                            <Shimmer className="mt-1.5 h-3 w-5/6" delay={i * 0.04} />
                            <Shimmer className="mt-4 h-3 w-40" delay={i * 0.04} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
