// Hand-matched to home-content.tsx: the header, the Needs attention list, the
// roles table (four columns) and the funnel card below it.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="page-frame space-y-6 px-page py-6">
            <ShimmerStyles />
            <div className="flex items-center justify-between"><Shimmer className="h-6 w-24" /><Shimmer className="h-8 w-28 rounded-lg" /></div>
            <div className="space-y-2">
                <Shimmer className="h-4 w-32" />
                <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="px-4 py-3"><Shimmer className="h-4 w-3/4" delay={i * 0.04} /></div>)}
                </div>
            </div>
            <div className="space-y-2">
                <Shimmer className="h-4 w-16" />
                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800">
                    <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800"><Shimmer className="h-3 w-full" /></div>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-4 gap-4 px-4 py-3.5">
                            <Shimmer className="h-4" delay={i * 0.04} /><Shimmer className="h-4" delay={i * 0.04} /><Shimmer className="h-4 w-8 justify-self-end" delay={i * 0.04} /><Shimmer className="h-5" delay={i * 0.04} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                <Shimmer className="h-4 w-40" />
                <div className="space-y-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                    {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} className="h-8 w-full" delay={i * 0.04} />)}
                </div>
            </div>
        </div>
    )
}
