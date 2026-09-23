import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

// Matched to credits-client: header with a three-cell stat band, then a purchases
// table and a history list. A skeleton that does not match is worse than none,
// because the page visibly reflows when the real thing lands.
export default function Loading() {
    return (
        <div className="flex h-dvh flex-col overflow-hidden">
            <div className="shrink-0 border-b border-neutral-200 px-6 py-5 dark:border-neutral-800">
                <div className="h-6 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                <StatBandSkeleton count={3} cols={3} className="mt-5" />
            </div>
            {/* Three sections, in the order the page renders them: usage by
                feature, the spend trend, then purchases. History is a panel now,
                not a section, so nothing is reserved for it here. */}
            <div className="space-y-10 p-6">
                <div>
                    <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="mt-3 h-48 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                </div>
                <div>
                    <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="mt-3 h-64 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                </div>
                <div>
                    <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="mt-3 h-40 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                </div>
            </div>
        </div>
    )
}
