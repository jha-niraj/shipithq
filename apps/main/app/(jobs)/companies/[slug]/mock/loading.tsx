// Hand-matched to the company mock hub.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="w-full px-6 py-8">
            <ShimmerStyles />

            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                    <Shimmer className="h-8 w-56" />
                    <Shimmer className="h-4 w-80" delay={0.06} />
                </div>
                <Shimmer className="h-10 w-36 rounded-xl" delay={0.12} />
            </div>

            {/* The hub header's three-cell stat band (Sessions, Avg. Score, Rounds). */}
            <StatBandSkeleton count={3} cols={3} size="sm" className="mb-8" />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 p-5">
                        <div className="flex items-start justify-between">
                            <Shimmer className="h-11 w-11 rounded-xl" delay={i * 0.05} />
                            <Shimmer className="h-6 w-20 rounded-full" delay={i * 0.05} />
                        </div>
                        <Shimmer className="mt-4 h-5 w-3/4" delay={i * 0.05} />
                        <Shimmer className="mt-2 h-4 w-full" delay={i * 0.05} />
                        <Shimmer className="mt-1.5 h-4 w-5/6" delay={i * 0.05} />
                        <div className="mt-4 flex flex-wrap gap-1.5">
                            {[0, 1, 2].map((j) => (
                                <Shimmer key={j} className="h-5 w-14 rounded-md" delay={i * 0.05} />
                            ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                            <Shimmer className="h-3.5 w-24" delay={i * 0.05} />
                            <Shimmer className="h-3.5 w-16" delay={i * 0.05} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
