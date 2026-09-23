// Hand-matched to the role-branched dashboards: same min-h-full p-6 lg:p-8 wrapper, same grids and
// card chrome, so nothing reflows when the real content mounts.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="min-h-full p-6 lg:p-8">
            <ShimmerStyles />

            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                    <Shimmer className="h-8 w-56" />
                    <Shimmer className="h-4 w-80" delay={0.06} />
                </div>
                <Shimmer className="h-10 w-36 rounded-xl" delay={0.12} />
            </div>

            <StatBandSkeleton count={4} cols={4} className="mb-8" />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950 lg:col-span-2">
                    <Shimmer className="h-5 w-44" />
                    <div className="mt-4 space-y-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Shimmer className="h-10 w-10 shrink-0 rounded-xl" delay={i * 0.05} />
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <Shimmer className="h-4 w-3/5" delay={i * 0.05} />
                                    <Shimmer className="h-3 w-1/4" delay={i * 0.05} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-6">
                    {Array.from({ length: 2 }).map((_, c) => (
                        <div key={c} className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                            <Shimmer className="h-5 w-32" delay={c * 0.08} />
                            <div className="mt-4 space-y-2.5">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Shimmer key={i} className="h-4 w-full" delay={c * 0.08 + i * 0.04} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
