// Hand-matched to settings/page.tsx: the page frame, PageHeader (no actions),
// then a max-w-3xl column of three cards - Profile Settings (two fields and a
// button), Notifications (four switch rows) and Security (a button and one
// switch row).
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";

function CardTitle({ delay = 0 }: { delay?: number }) {
    return (
        <div className="mb-6 flex items-center gap-2">
            <Shimmer className="h-5 w-5 rounded" delay={delay} />
            <Shimmer className="h-6 w-40" delay={delay} />
        </div>
    );
}

function SwitchRow({ delay = 0 }: { delay?: number }) {
    return (
        <div className="flex items-center justify-between py-2">
            <div className="space-y-1.5">
                <Shimmer className="h-5 w-40" delay={delay} />
                <Shimmer className="h-4 w-60" delay={delay} />
            </div>
            <Shimmer className="h-5 w-9 rounded-full" delay={delay} />
        </div>
    );
}

export default function Loading() {
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <ShimmerStyles />

            <div className="space-y-1.5">
                <Shimmer className="h-6 w-24" />
                <Shimmer className="h-4 w-64 max-w-full" delay={0.04} />
            </div>

            <div className="max-w-3xl space-y-8">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                    <CardTitle />
                    <div className="space-y-4">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Shimmer className="h-4 w-20" delay={i * 0.04} />
                                <Shimmer className="h-9 w-full rounded-xl" delay={i * 0.04} />
                            </div>
                        ))}
                        <Shimmer className="h-9 w-36 rounded-xl" delay={0.1} />
                    </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                    <CardTitle delay={0.08} />
                    <div className="space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <SwitchRow key={i} delay={0.08 + i * 0.04} />
                        ))}
                    </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                    <CardTitle delay={0.16} />
                    <div className="space-y-4">
                        <Shimmer className="h-9 w-40 rounded-xl" delay={0.16} />
                        <SwitchRow delay={0.2} />
                    </div>
                </div>
            </div>
        </div>
    );
}
