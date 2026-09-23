"use client";

/**
 * Matches `knowme-analytics.tsx`. The old one showed four stat cards in a
 * `grid-cols-4` at every width while the real page is `grid-cols-2` below `lg`,
 * so on a phone the page rearranged itself the moment the data arrived.
 */

import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

export default function AnalyticsSkeleton() {
    return (
        <div className="w-full px-4 py-6 sm:px-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-52" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-40 rounded-xl" />
                    <Skeleton className="h-10 w-28 rounded-md" />
                </div>
            </div>

            <StatBandSkeleton count={4} cols={4} className="mb-6" />

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
                {[0, 1].map((i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
                    >
                        <Skeleton className="mb-4 h-5 w-44" />
                        <div className="space-y-3">
                            {[0, 1, 2, 3, 4].map((j) => (
                                <Skeleton key={j} className="h-11 rounded-xl" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 lg:col-span-2 dark:border-neutral-800 dark:bg-neutral-900">
                    <Skeleton className="mb-4 h-5 w-36" />
                    <div className="space-y-3">
                        {[0, 1, 2].map((i) => (
                            <Skeleton key={i} className="h-16 rounded-xl" />
                        ))}
                    </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <Skeleton className="mb-4 h-5 w-24" />
                    <div className="space-y-3">
                        {[0, 1].map((i) => (
                            <Skeleton key={i} className="h-16 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <Skeleton className="mb-4 h-5 w-40" />
                <Skeleton className="h-40 w-full rounded-lg" />
            </div>
        </div>
    );
}
