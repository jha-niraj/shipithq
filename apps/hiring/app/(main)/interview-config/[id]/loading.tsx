// Matches _components/pipeline-builder.tsx: back link, the name and
// description inputs with Delete and Save, then the round list (20rem) beside
// the selected round's editor.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />
            <Shimmer className="h-4 w-24" />
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 space-y-2">
                    <Shimmer className="h-11 w-full max-w-xl rounded-md" />
                    <Shimmer className="h-16 w-full max-w-xl rounded-md" delay={0.04} />
                    <Shimmer className="h-3 w-72" delay={0.06} />
                </div>
                <div className="flex gap-2">
                    <Shimmer className="h-9 w-10 rounded-md" delay={0.08} />
                    <Shimmer className="h-9 w-32 rounded-md" delay={0.1} />
                </div>
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
                <div className="space-y-2">
                    <Shimmer className="h-3 w-24" />
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                            <Shimmer className="h-4 w-4 rounded" delay={i * 0.04} />
                            <div className="flex-1 space-y-1"><Shimmer className="h-4 w-32" delay={i * 0.04} /><Shimmer className="h-3 w-24" delay={i * 0.04} /></div>
                            <Shimmer className="h-5 w-14 rounded-md" delay={i * 0.04} />
                        </div>
                    ))}
                    <Shimmer className="h-9 w-full rounded-md" delay={0.2} />
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex justify-between px-5 py-4"><Shimmer className="h-4 w-20" /><Shimmer className="h-8 w-32 rounded-md" /></div>
                    {[0, 1, 2].map((s) => (
                        <div key={s} className="grid gap-4 border-t border-neutral-100 px-5 py-5 sm:grid-cols-2 dark:border-neutral-800">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="space-y-1.5"><Shimmer className="h-4 w-28" delay={s * 0.06 + i * 0.02} /><Shimmer className="h-9 w-full rounded-md" delay={s * 0.06 + i * 0.02} /></div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
