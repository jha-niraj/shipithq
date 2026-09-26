// Hand-matched to _components/interview-reports-client.tsx: the back link, the
// header, the three tabs, then report cards (company and role, the reporter
// line, the rounds with their questions, and the actions along the bottom).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="w-full p-6 lg:p-8">
            <ShimmerStyles />
            <Shimmer className="mb-4 h-4 w-40" />
            <div className="mb-6 space-y-2"><Shimmer className="h-7 w-48" /><Shimmer className="h-4 w-96 max-w-full" delay={0.04} /></div>
            <Shimmer className="mb-6 h-9 w-72 rounded-lg" delay={0.06} />
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                        <Shimmer className="h-5 w-72 max-w-full" delay={i * 0.04} />
                        <Shimmer className="h-4 w-80 max-w-full" delay={i * 0.04} />
                        {Array.from({ length: 2 }).map((_, j) => <Shimmer key={j} className="h-16 w-full rounded-lg" delay={i * 0.04 + j * 0.02} />)}
                        <div className="flex flex-wrap gap-2 pt-1"><Shimmer className="h-8 w-28 rounded-lg" delay={i * 0.04} /><Shimmer className="h-8 w-64 rounded-lg" delay={i * 0.04} /></div>
                    </div>
                ))}
            </div>
        </div>
    )
}
