// The same wrapper and blocks as page.tsx + HomeDashboard, so the swap from
// skeleton to content moves nothing (plan/home HOME-1).
import { HomeDashboardSkeleton, ActivityCalendarSkeleton } from "./_components/skeletons";

export default function HomeLoading() {
    return (
        <div className="page-frame pb-4">
            <HomeDashboardSkeleton />
            <div className="mx-auto w-full px-page pb-10">
                <ActivityCalendarSkeleton />
            </div>
        </div>
    );
}
