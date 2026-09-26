// Matches drafts-client.tsx: back link, the bar-and-title header, the "Add from
// website" form card, a 4-cell StatBand, then the 7-column drafts table.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export default function Loading() {
    return (
        <div className="p-6 lg:p-8 w-full mx-auto">
            <ShimmerStyles />
            <div className="mb-8">
                <Shimmer className="mb-4 h-4 w-36" />
                <div className="flex items-center gap-3">
                    <Shimmer className="h-8 w-3 rounded-full" />
                    <div className="space-y-2">
                        <Shimmer className="h-7 w-44" />
                        <Shimmer className="h-4 w-96 max-w-full" delay={0.06} />
                    </div>
                </div>
            </div>

            <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <Shimmer className="mb-2 h-4 w-32" />
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Shimmer className="h-10 flex-1 rounded-lg" delay={0.05} />
                    <Shimmer className="h-10 w-32 rounded-lg" delay={0.08} />
                </div>
                <Shimmer className="mt-2 h-3 w-80 max-w-full" delay={0.1} />
            </div>

            <StatBandSkeleton count={4} cols={4} className="mb-6" />

            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex gap-4 bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
                    {Array.from({ length: 6 }).map((_, i) => <Shimmer key={i} className="h-3.5 flex-1" delay={i * 0.04} />)}
                    <Shimmer className="h-3.5 w-16" />
                </div>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-4 py-4">
                            <Shimmer className="h-4 flex-1" delay={i * 0.03} />
                            <Shimmer className="h-6 flex-1 rounded-full" delay={i * 0.03} />
                            <Shimmer className="h-4 flex-1" delay={i * 0.03} />
                            <Shimmer className="h-4 flex-1" delay={i * 0.03} />
                            <Shimmer className="h-4 flex-1" delay={i * 0.03} />
                            <Shimmer className="h-4 flex-1" delay={i * 0.03} />
                            <Shimmer className="h-8 w-16 rounded-lg" delay={i * 0.03} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
