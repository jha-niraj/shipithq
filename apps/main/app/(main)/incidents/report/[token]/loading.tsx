// Matches ReportView: the sticky bar, then a centred column with the title block, the
// summary, four band cards (2 by 2), and the lists below.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="min-h-screen">
            <ShimmerStyles />
            <div className="flex items-center gap-3 border-b border-neutral-200 px-page py-3 dark:border-neutral-800">
                <Shimmer className="h-4 w-32" />
                <span className="flex-1" />
                <Shimmer className="h-8 w-56 rounded-md" delay={0.04} />
            </div>
            <div className="mx-auto w-full max-w-3xl px-page py-10">
                <Shimmer className="h-3 w-28" />
                <Shimmer className="mt-3 h-8 w-3/4" delay={0.03} />
                <Shimmer className="mt-3 h-4 w-1/2" delay={0.05} />
                <Shimmer className="mt-6 h-4 w-full" delay={0.07} />
                <Shimmer className="mt-2 h-4 w-5/6" delay={0.08} />
                <div className="mt-10 grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                            <div className="flex justify-between"><Shimmer className="h-4 w-28" delay={0.1 + i * 0.03} /><Shimmer className="h-6 w-20 rounded-full" delay={0.1 + i * 0.03} /></div>
                            <Shimmer className="mt-4 h-3 w-full" delay={0.12 + i * 0.03} />
                            <Shimmer className="mt-1.5 h-3 w-4/5" delay={0.12 + i * 0.03} />
                        </div>
                    ))}
                </div>
                <div className="mt-10 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Shimmer key={i} className="h-14 w-full rounded-2xl" delay={0.2 + i * 0.03} />)}
                </div>
            </div>
        </div>
    )
}
