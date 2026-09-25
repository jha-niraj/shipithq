// Hand-matched to candidates-content.tsx: the page frame and PageHeader, then
// the rest as below.
//
// Counts and chrome come from the component itself: an 8-cell StatBand
// (cols 8, matching the real one), a toolbar of
// search + two 200/180px selects + the list/kanban segmented control, the
// "Select all" row, then the list rows - `viewMode` defaults to "list", so the
// six-column kanban is not what first paint shows. The header carries no action
// button; drawing one here would pop it away on hydration.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />

            <div className="space-y-1.5">
                <Shimmer className="h-6 w-32" />
                <Shimmer className="h-4 w-72 max-w-full" delay={0.04} />
            </div>

            <StatBandSkeleton count={8} cols={8} />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Shimmer className="h-9 flex-1 rounded-xl" />
                <Shimmer className="h-9 w-full rounded-xl sm:w-[200px]" delay={0.06} />
                <Shimmer className="h-9 w-full rounded-xl sm:w-[180px]" delay={0.09} />
                <div className="flex items-center gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
                    <Shimmer className="h-8 w-9 rounded-lg" delay={0.12} />
                    <Shimmer className="h-8 w-9 rounded-lg" delay={0.14} />
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-3 px-4 py-2">
                    <Shimmer className="h-4 w-4 rounded" />
                    <Shimmer className="h-4 w-20" delay={0.04} />
                </div>
                {Array.from({ length: 9 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                    >
                        <div className="flex items-center gap-4">
                            <Shimmer className="h-4 w-4 shrink-0 rounded" delay={i * 0.04} />
                            <Shimmer className="h-12 w-12 shrink-0 rounded-full" delay={i * 0.04} />
                            <div className="min-w-0 flex-1 space-y-2">
                                <Shimmer className="h-4 w-2/5" delay={i * 0.04} />
                                <Shimmer className="h-3 w-1/3" delay={i * 0.04} />
                            </div>
                            <Shimmer className="hidden h-6 w-24 shrink-0 rounded-full sm:block" delay={i * 0.04} />
                            <Shimmer className="h-8 w-8 shrink-0 rounded-lg" delay={i * 0.04} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
