// Hand-matched to AIHubClient (_components/AIHubClient.tsx).
//
// Five full-bleed sections. Counts and geometry come from the component's own
// literals, not from memory: the hero is a two-column grid on lg
// (`minmax(0,1fr)_22rem`) with the artwork column dropped below it, `statCards`
// is a 3-cell StatBand (cols 3), `tools` is 3, `steps` is 3, and `priced` is
// 6 rows plus one hand-written row for the per-question interview price.
//
// The padding is copied verbatim from each section rather than approximated -
// the previous version still described the old marketing hero (pt-32 lg:pt-48,
// centred, one CTA) and the page dropped by ~13rem the moment it resolved.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function Loading() {
    return (
        <div className="w-full">
            <ShimmerStyles />

            {/* Hero - copy left, fanned template artwork right on lg+. */}
            <section className="relative border-b border-neutral-100 pt-12 pb-16 lg:pt-20 lg:pb-24 dark:border-neutral-800">
                <div className="w-full px-6">
                    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
                        <div className="space-y-7">
                            <Shimmer className="h-8 w-64 rounded-full" />
                            <div className="max-w-3xl space-y-3">
                                <Shimmer className="h-12 w-full" delay={0.06} />
                                <Shimmer className="h-12 w-11/12" delay={0.09} />
                                <Shimmer className="h-12 w-3/5" delay={0.12} />
                            </div>
                            <div className="max-w-2xl space-y-2">
                                <Shimmer className="h-6 w-full" delay={0.16} />
                                <Shimmer className="h-6 w-full" delay={0.18} />
                                <Shimmer className="h-6 w-2/3" delay={0.2} />
                            </div>
                            <div className="flex flex-wrap gap-4 pt-1">
                                <Shimmer className="h-12 w-56 rounded-full" delay={0.24} />
                                <Shimmer className="h-12 w-52 rounded-full" delay={0.27} />
                            </div>
                        </div>
                        {/* Matches the artwork column: hidden below lg, same height. */}
                        <div className="relative hidden h-[22rem] lg:block">
                            <Shimmer className="absolute top-1/2 left-1/2 h-72 w-44 -translate-x-1/2 -translate-y-1/2 rounded-xl" delay={0.12} />
                        </div>
                    </div>
                </div>
            </section>

            {/* Stat band - a three-cell StatBand (Resumes, Cover letters, Credits left). */}
            <section className="border-b border-neutral-100 bg-white py-12 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="w-full px-6">
                    <StatBandSkeleton count={3} cols={3} />
                </div>
            </section>

            {/* The tools - heading, then three cards. */}
            <section className="bg-neutral-50/50 py-20 dark:bg-neutral-950">
                <div className="w-full px-6">
                    <div className="max-w-2xl space-y-4">
                        <Shimmer className="h-9 w-40" />
                        <Shimmer className="h-6 w-3/4" delay={0.05} />
                    </div>
                    <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-full rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900"
                            >
                                <div className="mb-6 flex items-start justify-between gap-3">
                                    <Shimmer className="h-14 w-14 shrink-0 rounded-xl" delay={i * 0.06} />
                                    <Shimmer className="h-6 w-28 rounded-md" delay={i * 0.06} />
                                </div>
                                <Shimmer className="mb-3 h-8 w-3/4" delay={i * 0.06} />
                                <div className="mb-6 space-y-2">
                                    <Shimmer className="h-4 w-full" delay={i * 0.06} />
                                    <Shimmer className="h-4 w-full" delay={i * 0.06} />
                                    <Shimmer className="h-4 w-2/3" delay={i * 0.06} />
                                </div>
                                <div className="flex justify-end">
                                    <Shimmer className="h-4 w-16" delay={i * 0.06} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How a run goes - heading, then three numbered steps. */}
            <section className="border-t border-neutral-100 bg-white py-20 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="w-full px-6">
                    <div className="max-w-2xl space-y-4">
                        <Shimmer className="h-9 w-72" />
                        <Shimmer className="h-6 w-2/3" delay={0.05} />
                    </div>
                    <div className="mt-10 grid gap-8 md:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-8 dark:border-neutral-800 dark:bg-neutral-900/40"
                            >
                                <div className="mb-5 flex items-center gap-3">
                                    <Shimmer className="h-8 w-8 rounded-full" delay={i * 0.06} />
                                    <Shimmer className="h-5 w-5 rounded" delay={i * 0.06} />
                                </div>
                                <Shimmer className="mb-2 h-6 w-2/3" delay={i * 0.06} />
                                <div className="mb-6 space-y-2">
                                    <Shimmer className="h-4 w-full" delay={i * 0.06} />
                                    <Shimmer className="h-4 w-full" delay={i * 0.06} />
                                    <Shimmer className="h-4 w-1/2" delay={i * 0.06} />
                                </div>
                                <Shimmer className="h-4 w-32" delay={i * 0.06} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Prices - the table on the left, the balance card on the right. */}
            <section className="border-t border-neutral-100 bg-neutral-50/50 py-20 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="w-full px-6">
                    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                        <div>
                            <Shimmer className="mb-4 h-9 w-64" />
                            <div className="mb-8 max-w-2xl space-y-2">
                                <Shimmer className="h-6 w-full" delay={0.05} />
                                <Shimmer className="h-6 w-full" delay={0.07} />
                                <Shimmer className="h-6 w-1/2" delay={0.09} />
                            </div>
                            <div className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                                <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-3 dark:border-neutral-800">
                                    <Shimmer className="h-4 w-24" />
                                    <Shimmer className="h-4 w-12" />
                                </div>
                                {/* 6 priced rows + the per-question interview row. `divide-y`,
                                    matching the real table's tbody rather than a per-row border. */}
                                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {Array.from({ length: 7 }).map((_, i) => (
                                        <div key={i} className="flex items-center justify-between px-6 py-3">
                                            <Shimmer className="h-4 w-56" delay={i * 0.04} />
                                            <Shimmer className="h-4 w-20" delay={i * 0.04} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
                            <Shimmer className="h-4 w-28" />
                            <Shimmer className="mt-2 h-10 w-20" delay={0.05} />
                            <div className="mt-3 space-y-2">
                                <Shimmer className="h-4 w-full" delay={0.08} />
                                <Shimmer className="h-4 w-full" delay={0.1} />
                                <Shimmer className="h-4 w-2/3" delay={0.12} />
                            </div>
                            <Shimmer className="mt-6 h-9 w-full rounded-full" delay={0.15} />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
