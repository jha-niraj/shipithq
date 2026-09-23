// Hand-matched to `sprints-page-client.tsx`: the sprint rail (md+), the task
// list (400px on lg) and the detail pane, each topped by a 48px row - there is
// no page header since PJ-17. It used to draw a header, a tab row and a grid of cards - a different
// page - so the board jumped on load (plan/projects PJ-16 item 8). Change the
// two together.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="flex h-dvh w-full overflow-hidden">
            <ShimmerStyles />

            {/* Sprint rail */}
            <div className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/20 md:flex">
                <div className="flex h-12 items-center border-b border-neutral-200 px-4 dark:border-neutral-800">
                    <Shimmer className="h-4 w-36" />
                </div>
                <div className="flex-1 space-y-1 overflow-hidden p-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                            <div className="flex items-start gap-2.5 px-2.5 py-2">
                                <Shimmer className="h-5 w-5 shrink-0 rounded-full" delay={i * 0.06} />
                                <div className="flex-1">
                                    <Shimmer className="h-4 w-40" delay={i * 0.06} />
                                    <Shimmer className="mt-1.5 h-3 w-16" delay={i * 0.06} />
                                </div>
                            </div>
                            <Shimmer className="ml-[30px] h-6 w-32 rounded-md" delay={i * 0.06 + 0.03} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-neutral-950 lg:flex-row">
                {/* Task list */}
                <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden border-r border-neutral-200 dark:border-neutral-800 lg:w-[400px] lg:flex-none">
                    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-neutral-200 px-3 dark:border-neutral-800">
                        <Shimmer className="h-8 w-24 rounded-lg md:hidden" />
                        <Shimmer className="h-4 w-44" />
                    </div>
                    <div className="space-y-2 p-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="rounded-xl border border-neutral-200 px-3 py-3 dark:border-neutral-800">
                                <div className="flex items-start gap-3">
                                    <Shimmer className="mt-0.5 h-5 w-5 shrink-0 rounded-full" delay={i * 0.06} />
                                    <div className="min-w-0 flex-1">
                                        <Shimmer className="h-4 w-4/5" delay={i * 0.06} />
                                        <Shimmer className="mt-2 h-3 w-28" delay={i * 0.06} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Detail pane */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 px-3 dark:border-neutral-800">
                        <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Shimmer key={i} className="h-8 w-10 rounded-lg" delay={i * 0.05} />
                            ))}
                        </div>
                        <div className="flex gap-1.5">
                            <Shimmer className="h-8 w-24 rounded-lg" delay={0.25} />
                            <Shimmer className="h-8 w-24 rounded-lg" delay={0.3} />
                        </div>
                    </div>
                    <div className="space-y-4 p-6">
                        <Shimmer className="h-7 w-2/3" />
                        <Shimmer className="h-4 w-full" delay={0.06} />
                        <Shimmer className="h-4 w-5/6" delay={0.1} />
                        <Shimmer className="h-40 w-full rounded-xl" delay={0.14} />
                    </div>
                </div>
            </div>
        </div>
    );
}
