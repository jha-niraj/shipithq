import { PageHeroSkeleton } from "@/components/page-hero"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { IdeasListSkeleton } from "./_components/ideas-list"

// Matches the Ideas page (REV-115): the hero with its counts row, the full-width tab
// row, then the two-column list.
export default function Loading() {
    return (
        <main className="bg-neutral-50">
            <ShimmerStyles />
            <PageHeroSkeleton facts={4} compact />
            <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6">
                <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-1">
                        {["w-14", "w-[4.75rem]", "w-[5.5rem]", "w-[5.75rem]", "w-[5.5rem]"].map((w, i) => <Shimmer key={i} className={`h-9 rounded-lg ${w}`} delay={i * 0.03} />)}
                    </div>
                    <div className="flex gap-3"><Shimmer className="h-9 w-24 rounded-lg" /><Shimmer className="h-9 w-32 rounded-lg" /></div>
                </div>
                <IdeasListSkeleton />
            </div>
        </main>
    )
}
