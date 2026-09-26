import { PageHeroSkeleton } from "@/components/page-hero"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

// Matches the blog index: the shared hero, the topic row, the featured post, then the grid.
export default function Loading() {
    return (
        <div className="min-h-screen bg-neutral-50">
            <ShimmerStyles />
            <PageHeroSkeleton />
            <div className="mx-auto max-w-7xl px-6 pt-8">
                <div className="flex flex-wrap gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => <Shimmer key={i} className="h-11 w-36 rounded-full" delay={i * 0.03} />)}
                </div>
            </div>
            <div className="mx-auto max-w-7xl px-6 py-10">
                <Shimmer className="h-72 rounded-3xl" />
                <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2, 3, 4, 5].map((i) => <Shimmer key={i} className="h-80 rounded-2xl" delay={i * 0.04} />)}
                </div>
            </div>
        </div>
    )
}
