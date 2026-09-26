import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

/** Shaped like the index (INC-12): header with the tabs on its right, the record, the featured case, the topic tabs and a row of case cards. */
export default function Loading() {
    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Loading incidents">
            <ShimmerStyles />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Shimmer className="size-10 rounded-xl" />
                    <div className="space-y-2"><Shimmer className="h-5 w-28" /><Shimmer className="h-3.5 w-64" delay={0.05} /></div>
                </div>
                <Shimmer className="h-10 w-48 rounded-xl" delay={0.05} />
            </div>
            <div className="mt-6"><StatBandSkeleton count={4} cols={4} size="sm" /></div>
            <Shimmer className="mt-6 h-72 rounded-3xl lg:h-64" delay={0.08} />
            <Shimmer className="mt-12 h-5 w-20" delay={0.1} />
            <Shimmer className="mt-4 h-10 w-full max-w-3xl rounded-xl" delay={0.12} />
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => <Shimmer key={i} className="h-80 rounded-2xl" delay={0.14 + i * 0.04} />)}
            </div>
        </div>
    )
}
