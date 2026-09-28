// Hand-matched to _components/company-page.tsx: the back link, the header (logo
// tile, name and actions, the label, the meta line), the tab bar, then the
// Overview tab (the default): the profile blocks in the main column, stats and
// quick facts in the rail.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

const TAB_WIDTHS = ["w-16", "w-14", "w-20", "w-24"]

export default function Loading() {
    return (
        <div className="page-frame space-y-6 px-page py-6">
            <ShimmerStyles />
            <Shimmer className="h-4 w-24" />
            <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <Shimmer className="h-16 w-16 shrink-0 rounded-2xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <Shimmer className="h-8 w-56" />
                            <Shimmer className="h-8 w-24 rounded-lg" />
                        </div>
                        <Shimmer className="h-5 w-24 rounded-full" delay={0.04} />
                        <Shimmer className="h-4 w-72 max-w-full" delay={0.06} />
                    </div>
                </div>
                {/* The tab bar: Overview, Jobs, Practice, Interviews. */}
                <div className="mt-5 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
                    {TAB_WIDTHS.map((w, i) => (
                        <div key={w} className="px-3 pb-3 pt-1">
                            <Shimmer className={`h-5 ${w}`} delay={i * 0.03} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="space-y-8 lg:col-span-2">
                    {/* About */}
                    <div className="space-y-2">
                        <Shimmer className="h-4 w-16" />
                        <Shimmer className="h-4 w-full" delay={0.04} />
                        <Shimmer className="h-4 w-11/12" delay={0.06} />
                        <Shimmer className="h-4 w-3/4" delay={0.08} />
                    </div>
                    {/* Stack */}
                    <div className="space-y-2">
                        <Shimmer className="h-4 w-12" />
                        <div className="flex flex-wrap gap-1.5">
                            {Array.from({ length: 6 }).map((_, i) => <Shimmer key={i} className="h-6 w-16 rounded-md" delay={i * 0.02} />)}
                        </div>
                    </div>
                    {/* Culture */}
                    <div className="space-y-2">
                        <Shimmer className="h-4 w-16" />
                        <Shimmer className="h-4 w-full" delay={0.04} />
                        <Shimmer className="h-4 w-2/3" delay={0.06} />
                    </div>
                    {/* Benefits */}
                    <div className="space-y-2">
                        <Shimmer className="h-4 w-20" />
                        <div className="grid gap-1.5 sm:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} className="h-4 w-4/5" delay={i * 0.03} />)}
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Shimmer className="h-4 w-12" />
                        <StatBandSkeleton count={4} cols={1} size="sm" />
                        <Shimmer className="h-3 w-full" delay={0.04} />
                    </div>
                    <div className="space-y-2">
                        <Shimmer className="h-4 w-24" />
                        <Shimmer className="h-40 rounded-2xl" delay={0.06} />
                    </div>
                </div>
            </div>
        </div>
    )
}
