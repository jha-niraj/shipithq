import { PageHeroSkeleton } from "@/components/page-hero"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

// Matches /uni/pricing: the shared hero with its facts, the toggles, four plan cards, then the table.
export default function Loading() {
    return (
        <main className="bg-neutral-50">
            <ShimmerStyles />
            <PageHeroSkeleton facts={4} />
            <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
                <Shimmer className="mx-auto h-9 w-80" />
                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-[34rem] rounded-2xl" delay={i * 0.06} />)}
                </div>
                <Shimmer className="mt-16 h-96 rounded-2xl" />
            </div>
        </main>
    )
}
