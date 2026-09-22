import { Suspense } from "react";
import { getSession } from '@repo/auth';
import { headers } from 'next/headers';
import { redirect } from "next/navigation";
import { getHomeData } from "@/actions/(main)/home/home.action";

import HomeDashboard from "./_components/home-dashboard";
import ContinueLearning from "./_components/continue-learning";
import ActivityCalendar from "./_components/activity-calendar";

import {
    ContinueLearningSkeleton, ActivityCalendarSkeleton,
} from "./_components/skeletons";

export const metadata = {
    title: "Home | ShipItHQ",
    description: "Your personalized learning dashboard",
};

export default async function HomePage() {
    const session = await getSession(headers());
    if (!session?.user?.id) redirect("/signin");

    const homeDataResult = await getHomeData();

    if (!homeDataResult.success || !homeDataResult.data) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-muted-foreground">Failed to load home data</p>
            </div>
        );
    }

    const {
        user, inProgressProjects, recentStudios, activityCalendar,
        stats, trends, activityMix, recentActivity,
    } = homeDataResult.data;

    const hasContinueLearning = inProgressProjects.length > 0 || recentStudios.length > 0;

    return (
        <div className="w-full pb-4">
            {/* The analytics dashboard IS the page now: headline counters, then a stack
                of module rows pairing counters with a 6-month trend line, then the
                activity mix + feed. The two surfaces below it are kept because they do
                something the charts can't - resume a specific piece of work, and show
                the day-by-day contribution grid. */}
            <HomeDashboard
                user={user}
                stats={stats}
                trends={trends}
                activityMix={activityMix}
                recentActivity={recentActivity}
            />

            <div className="mx-auto w-full space-y-4 px-page pb-10">
                {hasContinueLearning && (
                    <Suspense fallback={<ContinueLearningSkeleton />}>
                        <ContinueLearning
                            projects={inProgressProjects}
                            studios={recentStudios}
                        />
                    </Suspense>
                )}

                <Suspense fallback={<ActivityCalendarSkeleton />}>
                    <ActivityCalendar data={activityCalendar} />
                </Suspense>
            </div>
        </div>
    );
}
