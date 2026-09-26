// Shaped like the runner: the slim top bar, then one question with four answers.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

export default function Loading() {
    return (
        <div className="flex min-h-dvh flex-col">
            <ShimmerStyles />
            <div className="flex h-14 items-center gap-3 border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex-1 space-y-1.5"><Shimmer className="h-3 w-40" /><Shimmer className="h-4 w-56" /></div>
                <Shimmer className="h-7 w-16 rounded-lg" />
                <Shimmer className="h-8 w-16 rounded-md" />
            </div>
            <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-10">
                <Shimmer className="h-4 w-32" />
                <Shimmer className="h-6 w-full" />
                <Shimmer className="h-6 w-4/5" />
                <div className="grid gap-2.5 pt-3">{[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-14 w-full rounded-xl" delay={i * 0.04} />)}</div>
            </div>
        </div>
    )
}
