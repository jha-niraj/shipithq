// Hand-matched to analytics-content.tsx: the header with the range picker, the
// six-cell StatBand, two chart cards side by side (stacked below xl), the
// by-role table, then the outcomes and teammates tables side by side.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export default function Loading() {
    return (
        <div className="page-frame space-y-6 px-page py-6">
            <ShimmerStyles />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5"><Shimmer className="h-6 w-28" /><Shimmer className="h-4 w-80 max-w-full" delay={0.04} /></div>
                <Shimmer className="h-8 w-64 rounded-lg" delay={0.06} />
            </div>
            <StatBandSkeleton count={6} cols={6} />
            <div className="grid gap-6 xl:grid-cols-2">
                {[0, 1].map((i) => (
                    <div key={i} className="space-y-2 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                        <Shimmer className="h-4 w-56" delay={i * 0.05} /><Shimmer className="h-3 w-72 max-w-full" delay={i * 0.05} />
                        <Shimmer className="mt-3 h-64 w-full rounded-lg" delay={i * 0.05} />
                    </div>
                ))}
            </div>
            <div className="space-y-2">
                <Shimmer className="h-4 w-20" />
                <div className="space-y-2 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                    {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} className="h-8 w-full" delay={i * 0.04} />)}
                </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                {[0, 1].map((i) => <Shimmer key={i} className="h-44 rounded-2xl" delay={i * 0.05} />)}
            </div>
        </div>
    )
}
