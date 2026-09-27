import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

/**
 * Shaped like the case player as it arrives (INC-14, INC-45 to INC-48):
 *   - the page column: the top bar (back, title, Ask the lead, Start recording, progress),
 *     the steps list (18%) beside one chapter, and the bottom bar (Previous, Listen and its
 *     settings, Next);
 *   - the incident lead's panel on the right, full height, as the shell docks it on a
 *     case (lg and up, 380px, the rail's default width): its h-14 header, the thread, the
 *     composer.
 */
export default function Loading() {
    return (
        <div className="flex h-[calc(100dvh-var(--app-bottom-nav-h))] bg-white dark:bg-neutral-950" aria-busy="true" aria-label="Loading the case">
            <ShimmerStyles />
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex h-14 shrink-0 items-center gap-4 border-b border-neutral-200 px-4 dark:border-neutral-800">
                    <Shimmer className="h-7 w-24 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-1.5"><Shimmer className="h-3.5 w-64 max-w-full" /><Shimmer className="h-2.5 w-40" delay={0.05} /></div>
                    <Shimmer className="hidden h-8 w-28 rounded-full md:block" delay={0.06} />
                    <Shimmer className="hidden h-8 w-36 rounded-full md:block" delay={0.08} />
                    <Shimmer className="hidden h-2 w-40 rounded-full xl:block" delay={0.1} />
                </div>
                <div className="flex min-h-0 flex-1">
                    <div className="hidden w-[18%] min-w-[12rem] space-y-2 border-r border-neutral-200 p-4 lg:block dark:border-neutral-800">
                        {Array.from({ length: 14 }, (_, i) => <Shimmer key={i} className={i % 5 === 0 ? "mt-3 h-3 w-28" : "h-6 w-full rounded-md"} delay={i * 0.02} />)}
                    </div>
                    <div className="mx-auto w-full max-w-4xl space-y-4 px-5 pt-8 sm:px-8">
                        <Shimmer className="h-3 w-48" />
                        <Shimmer className="h-9 w-2/3" delay={0.05} />
                        <Shimmer className="mt-4 h-4 w-full" delay={0.08} />
                        <Shimmer className="h-4 w-4/5" delay={0.1} />
                        <Shimmer className="mt-6 h-56 w-full rounded-3xl" delay={0.12} />
                        <Shimmer className="h-24 w-full rounded-2xl" delay={0.14} />
                    </div>
                </div>
                <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-t border-neutral-200 px-4 dark:border-neutral-800">
                    <Shimmer className="h-10 w-36 rounded-xl" />
                    <div className="flex items-center gap-2">
                        <Shimmer className="h-10 w-28 rounded-full" delay={0.04} />
                        <Shimmer className="h-10 w-16 rounded-full" delay={0.06} />
                    </div>
                    <Shimmer className="h-10 w-44 rounded-xl" delay={0.08} />
                </div>
            </div>

            <aside className="hidden w-[380px] shrink-0 flex-col border-l border-neutral-200 lg:flex dark:border-neutral-800">
                <div className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 px-3 dark:border-neutral-800">
                    <Shimmer className="size-8 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-1.5"><Shimmer className="h-3.5 w-32" delay={0.04} /><Shimmer className="h-2.5 w-44" delay={0.06} /></div>
                    <Shimmer className="h-7 w-20 rounded-lg" delay={0.08} />
                    <Shimmer className="size-8 rounded-lg" delay={0.1} />
                </div>
                <div className="flex-1 space-y-3 p-3">
                    <Shimmer className="ml-auto h-10 w-3/5 rounded-2xl" delay={0.12} />
                    <Shimmer className="h-12 w-4/5 rounded-2xl" delay={0.14} />
                    <Shimmer className="ml-auto h-10 w-1/2 rounded-2xl" delay={0.16} />
                    <Shimmer className="h-12 w-3/4 rounded-2xl" delay={0.18} />
                </div>
                <div className="flex shrink-0 items-end gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
                    <Shimmer className="h-10 flex-1 rounded-xl" delay={0.2} />
                    <Shimmer className="size-10 rounded-xl" delay={0.22} />
                    <Shimmer className="size-10 rounded-xl" delay={0.24} />
                </div>
            </aside>
        </div>
    )
}
