import { Suspense } from "react";
import { getSession } from '@repo/auth';
import { headers } from 'next/headers';
import { redirect } from "next/navigation";
import { getHomeData } from "@/actions/(main)/home/home.action";

import HomeDashboard, { type PickUpItem } from "./_components/home-dashboard";
import ActivityCalendar from "./_components/activity-calendar";
import { ActivityCalendarSkeleton } from "./_components/skeletons";
import ProgressSections from "./_components/progress-sections";
import { BadgesSection } from "./_components/badges-section";
import { GitHubActivity, GitHubCalendarSkeleton, connectedGitHub } from "./_components/github-activity";
import { parseRange } from "@repo/db/progress";

export const metadata = {
    title: "Home | ShipItHQ",
    description: "Your personalized learning dashboard",
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
    const range = parseRange((await searchParams).range);
    const session = await getSession(headers());
    if (!session?.user?.id) redirect("/signin");
    // GitHub contributions only for a connected account (plan/home HOME-10); asked up
    // front so an unconnected account never sees a skeleton for a card that won't come.
    const githubUser = await connectedGitHub(session.user.id);

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
            href: s.href,
        })),
    ].slice(0, 3);

    return (
        <div className="page-frame pb-4">
            <HomeDashboard user={user} stats={stats} trends={trends} pickUp={pickUp} />
            <div className="mx-auto w-full px-page pb-10">
                <Suspense fallback={<ActivityCalendarSkeleton />}>
                    <ActivityCalendar data={activityCalendar} />
                </Suspense>
                {githubUser && (
                    <div className="mt-4">
                        <Suspense fallback={<GitHubCalendarSkeleton />}>
                            <GitHubActivity username={githubUser} />
                        </Suspense>
                    </div>
                )}
                {/* Every module, chart plus list (plan/home HOME-7, HOME-8). */}
                <div className="mt-6">
                    <ProgressSections userId={session.user.id} range={range} />
                </div>
                {/* Badges (plan/badges BDG-5). */}
                <div className="mt-8">
                    <BadgesSection userId={session.user.id} />
                </div>
            </div>
        </div>
    );
}
