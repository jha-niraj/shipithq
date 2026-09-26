// Matches request-company-content.tsx: back link, PageHeader, the search card
// on the left, and "Your requests" plus "How it works" on the right.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />
            <Shimmer className="h-4 w-24" />
            <div className="space-y-1.5">
                <Shimmer className="h-6 w-48" />
                <Shimmer className="h-4 w-96 max-w-full" delay={0.04} />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <Shimmer className="mb-2 h-4 w-44" />
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Shimmer className="h-10 flex-1 rounded-md" delay={0.05} />
                        <Shimmer className="h-10 w-24 rounded-md" delay={0.08} />
                    </div>
                    <Shimmer className="mt-2 h-3 w-72 max-w-full" delay={0.1} />
                </div>
                <div className="space-y-4">
                    <div className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800"><Shimmer className="h-4 w-28" /></div>
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="space-y-1.5 px-4 py-3"><Shimmer className="h-4 w-32" delay={i * 0.05} /><Shimmer className="h-3 w-20" delay={i * 0.05} /></div>
                        ))}
                    </div>
                    <div className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                        <Shimmer className="h-4 w-28" />
                        {[0, 1, 2].map((i) => <Shimmer key={i} className="h-3 w-full" delay={0.1 + i * 0.03} />)}
                    </div>
                </div>
            </div>
        </div>
    )
}
