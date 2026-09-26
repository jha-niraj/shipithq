// Hand-matched to _components/reports-client.tsx: the back link, the header,
// the Open / Closed tabs, then report cards (kind and reason, the reported
// text, the reporter line, and the action buttons along the bottom).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="p-6">
            <ShimmerStyles />
            <Shimmer className="mb-4 h-4 w-40" />
            <div className="mb-6 space-y-2"><Shimmer className="h-7 w-32" /><Shimmer className="h-4 w-96 max-w-full" delay={0.04} /></div>
            <Shimmer className="mb-6 h-9 w-48 rounded-lg" delay={0.06} />
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex gap-2"><Shimmer className="h-5 w-20 rounded-full" delay={i * 0.04} /><Shimmer className="h-5 w-56" delay={i * 0.04} /></div>
                        <Shimmer className="h-14 w-full rounded-lg" delay={i * 0.04} />
                        <Shimmer className="h-4 w-80 max-w-full" delay={i * 0.04} />
                        <div className="flex flex-wrap gap-2 pt-1">
                            {Array.from({ length: 4 }).map((_, j) => <Shimmer key={j} className="h-8 w-28 rounded-lg" delay={i * 0.04} />)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
