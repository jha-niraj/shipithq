// Hand-matched to the Hiring overview: header with no action button, a 4-cell
// StatBand, and a 2-up grid of module cards (icon/title/desc + a 2-stat sub-
// grid each) - not 4 module cards with a 3-tag row, which is what the
// previous skeleton assumed before the dead Jobs/Members/Applications/
// Invitations/Analytics cards were removed this session (ADM-22).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export default function Loading() {
    return (
        <div className="p-6">
            <ShimmerStyles />
            <div className="w-full mx-auto">
                <div className="mb-8 flex items-center gap-3">
                    <Shimmer className="h-10 w-10 rounded-xl" />
                    <div className="space-y-2">
                        <Shimmer className="h-8 w-44" />
                        <Shimmer className="h-4 w-56" delay={0.06} />
                    </div>
                </div>

                <StatBandSkeleton count={4} cols={4} className="mb-8" />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 p-5">
                            <div className="mb-3 flex items-center gap-3">
                                <Shimmer className="h-10 w-10 rounded-lg" delay={i * 0.06} />
                                <div className="space-y-1.5">
                                    <Shimmer className="h-4 w-28" delay={i * 0.06} />
                                    <Shimmer className="h-3 w-36" delay={i * 0.06} />
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                {Array.from({ length: 2 }).map((_, j) => (
                                    <div key={j} className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 p-2">
                                        <Shimmer className="h-5 w-10" delay={i * 0.06 + j * 0.02} />
                                        <Shimmer className="mt-1.5 h-2.5 w-14" delay={i * 0.06 + j * 0.02} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
