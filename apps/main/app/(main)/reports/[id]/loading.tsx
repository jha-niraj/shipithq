import { Shimmer } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

/** Shaped like the report: header, the five figures, wins, the chart, a module. */
export default function ReportLoading() {
    const card = "rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950";
    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 px-page py-6" aria-busy aria-label="Loading the report">
            <div className="space-y-2">
                <Shimmer className="h-3 w-56" />
                <Shimmer className="h-7 w-72" />
                <Shimmer className="h-4 w-96 max-w-full" />
            </div>
            <StatBandSkeleton count={5} cols={5} />
            <div className={card}><Shimmer className="mb-3 h-4 w-24" /><div className="grid gap-3 md:grid-cols-3">{[0, 1, 2].map((i) => <Shimmer key={i} className="h-16" delay={i * 0.08} />)}</div></div>
            <div className={card}><Shimmer className="mb-3 h-4 w-32" /><Shimmer className="aspect-[4/1] w-full" /></div>
            <div className={card}><Shimmer className="mb-3 h-4 w-40" /><Shimmer className="aspect-[5/2] w-full" /></div>
        </div>
    );
}
