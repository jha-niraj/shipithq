import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

// Shaped like CodeSampleViewer: the header (path, stage switch, Compare), the file tree
// on the left from @2xl, and lines of code.
const TREE = ["w-24", "w-20", "w-28", "w-32", "w-24", "w-16", "w-28", "w-20"]
const CODE = ["w-2/3", "w-1/2", "w-0", "w-3/4", "w-5/6", "w-2/5", "w-1/2", "w-0", "w-3/5", "w-4/5", "w-1/3", "w-1/2"]

export function CodeSampleSkeleton() {
    return (
        <div className="@container overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800" aria-busy aria-label="Loading code">
            <ShimmerStyles />
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <Shimmer className="h-4 w-48" />
                <div className="flex gap-2">
                    <Shimmer className="h-8 w-48 rounded-lg" delay={0.02} />
                    <Shimmer className="h-8 w-24 rounded-lg" delay={0.04} />
                </div>
            </div>
            <div className="grid @2xl:grid-cols-[14rem_minmax(0,1fr)]">
                <div className="hidden space-y-2.5 border-r border-neutral-200 p-4 @2xl:block dark:border-neutral-800">
                    {TREE.map((w, i) => <Shimmer key={i} className={`h-3.5 ${w}`} delay={i * 0.02} />)}
                </div>
                <div className="space-y-2.5 p-4">
                    <Shimmer className="h-9 w-full rounded-md @2xl:hidden" />
                    {CODE.map((w, i) => (w === "w-0" ? <div key={i} className="h-3.5" /> : <Shimmer key={i} className={`h-3.5 ${w}`} delay={i * 0.02} />))}
                </div>
            </div>
        </div>
    )
}
