// Hand-matched to account/page.tsx (plan/hiring-ui HU-12): the header, then four
// sections, each a title and hint on the left beside its fields.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

const FIELDS = [2, 3, 1, 1]

export default function Loading() {
    return (
        <div className="page-frame px-page py-6">
            <ShimmerStyles />
            <div className="space-y-1.5"><Shimmer className="h-6 w-28" /><Shimmer className="h-4 w-64" delay={0.04} /></div>
            <div className="mt-2">
                {FIELDS.map((n, s) => (
                    <div key={s} className="grid gap-4 border-b border-neutral-200 py-6 last:border-0 lg:grid-cols-[18rem_minmax(0,1fr)] dark:border-neutral-800">
                        <div className="space-y-1.5"><Shimmer className="h-5 w-28" delay={s * 0.05} /><Shimmer className="h-4 w-56" delay={s * 0.05} /></div>
                        <div className="max-w-xl space-y-4">
                            {Array.from({ length: n }).map((_, i) => (
                                <div key={i} className="space-y-1.5"><Shimmer className="h-4 w-24" delay={s * 0.05 + i * 0.03} /><Shimmer className="h-10 w-full rounded-md" delay={s * 0.05 + i * 0.03} /></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
