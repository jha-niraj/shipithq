// Hand-matched to analytics-content.tsx - same wrapper, same grids, same card chrome, so
// nothing reflows when the real content mounts.
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

            <StatBandSkeleton count={6} cols={6} className="mb-8" />

            <div className="mb-8 grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950 lg:col-span-2">
                    <Shimmer className="h-5 w-40" />
                    <Shimmer className="mt-4 h-[280px] w-full rounded-lg" delay={0.08} />
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                    <Shimmer className="h-5 w-32" />
                    <Shimmer className="mx-auto mt-6 h-40 w-40 rounded-full" delay={0.1} />
                    <div className="mt-6 space-y-2.5">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <Shimmer className="h-3 w-3 rounded-sm" delay={i * 0.05} />
                                <Shimmer className="h-3.5 flex-1" delay={i * 0.05} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                        <Shimmer className="h-5 w-36" delay={i * 0.06} />
                        <Shimmer className="mt-4 h-52 w-full rounded-lg" delay={i * 0.06} />
                    </div>
                ))}
            </div>
        </div>
    );
}
