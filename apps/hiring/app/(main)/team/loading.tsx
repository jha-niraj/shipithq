// Hand-matched to team-content.tsx: the page frame, PageHeader with the invite
// button, the four-cell StatBand, then "Team Members (n)" and one card per
// member (avatar, name, email, role badge, menu).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                    <Shimmer className="h-6 w-40" />
                    <Shimmer className="h-4 w-72 max-w-full" delay={0.04} />
                </div>
                <Shimmer className="h-9 w-36 rounded-xl" delay={0.06} />
            </div>

            <StatBandSkeleton count={4} cols={4} />

            <div>
                <Shimmer className="mb-4 h-6 w-44" />
                <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                            <div className="flex items-center gap-4">
                                <Shimmer className="h-12 w-12 shrink-0 rounded-full" delay={i * 0.04} />
                                <div className="space-y-1.5">
                                    <Shimmer className="h-5 w-40" delay={i * 0.04} />
                                    <Shimmer className="h-4 w-52" delay={i * 0.04} />
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Shimmer className="h-6 w-20 rounded-full" delay={i * 0.04} />
                                <Shimmer className="h-9 w-9 rounded-md" delay={i * 0.04} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
