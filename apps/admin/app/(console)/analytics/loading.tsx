// Hand-matched to the analytics page, in the order analytics-client.tsx renders
// (ADM-30):
//
//   title + Refresh -> 4-cell StatBand -> 2 trend charts (xl:2-up) ->
//   Engagement beside Module Usage (lg:2-up)
//
// The revenue summary row between the charts and the two panels is NOT in this
// skeleton on purpose: it only renders when there is at least one completed
// payment, and a skeleton for a block that usually does not appear would make
// the page shrink on nearly every load. A skeleton should match the common case,
// and growing is a gentler reflow than shrinking.
//
// Chart placeholders are plain rectangles, not drawn axes - an axis with no line
// reads as a real chart reporting zero, which is a different claim from "still
// loading".
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export default function Loading() {
    return (
        <div className="w-full p-6 lg:p-8">
            <ShimmerStyles />

            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                    <Shimmer className="h-8 w-64" />
                    <Shimmer className="h-4 w-80" delay={0.06} />
                </div>
                <Shimmer className="h-9 w-28 rounded-lg" delay={0.1} />
            </div>

            <StatBandSkeleton count={4} cols={4} className="mb-8" />

            <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                        <Shimmer className="h-5 w-32" delay={i * 0.06} />
                        <Shimmer className="mt-2 h-3.5 w-44" delay={i * 0.06} />
                        <Shimmer className="mt-4 h-56 w-full rounded-lg" delay={i * 0.06} />
                        <Shimmer className="mt-3 h-3.5 w-56" delay={i * 0.06} />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                    <Shimmer className="h-5 w-32" />
                    <Shimmer className="mt-2 h-3.5 w-52" delay={0.05} />
                    <div className="mt-4 space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <Shimmer className="h-4 w-36" delay={i * 0.05} />
                                <Shimmer className="h-6 w-12" delay={i * 0.05} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                    <Shimmer className="h-5 w-36" />
                    <Shimmer className="mt-2 h-3.5 w-48" delay={0.05} />
                    <div className="mt-4 space-y-3">
                        {Array.from({ length: 1 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Shimmer className="h-4 w-28" delay={i * 0.05} />
                                    <Shimmer className="h-4 w-10" delay={i * 0.05} />
                                </div>
                                <Shimmer className="h-2 w-full rounded-full" delay={i * 0.05} />
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                        <Shimmer className="h-3 w-36" />
                        <div className="mt-3 flex flex-wrap gap-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Shimmer key={i} className="h-6 w-24 rounded-full" delay={i * 0.04} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
