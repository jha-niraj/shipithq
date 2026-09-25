/**
 * The editor while it loads (plan/profile PRF-14): the identity strip, the section
 * nav and one pane of rows, at the same sizes as the real thing, so nothing moves
 * when the data lands.
 */
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export function ProfileEditorSkeleton() {
    return (
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col border-neutral-200 bg-white lg:border-x dark:border-neutral-800 dark:bg-black" aria-busy="true" aria-label="Loading your profile">
            <ShimmerStyles />
            <header className="border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                        <Shimmer className="size-14 rounded-2xl" />
                        <div className="space-y-2">
                            <Shimmer className="h-3 w-20" delay={0.05} />
                            <Shimmer className="h-5 w-44" delay={0.1} />
                            <Shimmer className="h-3.5 w-64" delay={0.15} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
                        <div className="w-full space-y-2 sm:w-44">
                            <Shimmer className="h-3 w-full" delay={0.1} />
                            <Shimmer className="h-1 w-full" delay={0.15} />
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:flex">
                            <Shimmer className="h-8 rounded-md sm:w-36" delay={0.2} />
                            <Shimmer className="h-8 rounded-md sm:w-20" delay={0.25} />
                            <Shimmer className="h-8 rounded-md sm:w-28" delay={0.3} />
                        </div>
                    </div>
                </div>
            </header>
            <div className="border-b border-neutral-200 px-4 py-2 lg:hidden dark:border-neutral-800">
                <Shimmer className="h-7 w-full rounded-xl" />
            </div>
            <div className="flex min-h-0 flex-1">
                <nav className="hidden w-56 shrink-0 border-r border-neutral-200 lg:block dark:border-neutral-800">
                    <div className="flex h-11 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
                        <Shimmer className="h-3 w-12" />
                        <Shimmer className="h-3 w-10" />
                    </div>
                    <div className="space-y-1 p-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex h-8 items-center px-2.5">
                                <Shimmer className="h-3.5 w-24" delay={i * 0.04} />
                            </div>
                        ))}
                    </div>
                </nav>
                <main className="min-w-0 flex-1">
                    <div className="flex h-11 items-center border-b border-neutral-200 px-6 dark:border-neutral-800">
                        <Shimmer className="h-3.5 w-20" />
                    </div>
                    <div className="w-full px-6 py-6">
                        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <div key={i} className="grid grid-cols-[8rem_minmax(0,1fr)] gap-4 py-3">
                                    <Shimmer className="h-3.5 w-16" delay={i * 0.04} />
                                    <Shimmer className="h-3.5 w-3/5" delay={i * 0.04 + 0.02} />
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
