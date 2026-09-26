// Hand-matched to the verification page: a "Back to Hiring Platform" link, the
// header, a 4-cell StatBand (Claims waiting / Sign-ups waiting / Approved /
// Rejected), the "Claims on company pages" section (HR-8: details on the left,
// Approve/Reject on the right), then "New company sign-ups" as ONE column of
// cards (icon+name+industry+badge, a 2x2 detail grid, a footer with date +
// Details/Reject/Approve). The cards were drawn two-up before, while the page
// has always stacked them.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export default function Loading() {
    return (
        <div className="p-6">
            <ShimmerStyles />
            <div className="w-full mx-auto">
                <Shimmer className="mb-4 h-4 w-40" />
                <div className="mb-8 space-y-2">
                    <Shimmer className="h-7 w-52" />
                    <Shimmer className="h-4 w-72" delay={0.06} />
                </div>

                <StatBandSkeleton count={4} cols={4} className="mb-8" />

                <div className="mb-10">
                    <div className="mb-3 flex justify-between"><Shimmer className="h-6 w-56" /><Shimmer className="h-4 w-20" /></div>
                    <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 lg:flex-row lg:justify-between dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex-1 space-y-3">
                            <Shimmer className="h-5 w-56" />
                            {Array.from({ length: 4 }).map((_, j) => (
                                <div key={j} className="flex gap-8"><Shimmer className="h-4 w-24" delay={j * 0.03} /><Shimmer className="h-4 w-56" delay={j * 0.03} /></div>
                            ))}
                        </div>
                        <div className="flex flex-col gap-2 lg:w-72">
                            <Shimmer className="h-9 w-full rounded-md" delay={0.1} />
                            <Shimmer className="h-9 w-full rounded-md" delay={0.12} />
                        </div>
                    </div>
                </div>

                <div className="mb-3 flex justify-between"><Shimmer className="h-6 w-48" /><Shimmer className="h-4 w-20" /></div>
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-5">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <Shimmer className="h-12 w-12 shrink-0 rounded-xl" delay={i * 0.05} />
                                    <div className="space-y-1.5">
                                        <Shimmer className="h-4 w-28" delay={i * 0.05} />
                                        <Shimmer className="h-3 w-20" delay={i * 0.05} />
                                    </div>
                                </div>
                                <Shimmer className="h-5 w-16 rounded-full" delay={i * 0.05} />
                            </div>
                            <div className="mb-4 grid grid-cols-2 gap-3">
                                {Array.from({ length: 4 }).map((_, j) => (
                                    <Shimmer key={j} className="h-3.5 w-24" delay={i * 0.05 + j * 0.02} />
                                ))}
                            </div>
                            <div className="flex items-center justify-between border-t border-neutral-100 pt-4 dark:border-neutral-800">
                                <Shimmer className="h-3 w-24" delay={i * 0.05} />
                                <div className="flex gap-2">
                                    <Shimmer className="h-7 w-16 rounded-lg" delay={i * 0.05} />
                                    <Shimmer className="h-7 w-16 rounded-lg" delay={i * 0.05} />
                                    <Shimmer className="h-7 w-20 rounded-lg" delay={i * 0.05} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
