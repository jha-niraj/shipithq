// Shaped like the published resume: the action bar, then a paper sheet (RES-24).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

export default function Loading() {
    return (
        <div className="min-h-screen bg-neutral-100 px-4 py-8 dark:bg-neutral-900" aria-busy="true" aria-label="Loading resume">
            <ShimmerStyles />
            <div className="mx-auto mb-4 flex max-w-[700px] items-center justify-between">
                <Shimmer className="h-8 w-36 rounded-md" />
                <Shimmer className="h-8 w-32 rounded-md" delay={0.05} />
            </div>
            <div className="mx-auto max-w-[700px] space-y-3 rounded-lg bg-white p-10 shadow-xl dark:bg-neutral-800">
                <Shimmer className="h-7 w-56" />
                <Shimmer className="h-4 w-40" delay={0.05} />
                <Shimmer className="h-3 w-full" delay={0.1} />
                {Array.from({ length: 10 }).map((_, i) => (
                    <Shimmer key={i} className="h-3" delay={0.12 + i * 0.03} />
                ))}
            </div>
        </div>
    );
}
