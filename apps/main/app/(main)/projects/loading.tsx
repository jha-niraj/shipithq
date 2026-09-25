// Hand-matched to the rewritten ProjectsHubClient: a header row, the "next up"
// card, a 4-up stat row, then the in-progress grid and the catalogue strip.
//
// The old skeleton mirrored a marketing hero, a full-bleed stat band and three
// alternating sections, because that is what the page used to be (PRJ-7). A
// skeleton that no longer matches is worse than none - the page visibly reflows
// the moment the data lands.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="page-frame px-page py-6">
            <ShimmerStyles />

            {/* Header: title + subtitle on the left, two buttons on the right. */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                    <Shimmer className="h-6 w-40" />
                    <Shimmer className="h-4 w-72" delay={0.04} />
                </div>
                <div className="flex items-center gap-2">
                    <Shimmer className="h-8 w-32 rounded-md" delay={0.06} />
                    <Shimmer className="h-8 w-32 rounded-md" delay={0.08} />
                </div>
            </div>

            {/* "Next up" card. */}
            <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                        <Shimmer className="h-3 w-16" delay={0.1} />
                        <Shimmer className="h-5 w-64" delay={0.12} />
                        <Shimmer className="h-4 w-48" delay={0.14} />
                    </div>
                    <Shimmer className="h-9 w-28 rounded-md" delay={0.16} />
                </div>
            </div>

            {/* Four-cell stat band. */}
            <StatBandSkeleton count={4} cols={4} className="mb-6" />

            {/* In progress. */}
            <div className="mb-8">
                <div className="mb-3 flex items-baseline justify-between">
                    <Shimmer className="h-5 w-28" delay={0.28} />
                    <Shimmer className="h-4 w-24" delay={0.3} />
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <ProjectCardShimmer key={i} delay={0.32 + i * 0.03} />
                    ))}
                </div>
            </div>

            {/* Catalogue strip. */}
            <div>
                <div className="mb-3 flex items-baseline justify-between">
                    <Shimmer className="h-5 w-36" delay={0.42} />
                    <Shimmer className="h-4 w-20" delay={0.44} />
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <ProjectCardShimmer key={i} delay={0.46 + i * 0.03} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function ProjectCardShimmer({ delay }: { delay: number }) {
    return (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-start justify-between gap-3">
                <Shimmer className="h-4 w-40" delay={delay} />
                <Shimmer className="h-5 w-16 rounded-full" delay={delay + 0.01} />
            </div>
            <Shimmer className="mt-2 h-3 w-full" delay={delay + 0.02} />
            <Shimmer className="mt-1.5 h-3 w-2/3" delay={delay + 0.03} />
            <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between">
                    <Shimmer className="h-3 w-24" delay={delay + 0.04} />
                    <Shimmer className="h-3 w-8" delay={delay + 0.05} />
                </div>
                <Shimmer className="h-1.5 w-full rounded-full" delay={delay + 0.06} />
            </div>
        </div>
    );
}
