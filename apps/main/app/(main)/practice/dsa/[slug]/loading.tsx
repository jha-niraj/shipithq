// Hand-matched to the DSA practice workspace (PD-14): header, then three
// panels at their default widths. Problem 25%, editor 40% (signature strip,
// code, test cases), mentor 35% (header, stage tracker, messages, input).
// Themed, like the workspace it stands in for (plan/practice-ui, UI-4).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="flex h-dvh w-full flex-col overflow-hidden bg-white dark:bg-neutral-950">
            <ShimmerStyles />
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-4">
                <div className="flex items-center gap-3">
                    <Shimmer className="h-4 w-4 rounded" />
                    <Shimmer className="h-4 w-40" delay={0.05} />
                    <Shimmer className="h-5 w-14 rounded-full" delay={0.08} />
                </div>
                <div className="flex items-center gap-2">
                    <Shimmer className="h-4 w-12" delay={0.1} />
                    <Shimmer className="h-8 w-16 rounded-md" delay={0.12} />
                    <Shimmer className="h-8 w-20 rounded-md" delay={0.14} />
                </div>
            </div>
            <div className="flex min-h-0 flex-1">
                <div className="w-1/4 min-w-0 space-y-4 border-r border-neutral-200 dark:border-neutral-800 p-6">
                    <Shimmer className="h-6 w-2/3" />
                    <div className="space-y-2 pt-1">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Shimmer key={i} className="h-3.5 w-full" delay={i * 0.04} />
                        ))}
                        <Shimmer className="h-3.5 w-3/5" delay={0.36} />
                    </div>
                    <Shimmer className="h-24 w-full rounded-lg" delay={0.4} />
                </div>
                <div className="flex w-[40%] min-w-0 flex-col border-r border-neutral-200 dark:border-neutral-800">
                    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 px-3">
                        <Shimmer className="h-3 w-10" />
                        <Shimmer className="h-3.5 w-72" delay={0.05} />
                    </div>
                    <div className="min-h-0 flex-1 space-y-2 p-4">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <Shimmer key={i} className="h-3.5" delay={0.08 + i * 0.03} />
                        ))}
                    </div>
                    <div className="h-[42%] shrink-0 border-t border-neutral-200 dark:border-neutral-800">
                        <div className="flex h-10 items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 px-3">
                            <Shimmer className="h-3.5 w-20" />
                            <Shimmer className="h-3.5 w-28" delay={0.05} />
                        </div>
                        <div className="space-y-3 p-3">
                            <div className="flex gap-2">
                                {[0, 1, 2].map((i) => <Shimmer key={i} className="h-7 w-16 rounded-lg" delay={i * 0.04} />)}
                            </div>
                            <Shimmer className="h-14 w-full rounded-lg" delay={0.12} />
                            <Shimmer className="h-9 w-full rounded-lg" delay={0.16} />
                        </div>
                    </div>
                </div>
                <div className="flex w-[35%] min-w-0 flex-col">
                    <div className="flex h-10 shrink-0 items-center border-b border-neutral-200 dark:border-neutral-800 px-4">
                        <Shimmer className="h-3.5 w-16" />
                    </div>
                    <div className="shrink-0 space-y-2 border-b border-neutral-200 dark:border-neutral-800 px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                            {[0, 1, 2, 3, 4].map((i) => <Shimmer key={i} className={i === 0 ? "h-6 w-24 rounded-full" : "h-6 w-6 rounded-full"} delay={i * 0.04} />)}
                        </div>
                        <Shimmer className="h-3 w-4/5" delay={0.2} />
                    </div>
                    <div className="min-h-0 flex-1 space-y-3 p-4">
                        <Shimmer className="h-16 w-4/5 rounded-lg" delay={0.24} />
                    </div>
                    <div className="border-t border-neutral-200 dark:border-neutral-800 p-3">
                        <Shimmer className="h-14 w-full rounded-lg" delay={0.28} />
                    </div>
                </div>
            </div>
        </div>
    );
}
