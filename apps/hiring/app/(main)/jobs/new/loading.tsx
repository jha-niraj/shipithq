// Hand-matched to job-form-content.tsx (plan/hiring-ui HU-5): the back link, the
// PageHeader, then the step list (a 15rem column on desktop, a row on phones) beside
// the step's cards, and the sticky action bar at the bottom.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="page-frame px-page pt-6">
            <ShimmerStyles />
            <Shimmer className="h-5 w-16" />
            <div className="mt-3 space-y-1.5">
                <Shimmer className="h-7 w-40" />
                <Shimmer className="h-4 w-72 max-w-full" delay={0.04} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
                <div className="flex gap-2 overflow-hidden lg:flex-col lg:gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex shrink-0 items-center gap-3 px-3 py-2.5">
                            <Shimmer className="h-7 w-7 rounded-full" delay={i * 0.04} />
                            <div className="space-y-1">
                                <Shimmer className="h-4 w-24" delay={i * 0.04} />
                                <Shimmer className="hidden h-3 w-32 lg:block" delay={i * 0.04} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="min-w-0 space-y-5 pb-4">
                    <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="mb-5 space-y-1.5">
                            <Shimmer className="h-5 w-56" />
                            <Shimmer className="h-4 w-full max-w-lg" delay={0.04} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Shimmer key={i} className="h-28 w-full rounded-xl" delay={0.08 + i * 0.04} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="sticky bottom-0 bleed-page mt-6 flex items-center justify-between border-t border-neutral-200 bg-white px-page py-3 dark:border-neutral-800 dark:bg-neutral-950">
                <Shimmer className="h-9 w-20 rounded-md" />
                <div className="flex gap-2">
                    <Shimmer className="h-9 w-28 rounded-md" delay={0.04} />
                    <Shimmer className="h-9 w-24 rounded-md" delay={0.08} />
                </div>
            </div>
        </div>
    );
}
