// Hand-matched to AIHubClient (_components/AIHubClient.tsx), which is an
// overview in the page frame since plan/ui-pass UI-10: the hero card (copy left,
// a 16rem artwork column on lg+), a 3-cell StatBand and the cover-letter chart,
// three tool cards, three steps, then the price table beside the balance card
// (6 priced rows plus the per-question interview row). Change the two together.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

const CARD = "rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";

function SectionHeading({ w }: { w: string }) {
    return (
        <div className="space-y-1.5">
            <Shimmer className={`h-6 ${w}`} />
            <Shimmer className="h-4 w-80 max-w-full" delay={0.04} />
        </div>
    );
}

export default function Loading() {
    return (
        <div className="page-frame space-y-8 px-page pt-6 pb-10">
            <ShimmerStyles />

            <section className="rounded-2xl border border-neutral-200 bg-white px-6 py-8 lg:px-8 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
                    <div className="space-y-4">
                        <Shimmer className="h-6 w-56 rounded-full" />
                        <div className="max-w-2xl space-y-2">
                            <Shimmer className="h-8 w-full" delay={0.06} />
                            <Shimmer className="h-8 w-3/5" delay={0.09} />
                        </div>
                        <div className="max-w-2xl space-y-2">
                            <Shimmer className="h-4 w-full" delay={0.12} />
                            <Shimmer className="h-4 w-2/3" delay={0.14} />
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <Shimmer className="h-9 w-48 rounded-full" delay={0.18} />
                            <Shimmer className="h-9 w-44 rounded-full" delay={0.2} />
                        </div>
                    </div>
                    <div className="relative hidden h-[15rem] lg:block">
                        <Shimmer className="absolute top-1/2 left-1/2 h-48 w-32 -translate-x-1/2 -translate-y-1/2 rounded-xl" delay={0.12} />
                    </div>
                </div>
            </section>

            <section>
                <StatBandSkeleton count={3} cols={3} />
                <div className={`mt-4 p-5 ${CARD}`}>
                    <div className="mb-1 flex items-center justify-between">
                        <Shimmer className="h-5 w-44" />
                        <Shimmer className="h-4 w-24" />
                    </div>
                    <Shimmer className="mb-3 h-4 w-36" delay={0.04} />
                    <Shimmer className="h-48 w-full rounded-xl" delay={0.08} />
                </div>
            </section>

            <section>
                <SectionHeading w="w-28" />
                <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className={`p-5 ${CARD}`}>
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <Shimmer className="h-10 w-10 rounded-xl" delay={i * 0.06} />
                                <Shimmer className="h-5 w-24 rounded-md" delay={i * 0.06} />
                            </div>
                            <Shimmer className="mb-1.5 h-5 w-1/2" delay={i * 0.06} />
                            <div className="mb-4 space-y-2">
                                <Shimmer className="h-4 w-full" delay={i * 0.06} />
                                <Shimmer className="h-4 w-2/3" delay={i * 0.06} />
                            </div>
                            <div className="flex justify-end"><Shimmer className="h-4 w-12" delay={i * 0.06} /></div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <SectionHeading w="w-56" />
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className={`p-5 ${CARD}`}>
                            <div className="mb-3 flex items-center gap-3">
                                <Shimmer className="h-8 w-8 rounded-full" delay={i * 0.06} />
                                <Shimmer className="h-5 w-5 rounded" delay={i * 0.06} />
                            </div>
                            <Shimmer className="mb-1.5 h-5 w-2/3" delay={i * 0.06} />
                            <div className="mb-4 space-y-2">
                                <Shimmer className="h-4 w-full" delay={i * 0.06} />
                                <Shimmer className="h-4 w-1/2" delay={i * 0.06} />
                            </div>
                            <Shimmer className="h-4 w-32" delay={i * 0.06} />
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
                <div>
                    <Shimmer className="h-6 w-52" />
                    <div className="mt-1.5 mb-4 max-w-2xl space-y-2">
                        <Shimmer className="h-4 w-full" delay={0.05} />
                        <Shimmer className="h-4 w-1/2" delay={0.07} />
                    </div>
                    <div className={CARD}>
                        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-3 dark:border-neutral-800">
                            <Shimmer className="h-4 w-24" />
                            <Shimmer className="h-4 w-12" />
                        </div>
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
                <div className={`p-5 ${CARD}`}>
                    <Shimmer className="h-4 w-28" />
                    <Shimmer className="mt-2 h-9 w-20" delay={0.05} />
                    <div className="mt-3 space-y-2">
                        <Shimmer className="h-4 w-full" delay={0.08} />
                        <Shimmer className="h-4 w-2/3" delay={0.1} />
                    </div>
                    <Shimmer className="mt-4 h-9 w-full rounded-full" delay={0.15} />
                </div>
            </section>
        </div>
    );
}
