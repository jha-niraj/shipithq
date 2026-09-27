// Matches `GoalWorkspace` on its default tab (Today): the back link, the header with
// the goal's title, the four tabs and the actions; then the topic list (30%) beside
// the topic pane.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="flex h-dvh flex-col overflow-hidden">
            <ShimmerStyles />
            <div className="shrink-0 border-b border-neutral-200 px-page py-3 dark:border-neutral-800">
                <Shimmer className="mb-2 h-4 w-20" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                        <Shimmer className="h-6 w-64" delay={0.03} />
                        <Shimmer className="h-4 w-80" delay={0.05} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Shimmer className="h-8 w-72 rounded-lg" delay={0.07} />
                        <Shimmer className="h-8 w-32 rounded-md" delay={0.09} />
                        <Shimmer className="h-8 w-24 rounded-md" delay={0.11} />
                    </div>
                </div>
            </div>
            <div className="flex min-h-0 flex-1">
                <div className="w-full border-r border-neutral-200 lg:w-[30%] dark:border-neutral-800">
                    <div className="space-y-3 border-b border-neutral-200 p-3 dark:border-neutral-800">
                        <Shimmer className="h-8 w-full rounded-md" delay={0.1} />
                    </div>
                    <div className="space-y-2 p-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-start gap-3 rounded-lg p-3">
                                <Shimmer className="size-5 shrink-0 rounded-full" delay={0.12 + i * 0.03} />
                                <div className="flex-1 space-y-1.5">
                                    <Shimmer className="h-4 w-3/4" delay={0.12 + i * 0.03} />
                                    <Shimmer className="h-3 w-16" delay={0.12 + i * 0.03} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="hidden flex-1 items-center justify-center lg:flex">
                    <div className="flex flex-col items-center gap-3">
                        <Shimmer className="size-9 rounded-full" delay={0.2} />
                        <Shimmer className="h-4 w-24" delay={0.22} />
                        <Shimmer className="h-3 w-56" delay={0.24} />
                    </div>
                </div>
            </div>
        </div>
    )
}
