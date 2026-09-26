// Hand-matched to browse-content.tsx (plan/ui-pass UI-12): the floating toolbar
// (icon, title and count, search, Filters, Spark on one row from lg), then
// JobCard's default layout - a 56px logo tile beside title and company, the
// meta row, the skill badges and the interview line. Also the page's Suspense
// fallback, so the two cannot disagree.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div>
            <ShimmerStyles />
            <div className="px-page pt-4">
                <div className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="flex shrink-0 items-center gap-3">
                            <Shimmer className="h-9 w-9 rounded-xl" />
                            <div className="space-y-1.5">
                                <Shimmer className="h-4 w-32" />
                                <Shimmer className="h-3 w-24" delay={0.04} />
                            </div>
                        </div>
                        <Shimmer className="h-9 min-w-0 flex-1 rounded-xl" delay={0.06} />
                        <div className="flex shrink-0 gap-2">
                            <Shimmer className="h-9 w-24 rounded-xl" delay={0.08} />
                            <Shimmer className="h-9 w-32 rounded-xl" delay={0.1} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4 px-page pt-5 pb-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex items-start gap-4">
                            <Shimmer className="h-11 w-11 shrink-0 rounded-xl sm:h-14 sm:w-14" delay={i * 0.04} />
                            <div className="min-w-0 flex-1">
                                <div className="mb-2 flex items-start justify-between gap-4">
                                    <div className="space-y-2">
                                        <Shimmer className="h-6 w-64" delay={i * 0.04} />
                                        <Shimmer className="h-4 w-32" delay={i * 0.04} />
                                    </div>
                                    <Shimmer className="h-6 w-16 rounded-full" delay={i * 0.04} />
                                </div>
                                <div className="mb-3 flex flex-wrap gap-3">
                                    {[0, 1, 2].map((j) => <Shimmer key={j} className="h-4 w-24" delay={i * 0.04} />)}
                                </div>
                                <div className="mb-3 flex flex-wrap gap-1.5">
                                    {[0, 1, 2].map((j) => <Shimmer key={j} className="h-5 w-16 rounded-md" delay={i * 0.04} />)}
                                </div>
                                <Shimmer className="h-4 w-48" delay={i * 0.04} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
