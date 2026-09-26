import { PageHeaderSkeleton, Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

/** Shaped like the holding page: header with its action, then the job rows. */
export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />
            <PageHeaderSkeleton />
            <div className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                        <Shimmer className="h-9 w-9 shrink-0 rounded-lg" delay={i * 0.05} />
                        <div className="flex-1 space-y-1.5"><Shimmer className="h-4 w-56" delay={i * 0.05} /><Shimmer className="h-3.5 w-40" delay={i * 0.05} /></div>
                    </div>
                ))}
            </div>
        </div>
    )
}
