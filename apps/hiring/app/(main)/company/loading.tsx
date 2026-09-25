// Hand-matched to company-content.tsx - same wrapper, same grids, same card chrome, so
// nothing reflows when the real content mounts.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                    <Shimmer className="h-6 w-44" />
                    <Shimmer className="h-4 w-80 max-w-full" delay={0.04} />
                </div>
                <div className="flex gap-2">
                    <Shimmer className="h-9 w-40 rounded-xl" delay={0.06} />
                    <Shimmer className="h-9 w-32 rounded-xl" delay={0.08} />
                </div>
            </div>

            {/* Cover banner; the logo overhangs it by 40px, hence the band's mt-16. */}
            <div className="relative">
                <Shimmer className="h-48 w-full rounded-2xl lg:h-64" />
                <div className="absolute -bottom-10 left-8 h-28 w-28 overflow-hidden rounded-2xl border-4 border-white bg-white dark:border-neutral-900 dark:bg-neutral-900">
                    <Shimmer className="h-full w-full rounded-xl" delay={0.06} />
                </div>
            </div>

            <StatBandSkeleton count={4} cols={4} className="!mt-16" />

            <div className="space-y-6">
                <Shimmer className="h-10 w-[30rem] max-w-full rounded-xl" />
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="grid gap-6 md:grid-cols-2">
                        {Array.from({ length: 2 }).map((_, c) => (
                            <div key={c} className="space-y-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <Shimmer className="h-4 w-28" delay={c * 0.08 + i * 0.04} />
                                        <Shimmer className="h-5 w-48" delay={c * 0.08 + i * 0.04} />
                                    </div>
                                ))}
                            </div>
                        ))}
                        <div className="space-y-2 md:col-span-2">
                            <Shimmer className="h-4 w-24" />
                            <Shimmer className="h-4 w-full" />
                            <Shimmer className="h-4 w-4/5" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
