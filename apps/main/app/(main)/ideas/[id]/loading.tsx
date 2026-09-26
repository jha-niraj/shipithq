import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

// Matches the idea page: back link, title block, description, then the vote and timeline column.
export default function Loading() {
    return (
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
            <ShimmerStyles />
            <Shimmer className="h-4 w-20" />
            <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_16rem]">
                <div className="space-y-3">
                    <Shimmer className="h-5 w-40" />
                    <Shimmer className="h-9 w-4/5" />
                    <Shimmer className="h-4 w-32" />
                    <Shimmer className="mt-4 h-32 w-full" />
                </div>
                <div className="space-y-6">
                    <Shimmer className="h-14 rounded-2xl" />
                    <Shimmer className="h-56 rounded-2xl" />
                </div>
            </div>
        </div>
    )
}
