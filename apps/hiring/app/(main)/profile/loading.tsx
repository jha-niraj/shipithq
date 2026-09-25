// Hand-matched to profile/page.tsx: the page frame, PageHeader (no actions),
// then a max-w-4xl column holding the profile card (cover strip, avatar
// overhanging it, name, email, two pills), the four-tab strip and the Personal
// Information card in view mode (four facts in two columns). Also the page's
// own client-side loading state.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />

            <div className="space-y-1.5">
                <Shimmer className="h-6 w-24" />
                <Shimmer className="h-4 w-72 max-w-full" delay={0.04} />
            </div>

            <div className="max-w-4xl space-y-5">
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                    <Shimmer className="h-32 w-full rounded-none" />
                    <div className="relative -mt-12 px-6 pb-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white dark:border-neutral-950 dark:bg-neutral-950">
                                <Shimmer className="h-full w-full rounded-xl" delay={0.04} />
                            </div>
                            <div className="flex-1 space-y-2 pt-4 sm:pt-0">
                                <Shimmer className="h-6 w-48" delay={0.06} />
                                <Shimmer className="h-4 w-56" delay={0.08} />
                                <div className="flex gap-2">
                                    <Shimmer className="h-6 w-24 rounded-full" delay={0.1} />
                                    <Shimmer className="h-6 w-20 rounded-full" delay={0.12} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Shimmer key={i} className="h-8 w-32 rounded-lg" delay={i * 0.05} />
                        ))}
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                        <div className="mb-6 flex items-center justify-between">
                            <Shimmer className="h-6 w-52" />
                            <Shimmer className="h-8 w-20 rounded-xl" delay={0.04} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-900/50">
                                    <Shimmer className="h-5 w-5 rounded" delay={i * 0.05} />
                                    <div className="space-y-1.5">
                                        <Shimmer className="h-3 w-16" delay={i * 0.05} />
                                        <Shimmer className="h-4 w-40" delay={i * 0.05} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
