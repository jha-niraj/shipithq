// Shaped like _components/report-settings.tsx: the frequency card with four options,
// then the list of past reports.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    const card = "rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950"
    return (
        <div className="space-y-6">
            <ShimmerStyles />
            <div className={card}>
                <Shimmer className="h-5 w-40" />
                <Shimmer className="mt-2 h-4 w-full max-w-lg" delay={0.04} />
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-[74px] rounded-xl" delay={i * 0.04} />)}
                </div>
                <Shimmer className="mt-4 h-3 w-72" />
            </div>
            <div className={card}>
                <Shimmer className="h-5 w-32" />
                {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                        <div className="space-y-1.5"><Shimmer className="h-4 w-48" delay={i * 0.04} /><Shimmer className="h-3 w-40" delay={i * 0.04} /></div>
                    </div>
                ))}
            </div>
        </div>
    )
}
