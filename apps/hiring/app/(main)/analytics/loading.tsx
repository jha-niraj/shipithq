// Hand-matched to analytics-content.tsx: the page frame, PageHeader (no
// actions), the six-cell StatBand, the pipeline bars (2 cols) beside Top Jobs,
// then the Team Performance card.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />

            <div className="space-y-1.5">
                <Shimmer className="h-6 w-28" />
                <Shimmer className="h-4 w-72 max-w-full" delay={0.04} />
            </div>

            <StatBandSkeleton count={6} cols={6} />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950 lg:col-span-2">
                    <Shimmer className="mb-6 h-6 w-36" />
                    <div className="space-y-4">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Shimmer className="h-4 w-24" delay={i * 0.04} />
                                <Shimmer className="h-8 flex-1 rounded-lg" delay={i * 0.04} />
                                <Shimmer className="h-4 w-12" delay={i * 0.04} />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="mb-6 flex items-center justify-between">
                        <Shimmer className="h-6 w-24" />
                        <Shimmer className="h-4 w-16" delay={0.04} />
                    </div>
                    <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Shimmer className="h-8 w-8 rounded-lg" delay={i * 0.05} />
                                <div className="flex-1 space-y-1.5">
                                    <Shimmer className="h-4 w-3/4" delay={i * 0.05} />
                                    <Shimmer className="h-3 w-1/2" delay={i * 0.05} />
                                </div>
                                <Shimmer className="h-5 w-14 rounded-full" delay={i * 0.05} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                <Shimmer className="mb-6 h-6 w-44" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-900">
                            <div className="mb-3 flex items-center gap-3">
                                <Shimmer className="h-10 w-10 rounded-full" delay={i * 0.05} />
                                <div className="space-y-1.5">
                                    <Shimmer className="h-4 w-24" delay={i * 0.05} />
                                    <Shimmer className="h-3 w-16" delay={i * 0.05} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Shimmer className="h-14 rounded-lg" delay={i * 0.05} />
                                <Shimmer className="h-14 rounded-lg" delay={i * 0.05} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
