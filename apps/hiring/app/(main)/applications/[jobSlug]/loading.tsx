// Hand-matched to the candidates workspace: header, the list on the left, the candidate in the middle.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="flex h-screen flex-col">
            <ShimmerStyles />
            <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <Shimmer className="h-7 w-7 rounded-md" />
                <div className="flex-1 space-y-1.5">
                    <Shimmer className="h-4 w-48" delay={0.03} />
                    <Shimmer className="h-3 w-32" delay={0.05} />
                </div>
                <Shimmer className="h-8 w-40 rounded-md" delay={0.07} />
                <Shimmer className="h-8 w-48 rounded-md" delay={0.09} />
                <Shimmer className="h-8 w-24 rounded-md" delay={0.11} />
            </div>
            <div className="flex min-h-0 flex-1">
                <div className="w-full max-w-[26rem] shrink-0 border-r border-neutral-200 dark:border-neutral-800">
                    <Shimmer className="m-3 h-3 w-40" delay={0.1} />
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2 border-b border-neutral-100 px-3 py-3 dark:border-neutral-900">
                            <Shimmer className="h-4 w-4 rounded" delay={0.12 + i * 0.02} />
                            <div className="flex-1 space-y-1.5">
                                <Shimmer className="h-3.5 w-32" delay={0.12 + i * 0.02} />
                                <Shimmer className="h-3 w-24" delay={0.13 + i * 0.02} />
                            </div>
                            <Shimmer className="h-4 w-24" delay={0.14 + i * 0.02} />
                        </div>
                    ))}
                </div>
                <div className="hidden flex-1 space-y-4 p-5 md:block">
                    <Shimmer className="h-8 w-80 rounded-lg" delay={0.12} />
                    <Shimmer className="h-40 w-full max-w-3xl rounded-2xl" delay={0.16} />
                    <div className="grid max-w-3xl grid-cols-2 gap-3">
                        {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-24 w-full rounded-2xl" delay={0.2 + i * 0.03} />)}
                    </div>
                </div>
            </div>
        </div>
    )
}
