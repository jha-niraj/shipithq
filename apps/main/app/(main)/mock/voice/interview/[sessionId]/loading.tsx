// Hand-matched to the live interview: the header, the call on the left, the transcript on the right.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="flex min-h-dvh flex-col">
            <ShimmerStyles />
            <div className="flex h-14 items-center gap-3 border-b border-neutral-200 px-4 dark:border-neutral-800">
                <Shimmer className="h-7 w-7 rounded-md" />
                <div className="flex-1 space-y-1.5">
                    <Shimmer className="h-3 w-24" delay={0.04} />
                    <Shimmer className="h-4 w-48" delay={0.06} />
                </div>
                <Shimmer className="h-7 w-16 rounded-lg" delay={0.08} />
            </div>
            <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
                <div className="flex flex-col items-center justify-center gap-6 px-4 py-10">
                    <Shimmer className="h-40 w-40 rounded-full" delay={0.1} />
                    <Shimmer className="h-4 w-32" delay={0.14} />
                    <Shimmer className="h-9 w-44 rounded-md" delay={0.18} />
                </div>
                <div className="hidden border-l border-neutral-200 p-4 lg:block dark:border-neutral-800">
                    <Shimmer className="mb-4 h-3 w-20" delay={0.1} />
                    <div className="space-y-3">
                        <Shimmer className="h-12 w-3/4 rounded-2xl" delay={0.14} />
                        <Shimmer className="ml-auto h-16 w-2/3 rounded-2xl" delay={0.18} />
                        <Shimmer className="h-10 w-3/5 rounded-2xl" delay={0.22} />
                    </div>
                </div>
            </div>
        </div>
    );
}
