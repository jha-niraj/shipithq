import { Suspense } from "react";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";
import { getUserPracticeStats, getDailyChallenge } from "@/actions/(main)/practice";
import { getModuleActivity } from "@/actions/(common)/stats/module-activity.action";
import { PracticeDashboard } from "./_components/practice-dashboard";

function DashboardSkeleton() {
    return (
        <div className="p-6 space-y-6">
            <StatBandSkeleton count={4} cols={4} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
            <Skeleton className="h-80 w-full rounded-xl" />
        </div>
    );
}

export default async function PracticePage() {
    const [stats, dailyChallenge, activity] = await Promise.all([
        getUserPracticeStats(),
        getDailyChallenge(),
        getModuleActivity("practice", 30),
    ]);

    // No scroller here. This div is a block child of the wrapper's <main>, which is
    // the real scroller - `flex-1` does nothing outside a flex parent and
    // `overflow-auto` never fires without a height cap. See JB-1.
    return (
        <div>
            <Suspense fallback={<DashboardSkeleton />}>
                <PracticeDashboard stats={stats} dailyChallenge={dailyChallenge.problem} activity={activity} />
            </Suspense>
        </div>
    );
}