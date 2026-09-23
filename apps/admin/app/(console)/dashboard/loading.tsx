// Hand-matched to the admin dashboard, in the order dashboard-client.tsx
// actually renders (ADM-27/ADM-28):
//
//   welcome header -> Quick Links strip (6 tiles) -> 4-cell StatBand ->
//   2 trend charts -> "Platform Overview" heading over 3 platform cards
//   (icon + title/desc + 2x2 sub-stat grid each) -> full-width pending actions
//
// The order matters more than the shapes: Quick Links moved from the bottom
// right of a 2-up row to the top of the page, so a skeleton still showing the
// old order would reorder itself in front of the user on every load - which is
// exactly the reflow the repo rule about matching skeletons exists to prevent.
//
// The chart placeholders are plain rectangles on purpose. A drawn axis with no
// line reads as a real chart reporting zero, which is a different and wrong
// claim from "this is still loading".
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export default function Loading() {
    return (
        <div className="w-full p-6 lg:p-8">
            <ShimmerStyles />

            <div className="mb-8 flex items-center gap-3">
                <Shimmer className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                    <Shimmer className="h-7 w-56" />
                    <Shimmer className="h-4 w-72" delay={0.06} />
                </div>
            </div>

            <div className="mb-8">
                <Shimmer className="mb-3 h-4 w-24" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Shimmer key={i} className="h-12 w-full rounded-lg" delay={i * 0.04} />
                    ))}
                </div>
            </div>

            <StatBandSkeleton count={4} cols={4} className="mb-8" />

            <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                        <Shimmer className="h-5 w-32" delay={i * 0.06} />
                        <Shimmer className="mt-2 h-3.5 w-40" delay={i * 0.06} />
                        <Shimmer className="mt-4 h-56 w-full rounded-lg" delay={i * 0.06} />
                    </div>
                ))}
            </div>

            <div className="mb-8">
                <Shimmer className="mb-4 h-5 w-36" />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                            <div className="mb-4 flex items-center gap-3">
                                <Shimmer className="h-12 w-12 rounded-xl" delay={i * 0.05} />
                                <div className="space-y-1.5">
                                    <Shimmer className="h-4.5 w-24" delay={i * 0.05} />
                                    <Shimmer className="h-3.5 w-32" delay={i * 0.05} />
                                </div>
                            </div>
                            <div className="mt-6 grid grid-cols-2 gap-4">
                                {Array.from({ length: 4 }).map((_, j) => (
                                    <div key={j} className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
                                        <Shimmer className="h-6 w-10" delay={i * 0.05 + j * 0.02} />
                                        <Shimmer className="mt-1.5 h-3 w-14" delay={i * 0.05 + j * 0.02} />
                                    </div>
                                ))}
                            </div>
                            <Shimmer className="mt-6 h-4 w-32" delay={i * 0.05} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                <Shimmer className="mb-4 h-5 w-36" />
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Shimmer key={i} className="h-14 w-full rounded-lg" delay={i * 0.06} />
                    ))}
                </div>
            </div>
        </div>
    )
}
