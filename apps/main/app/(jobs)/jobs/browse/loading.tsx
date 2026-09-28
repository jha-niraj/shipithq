// Hand-matched to browse-content.tsx (plan/jobs-polish JP-22): the header (title, count,
// Spark picks), the search and the filter row, the list of JobCards (a 48px mark beside the
// title and company, the one meta line, the skills, the footer line), then the count and the
// pages pinned below. `BrowseListSkeleton` is also what the list shows while a filter applies.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export function BrowseListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <>
            <ShimmerStyles />
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex gap-4">
                        <Shimmer className="h-12 w-12 shrink-0 rounded-xl" delay={i * 0.04} />
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1.5"><Shimmer className="h-4 w-56 max-w-full" delay={i * 0.04} /><Shimmer className="h-3.5 w-28" delay={i * 0.04 + 0.02} /></div>
                                <Shimmer className="h-6 w-20 rounded-full" delay={i * 0.04} />
                            </div>
                            <Shimmer className="h-3.5 w-3/4" delay={i * 0.04 + 0.04} />
                            <div className="flex gap-1.5">{[0, 1, 2].map((k) => <Shimmer key={k} className="h-5 w-16 rounded-md" delay={i * 0.04 + 0.06} />)}</div>
                            <div className="flex justify-between border-t border-neutral-100 pt-2 dark:border-neutral-800"><Shimmer className="h-3.5 w-40" /><Shimmer className="h-3.5 w-10" /></div>
                        </div>
                    </div>
                </div>
            ))}
        </>
    )
}

export default function Loading() {
    return (
        <div className="page-frame flex h-[calc(var(--page-h,100dvh)-var(--jobs-header-h,56px))] min-h-[32rem] flex-col px-page pt-5">
            <ShimmerStyles />
            <div className="shrink-0 space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1.5"><Shimmer className="h-6 w-40" /><Shimmer className="h-3.5 w-24" delay={0.02} /></div>
                    <Shimmer className="h-8 w-28 rounded-lg" />
                </div>
                <div className="flex gap-2">
                    <Shimmer className="h-9 min-w-0 flex-1 rounded-md" delay={0.04} />
                    <Shimmer className="h-9 w-40 shrink-0 rounded-md" delay={0.04} />
                </div>
                <div className="flex flex-wrap gap-2">
                    {["w-24", "w-20", "w-24", "w-16", "w-16", "w-14", "w-20", "w-36"].map((w, i) => <Shimmer key={i} className={`h-8 ${w} rounded-md`} delay={0.06 + i * 0.02} />)}
                </div>
            </div>
            <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-hidden">
                <BrowseListSkeleton />
            </div>
            <div className="flex shrink-0 items-center justify-between border-t border-neutral-200 py-3 dark:border-neutral-800">
                <Shimmer className="h-4 w-20" />
                <Shimmer className="h-9 w-72 rounded-md" />
            </div>
        </div>
    )
}
