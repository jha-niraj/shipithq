// Hand-matched to job-applications-content.tsx: the page frame, the back link,
// PageHeader (job title, count), the search and status filter, then the
// applications table (header strip + rows on a 12-column grid).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />
            <Shimmer className="h-8 w-48 rounded-md" />

            <div className="space-y-1.5">
                <Shimmer className="h-6 w-64" />
                <Shimmer className="h-4 w-40" delay={0.04} />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
                <Shimmer className="h-9 w-full max-w-md rounded-xl" />
                <Shimmer className="h-9 w-[180px] rounded-xl" delay={0.04} />
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                <div className="hidden grid-cols-12 gap-4 border-b border-neutral-200 bg-neutral-50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900 md:grid">
                    <Shimmer className="col-span-4 h-4 w-24" />
                    <Shimmer className="col-span-2 h-4 w-16" />
                    <Shimmer className="col-span-2 h-4 w-16" />
                    <Shimmer className="col-span-2 h-4 w-24" />
                    <Shimmer className="col-span-2 ml-auto h-4 w-16" />
                </div>
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-12">
                            <div className="flex items-center gap-3 md:col-span-4">
                                <Shimmer className="h-10 w-10 shrink-0 rounded-full" delay={i * 0.04} />
                                <div className="flex-1 space-y-1.5">
                                    <Shimmer className="h-4 w-32" delay={i * 0.04} />
                                    <Shimmer className="h-4 w-44" delay={i * 0.04} />
                                </div>
                            </div>
                            <div className="flex items-center md:col-span-2"><Shimmer className="h-5 w-20 rounded-full" delay={i * 0.04} /></div>
                            <div className="flex items-center md:col-span-2"><Shimmer className="h-4 w-24" delay={i * 0.04} /></div>
                            <div className="flex items-center md:col-span-2"><Shimmer className="h-2 w-20 rounded-full" delay={i * 0.04} /></div>
                            <div className="flex items-center justify-end md:col-span-2"><Shimmer className="h-8 w-8 rounded-md" delay={i * 0.04} /></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
