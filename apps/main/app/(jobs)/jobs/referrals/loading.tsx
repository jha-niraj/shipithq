// Hand-matched to components/referrals/referrals-view.tsx: the page header, the two
// tabs, then rows (title and company, the status line, a button on the right).
import { PageHeaderSkeleton, Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="page-frame space-y-6 px-page py-6">
            <ShimmerStyles />
            <PageHeaderSkeleton action={false} />
            <Shimmer className="h-9 w-64 rounded-lg" delay={0.04} />
            <div className="space-y-2.5">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex-1 space-y-1.5"><Shimmer className="h-4 w-64 max-w-full" delay={i * 0.05} /><Shimmer className="h-3.5 w-48" delay={i * 0.05} /></div>
                        <Shimmer className="hidden h-8 w-24 rounded-md sm:block" delay={i * 0.05} />
                    </div>
                ))}
            </div>
        </div>
    )
}
