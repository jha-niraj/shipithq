// Hand-matched to company-page.tsx (plan/hiring-ui HU-11) on the About tab: the header
// card (cover, overlapping logo, name, tagline, facts, the tabs), then the overview
// cards beside the Details card.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="page-frame px-page py-6">
            <ShimmerStyles />
            <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <Shimmer className="h-40 w-full rounded-none sm:h-56" />
                <div className="px-5 sm:px-8">
                    <div className="-mt-12 flex items-end justify-between sm:-mt-16">
                        <Shimmer className="h-24 w-24 rounded-2xl border-4 border-white sm:h-32 sm:w-32 dark:border-neutral-900" />
                        <Shimmer className="mb-1 h-8 w-32 rounded-md" delay={0.04} />
                    </div>
                    <div className="mt-3 space-y-2">
                        <Shimmer className="h-7 w-48" />
                        <Shimmer className="h-4 w-80 max-w-full" delay={0.04} />
                        <Shimmer className="h-4 w-64 max-w-full" delay={0.06} />
                    </div>
                    <div className="mt-5 flex gap-4 pb-3">
                        {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-5 w-16" delay={0.08 + i * 0.03} />)}
                    </div>
                </div>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="space-y-6">
                    {[0, 1].map((c) => (
                        <div key={c} className="space-y-3 rounded-2xl border border-neutral-200 p-5 sm:p-6 dark:border-neutral-800">
                            <Shimmer className="h-5 w-28" delay={c * 0.06} />
                            {[0, 1, 2].map((i) => <Shimmer key={i} className="h-4 w-full" delay={c * 0.06 + i * 0.03} />)}
                        </div>
                    ))}
                </div>
                <div className="space-y-3 rounded-2xl border border-neutral-200 p-5 sm:p-6 dark:border-neutral-800">
                    <Shimmer className="h-5 w-20" />
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex gap-3"><Shimmer className="h-4 w-4" delay={i * 0.03} /><div className="flex-1 space-y-1"><Shimmer className="h-3 w-16" delay={i * 0.03} /><Shimmer className="h-4 w-32" delay={i * 0.03} /></div></div>
                    ))}
                </div>
            </div>
        </div>
    )
}
