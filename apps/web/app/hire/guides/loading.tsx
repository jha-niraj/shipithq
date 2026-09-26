import { PageHeroSkeleton } from "@/components/page-hero"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

// Matches /hire/guides: the shared hero, then five guide cards.
export default function Loading() {
    return (
        <main className="bg-neutral-50">
            <ShimmerStyles />
            <PageHeroSkeleton />
            <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
                <Shimmer className="h-3 w-28" />
                <Shimmer className="mt-4 h-9 w-72 max-w-full" />
                <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[0, 1, 2, 3, 4].map((i) => <Shimmer key={i} className="h-72 rounded-2xl" delay={i * 0.05} />)}
                </div>
            </div>
        </main>
    )
}
