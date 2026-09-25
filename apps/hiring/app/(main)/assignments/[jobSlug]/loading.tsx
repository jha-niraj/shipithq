// Hand-matched to assignment-detail-content.tsx: the page frame, the back link,
// PageHeader (job title + status badge), the four-cell StatBand, the three
// tabs, then the candidate cards (avatar, name, status, dates, action button).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />
            <Shimmer className="h-5 w-40" />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                    <Shimmer className="h-6 w-60" />
                    <Shimmer className="h-4 w-72 max-w-full" delay={0.04} />
                </div>
                <Shimmer className="h-5 w-20 rounded-full" delay={0.06} />
            </div>

            <StatBandSkeleton count={4} cols={4} />

            <div className="space-y-6">
                <Shimmer className="h-9 w-[26rem] max-w-full rounded-lg" />
                <div className="grid gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <Shimmer className="h-10 w-10 rounded-full" delay={i * 0.04} />
                                    <div className="space-y-1.5">
                                        <Shimmer className="h-4 w-36" delay={i * 0.04} />
                                        <Shimmer className="h-4 w-48" delay={i * 0.04} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shimmer className="h-5 w-20 rounded-full" delay={i * 0.04} />
                                    <Shimmer className="h-8 w-8 rounded-md" delay={i * 0.04} />
                                </div>
                            </div>
                            <div className="mt-4 flex gap-6">
                                <Shimmer className="h-4 w-28" delay={i * 0.04} />
                                <Shimmer className="h-4 w-32" delay={i * 0.04} />
                            </div>
                            <Shimmer className="mt-4 h-8 w-36 rounded-md" delay={i * 0.04} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
