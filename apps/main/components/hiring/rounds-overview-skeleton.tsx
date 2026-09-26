import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

/** Shaped like RoundsOverviewView: back link, PageHeader, and one card per round. */
export function RoundsOverviewSkeleton() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />
            <Shimmer className="h-4 w-32" />
            <div className="space-y-1.5"><Shimmer className="h-6 w-72" /><Shimmer className="h-4 w-96 max-w-full" delay={0.04} /></div>
            <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 dark:border-neutral-800 dark:bg-neutral-900">
                        <Shimmer className="h-9 w-9 shrink-0 rounded-full" delay={i * 0.05} />
                        <div className="flex-1 space-y-2">
                            <Shimmer className="h-5 w-56" delay={i * 0.05} />
                            <Shimmer className="h-4 w-72 max-w-full" delay={i * 0.05} />
                            <Shimmer className="h-4 w-full max-w-lg" delay={i * 0.05} />
                        </div>
                        <Shimmer className="hidden h-8 w-24 rounded-md sm:block" delay={i * 0.05} />
                    </div>
                ))}
            </div>
        </div>
    )
}
