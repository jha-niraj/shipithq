// Hand-matched to assignments-content.tsx: the page frame, PageHeader with one
// button, the five-cell StatBand, the search field, the job cards (icon, title,
// status, View button, three counts) and the "How Assessments Work" panel.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                    <Shimmer className="h-6 w-36" />
                    <Shimmer className="h-4 w-80 max-w-full" delay={0.04} />
                </div>
                <Shimmer className="h-9 w-56 rounded-xl" delay={0.06} />
            </div>

            <StatBandSkeleton count={5} cols={5} />

            <Shimmer className="h-9 w-full rounded-xl" />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                        <div className="mb-4 flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <Shimmer className="h-10 w-10 rounded-xl" delay={i * 0.05} />
                                <div className="space-y-1.5">
                                    <Shimmer className="h-5 w-36" delay={i * 0.05} />
                                    <Shimmer className="h-5 w-16 rounded-full" delay={i * 0.05} />
                                </div>
                            </div>
                            <Shimmer className="h-8 w-16 rounded-xl" delay={i * 0.05} />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                            {Array.from({ length: 3 }).map((__, j) => (
                                <div key={j} className="space-y-1.5">
                                    <Shimmer className="mx-auto h-5 w-10" delay={i * 0.05} />
                                    <Shimmer className="mx-auto h-3 w-14" delay={i * 0.05} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl bg-neutral-50 p-6 dark:bg-neutral-900">
                <Shimmer className="mb-3 h-5 w-48" />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex gap-3">
                            <Shimmer className="h-8 w-8 shrink-0 rounded-full" delay={i * 0.05} />
                            <div className="flex-1 space-y-1.5">
                                <Shimmer className="h-4 w-40" delay={i * 0.05} />
                                <Shimmer className="h-4 w-full" delay={i * 0.05} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
