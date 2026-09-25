// Hand-matched to universities/page.tsx: the page frame, PageHeader (no
// actions), the three-cell StatBand, the info banner, search + sort, the
// university rows (logo, name, three figures, button) and the partner CTA.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />

            <div className="space-y-1.5">
                <Shimmer className="h-6 w-48" />
                <Shimmer className="h-4 w-80 max-w-full" delay={0.04} />
            </div>

            <StatBandSkeleton count={3} cols={3} />

            <div className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900/30">
                <Shimmer className="h-12 w-12 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                    <Shimmer className="h-5 w-56" delay={0.04} />
                    <Shimmer className="h-4 w-full" delay={0.06} />
                    <Shimmer className="h-4 w-3/4" delay={0.08} />
                    <Shimmer className="mt-1 h-4 w-72" delay={0.1} />
                </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
                <Shimmer className="h-11 flex-1 rounded-xl" />
                <Shimmer className="h-11 w-full rounded-xl sm:w-[180px]" delay={0.04} />
            </div>

            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                            <Shimmer className="h-14 w-14 shrink-0 rounded-xl" delay={i * 0.05} />
                            <div className="space-y-2">
                                <Shimmer className="h-5 w-64" delay={i * 0.05} />
                                <Shimmer className="h-4 w-28" delay={i * 0.05} />
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            {Array.from({ length: 3 }).map((__, j) => (
                                <div key={j} className="space-y-1.5">
                                    <Shimmer className="mx-auto h-7 w-16" delay={i * 0.05} />
                                    <Shimmer className="h-3 w-20" delay={i * 0.05} />
                                </div>
                            ))}
                            <Shimmer className="h-9 w-40 rounded-xl" delay={i * 0.05} />
                        </div>
                    </div>
                ))}
            </div>

            <Shimmer className="h-[140px] w-full rounded-2xl" />
        </div>
    );
}
