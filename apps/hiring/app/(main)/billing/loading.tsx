// Hand-matched to billing/page.tsx: the page frame, PageHeader (no actions), the
// current-plan banner, the billing-overview StatBand, "Usage This Month" and its
// StatBand, the three plan cards, then the invoices/payments tabs. Also used as
// the page's own client-side loading state, so first paint and data wait match.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />

            <div className="space-y-1.5">
                <Shimmer className="h-6 w-52" />
                <Shimmer className="h-4 w-96 max-w-full" delay={0.04} />
            </div>

            <div className="flex flex-col justify-between gap-6 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800 lg:flex-row lg:items-center">
                <div className="space-y-2">
                    <Shimmer className="h-4 w-24" />
                    <Shimmer className="h-8 w-40" delay={0.04} />
                    <Shimmer className="h-4 w-72 max-w-full" delay={0.06} />
                </div>
                <div className="flex gap-3">
                    <Shimmer className="h-8 w-20 rounded-md" delay={0.08} />
                    <Shimmer className="h-8 w-20 rounded-md" delay={0.1} />
                </div>
            </div>

            <StatBandSkeleton count={4} cols={4} />

            <div>
                <Shimmer className="mb-4 h-6 w-44" />
                <StatBandSkeleton count={4} cols={4} />
            </div>

            <div>
                <Shimmer className="mb-4 h-6 w-36" />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                            <Shimmer className="h-6 w-24" delay={i * 0.05} />
                            <Shimmer className="mt-2 h-10 w-32" delay={i * 0.05} />
                            <div className="mb-6 mt-6 space-y-3">
                                {Array.from({ length: 6 }).map((__, j) => (
                                    <Shimmer key={j} className="h-4 w-full" delay={i * 0.05 + j * 0.02} />
                                ))}
                            </div>
                            <Shimmer className="h-10 w-full rounded-md" delay={i * 0.05} />
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <Shimmer className="h-9 w-56 rounded-lg" />
                <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                    <Shimmer className="mb-4 h-5 w-32" />
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-neutral-100 py-4 last:border-0 dark:border-neutral-800">
                            <div className="space-y-1.5">
                                <Shimmer className="h-4 w-40" delay={i * 0.05} />
                                <Shimmer className="h-3 w-24" delay={i * 0.05} />
                            </div>
                            <Shimmer className="h-5 w-16" delay={i * 0.05} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
