// Hand-matched to home-content.tsx (plan/hiring-ui HU-6): the header with "New job",
// the four-figure StatBand, the setup checklist (five steps), then the chart and jobs
// table on the left beside the pipelines and team lists.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

const card = "rounded-2xl border border-neutral-200 dark:border-neutral-800"

function List({ rows, delay }: { rows: number; delay: number }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between"><Shimmer className="h-4 w-20" delay={delay} /><Shimmer className="h-3 w-16" delay={delay} /></div>
            <div className={`divide-y divide-neutral-100 dark:divide-neutral-800 ${card}`}>
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <Shimmer className="h-8 w-8 rounded-full" delay={delay + i * 0.04} />
                        <div className="flex-1 space-y-1"><Shimmer className="h-4 w-3/4" delay={delay + i * 0.04} /><Shimmer className="h-3 w-1/3" delay={delay + i * 0.04} /></div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function Loading() {
    return (
        <div className="page-frame space-y-6 px-page py-6">
            <ShimmerStyles />
            <div className="flex items-center justify-between">
                <div className="space-y-1.5"><Shimmer className="h-6 w-24" /><Shimmer className="h-4 w-80 max-w-full" delay={0.04} /></div>
                <Shimmer className="h-8 w-28 rounded-md" />
            </div>
            <StatBandSkeleton count={4} cols={4} />
            <div className="space-y-2">
                <Shimmer className="h-4 w-28" />
                <div className={`grid md:grid-cols-5 ${card}`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex gap-3 p-4 md:flex-col">
                            <Shimmer className="h-6 w-6 rounded-full" delay={i * 0.04} />
                            <div className="flex-1 space-y-1"><Shimmer className="h-4 w-32" delay={i * 0.04} /><Shimmer className="h-3 w-full" delay={i * 0.04} /></div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="min-w-0 space-y-6">
                    <div className="space-y-2">
                        <Shimmer className="h-4 w-52" />
                        <div className={`p-4 ${card}`}><Shimmer className="h-56 w-full" delay={0.08} /></div>
                    </div>
                    <div className="space-y-2">
                        <Shimmer className="h-4 w-16" />
                        <div className={card}>
                            <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800"><Shimmer className="h-3 w-full" /></div>
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="grid grid-cols-4 gap-4 px-4 py-3.5">
                                    <Shimmer className="h-4" delay={i * 0.04} /><Shimmer className="h-4" delay={i * 0.04} /><Shimmer className="h-4 w-8 justify-self-end" delay={i * 0.04} /><Shimmer className="h-5" delay={i * 0.04} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="min-w-0 space-y-6">
                    <List rows={4} delay={0.1} />
                    <List rows={3} delay={0.16} />
                </div>
            </div>
        </div>
    )
}
