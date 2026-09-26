import { PageHeroSkeleton } from "@/components/page-hero"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

// Matches the changelog: the shared hero, a month divider, then update cards.
export default function Loading() {
    return (
        <main className="bg-neutral-50">
            <ShimmerStyles />
            <PageHeroSkeleton />
            <div className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6">
                <Shimmer className="mx-auto h-3 w-40" />
                <Shimmer className="mx-auto mt-6 h-6 w-96 max-w-full" />
                <div className="mt-8 space-y-4">
                    {[0, 1, 2].map((i) => <Shimmer key={i} className="h-48 rounded-2xl" delay={i * 0.06} />)}
                </div>
            </div>
        </main>
    )
}
