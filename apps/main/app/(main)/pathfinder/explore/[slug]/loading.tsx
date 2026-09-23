// Matches `goal-preview-content.tsx`: full-width pane, header row, a 3-cell StatBand,
// a progress bar, the Copy button, then a 2-up study plan grid.
//
// It was `max-w-3xl mx-auto p-6` with a `lg:grid-cols-3` block - the centred
// column the preview used to have and a grid shape it never had. The preview is
// now `w-full`, so the old skeleton narrowed the pane and then jumped wide.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export default function Loading() {
    return (
        <div className="h-full w-full overflow-hidden p-6">
            <ShimmerStyles />

            <div className="flex items-start gap-4">
                <Shimmer className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                    <Shimmer className="h-8 w-2/3" delay={0.05} />
                    <div className="flex items-center gap-2">
                        <Shimmer className="h-5 w-24" delay={0.08} />
                        <Shimmer className="h-5 w-20" delay={0.1} />
                    </div>
                </div>
            </div>

            <Shimmer className="mt-4 h-4 w-3/4" delay={0.12} />

            <StatBandSkeleton count={3} cols={3} className="mt-5" />

            <Shimmer className="mt-4 h-1.5 w-full rounded-full" delay={0.2} />
            <Shimmer className="mt-4 h-10 w-44 rounded-lg" delay={0.22} />

            <Shimmer className="mt-8 h-5 w-48" delay={0.24} />
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                        <div className="flex items-start gap-3">
                            <Shimmer className="h-8 w-8 shrink-0 rounded-lg" delay={i * 0.04} />
                            <div className="min-w-0 flex-1 space-y-2">
                                <Shimmer className="h-4 w-3/4" delay={i * 0.04} />
                                <Shimmer className="h-3 w-full" delay={i * 0.04} />
                                <div className="flex gap-1.5 pt-1">
                                    <Shimmer className="h-5 w-12 rounded-full" delay={i * 0.04} />
                                    <Shimmer className="h-5 w-10 rounded-full" delay={i * 0.04} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
