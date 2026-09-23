// Hand-matched to the project task board.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="max-w-4xl mx-auto py-6 px-4">
            <ShimmerStyles />

            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                    <Shimmer className="h-8 w-56" />
                    <Shimmer className="h-4 w-80" delay={0.06} />
                </div>
                <Shimmer className="h-10 w-36 rounded-xl" delay={0.12} />
            </div>

            {/* Progress card: heading + percentage, the bar, the three-count band, the milestones. */}
            <div className="mb-6 rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
                <div className="mb-4 flex items-center justify-between">
                    <div className="space-y-2">
                        <Shimmer className="h-5 w-24" />
                        <Shimmer className="h-4 w-44" delay={0.04} />
                    </div>
                    <Shimmer className="h-9 w-16" delay={0.06} />
                </div>
                <Shimmer className="mb-4 h-3 w-full rounded-full" delay={0.08} />
                <StatBandSkeleton count={3} cols={3} size="sm" />
                <div className="mt-4 flex justify-between">
                    {[0, 1, 2, 3].map((i) => (
                        <Shimmer key={i} className="h-3 w-16" delay={0.1 + i * 0.02} />
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, col) => (
                    <div key={col} className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
                        <div className="flex items-center justify-between px-1">
                            <Shimmer className="h-4 w-24" delay={col * 0.06} />
                            <Shimmer className="h-5 w-6 rounded-full" delay={col * 0.06} />
                        </div>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
                                <Shimmer className="h-4 w-4/5" delay={col * 0.06 + i * 0.04} />
                                <Shimmer className="mt-2 h-3 w-1/2" delay={col * 0.06 + i * 0.04} />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
