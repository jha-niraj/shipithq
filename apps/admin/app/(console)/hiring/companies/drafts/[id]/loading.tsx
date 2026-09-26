// Matches draft-review.tsx for a READY draft: back link, the bar-and-title
// header with "Open site", then the field table (9 rows, keep toggles) beside
// the "Pages read" column.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="p-6 lg:p-8 w-full mx-auto">
            <ShimmerStyles />
            <div className="mb-8">
                <Shimmer className="mb-4 h-4 w-28" />
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Shimmer className="h-8 w-3 rounded-full" />
                        <div className="space-y-2">
                            <Shimmer className="h-7 w-48" />
                            <Shimmer className="h-4 w-64" delay={0.06} />
                        </div>
                    </div>
                    <Shimmer className="h-9 w-28 rounded-lg" delay={0.08} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="hidden gap-4 bg-neutral-50 px-4 py-3 md:flex dark:bg-neutral-800/50">
                        <Shimmer className="h-3.5 w-24" /><Shimmer className="h-3.5 flex-1" /><Shimmer className="h-3.5 w-20" /><Shimmer className="h-3.5 w-10" />
                    </div>
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="grid grid-cols-1 gap-2 px-4 py-4 md:grid-cols-[9rem_minmax(0,1fr)_8rem_3.5rem] md:gap-4">
                                <Shimmer className="mt-2 h-4 w-20" delay={i * 0.03} />
                                <Shimmer className={i === 1 || i === 6 ? "h-24 rounded-md" : "h-10 rounded-md"} delay={i * 0.03} />
                                <Shimmer className="mt-2 h-4 w-20" delay={i * 0.03} />
                                <Shimmer className="mt-1.5 h-5 w-9 rounded-full md:ml-auto" delay={i * 0.03} />
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
                        <Shimmer className="h-9 w-24 rounded-lg" />
                        <Shimmer className="h-9 w-48 rounded-lg" delay={0.05} />
                    </div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <Shimmer className="mb-3 h-3 w-24" />
                    <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="space-y-1.5"><Shimmer className="h-4 w-4/5" delay={i * 0.04} /><Shimmer className="h-3 w-1/2" delay={i * 0.04} /></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
