// Hand-matched to the send page: back link and header, then choices left and the preview right.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />
            <Shimmer className="h-4 w-40" />
            <div className="space-y-2">
                <Shimmer className="h-7 w-72" delay={0.04} />
                <Shimmer className="h-4 w-96 max-w-full" delay={0.06} />
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
                <div className="space-y-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="space-y-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                            <Shimmer className="h-4 w-28" delay={0.08 + i * 0.03} />
                            <Shimmer className="h-9 w-full rounded-md" delay={0.1 + i * 0.03} />
                            <Shimmer className="h-9 w-full rounded-md" delay={0.12 + i * 0.03} />
                        </div>
                    ))}
                </div>
                <div className="space-y-4">
                    <Shimmer className="h-40 w-full rounded-2xl" delay={0.1} />
                    <Shimmer className="h-48 w-full rounded-2xl" delay={0.14} />
                    <Shimmer className="h-48 w-full rounded-2xl" delay={0.18} />
                </div>
            </div>
        </div>
    )
}
