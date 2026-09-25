// Hand-matched to home-content.tsx: the page frame, PageHeader with two buttons,
// the four-cell StatBand, then the pipeline card (2 cols) beside a column of
// three cards (feature, getting started, pipeline health).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                    <Shimmer className="h-6 w-56" />
                    <Shimmer className="h-4 w-80 max-w-full" delay={0.04} />
                </div>
                <div className="flex gap-2">
                    <Shimmer className="h-9 w-36 rounded-xl" delay={0.06} />
                    <Shimmer className="h-9 w-36 rounded-xl" delay={0.08} />
                </div>
            </div>

            <StatBandSkeleton count={4} cols={4} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950 lg:col-span-2">
                    <div className="mb-6 flex items-center justify-between">
                        <Shimmer className="h-6 w-40" />
                        <Shimmer className="h-8 w-32 rounded-lg" delay={0.04} />
                    </div>
                    <Shimmer className="h-4 w-full rounded-full" delay={0.06} />
                    <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <Shimmer className="h-3 w-3 rounded-full" delay={i * 0.05} />
                                <div className="space-y-1.5">
                                    <Shimmer className="h-3 w-20" delay={i * 0.05} />
                                    <Shimmer className="h-5 w-8" delay={i * 0.05} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
                        <Shimmer className="h-5 w-24 rounded-full" />
                        <Shimmer className="mt-3 h-6 w-44" delay={0.04} />
                        <Shimmer className="mt-2 h-4 w-full" delay={0.06} />
                        <Shimmer className="mt-1.5 h-4 w-4/5" delay={0.06} />
                        <Shimmer className="mt-4 h-10 w-full rounded-xl" delay={0.08} />
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
                        <Shimmer className="h-6 w-36" />
                        <div className="mt-4 space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Shimmer className="h-4 w-4 rounded-full" delay={i * 0.05} />
                                    <Shimmer className="h-4 w-44" delay={i * 0.05} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex items-center gap-3">
                            <Shimmer className="h-8 w-8 rounded-lg" />
                            <Shimmer className="h-5 w-32" delay={0.04} />
                        </div>
                        <div className="mt-4 space-y-2">
                            <Shimmer className="h-4 w-full" delay={0.06} />
                            <Shimmer className="h-4 w-full" delay={0.08} />
                        </div>
                        <Shimmer className="mt-4 h-8 w-full rounded-xl" delay={0.1} />
                    </div>
                </div>
            </div>
        </div>
    );
}
