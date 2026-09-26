// Hand-matched to the About page: PageHero-height hero (pt-16 / sm:pt-20 / lg:pt-24), stat band, mission grid, team grid, then the #contact section.
import { PageHeroSkeleton } from "@/components/page-hero";
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="w-full">
            <ShimmerStyles />

            {/* Hero */}
            <PageHeroSkeleton />

            {/* Stat band */}
            <section className="py-24">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="space-y-2">
                                <Shimmer className="h-10 w-24" delay={i * 0.06} />
                                <Shimmer className="h-4 w-28" delay={i * 0.06} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mission - 2-up */}
            <section className="border-t border-neutral-100 py-24 dark:border-neutral-800">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                        {[0, 1].map((i) => (
                            <div key={i} className="space-y-3">
                                <Shimmer className="h-11 w-11 rounded-xl" delay={i * 0.07} />
                                <Shimmer className="h-7 w-1/2" delay={i * 0.07} />
                                {[0, 1, 2].map((j) => (
                                    <Shimmer key={j} className="h-4 w-full" delay={i * 0.07 + j * 0.04} />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team - 2-up */}
            <section className="border-t border-neutral-100 py-24 dark:border-neutral-800">
                <div className="mx-auto max-w-7xl px-6">
                    <Shimmer className="mb-10 h-8 w-56" />
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                        {[0, 1].map((i) => (
                            <div key={i} className="flex gap-5">
                                <Shimmer className="h-28 w-28 shrink-0 rounded-2xl" delay={i * 0.07} />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <Shimmer className="h-5 w-40" delay={i * 0.07} />
                                    <Shimmer className="h-4 w-32" delay={i * 0.07} />
                                    <Shimmer className="h-4 w-full" delay={i * 0.07} />
                                    <div className="flex gap-2 pt-1">
                                        {[0, 1, 2].map((j) => (
                                            <Shimmer key={j} className="h-4 w-4 rounded" delay={i * 0.07 + j * 0.03} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* #contact - copy column beside the form */}
            <section className="border-t border-neutral-100 py-24 dark:border-neutral-800">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid gap-14 lg:grid-cols-[1fr_1.2fr]">
                        <div className="space-y-4">
                            <Shimmer className="h-9 w-56" />
                            <Shimmer className="h-5 w-full max-w-md" delay={0.06} />
                            <div className="space-y-5 pt-4">
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="space-y-1.5">
                                        <Shimmer className="h-3 w-24" delay={i * 0.06} />
                                        <Shimmer className="h-4 w-48" delay={i * 0.06} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="space-y-2">
                                    <Shimmer className="h-3.5 w-24" delay={i * 0.05} />
                                    <Shimmer className="h-10 w-full rounded-lg" delay={i * 0.05} />
                                </div>
                            ))}
                            <Shimmer className="h-28 w-full rounded-lg" delay={0.2} />
                            <Shimmer className="h-11 w-36 rounded-lg" delay={0.24} />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
