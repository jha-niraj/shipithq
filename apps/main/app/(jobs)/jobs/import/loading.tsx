import { PageHeaderSkeleton, Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

/** Shaped like the paste page: header, then the form card (field, two choices, button). */
export default function Loading() {
    return (
        <div className="page-frame space-y-6 px-page py-6">
            <ShimmerStyles />
            <PageHeaderSkeleton action={false} />
            <div className="max-w-2xl space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="space-y-2"><Shimmer className="h-4 w-16" /><Shimmer className="h-36 w-full rounded-lg" delay={0.04} /><Shimmer className="h-3 w-64" delay={0.06} /></div>
                <div className="space-y-2">
                    <Shimmer className="h-4 w-40" delay={0.08} />
                    <div className="grid gap-2 sm:grid-cols-2"><Shimmer className="h-20 rounded-xl" delay={0.1} /><Shimmer className="h-20 rounded-xl" delay={0.12} /></div>
                </div>
                <Shimmer className="h-9 w-36 rounded-md" delay={0.14} />
            </div>
        </div>
    )
}
