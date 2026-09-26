import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

/** Shaped like a case (INC-9): the dark cover, the first beats of the story, the parts index on the right at xl. */
export default function Loading() {
    return (
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 xl:grid xl:grid-cols-[minmax(0,1fr)_13rem] xl:gap-12" aria-busy="true" aria-label="Loading the case">
            <ShimmerStyles />
            <div className="min-w-0">
                <div className="grid overflow-hidden rounded-3xl bg-neutral-900 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                    <div className="space-y-4 p-6 sm:p-8">
                        <Shimmer className="h-3 w-40 opacity-30" />
                        <Shimmer className="h-9 w-4/5 opacity-30" delay={0.05} />
                        <Shimmer className="h-4 w-full opacity-30" delay={0.1} />
                        <Shimmer className="h-3 w-56 opacity-30" delay={0.15} />
                    </div>
                    <div className="p-6 sm:p-8"><Shimmer className="h-32 w-full rounded-2xl opacity-20" delay={0.1} /></div>
                </div>
                <div className="mt-4 h-11 border-b border-neutral-200 xl:hidden dark:border-neutral-800" />
                <div className="max-w-[44rem] space-y-3 pt-12">
                    <Shimmer className="h-3 w-32" delay={0.2} />
                    <Shimmer className="h-8 w-64" delay={0.25} />
                    <div className="space-y-3 pt-8">
                        {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-4 w-full" delay={0.3 + i * 0.05} />)}
                        <Shimmer className="h-4 w-2/3" delay={0.5} />
                    </div>
                </div>
            </div>
            <div className="hidden space-y-2 pt-2 xl:block">
                <Shimmer className="h-3 w-24" />
                {[0, 1, 2, 3, 4, 5].map((i) => <Shimmer key={i} className="h-7 w-full rounded-lg" delay={i * 0.04} />)}
                <Shimmer className="mt-4 h-28 w-full rounded-2xl" delay={0.3} />
            </div>
        </div>
    )
}
