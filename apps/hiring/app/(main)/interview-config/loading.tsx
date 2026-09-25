// Hand-matched to interview-config-content.tsx: the page frame, PageHeader with
// two buttons, the three-cell StatBand, the search field, then one card per
// process (name + badges, description, round pills, jobs count and menu).
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
                    <Shimmer className="h-9 w-32 rounded-xl" delay={0.06} />
                    <Shimmer className="h-9 w-36 rounded-xl" delay={0.08} />
                </div>
            </div>

            <StatBandSkeleton count={3} cols={3} />

            <Shimmer className="h-9 w-full max-w-md rounded-xl" />

            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, s) => (
                    <div key={s} className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <div className="mb-2 flex items-center gap-3">
                                    <Shimmer className="h-6 w-56" delay={s * 0.08} />
                                    <Shimmer className="h-5 w-16 rounded-full" delay={s * 0.08} />
                                </div>
                                <Shimmer className="mb-4 h-4 w-3/4" delay={s * 0.08} />
                                <div className="flex flex-wrap gap-2">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <Shimmer key={i} className="h-8 w-32 rounded-lg" delay={s * 0.08 + i * 0.04} />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Shimmer className="hidden h-4 w-28 md:block" delay={s * 0.08} />
                                <Shimmer className="h-9 w-9 rounded-xl" delay={s * 0.08} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
