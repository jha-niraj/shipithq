import { PageHeroSkeleton } from "@/components/page-hero";
/** Skeleton for /compare: a ledger hero (copy, then a four-fact row) over a two-card grid. */
export default function Loading() {
    return (
        <div className="animate-pulse">
            <PageHeroSkeleton />
            <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-24">
                <div className="grid gap-5 sm:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-neutral-200 p-7 dark:border-neutral-800">
                            <div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-800" />
                            <div className="mt-3 h-6 w-48 rounded bg-neutral-300 dark:bg-neutral-800" />
                            <div className="mt-4 h-4 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
                            <div className="mt-2 h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                            <div className="mt-6 h-4 w-36 rounded bg-neutral-200 dark:bg-neutral-800" />
                        </div>
                    ))}
                </div>
                <div className="mt-16 h-64 rounded-2xl border border-neutral-200 dark:border-neutral-800" />
            </div>
        </div>
    )
}
