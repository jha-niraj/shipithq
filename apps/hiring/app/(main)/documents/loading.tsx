// Hand-matched to page.tsx and _components/docs-explorer.tsx: the header, then
// the list column (Upload and Folder buttons, search, file rows) beside the
// preview pane; stacked on phones.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="page-frame flex h-[var(--page-h)] flex-col gap-4 overflow-hidden px-page py-5">
            <ShimmerStyles />
            <div className="space-y-1.5"><Shimmer className="h-6 w-36" /><Shimmer className="h-4 w-96 max-w-full" delay={0.04} /></div>
            <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
                <div className="flex w-full flex-col gap-3 lg:w-1/3 lg:min-w-[280px] lg:max-w-[400px]">
                    <div className="flex gap-2"><Shimmer className="h-8 flex-1 rounded-lg" /><Shimmer className="h-8 w-24 rounded-lg" /></div>
                    <Shimmer className="h-9 w-full rounded-lg" delay={0.04} />
                    <div className="space-y-1.5 rounded-2xl border border-neutral-200 p-2 dark:border-neutral-800">
                        {Array.from({ length: 7 }).map((_, i) => <Shimmer key={i} className="h-7 w-full rounded-lg" delay={i * 0.03} />)}
                    </div>
                </div>
                <Shimmer className="min-h-[24rem] flex-1 rounded-2xl lg:min-h-0" delay={0.08} />
            </div>
        </div>
    )
}
