// Hand-matched to _components/roles-editor.tsx: the page frame, PageHeader with a
// button, then the role list (19rem) beside the role card - name row, the five
// permission groups in two columns, the members list and the save row.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />
            <div className="flex items-center justify-between gap-3">
                <div className="space-y-1.5">
                    <Shimmer className="h-6 w-24" />
                    <Shimmer className="h-4 w-96 max-w-full" delay={0.04} />
                </div>
                <Shimmer className="h-8 w-28 rounded-lg" delay={0.06} />
            </div>
            <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
                <div className="h-fit space-y-1 rounded-2xl border border-neutral-200 bg-white p-1.5 dark:border-neutral-800 dark:bg-neutral-900">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                            <Shimmer className="h-8 w-8 rounded-lg" delay={i * 0.04} />
                            <div className="flex-1 space-y-1.5">
                                <Shimmer className="h-4 w-24" delay={i * 0.04} />
                                <Shimmer className="h-3 w-32" delay={i * 0.04} />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="border-b border-neutral-200 p-4 dark:border-neutral-800"><Shimmer className="h-9 w-72 rounded-lg" /></div>
                    <div className="grid gap-x-8 gap-y-5 p-4 sm:grid-cols-2">
                        {Array.from({ length: 5 }).map((_, g) => (
                            <div key={g} className="space-y-3">
                                <Shimmer className="h-3 w-24" delay={g * 0.04} />
                                {Array.from({ length: 2 }).map((__, i) => (
                                    <div key={i} className="flex items-center justify-between gap-3">
                                        <div className="space-y-1.5">
                                            <Shimmer className="h-4 w-36" delay={g * 0.04} />
                                            <Shimmer className="h-3 w-52" delay={g * 0.04} />
                                        </div>
                                        <Shimmer className="h-5 w-9 rounded-full" delay={g * 0.04} />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
                        <Shimmer className="mb-3 h-4 w-44" />
                        <div className="flex items-center gap-3">
                            <Shimmer className="h-8 w-8 rounded-full" />
                            <div className="flex-1 space-y-1.5"><Shimmer className="h-4 w-32" /><Shimmer className="h-3 w-44" /></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
