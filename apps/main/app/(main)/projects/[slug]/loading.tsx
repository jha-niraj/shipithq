// Matches project-details-client.tsx (the 2026-09-24 redesign): top bar, the
// hero band with its action column, the next-up strip, then the two-column
// body. Change the two together.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="min-h-screen w-full">
            <ShimmerStyles />
            <div className="mx-auto w-full max-w-6xl px-page py-6">
                <div className="flex justify-between"><Shimmer className="h-5 w-20" /><Shimmer className="h-8 w-72 rounded-lg" delay={0.06} /></div>
                <div className="mt-6 grid gap-8 border-b border-neutral-200 pb-8 dark:border-neutral-800 lg:grid-cols-[1fr_300px]">
                    <div className="space-y-3">
                        <Shimmer className="h-5 w-56" />
                        <Shimmer className="h-9 w-3/4" delay={0.05} />
                        <Shimmer className="h-6 w-2/3" delay={0.1} />
                        <Shimmer className="h-4 w-96" delay={0.15} />
                    </div>
                    <div className="space-y-3"><Shimmer className="h-6 w-full" /><Shimmer className="h-11 w-full rounded-lg" delay={0.05} /><Shimmer className="h-10 w-full rounded-lg" delay={0.1} /></div>
                </div>
                <Shimmer className="mt-6 h-20 w-full rounded-xl" />
                <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_300px]">
                    <div className="space-y-4">{[0, 1, 2].map((i) => <Shimmer key={i} className="h-32 w-full rounded-xl" delay={i * 0.06} />)}</div>
                    <div className="space-y-6">{[0, 1, 2].map((i) => <Shimmer key={i} className="h-28 w-full rounded-xl" delay={i * 0.06} />)}</div>
                </div>
            </div>
        </div>
    );
}
