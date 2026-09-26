import { PageHeroSkeleton } from "@/components/page-hero";
/** Skeleton for a comparison page: a versus hero (7/5 split) over prose, a table, two columns. */
export default function Loading() {
    return (
        <div className="animate-pulse">
            <PageHeroSkeleton />
            <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-24">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className={i > 0 ? 'mt-16 border-t border-neutral-200 pt-16 dark:border-neutral-800' : ''}>
                        <div className="h-8 w-72 rounded bg-neutral-300 dark:bg-neutral-800" />
                        <div className="mt-5 space-y-3">
                            {Array.from({ length: 4 }).map((_, j) => (
                                <div key={j} className="h-5 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
                            ))}
                        </div>
                    </div>
                ))}
                <div className="mt-16 border-t border-neutral-200 pt-16 dark:border-neutral-800">
                    <div className="h-8 w-40 rounded bg-neutral-300 dark:bg-neutral-800" />
                    <div className="mt-8 space-y-px">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="h-14 bg-neutral-100 dark:bg-neutral-900" />
                        ))}
                    </div>
                </div>
                <div className="mt-16 grid gap-8 border-t border-neutral-200 pt-16 dark:border-neutral-800 md:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i}>
                            <div className="h-6 w-40 rounded bg-neutral-300 dark:bg-neutral-800" />
                            <div className="mt-4 space-y-3">
                                {Array.from({ length: 3 }).map((_, j) => (
                                    <div key={j} className="h-12 w-full rounded bg-neutral-100 dark:bg-neutral-900" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
