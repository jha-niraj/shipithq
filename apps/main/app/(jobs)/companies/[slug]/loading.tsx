// Hand-matched to _components/company-page.tsx: the back link, the header (logo
// tile, name and Follow, the label, the meta line), then open roles and the
// profile in the main column, stats and quick facts in the rail.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export default function Loading() {
    return (
        <div className="page-frame space-y-6 px-page py-6">
            <ShimmerStyles />
            <Shimmer className="h-4 w-24" />
            <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-start dark:border-neutral-800">
                <Shimmer className="h-16 w-16 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                        <Shimmer className="h-8 w-56" />
                        <Shimmer className="h-8 w-24 rounded-lg" />
                    </div>
                    <Shimmer className="h-5 w-24 rounded-full" delay={0.04} />
                    <Shimmer className="h-4 w-72 max-w-full" delay={0.06} />
                    <Shimmer className="h-4 w-80 max-w-full" delay={0.08} />
                </div>
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="space-y-8 lg:col-span-2">
                    <div className="space-y-3">
                        <Shimmer className="h-4 w-28" />
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1.5">
                                        <Shimmer className="h-5 w-52" delay={i * 0.04} />
                                        <Shimmer className="h-4 w-80 max-w-full" delay={i * 0.04} />
                                    </div>
                                    <Shimmer className="h-8 w-24 rounded-lg" delay={i * 0.04} />
                                </div>
                                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                                    {Array.from({ length: 4 }).map((_, j) => <Shimmer key={j} className="h-9 rounded-lg" delay={i * 0.04} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-2">
                        <Shimmer className="h-4 w-16" />
                        <Shimmer className="h-4 w-full" delay={0.04} />
                        <Shimmer className="h-4 w-11/12" delay={0.06} />
                        <Shimmer className="h-4 w-3/4" delay={0.08} />
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Shimmer className="h-4 w-12" />
                        <StatBandSkeleton count={3} cols={1} size="sm" />
                    </div>
                    <div className="space-y-2">
                        <Shimmer className="h-4 w-24" />
                        <Shimmer className="h-40 rounded-2xl" delay={0.06} />
                    </div>
                </div>
            </div>
        </div>
    )
}
