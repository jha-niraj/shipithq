// Hand-matched to the university verification queue - same shape as the
// company verification skeleton, see the note there (ADM-22).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export default function Loading() {
    return (
        <div className="p-6">
            <ShimmerStyles />
            <div className="w-full mx-auto">
                <Shimmer className="mb-4 h-4 w-44" />
                <div className="mb-8 space-y-2">
                    <Shimmer className="h-7 w-56" />
                    <Shimmer className="h-4 w-72" delay={0.06} />
                </div>

                <StatBandSkeleton count={3} cols={3} className="mb-8" />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-5">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <Shimmer className="h-12 w-12 shrink-0 rounded-xl" delay={i * 0.05} />
                                    <div className="space-y-1.5">
                                        <Shimmer className="h-4 w-28" delay={i * 0.05} />
                                        <Shimmer className="h-3 w-20" delay={i * 0.05} />
                                    </div>
                                </div>
                                <Shimmer className="h-5 w-16 rounded-full" delay={i * 0.05} />
                            </div>
                            <div className="mb-4 grid grid-cols-2 gap-3">
                                {Array.from({ length: 4 }).map((_, j) => (
                                    <Shimmer key={j} className="h-3.5 w-24" delay={i * 0.05 + j * 0.02} />
                                ))}
                            </div>
                            <div className="flex items-center justify-between border-t border-neutral-100 pt-4 dark:border-neutral-800">
                                <Shimmer className="h-3 w-24" delay={i * 0.05} />
                                <div className="flex gap-2">
                                    <Shimmer className="h-7 w-16 rounded-lg" delay={i * 0.05} />
                                    <Shimmer className="h-7 w-16 rounded-lg" delay={i * 0.05} />
                                    <Shimmer className="h-7 w-20 rounded-lg" delay={i * 0.05} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
