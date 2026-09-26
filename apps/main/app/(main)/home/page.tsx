import { Suspense } from "react";
import { getSession } from '@repo/auth';
import { headers } from 'next/headers';
import { redirect } from "next/navigation";
import { getHomeData } from "@/actions/(main)/home/home.action";

import HomeDashboard, { type PickUpItem } from "./_components/home-dashboard";
import ActivityCalendar from "./_components/activity-calendar";
import { ActivityCalendarSkeleton } from "./_components/skeletons";

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
        user, inProgressProjects, recentStudios, pathfinderGoals, activityCalendar, stats, trends,
    } = homeDataResult.data;

    // "Pick up where you left off" (plan/home HOME-2): what is in progress, most
    // specific first - a project you are building, then an active career goal, then
    // a study space. Up to three; the first is the lead card.
    const pickUp: PickUpItem[] = [
        ...inProgressProjects.map((p): PickUpItem => ({
            kind: "project",
            title: p.project.title,
            detail: "Sprint board in progress",
            href: `/projects/${p.project.slug}`,
        })),
        ...pathfinderGoals
            .filter((g) => g.status !== "COMPLETED")
            .map((g): PickUpItem => ({
                kind: "goal",
                title: g.title,
                detail: `${g.completedSubGoals} of ${g.totalSubGoals} steps done`,
                href: `/pathfinder/${g.slug}`,
                progress: g.progressPercent ?? 0,
            })),
        ...recentStudios.map((s): PickUpItem => ({
            kind: "studio",
            title: s.title,
            detail: `${s._count.quizzes} quizzes · ${s._count.flashcardDecks} decks`,
            href: `/studio/${s.slug || s.id}`,
        })),
    ].slice(0, 3);

    return (
        <div className="page-frame pb-4">
            <HomeDashboard user={user} stats={stats} trends={trends} pickUp={pickUp} />
            <div className="mx-auto w-full px-page pb-10">
                <Suspense fallback={<ActivityCalendarSkeleton />}>
                    <ActivityCalendar data={activityCalendar} />
                </Suspense>
            </div>
        </div>
    );
}
