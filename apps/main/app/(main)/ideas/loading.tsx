import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

// Matches ideas-client: header row with the Post button, the tab row, then cards.
export default function Loading() {
    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
            <ShimmerStyles />
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <Shimmer className="h-7 w-24" />
                    <Shimmer className="h-4 w-80 max-w-full" />
                </div>
                <Shimmer className="h-9 w-32" />
            </div>
            <Shimmer className="mt-8 h-8 w-full" />
            <div className="mt-5 space-y-3">
                {[0, 1, 2, 3, 4].map((i) => <Shimmer key={i} className="h-28 rounded-xl" delay={i * 0.05} />)}
            </div>
        </div>
    )
}
