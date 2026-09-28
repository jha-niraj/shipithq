import { Shimmer } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

/** Shaped like the page: the header, three figures, then module sections of badge cards. */
export default function BadgesLoading() {
    return (
        <div className="mx-auto w-full space-y-8 px-page py-6" aria-busy aria-label="Loading badges">
            <div className="space-y-2"><Shimmer className="h-7 w-32" /><Shimmer className="h-4 w-96 max-w-full" /></div>
            <StatBandSkeleton count={3} cols={3} />
            {[0, 1].map((s) => (
                <div key={s}>
                    <Shimmer className="mb-3 h-5 w-40" />
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-60 rounded-[18px]" delay={i * 0.06} />)}
                    </div>
                </div>
            ))}
        </div>
    )
}
