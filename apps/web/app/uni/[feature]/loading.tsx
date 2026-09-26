import { PageHeroSkeleton } from "@/components/page-hero"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

// Matches FeatureDetail (a /uni module): the shared hero, then the scene beside the step timeline.
export default function Loading() {
    return (
        <main className="bg-neutral-50">
            <ShimmerStyles />
            <PageHeroSkeleton />
            <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
                <Shimmer className="h-3 w-28" />
                <Shimmer className="mt-4 h-9 w-80 max-w-full" />
                <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
                    <Shimmer className="hidden h-80 rounded-3xl lg:block" />
                    <div className="space-y-4">
                        {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-20 rounded-2xl" delay={i * 0.05} />)}
                    </div>
                </div>
            </div>
        </main>
    )
}
