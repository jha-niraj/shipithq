// Hand-matched to _components/my-rounds.tsx: the page header and its button, then two stacked
// sections of rows - title and company, the step line, a pill, and a button on
// the right (below it on phones).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="page-frame space-y-8 px-page py-6">
            <ShimmerStyles />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                    <Shimmer className="h-6 w-32" />
                    <Shimmer className="h-4 w-80 max-w-full" delay={0.04} />
                </div>
                {/* "Report a real interview" (CMP-1). */}
                <Shimmer className="h-8 w-48 rounded-md" delay={0.06} />
            </div>
            {[3, 2].map((rows, s) => (
                <div key={s} className="space-y-3">
                    <Shimmer className="h-4 w-28" delay={s * 0.08} />
                    <div className="space-y-2.5">
                        {Array.from({ length: rows }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1.5">
                                        <Shimmer className="h-5 w-60 max-w-full" delay={i * 0.04} />
                                        <Shimmer className="h-4 w-80 max-w-full" delay={i * 0.04} />
                                        <Shimmer className="mt-2 h-5 w-24 rounded-full" delay={i * 0.04} />
                                    </div>
                                    <Shimmer className="h-8 w-28 rounded-lg" delay={i * 0.04} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
