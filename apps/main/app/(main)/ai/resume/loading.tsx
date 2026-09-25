// Matched to the resume hub after RES-21: header with two buttons, the tabs and
// origin-filter row over a hairline, then cards with a thumbnail band on top.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="w-full px-page">
            <ShimmerStyles />
            <div className="mx-auto w-full max-w-6xl pb-16">
                <div className="flex flex-col gap-4 pt-8 pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        <Shimmer className="h-7 w-48" />
                        <Shimmer className="h-4 w-80 max-w-full" delay={0.06} />
                    </div>
                    <div className="flex gap-2">
                        <Shimmer className="h-8 w-36 rounded-md" delay={0.1} />
                        <Shimmer className="h-8 w-32 rounded-md" delay={0.14} />
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-b border-neutral-200 pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
                    <Shimmer className="h-8 w-48 rounded-xl" />
                    <Shimmer className="h-8 w-72 max-w-full rounded-xl" delay={0.05} />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex min-h-64 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                            <div className="flex h-32 items-center justify-center border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                                <Shimmer className="h-24 w-[4.5rem] rounded-sm" delay={i * 0.05} />
                            </div>
                            <div className="flex flex-1 flex-col p-4">
                                <Shimmer className="h-4 w-3/4" delay={i * 0.05} />
                                <div className="mt-3 flex gap-1.5">
                                    <Shimmer className="h-5 w-16 rounded-md" delay={i * 0.05} />
                                    <Shimmer className="h-5 w-20 rounded-md" delay={i * 0.05} />
                                </div>
                                <Shimmer className="mt-auto h-3 w-40" delay={i * 0.05} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
