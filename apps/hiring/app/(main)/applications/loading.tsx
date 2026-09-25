// Hand-matched to applications-content.tsx: the page frame, PageHeader (no
// actions), the four-cell StatBand, the search field, then "Applications by
// Job" and one card per job (icon, title, count, status badges, pipeline bar).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />

            <div className="space-y-1.5">
                <Shimmer className="h-6 w-36" />
                <Shimmer className="h-4 w-96 max-w-full" delay={0.04} />
            </div>

            <StatBandSkeleton count={4} cols={4} />

            <Shimmer className="h-9 w-full max-w-md rounded-xl" />

            <div className="space-y-4">
                <Shimmer className="h-6 w-48" />
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Shimmer className="h-12 w-12 rounded-xl" delay={i * 0.04} />
                                <div className="space-y-1.5">
                                    <Shimmer className="h-5 w-48" delay={i * 0.04} />
                                    <Shimmer className="h-4 w-32" delay={i * 0.04} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Shimmer className="hidden h-5 w-16 rounded-full sm:block" delay={i * 0.04} />
                                <Shimmer className="hidden h-5 w-20 rounded-full sm:block" delay={i * 0.04} />
                                <Shimmer className="h-5 w-5 rounded" delay={i * 0.04} />
                            </div>
                        </div>
                        <Shimmer className="mt-4 h-2 w-full rounded-full" delay={i * 0.04} />
                    </div>
                ))}
            </div>
        </div>
    );
}
