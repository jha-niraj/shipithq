// Hand-matched to job-form-content.tsx: the page frame, the back link,
// PageHeader with two buttons, then the form's section cards in a max-w-4xl
// column (icon + heading row, then fields).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />
            <Shimmer className="h-5 w-28" />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                    <Shimmer className="h-6 w-44" />
                    <Shimmer className="h-4 w-80 max-w-full" delay={0.04} />
                </div>
                <div className="flex gap-2">
                    <Shimmer className="h-9 w-32 rounded-md" delay={0.06} />
                    <Shimmer className="h-9 w-32 rounded-md" delay={0.08} />
                </div>
            </div>

            <div className="max-w-4xl space-y-6">
                {Array.from({ length: 4 }).map((_, s) => (
                    <div key={s} className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="mb-6 flex items-center gap-3">
                            <Shimmer className="h-9 w-9 rounded-lg" delay={s * 0.08} />
                            <div className="space-y-1.5">
                                <Shimmer className="h-5 w-44" delay={s * 0.08} />
                                <Shimmer className="h-4 w-64" delay={s * 0.08} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Shimmer className="h-3.5 w-28" delay={s * 0.08 + i * 0.04} />
                                    <Shimmer className="h-11 w-full rounded-lg" delay={s * 0.08 + i * 0.04} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
