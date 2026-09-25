"use client";

/**
 * Matches `knowme-dashboard.tsx` shape for shape: the same full-height column,
 * the same 2/1 split, the same card edges. A skeleton that does not match is
 * worse than none, because the page visibly reflows the moment it resolves.
 */

import { Skeleton } from "@repo/ui/components/ui/skeleton";

export default function KnowMeDashboardSkeleton() {
    return (
        <div className="page-frame flex h-screen min-h-0 flex-col px-page py-4">
            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-3">
                <div className="flex min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white lg:col-span-2 lg:min-h-0 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-7 w-7 rounded-lg" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-4 w-44" />
                                <Skeleton className="h-3 w-56" />
                            </div>
                        </div>
                        <Skeleton className="h-5 w-16 rounded-full" />
                    </div>

                    {/* The empty state the chat actually shows first: a mark, two lines,
                        and four opener cards. */}
                    <div className="flex min-h-0 flex-1 flex-col items-center gap-3 px-4 py-10">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <Skeleton className="h-5 w-56" />
                        <Skeleton className="h-4 w-72" />
                        <div className="mt-3 grid w-full max-w-3xl gap-2.5 sm:grid-cols-2">
                            {[0, 1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-14 rounded-xl" />
                            ))}
                        </div>
                    </div>

                    <div className="shrink-0 border-t border-neutral-200 p-3 sm:px-6 dark:border-neutral-800">
                        <Skeleton className="h-11 w-full rounded-2xl" />
                        <Skeleton className="mx-auto mt-2 h-3 w-72" />
                    </div>
                </div>

                <div className="min-h-0 space-y-4">
                    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="mb-3 flex items-center justify-between">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <div className="mt-4 space-y-2.5">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-4 w-12" />
                                </div>
                            ))}
                        </div>
                        <Skeleton className="mt-4 h-8 w-full rounded-md" />
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                        <Skeleton className="mb-3 h-4 w-28" />
                        <div className="space-y-1">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="flex items-center justify-between py-1.5">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-8 w-8 rounded-lg" />
                                        <Skeleton className="h-4 w-28" />
                                    </div>
                                    <Skeleton className="h-5 w-5 rounded" />
                                </div>
                            ))}
                        </div>
                        <Skeleton className="mt-3 h-8 w-full rounded-md" />
                    </div>

                    <Skeleton className="h-44 rounded-2xl" />

                    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                        <Skeleton className="mb-3 h-4 w-12" />
                        <Skeleton className="mb-3 h-4 w-full" />
                        <Skeleton className="h-8 w-full rounded-md" />
                    </div>
                </div>
            </div>
        </div>
    );
}
