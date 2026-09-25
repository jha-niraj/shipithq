// Hand-matched to jobs-content.tsx: the page frame, PageHeader with one button,
// the six-cell StatBand, the search/status/view-toggle bar, then the job list
// (list view is the default) - so nothing reflows when the real content mounts.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                    <Shimmer className="h-6 w-36" />
                    <Shimmer className="h-4 w-72 max-w-full" delay={0.04} />
                </div>
                <Shimmer className="h-9 w-40 rounded-xl" delay={0.06} />
            </div>

            <StatBandSkeleton count={6} cols={6} />

            <div className="flex flex-col gap-4 sm:flex-row">
                <Shimmer className="h-9 flex-1 rounded-xl" />
                <Shimmer className="h-9 w-full rounded-xl sm:w-[160px]" delay={0.04} />
                <Shimmer className="h-10 w-20 rounded-xl" delay={0.06} />
            </div>

            <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                        <div className="flex items-center gap-3">
                            <Shimmer className="h-6 w-56" delay={i * 0.05} />
                            <Shimmer className="h-5 w-16 rounded-full" delay={i * 0.05} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4">
                            {Array.from({ length: 4 }).map((__, j) => (
                                <Shimmer key={j} className="h-4 w-24" delay={i * 0.05} />
                            ))}
                        </div>
                        <Shimmer className="mt-3 h-3 w-32" delay={i * 0.05} />
                    </div>
                ))}
            </div>
        </div>
    );
}
