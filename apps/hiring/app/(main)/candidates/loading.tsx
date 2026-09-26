// Hand-matched to candidates-list.tsx: header, search, then one row per person with role chips.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />
            <div className="space-y-2">
                <Shimmer className="h-7 w-40" />
                <Shimmer className="h-4 w-96 max-w-full" delay={0.04} />
            </div>
            <Shimmer className="h-9 w-full max-w-sm rounded-md" delay={0.06} />
            <div className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                        <div className="w-64 space-y-1.5">
                            <Shimmer className="h-4 w-40" delay={0.08 + i * 0.03} />
                            <Shimmer className="h-3 w-28" delay={0.1 + i * 0.03} />
                        </div>
                        <div className="flex flex-1 gap-2">
                            <Shimmer className="h-6 w-40 rounded-full" delay={0.12 + i * 0.03} />
                            <Shimmer className="h-6 w-32 rounded-full" delay={0.14 + i * 0.03} />
                        </div>
                        <Shimmer className="h-3 w-12" delay={0.14 + i * 0.03} />
                    </div>
                ))}
            </div>
        </div>
    )
}
