// Hand-matched to applications-content.tsx (plan/ui-pass UI-13): the page frame,
// one header row (back, title and count; status tabs and view toggle on the
// right), the four-cell StatBand, then the compact rows - a 40px tile, title,
// company and the status pill, then the meta line with the small actions at its end.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="page-frame min-h-full px-page py-5">
            <ShimmerStyles />

            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                    <Shimmer className="h-8 w-8 rounded-lg" />
                    <div className="space-y-1.5">
                        <Shimmer className="h-5 w-40" />
                        <Shimmer className="h-4 w-16" delay={0.04} />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Shimmer className="h-9 w-[18.375rem] rounded-xl" delay={0.08} />
                    <Shimmer className="h-9 w-[4.375rem] rounded-xl" delay={0.1} />
                </div>
            </div>

            <StatBandSkeleton count={4} cols={4} className="mb-4" />

            <div className="space-y-2.5">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex items-start gap-3">
                            <Shimmer className="h-10 w-10 shrink-0 rounded-lg" delay={i * 0.04} />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1.5">
                                        <Shimmer className="h-4 w-56" delay={i * 0.04} />
                                        <Shimmer className="h-4 w-28" delay={i * 0.04} />
                                    </div>
                                    <Shimmer className="h-6 w-24 rounded-full" delay={i * 0.04} />
                                </div>
                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                    <Shimmer className="h-3 w-72 max-w-full" delay={i * 0.04} />
                                    <div className="flex gap-1.5">
                                        <Shimmer className="h-8 w-24 rounded-lg" delay={i * 0.04} />
                                        <Shimmer className="h-8 w-20 rounded-lg" delay={i * 0.04} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
