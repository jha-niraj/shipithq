// Hand-matched to `sprints-page-client.tsx`: the sprint rail (md+), the 56px
// header, the task list (400px on lg) and the detail pane with its five icon
// tabs. It used to draw a header, a tab row and a grid of cards - a different
// page - so the board jumped on load (plan/projects PJ-16 item 8). Change the
// two together.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="flex h-dvh w-full overflow-hidden">
            <ShimmerStyles />

            {/* Sprint rail */}
            <div className="hidden w-72 flex-col border-r border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/20 md:flex">
                <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
                    <Shimmer className="h-5 w-32" />
                </div>
                <div className="p-4 pb-2">
                    <Shimmer className="h-6 w-20" delay={0.04} />
                    <Shimmer className="mt-1.5 h-3 w-32" delay={0.08} />
                </div>
                <div className="flex-1 space-y-2 overflow-hidden px-3 py-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-xl p-3">
                            <Shimmer className="h-3 w-16" delay={i * 0.06} />
                            <Shimmer className="mt-2 h-4 w-44" delay={i * 0.06} />
                            <Shimmer className="mt-2 h-3 w-24" delay={i * 0.06} />
                            <Shimmer className="mt-2 h-1 w-full rounded-full" delay={i * 0.06} />
                        </div>
                    ))}
                </div>
                <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
                    <Shimmer className="h-9 w-full rounded-lg" delay={0.3} />
                </div>
            </div>

            <div className="flex h-full flex-1 flex-col bg-white dark:bg-neutral-950">
                {/* Header */}
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
                    <div className="flex items-center gap-4">
                        <Shimmer className="h-8 w-24 rounded-lg md:hidden" />
                        <Shimmer className="h-6 w-48" />
                    </div>
                    <div className="hidden items-center gap-2 lg:flex">
                        <Shimmer className="h-8 w-24 rounded-lg" delay={0.06} />
                        <Shimmer className="h-8 w-28 rounded-lg" delay={0.12} />
                        <Shimmer className="h-8 w-44 rounded-lg" delay={0.18} />
                    </div>
                </div>

                <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
                    {/* Task list */}
                    <div className="flex w-full min-h-0 flex-1 flex-col overflow-hidden border-r border-neutral-200 dark:border-neutral-800 lg:w-[400px] lg:flex-none">
                        <div className="space-y-3 p-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                                    <div className="flex items-start gap-3">
                                        <Shimmer className="mt-0.5 h-5 w-5 shrink-0 rounded-full" delay={i * 0.06} />
                                        <div className="min-w-0 flex-1">
                                            <Shimmer className="h-4 w-4/5" delay={i * 0.06} />
                                            <Shimmer className="mt-2 h-5 w-20 rounded-md" delay={i * 0.06} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detail pane */}
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <div className="shrink-0 border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
                            <div className="flex gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Shimmer key={i} className="h-8 w-10 rounded-lg" delay={i * 0.05} />
                                ))}
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
        </div>
    );
}
