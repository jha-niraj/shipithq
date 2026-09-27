// Hand-matched to the candidates index: header, the stat band, then one row per role.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />
            <div className="space-y-2">
                <Shimmer className="h-7 w-40" />
                <Shimmer className="h-4 w-96 max-w-full" delay={0.04} />
            </div>
            <StatBandSkeleton count={4} cols={4} />
            <div className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                        <div className="flex-1 space-y-1.5">
                            <Shimmer className="h-4 w-56" delay={0.08 + i * 0.03} />
                            <Shimmer className="h-3 w-40" delay={0.1 + i * 0.03} />
                        </div>
                        <Shimmer className="h-4 w-36" delay={0.12 + i * 0.03} />
                    </div>
                ))}
            </div>
        </div>
    )
}
