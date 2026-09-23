// Hand-matched to the Explore page (plan/projects, PJ-4 and PJ-8): the sticky
// header band with its tabs, the filter row, then a grid of cards. The inline
// skeleton inside the page covers the Ideas tab only, so Community and Mine
// painted nothing while they loaded.
//
// The band and the body carry their own padding, exactly as the real shell
// does, or the skeleton and the page disagree by a gutter on first paint.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="w-full pb-6">
            <ShimmerStyles />
            <div className="border-b border-neutral-200 px-page py-3 dark:border-neutral-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                        <Shimmer className="h-6 w-48" />
                        <Shimmer className="h-4 w-72" delay={0.05} />
                    </div>
                    <div className="flex items-center gap-2">
                        <Shimmer className="h-8 w-56 rounded-xl" delay={0.08} />
                        <Shimmer className="h-8 w-28 rounded-xl" delay={0.1} />
                    </div>
                </div>
            </div>
            <div className="space-y-5 px-page pt-5">
                <div className="flex flex-wrap gap-2">
                    <Shimmer className="h-8 w-56 rounded-xl" delay={0.12} />
                    <Shimmer className="h-8 w-32 rounded-xl" delay={0.14} />
                    <Shimmer className="h-8 w-32 rounded-xl" delay={0.16} />
                    <Shimmer className="h-8 w-32 rounded-xl" delay={0.18} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Shimmer key={i} className="h-60 rounded-2xl" delay={0.2 + i * 0.04} />
                    ))}
                </div>
            </div>
        </div>
    );
}
