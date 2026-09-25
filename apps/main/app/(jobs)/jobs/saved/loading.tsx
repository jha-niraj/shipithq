// Hand-matched to saved jobs.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="page-frame min-h-full px-page py-4">
            <ShimmerStyles />

            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                    <Shimmer className="h-8 w-56" />
                    <Shimmer className="h-4 w-80" delay={0.06} />
                </div>
                <Shimmer className="h-10 w-36 rounded-xl" delay={0.12} />
            </div>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
                <Shimmer className="h-10 flex-1 rounded-lg" />
                <Shimmer className="h-10 w-full rounded-lg sm:w-44" delay={0.06} />
            </div>

            <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 p-4">
                        <Shimmer className="h-11 w-11 shrink-0 rounded-xl" delay={i * 0.04} />
                        <div className="min-w-0 flex-1 space-y-2">
                            <Shimmer className="h-4 w-2/5" delay={i * 0.04} />
                            <Shimmer className="h-3 w-1/3" delay={i * 0.04} />
                        </div>
                        <Shimmer className="hidden h-6 w-20 shrink-0 rounded-full sm:block" delay={i * 0.04} />
                        <Shimmer className="h-8 w-8 shrink-0 rounded-lg" delay={i * 0.04} />
                    </div>
                ))}
            </div>
        </div>
    );
}
