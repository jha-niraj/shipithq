// Hand-matched to the memory page (UI-10): heading, the module tab row, the
// "where you stand" card, then memory groups as cards of rows.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="w-full space-y-5 px-page pb-6 pt-3">
            <ShimmerStyles />
            <div className="space-y-2">
                <Shimmer className="h-7 w-80" />
                <Shimmer className="h-4 w-full max-w-xl" delay={0.05} />
            </div>
            <Shimmer className="h-8 w-80 rounded-xl" delay={0.08} />
            <Shimmer className="h-32 w-full rounded-2xl" delay={0.1} />
            {[0, 1].map((g) => (
                <div key={g} className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <Shimmer className="h-4 w-32" delay={0.12 + g * 0.08} />
                    <Shimmer className="mt-1.5 h-3 w-64" delay={0.12 + g * 0.08} />
                    <div className="mt-4 space-y-4">
                        {[0, 1, 2].map((r) => (
                            <div key={r} className="flex items-start gap-3">
                                <div className="flex-1 space-y-1.5">
                                    <Shimmer className="h-4 w-48" delay={0.12 + g * 0.08 + r * 0.04} />
                                    <Shimmer className="h-3 w-72" delay={0.12 + g * 0.08 + r * 0.04} />
                                </div>
                                <Shimmer className="h-6 w-6 rounded-md" delay={0.12 + g * 0.08 + r * 0.04} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
