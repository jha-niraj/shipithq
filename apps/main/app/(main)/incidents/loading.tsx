import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

/** Shaped like the index (INC-8): header row with the record band, the featured case, a 2x2 of topics, the badges. */
export default function Loading() {
    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Loading incidents">
            <ShimmerStyles />
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3">
                    <Shimmer className="size-10 rounded-xl" />
                    <div className="space-y-2"><Shimmer className="h-5 w-28" /><Shimmer className="h-3.5 w-64" delay={0.05} /></div>
                </div>
                <StatBandSkeleton count={4} cols={4} size="sm" className="xl:w-[40rem]" />
            </div>
            <Shimmer className="mt-8 h-72 rounded-3xl lg:h-64" delay={0.08} />
            <Shimmer className="mt-12 h-5 w-20" delay={0.1} />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-40 rounded-2xl" delay={0.12 + i * 0.04} />)}
            </div>
            <Shimmer className="mt-12 h-5 w-20" delay={0.2} />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Shimmer key={i} className="h-32 rounded-2xl" delay={0.22 + i * 0.02} />)}
            </div>
        </div>
    )
}
