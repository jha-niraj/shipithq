// Hand-matched to _components/pipeline-builder.tsx (plan/hiring-ui HU-8): the back
// link, the name and description on one row, then the sticky rounds column (rounds,
// Add round, the actions pinned under them) beside the round editor's sections.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="space-y-4 px-page py-6">
            <ShimmerStyles />
            <Shimmer className="h-5 w-24" />
            <div className="grid gap-2 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
                <Shimmer className="h-10 w-full rounded-md" />
                <Shimmer className="h-10 w-full rounded-md" delay={0.04} />
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800">
                    <div className="space-y-2 p-3">
                        <Shimmer className="h-3 w-24" />
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-2 rounded-xl border border-neutral-200 px-2 py-2.5 dark:border-neutral-800">
                                <Shimmer className="h-4 w-4" delay={i * 0.04} />
                                <div className="flex-1 space-y-1"><Shimmer className="h-4 w-32" delay={i * 0.04} /><Shimmer className="h-3 w-20" delay={i * 0.04} /></div>
                                <Shimmer className="h-5 w-14 rounded-md" delay={i * 0.04} />
                            </div>
                        ))}
                        <Shimmer className="h-9 w-full rounded-md" delay={0.2} />
                    </div>
                    <div className="space-y-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
                        <Shimmer className="h-3 w-40" />
                        <div className="flex gap-2"><Shimmer className="h-9 flex-1 rounded-md" /><Shimmer className="h-9 w-9 rounded-md" /></div>
                    </div>
                </div>
                <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                    <div className="flex justify-between px-5 py-4"><Shimmer className="h-4 w-20" /><Shimmer className="h-8 w-32 rounded-md" /></div>
                    {[0, 1, 2].map((s) => (
                        <div key={s} className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="space-y-1.5"><Shimmer className="h-4 w-28" delay={s * 0.06 + i * 0.03} /><Shimmer className="h-10 w-full rounded-md" delay={s * 0.06 + i * 0.03} /></div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
