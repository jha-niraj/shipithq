import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

// Matches the idea page: back link, the article card, then the vote and timeline column.
export default function Loading() {
    return (
        <main className="bg-neutral-50">
            <ShimmerStyles />
            <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
                <Shimmer className="h-4 w-20" />
                <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_17rem]">
                    <Shimmer className="h-[28rem] rounded-3xl" />
                    <div className="space-y-4">
                        <Shimmer className="h-14 rounded-2xl" />
                        <Shimmer className="h-56 rounded-2xl" />
                        <Shimmer className="h-32 rounded-2xl" />
                    </div>
                </div>
            </div>
        </main>
    )
}
