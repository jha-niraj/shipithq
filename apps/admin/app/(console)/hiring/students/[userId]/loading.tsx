// Hand-matched to page.tsx: the back link, the name and email, then the
// attempts table (a header row and seven columns).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="w-full p-6 lg:p-8">
            <ShimmerStyles />
            <Shimmer className="mb-4 h-4 w-24" />
            <Shimmer className="h-7 w-64" />
            <Shimmer className="mb-6 mt-2 h-4 w-48" delay={0.04} />
            <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800"><Shimmer className="h-3 w-full" /></div>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-7 gap-4 px-4 py-3">
                        {Array.from({ length: 7 }).map((_, j) => <Shimmer key={j} className="h-4" delay={i * 0.03} />)}
                    </div>
                ))}
            </div>
        </div>
    )
}
