// Matches `goal-preview-content.tsx`: the sticky bar with the button, then a centred
// column: the title block, overview, a 3-cell StatBand and the day cards.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export default function Loading() {
    return (
        <div className="w-full pb-10">
            <ShimmerStyles />
            <div className="flex items-center gap-3 border-b border-neutral-200 px-page py-3 dark:border-neutral-800">
                <Shimmer className="h-4 w-16" />
                <Shimmer className="h-4 flex-1 max-w-xs" delay={0.04} />
                <Shimmer className="ml-auto h-9 w-40 rounded-full" delay={0.06} />
            </div>
            <div className="mx-auto w-full max-w-4xl px-page pt-8">
                <div className="flex items-start gap-4">
                    <Shimmer className="size-14 shrink-0 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                        <Shimmer className="h-7 w-2/3" delay={0.05} />
                        <Shimmer className="h-4 w-1/2" delay={0.08} />
                    </div>
                </div>
                <Shimmer className="mt-5 h-4 w-full" delay={0.1} />
                <Shimmer className="mt-2 h-4 w-4/5" delay={0.12} />
                <StatBandSkeleton count={3} cols={3} className="mt-6" />
                <div className="mt-8 space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-neutral-200 dark:border-neutral-800">
                            <div className="border-b border-neutral-200 px-4 py-2 dark:border-neutral-800"><Shimmer className="h-3 w-12" delay={i * 0.04} /></div>
                            {Array.from({ length: 3 }).map((_, j) => (
                                <div key={j} className="px-4 py-3"><Shimmer className="h-4 w-2/3" delay={i * 0.04 + j * 0.02} /></div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
