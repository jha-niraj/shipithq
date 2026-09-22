// Hand-matched to the home dashboard - see _components/skeletons.tsx (HomeDashboardSkeleton).
import {
    HomeDashboardSkeleton, ContinueLearningSkeleton, ActivityCalendarSkeleton,
} from "./_components/skeletons";

// Mirrors the real page: the analytics dashboard, then the two surfaces below it.
// Deliberately a SKELETON rather than the full-page ShipItHQLoader - the sidebar is
// already painted around this, so previewing the layout beats a centred spinner.
export default function HomeLoading() {
    return (
        <div className="w-full pb-4">
            <div className="mx-auto w-full px-page pt-6 pb-10">
                <HomeDashboardSkeleton />
            </div>
            <div className="mx-auto w-full space-y-4 px-page pb-10">
                <ContinueLearningSkeleton />
                <ActivityCalendarSkeleton />
            </div>
        </div>
    );
}
