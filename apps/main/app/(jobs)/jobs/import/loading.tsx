import { PageHeaderSkeleton, Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

/** Shaped like the paste page: "How it works" on the left; the link form, then "Your imports", on the right. */
export default function Loading() {
    return (
        <div className="page-frame space-y-6 px-page py-6">
            <ShimmerStyles />
            <PageHeaderSkeleton action={false} />
            <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,44rem)] lg:items-start">
                <div className="space-y-6">
                    <Shimmer className="h-4 w-28" />
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3">
                            <Shimmer className="h-7 w-7 shrink-0 rounded-full" delay={i * 0.04} />
                            <div className="flex-1 space-y-1.5"><Shimmer className="h-4 w-32" delay={i * 0.04} /><Shimmer className="h-3 w-full" delay={i * 0.04 + 0.02} /></div>
                        </div>
                    ))}
                </div>
                <div className="space-y-6">
                    <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="space-y-2"><Shimmer className="h-4 w-24" /><Shimmer className="h-9 w-full rounded-md" delay={0.04} /><Shimmer className="h-3 w-64" delay={0.06} /></div>
                        <Shimmer className="h-3 w-full" delay={0.08} />
                        <Shimmer className="h-9 w-32 rounded-md" delay={0.1} />
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="border-b border-neutral-200 px-5 py-3 dark:border-neutral-800"><Shimmer className="h-4 w-28" /></div>
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-3">
                                <Shimmer className="h-8 w-8 shrink-0 rounded-lg" delay={i * 0.04} />
                                <div className="flex-1 space-y-1.5"><Shimmer className="h-4 w-2/3" delay={i * 0.04} /><Shimmer className="h-3 w-1/2" delay={i * 0.04 + 0.02} /></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
