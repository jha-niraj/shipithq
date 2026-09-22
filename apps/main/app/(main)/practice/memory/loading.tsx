// Hand-matched to the memory page: header, then status groups as cards of rows.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="w-full space-y-6 px-page py-6">
            <ShimmerStyles />
            <div className="space-y-2">
                <Shimmer className="h-7 w-80" />
                <Shimmer className="h-4 w-full max-w-xl" delay={0.05} />
            </div>
            {[0, 1].map((g) => (
                <div key={g} className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <Shimmer className="h-4 w-32" delay={g * 0.08} />
                    <Shimmer className="mt-1.5 h-3 w-64" delay={g * 0.08} />
                    <div className="mt-4 space-y-4">
                        {[0, 1, 2].map((r) => (
                            <div key={r} className="flex items-start gap-3">
                                <div className="flex-1 space-y-1.5">
                                    <Shimmer className="h-4 w-48" delay={g * 0.08 + r * 0.04} />
                                    <Shimmer className="h-3 w-72" delay={g * 0.08 + r * 0.04} />
                                </div>
                                <Shimmer className="h-8 w-8 rounded-lg" delay={g * 0.08 + r * 0.04} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
