// Hand-matched to _components/company-page.tsx (plan/jobs-polish JP-18): the details column on
// the left (back link, logo tile, name, label, links, stats, quick facts), then the tabs and
// the actions at the top of the right column and the Overview tab (the default) under them.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

const TAB_WIDTHS = ["w-16", "w-12", "w-16", "w-20"]

export default function Loading() {
    return (
        <div className="page-frame grid gap-8 px-page py-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
            <ShimmerStyles />
            <div className="space-y-6">
                <Shimmer className="h-4 w-24" />
                <div className="space-y-3">
                    <Shimmer className="h-16 w-16 rounded-2xl" />
                    <Shimmer className="h-8 w-48" delay={0.02} />
                    <Shimmer className="h-5 w-24 rounded-full" delay={0.04} />
                    {["w-44", "w-28", "w-36"].map((w, i) => <Shimmer key={w} className={`h-4 ${w}`} delay={0.06 + i * 0.02} />)}
                </div>
                <div className="space-y-2">
                    <Shimmer className="h-4 w-12" />
                    <StatBandSkeleton count={4} cols={1} size="sm" />
                </div>
                <div className="space-y-2">
                    <Shimmer className="h-4 w-20" />
                    <Shimmer className="h-40 w-full rounded-2xl" />
                </div>
            </div>

            <div className="min-w-0 space-y-6">
                {/* The tabs: Overview, Jobs, Practice, Interviews, as the segmented strip. */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
                        {TAB_WIDTHS.map((w, i) => <Shimmer key={i} className={`h-7 ${w} rounded-lg`} delay={i * 0.03} />)}
                    </div>
                    {/* Report your interview, Report, Block, Follow */}
                    <div className="flex gap-2">
                        {["w-40", "w-16", "w-16", "w-20"].map((w, i) => <Shimmer key={i} className={`h-8 ${w} rounded-lg`} delay={i * 0.02} />)}
                    </div>
                </div>
                <div className="space-y-8">
                    <div className="space-y-2">
                        <Shimmer className="h-4 w-16" />
                        <Shimmer className="h-4 w-full" delay={0.04} />
                        <Shimmer className="h-4 w-11/12" delay={0.06} />
                        <Shimmer className="h-4 w-3/4" delay={0.08} />
                    </div>
                    <div className="space-y-2">
                        <Shimmer className="h-4 w-12" />
                        <div className="flex flex-wrap gap-1.5">
                            {Array.from({ length: 6 }).map((_, i) => <Shimmer key={i} className="h-6 w-16 rounded-md" delay={i * 0.02} />)}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Shimmer className="h-4 w-16" />
                        <Shimmer className="h-4 w-full" delay={0.04} />
                        <Shimmer className="h-4 w-2/3" delay={0.06} />
                    </div>
                    <div className="space-y-2">
                        <Shimmer className="h-4 w-20" />
                        <div className="grid gap-1.5 sm:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} className="h-4 w-3/4" delay={i * 0.02} />)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
