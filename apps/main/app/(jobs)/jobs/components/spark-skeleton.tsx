import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

/*
 * Spark's skeleton (plan/jobs JB-18), shaped like `SparkPanel` block for block:
 * - the header
 * - the three-cell stat strip
 * - the Role, Skills, Process and About sections (label row over band)
 * - the footer
 * It is used by the `/jobs` and `/jobs/spark` loading files, their Suspense
 * fallbacks and Spark's own "loading more", so none of them can drift from the
 * panel.
 */

function SectionSkeleton({ delay, band }: { delay: number; band: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-2 px-1 pt-5 pb-2.5">
                <Shimmer className="h-3.5 w-3.5 rounded" delay={delay} />
                <Shimmer className="h-3 w-20" delay={delay} />
            </div>
            <div className="border-y border-neutral-200 bg-neutral-50 px-4 py-3.5 dark:border-neutral-800 dark:bg-neutral-800/40">
                {band}
            </div>
        </div>
    )
}

export function SparkPanelSkeleton() {
    return (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-start gap-4 border-b border-neutral-200 px-4 py-4 sm:px-6 sm:py-5 dark:border-neutral-800">
                <Shimmer className="h-11 w-11 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                    <Shimmer className="h-5 w-3/5" delay={0.03} />
                    <Shimmer className="h-4 w-1/3" delay={0.05} />
                </div>
                <Shimmer className="h-8 w-20 rounded-lg" delay={0.06} />
            </div>

            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                <div className="grid grid-cols-1 divide-y divide-neutral-200 border-b border-neutral-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-neutral-800 dark:border-neutral-800">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-2 px-1 py-4 sm:px-5 sm:first:pl-1">
                            <Shimmer className="h-5 w-32" delay={0.08 + i * 0.02} />
                        </div>
                    ))}
                </div>
                <SectionSkeleton
                    delay={0.14}
                    band={
                        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                            {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-5 w-3/4" delay={0.16 + i * 0.02} />)}
                        </div>
                    }
                />
                <SectionSkeleton
                    delay={0.24}
                    band={
                        <div className="flex flex-wrap gap-1.5">
                            {[0, 1, 2, 3, 4].map((i) => <Shimmer key={i} className="h-6 w-16 rounded-md" delay={0.26 + i * 0.02} />)}
                        </div>
                    }
                />
                <SectionSkeleton
                    delay={0.36}
                    band={
                        <div className="flex flex-wrap gap-1.5">
                            {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-6 w-20 rounded-md" delay={0.38 + i * 0.02} />)}
                        </div>
                    }
                />
                <SectionSkeleton
                    delay={0.46}
                    band={
                        <div className="space-y-2">
                            <Shimmer className="h-4 w-full" delay={0.48} />
                            <Shimmer className="h-4 w-11/12" delay={0.5} />
                            <Shimmer className="h-4 w-4/5" delay={0.52} />
                        </div>
                    }
                />
            </div>

            <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-neutral-800">
                <Shimmer className="order-2 h-9 w-full rounded-lg sm:order-1 sm:w-32" delay={0.56} />
                <div className="order-1 flex items-center justify-center gap-2 sm:order-2">
                    <Shimmer className="h-4 w-14" delay={0.58} />
                    <Shimmer className="h-9 w-9 rounded-lg" delay={0.6} />
                    <Shimmer className="h-9 w-9 rounded-lg" delay={0.62} />
                </div>
                <Shimmer className="order-3 hidden h-9 w-24 rounded-lg sm:block" delay={0.64} />
            </div>
        </div>
    )
}

export function SparkSkeleton() {
    return (
        <div className="page-frame px-page py-4">
            <ShimmerStyles />
            <div className="mb-4 flex items-center justify-between gap-3">
                <Shimmer className="h-4 w-72" />
                <Shimmer className="h-8 w-24 rounded-lg" delay={0.05} />
            </div>
            <div className="mx-auto w-full max-w-4xl">
                <SparkPanelSkeleton />
                <div className="mt-3 hidden justify-center lg:flex">
                    <Shimmer className="h-4 w-96" delay={0.66} />
                </div>
            </div>
        </div>
    )
}
