// Hand-matched to the practice hub (module cards + progress).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="w-full mx-auto px-page py-6">
            <ShimmerStyles />

            {/* Full width, like the hub itself: the skeleton used to be capped at
                max-w-6xl and the page jumped wider when it landed. */}
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                    <Shimmer className="h-8 w-56" />
                    <Shimmer className="h-4 w-80" delay={0.06} />
                </div>
                <Shimmer className="h-10 w-36 rounded-xl" delay={0.12} />
            </div>

            <StatBandSkeleton count={4} cols={4} className="mb-8" />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
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

            {/* The activity chart and the difficulty breakdown under the modules. */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 lg:col-span-2 dark:border-neutral-800 dark:bg-neutral-900">
                    <Shimmer className="h-4 w-40" delay={0.2} />
                    <Shimmer className="mt-4 h-44 w-full rounded-lg" delay={0.24} />
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <Shimmer className="h-4 w-28" delay={0.2} />
                    <div className="mt-4 space-y-3">
                        {[0, 1, 2].map((i) => <Shimmer key={i} className="h-6 w-full" delay={0.24 + i * 0.04} />)}
                    </div>
                </div>
            </div>
        </div>
    );
}
