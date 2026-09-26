import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

/** Shaped like the player (INC-14): the top bar, the step list on the left, one step in the middle, the footer. */
export default function Loading() {
    return (
        <div className="flex h-[calc(100dvh-var(--app-bottom-nav-h))] flex-col bg-white dark:bg-neutral-950" aria-busy="true" aria-label="Loading the case">
            <ShimmerStyles />
            <div className="flex h-14 items-center gap-4 border-b border-neutral-200 px-4 dark:border-neutral-800">
                <Shimmer className="h-7 w-24 rounded-lg" />
                <div className="flex-1 space-y-1.5"><Shimmer className="h-3.5 w-64" /><Shimmer className="h-2.5 w-40" delay={0.05} /></div>
                <Shimmer className="hidden h-2 w-48 rounded-full sm:block" />
            </div>
            <div className="flex min-h-0 flex-1">
                <div className="hidden w-72 space-y-2 border-r border-neutral-200 p-5 lg:block dark:border-neutral-800">
                    {Array.from({ length: 14 }, (_, i) => <Shimmer key={i} className={i % 5 === 0 ? "mt-3 h-3 w-32" : "h-6 w-full rounded-md"} delay={i * 0.02} />)}
                </div>
                <div className="mx-auto w-full max-w-3xl space-y-4 px-8 pt-10">
                    <Shimmer className="h-3 w-56" />
                    <Shimmer className="h-9 w-2/3" delay={0.05} />
                    <Shimmer className="mt-6 h-4 w-full" delay={0.1} />
                    <Shimmer className="h-4 w-11/12" delay={0.12} />
                    <Shimmer className="h-4 w-3/4" delay={0.14} />
                </div>
            </div>
            <div className="flex h-16 items-center justify-between border-t border-neutral-200 px-4 dark:border-neutral-800">
                <Shimmer className="h-10 w-40 rounded-xl" /><Shimmer className="h-10 w-40 rounded-xl" />
            </div>
        </div>
    )
}
