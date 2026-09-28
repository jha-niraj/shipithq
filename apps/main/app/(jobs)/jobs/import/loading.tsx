import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

/** Shaped like the wizard with no import yet: title and steps on the left, the link form, "Your imports" as a rail on xl. */
export default function Loading() {
    return (
        <div className="page-frame grid gap-6 px-page py-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[16rem_minmax(0,1fr)_20rem]">
            <ShimmerStyles />
            <div className="space-y-5">
                <div className="space-y-2"><Shimmer className="h-6 w-40" /><Shimmer className="h-3 w-full" delay={0.02} /><Shimmer className="h-3 w-5/6" delay={0.04} /><Shimmer className="h-3 w-2/3" delay={0.06} /></div>
                <div className="flex gap-4 lg:flex-col lg:gap-6">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="flex shrink-0 gap-3">
                            <Shimmer className="h-7 w-7 shrink-0 rounded-full" delay={i * 0.04} />
                            <div className="space-y-1.5 lg:flex-1"><Shimmer className="h-4 w-28" delay={i * 0.04} /><Shimmer className="hidden h-3 w-full lg:block" delay={i * 0.04 + 0.02} /></div>
                        </div>
                    ))}
                </div>
            </div>
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
    )
}
