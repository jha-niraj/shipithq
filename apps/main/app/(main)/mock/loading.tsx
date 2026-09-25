import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

// Matched to the rebuilt page (MK-4): a header row with two actions, a four-cell stat
// band, then the practice chart. It previously described the marketing layout -
// a four-up platform stat band and a centred format hero - and leaving it would
// have drawn one page and then replaced it with another.
export default function Loading() {
    return (
        <div className="page-frame px-page pt-6 pb-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-56 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-4 w-80 max-w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
                <div className="flex gap-2">
                    <div className="h-9 w-44 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-9 w-28 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                </div>
            </div>

            <StatBandSkeleton count={4} cols={4} className="mt-6" />

            <div className="mt-8 space-y-3">
                <div className="h-4 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-[22rem] animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            </div>
        </div>
    )
}
