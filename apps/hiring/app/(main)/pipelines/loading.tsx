// Matches _components/pipelines-list.tsx on its default tab (plan/hiring-ui HU-7):
// PageHeader with the two-part button, a 3-cell StatBand, the tabs, then the
// "Your pipelines" list.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                    <Shimmer className="h-6 w-52" />
                    <Shimmer className="h-4 w-96 max-w-full" delay={0.04} />
                </div>
                <Shimmer className="h-9 w-64 rounded-lg" delay={0.06} />
            </div>
            <StatBandSkeleton count={3} cols={3} />
            <div className="flex gap-4 border-b border-neutral-200 pb-2.5 dark:border-neutral-800">
                <Shimmer className="h-4 w-32" /><Shimmer className="h-4 w-40" delay={0.04} />
            </div>
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="border-b border-neutral-200 px-5 py-3 dark:border-neutral-800"><Shimmer className="h-4 w-32" /></div>
                {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-4 border-b border-neutral-100 px-5 py-4 last:border-0 dark:border-neutral-800">
                        <div className="flex-1 space-y-1.5"><Shimmer className="h-4 w-48" delay={i * 0.04} /><Shimmer className="h-3.5 w-64" delay={i * 0.04} /></div>
                        <Shimmer className="h-4 w-4 rounded" delay={i * 0.04} />
                    </div>
                ))}
            </div>
        </div>
    )
}
