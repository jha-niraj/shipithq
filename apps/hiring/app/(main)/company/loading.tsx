// Hand-matched to company-content.tsx - same wrapper, same grids, same card chrome, so
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

            {/* Cover banner (the logo overhangs it by 40px, hence the band's mt-16). */}
            <Shimmer className="mb-8 h-48 w-full rounded-2xl lg:h-64" />

            <StatBandSkeleton count={4} cols={4} className="mt-16 mb-8" />

            <div className="mb-6 flex flex-wrap gap-2 border-b border-neutral-200 pb-2 dark:border-neutral-800">
                {Array.from({ length: 9 }).map((_, i) => (
                    <Shimmer key={i} className="h-9 w-28 rounded-lg" delay={i * 0.05} />
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-6 md:col-span-2">
                    {Array.from({ length: 2 }).map((_, s) => (
                        <div key={s} className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                            <Shimmer className="h-5 w-40" delay={s * 0.08} />
                            <div className="mt-5 space-y-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <Shimmer className="h-3.5 w-28" delay={s * 0.08 + i * 0.04} />
                                        <Shimmer className="h-10 w-full rounded-lg" delay={s * 0.08 + i * 0.04} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                    <Shimmer className="mx-auto h-20 w-20 rounded-2xl" />
                    <Shimmer className="mx-auto mt-4 h-5 w-32" delay={0.06} />
                    <Shimmer className="mx-auto mt-2 h-3.5 w-40" delay={0.08} />
                    <Shimmer className="mt-6 h-10 w-full rounded-lg" delay={0.12} />
                </div>
            </div>
        </div>
    );
}
