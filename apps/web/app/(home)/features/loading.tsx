import { PageHeroSkeleton } from "@/components/page-hero";
/**
 * Skeleton for /features.
 *
 * It mirrors the real layout: hero band, then the two-column body with the sticky index on
 * the left and six sections on the right. A skeleton that does not match is worse than no
 * skeleton, because the page visibly reflows when the real thing arrives.
 */
export default function Loading() {
    return (
        <div className="animate-pulse">
            {/* Hero band - matches PageHero's py-20 sm:py-24 lg:py-28 on the light surface. */}
            <PageHeroSkeleton />

            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
                <div className="grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
                    <div className="hidden space-y-2 lg:block">
                        <div className="mb-4 h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-4 w-28 rounded bg-neutral-200 dark:bg-neutral-800" />
                        ))}
                    </div>
                    <div className="min-w-0 space-y-20">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i}>
                                <div className="h-3 w-8 rounded bg-neutral-200 dark:bg-neutral-800" />
                                <div className="mt-3 h-9 w-56 rounded bg-neutral-300 dark:bg-neutral-800" />
                                <div className="mt-4 h-5 w-full max-w-xl rounded bg-neutral-200 dark:bg-neutral-800" />
                                <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                                    <div className="space-y-3">
                                        {Array.from({ length: 6 }).map((_, j) => (
                                            <div key={j} className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
                                        ))}
                                    </div>
                                    <div className="space-y-2.5">
                                        {Array.from({ length: 4 }).map((_, j) => (
                                            <div key={j} className="h-4 w-11/12 rounded bg-neutral-200 dark:bg-neutral-800" />
                                        ))}
                                        <div className="mt-6 h-32 rounded-xl bg-neutral-100 dark:bg-neutral-900" />
                                    </div>
                                </div>
                                <div className="mt-8 h-12 w-full rounded bg-neutral-100 dark:bg-neutral-900" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
