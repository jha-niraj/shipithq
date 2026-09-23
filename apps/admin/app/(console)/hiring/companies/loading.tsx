// Hand-matched to the companies table: a "Back to Hiring Platform" link,
// header with two buttons (Pending/Export), a search + status-filter row,
// a 4-cell StatBand, then the 7-column table (Company, Industry, Size, Status,
// Members, Joined, Actions) - the order (filters before stats) and column
// count both drifted from the previous skeleton (ADM-22).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export default function Loading() {
    return (
        <div className="p-6 lg:p-8">
            <ShimmerStyles />
            <div className="mx-auto w-full">
                <div className="mb-8">
                    <Shimmer className="mb-4 h-4 w-40" />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shimmer className="h-8 w-1.5 rounded-full" />
                            <div className="space-y-2">
                                <Shimmer className="h-7 w-32" />
                                <Shimmer className="h-4 w-40" delay={0.06} />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Shimmer className="h-9 w-28 rounded-lg" delay={0.1} />
                            <Shimmer className="h-9 w-24 rounded-lg" delay={0.14} />
                        </div>
                    </div>
                </div>

                <div className="mb-6 flex items-center gap-4">
                    <Shimmer className="h-10 max-w-md flex-1 rounded-lg" />
                    <Shimmer className="h-10 w-[150px] rounded-lg" delay={0.06} />
                </div>

                <StatBandSkeleton count={4} cols={4} className="mb-6" />

                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex gap-4 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Shimmer key={i} className="h-3.5 flex-1" delay={i * 0.05} />
                        ))}
                        <Shimmer className="h-3.5 w-4" />
                    </div>
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-4 py-4">
                                <Shimmer className="h-10 w-10 shrink-0 rounded-lg" delay={i * 0.03} />
                                {Array.from({ length: 5 }).map((_, j) => (
                                    <Shimmer key={j} className="h-4 flex-1" delay={i * 0.03} />
                                ))}
                                <Shimmer className="h-6 w-6 shrink-0 rounded" delay={i * 0.03} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
