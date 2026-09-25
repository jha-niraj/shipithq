// Hand-matched to invoices/page.tsx: the page frame, PageHeader (no actions),
// the four-cell StatBand, search + status filter, then the invoice cards
// (icon, number, date, status badge, amount, View/PDF). Also the page's own
// client-side loading state.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />

            <div className="space-y-1.5">
                <Shimmer className="h-6 w-28" />
                <Shimmer className="h-4 w-72 max-w-full" delay={0.04} />
            </div>

            <StatBandSkeleton count={4} cols={4} />

            <div className="flex flex-col gap-4 sm:flex-row">
                <Shimmer className="h-9 flex-1 rounded-md" />
                <Shimmer className="h-9 w-full rounded-md sm:w-[180px]" delay={0.04} />
            </div>

            <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex items-start gap-4">
                            <Shimmer className="h-11 w-11 shrink-0 rounded-xl" delay={i * 0.04} />
                            <div className="space-y-2">
                                <Shimmer className="h-5 w-36" delay={i * 0.04} />
                                <Shimmer className="h-4 w-32" delay={i * 0.04} />
                                <Shimmer className="h-5 w-20 rounded-full" delay={i * 0.04} />
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <Shimmer className="h-7 w-24" delay={i * 0.04} />
                            <div className="flex gap-2">
                                <Shimmer className="h-8 w-16 rounded-md" delay={i * 0.04} />
                                <Shimmer className="h-8 w-14 rounded-md" delay={i * 0.04} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
