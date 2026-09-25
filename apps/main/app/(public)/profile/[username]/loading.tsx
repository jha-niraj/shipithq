import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

/** Shaped like the one-pager (PRF-14): top bar, hero with portrait, stat band, two sections. */
export default function Loading() {
    return (
        <div className="min-h-dvh bg-white dark:bg-black" aria-busy="true" aria-label="Loading profile">
            <ShimmerStyles />
            <div className="border-b border-neutral-200 dark:border-neutral-800">
                <div className="mx-auto flex h-12 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
                    <Shimmer className="h-4 w-20" />
                    <Shimmer className="h-8 w-28 rounded-full" />
                </div>
            </div>
            <main className="mx-auto w-full max-w-4xl px-4 pb-20 sm:px-6">
                <section className="flex flex-col-reverse gap-8 pb-12 pt-10 sm:flex-row sm:items-start sm:justify-between sm:pt-16">
                    <div className="min-w-0 flex-1 space-y-3">
                        <Shimmer className="h-10 w-64 sm:h-12" />
                        <Shimmer className="h-5 w-80 max-w-full" delay={0.05} />
                        <Shimmer className="h-4 w-56" delay={0.1} />
                        <div className="flex gap-2 pt-3">
                            <Shimmer className="h-8 w-28 rounded-full" delay={0.15} />
                            <Shimmer className="h-8 w-20 rounded-full" delay={0.2} />
                            <Shimmer className="h-8 w-24 rounded-full" delay={0.25} />
                        </div>
                    </div>
                    <Shimmer className="aspect-square w-28 shrink-0 rounded-2xl sm:w-40" />
                </section>
                <StatBandSkeleton count={4} cols={4} size="sm" />
                {[0, 1].map((i) => (
                    <section key={i} className="mt-14">
                        <div className="mb-6 border-b border-neutral-200 pb-3 dark:border-neutral-800">
                            <Shimmer className="h-3 w-24" delay={i * 0.1} />
                        </div>
                        <div className="space-y-3">
                            <Shimmer className="h-4 w-full" delay={i * 0.1 + 0.05} />
                            <Shimmer className="h-4 w-11/12" delay={i * 0.1 + 0.1} />
                            <Shimmer className="h-4 w-4/5" delay={i * 0.1 + 0.15} />
                        </div>
                    </section>
                ))}
            </main>
        </div>
    );
}
