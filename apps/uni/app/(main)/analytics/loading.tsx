// Hand-matched to analytics: same min-h-full p-6 lg:p-8 wrapper, same grids and
// card chrome, so nothing reflows when the real content mounts.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="min-h-full p-6 lg:p-8">
            <ShimmerStyles />

            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                    <Shimmer className="h-8 w-56" />
                    <Shimmer className="h-4 w-80" delay={0.06} />
                </div>
                <Shimmer className="h-10 w-36 rounded-xl" delay={0.12} />
            </div>

            <StatBandSkeleton count={4} cols={4} className="mb-8" />

            <div className="grid gap-6 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                        <Shimmer className="h-5 w-36" delay={i * 0.06} />
                        <Shimmer className="mt-4 h-56 w-full rounded-lg" delay={i * 0.06} />
                    </div>
                ))}
            </div>
        </div>
    );
}
