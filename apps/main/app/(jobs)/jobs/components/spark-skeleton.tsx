import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

/*
 * The Spark page's skeleton (plan/ui-pass UI-12), shaped like the real deck in
 * `swipe-card.tsx`: a max-w-3xl card centred in a viewport-tall box, with the
 * one-line intro above it. Used by `/jobs` and `/jobs/spark` loading files and
 * as their Suspense fallbacks, so the three cannot drift apart.
 */
export function SparkDeckSkeleton() {
    return (
        <div className="relative mx-auto flex h-[calc(100dvh-16rem)] min-h-[540px] w-full max-w-3xl items-center justify-center pb-16">
            <div className="w-full overflow-hidden rounded-3xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="p-8">
                    <div className="flex items-start gap-5">
                        <Shimmer className="h-20 w-20 shrink-0 rounded-2xl" />
                        <div className="min-w-0 flex-1 space-y-2.5 pt-1">
                            <Shimmer className="h-7 w-3/5" delay={0.05} />
                            <Shimmer className="h-5 w-1/3" delay={0.08} />
                        </div>
                    </div>
                    <div className="mt-7 space-y-2">
                        <Shimmer className="h-4 w-full" delay={0.12} />
                        <Shimmer className="h-4 w-4/5" delay={0.14} />
                    </div>
                    <div className="mt-7 grid grid-cols-2 gap-x-8 gap-y-4">
                        {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-5 w-2/3" delay={0.18 + i * 0.03} />)}
                    </div>
                    <div className="mt-7 flex flex-wrap gap-2">
                        {[0, 1, 2].map((i) => <Shimmer key={i} className="h-7 w-20 rounded-full" delay={0.3 + i * 0.03} />)}
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                        <Shimmer className="h-5 w-28" delay={0.4} />
                        <Shimmer className="h-5 w-24" delay={0.42} />
                    </div>
                </div>
                <div className="flex items-center justify-center gap-6 border-t border-neutral-100 py-5 dark:border-neutral-800">
                    <Shimmer className="h-16 w-16 rounded-full" delay={0.45} />
                    <Shimmer className="h-12 w-12 rounded-full" delay={0.47} />
                    <Shimmer className="h-16 w-16 rounded-full" delay={0.49} />
                </div>
            </div>
        </div>
    )
}

export function SparkSkeleton() {
    return (
        <div className="page-frame px-page py-4 max-lg:overflow-x-clip">
            <ShimmerStyles />
            <div className="mb-4 flex items-center justify-between gap-3">
                <Shimmer className="h-4 w-60" />
                <Shimmer className="h-8 w-24 rounded-lg" delay={0.05} />
            </div>
            <SparkDeckSkeleton />
        </div>
    )
}
