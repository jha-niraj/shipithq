// Hand-matched to the Inbox: the list with its header and tabs, the open item beside it.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { InboxDetailSkeleton, InboxListSkeleton } from "@repo/ui/components/inbox/inbox"

export default function Loading() {
    return (
        <div className="flex h-screen min-h-0">
            <ShimmerStyles />
            <div className="flex w-full shrink-0 flex-col border-neutral-200 lg:w-[28rem] lg:border-r dark:border-neutral-800">
                <div className="px-5 pt-4">
                    <div className="flex items-center gap-3"><Shimmer className="h-6 w-20" /><span className="flex-1" /><Shimmer className="h-5 w-24" delay={0.03} /></div>
                    <div className="mt-4 flex gap-5 pb-2.5">{[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-4 w-16" delay={0.05 + i * 0.02} />)}</div>
                </div>
                <ol className="border-t border-neutral-200 dark:border-neutral-800"><InboxListSkeleton /></ol>
            </div>
            <div className="hidden flex-1 lg:block">
                <div className="h-14 border-b border-neutral-200 dark:border-neutral-800" />
                <div className="mx-auto max-w-3xl px-6 py-8"><InboxDetailSkeleton /></div>
            </div>
        </div>
    )
}
