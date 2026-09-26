// Hand-matched to _components/blocked-companies.tsx: the card's heading and
// line, then rows of a company name, the date and an Unblock button.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
            <ShimmerStyles />
            <Shimmer className="h-5 w-44" />
            <Shimmer className="mt-2 h-4 w-96 max-w-full" delay={0.04} />
            <div className="mt-5 divide-y divide-neutral-100 dark:divide-neutral-800">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-3">
                        <div className="space-y-1.5"><Shimmer className="h-4 w-40" delay={i * 0.04} /><Shimmer className="h-3 w-28" delay={i * 0.04} /></div>
                        <Shimmer className="h-8 w-24 rounded-lg" delay={i * 0.04} />
                    </div>
                ))}
            </div>
        </div>
    )
}
