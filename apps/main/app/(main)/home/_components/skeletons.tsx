"use client";

import { DotmSquare11 } from "@repo/ui/components/ui/dotm-square-11";
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band";

// Shared loader tile - matches the bento card style
function LoaderTile({ className = "" }: { className?: string }) {
    return (
        <div className={`rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-center ${className}`}>
            <DotmSquare11 size={32} dotSize={4} speed={1.4} />
        </div>
    );
}

export function GreetingHeaderSkeleton() {
    return (
        <div className="h-28 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-center">
            <DotmSquare11 size={32} dotSize={4} speed={1.4} />
        </div>
    );
}

export function ContinueLearningSkeleton() {
    return <LoaderTile className="h-36" />;
}

export function PathfinderGoalsSkeleton() {
    return <LoaderTile className="h-64" />;
}

// The real grid with inert cells: it has the calendar's exact height at every
// width, which a fixed-height tile cannot.
export { ActivityCalendarSkeleton } from "./activity-calendar";

export function AchievementsCardSkeleton() {
    return <LoaderTile className="h-56" />;
}

export function LeaderboardPositionSkeleton() {
    return <LoaderTile className="h-64" />;
}

export function FeatureDiscoverySkeleton() {
    return <LoaderTile className="h-40" />;
}

export function RecentActivitySkeleton() {
    return <LoaderTile className="h-56" />;
}

export function ShareCreditsSkeleton() {
    return <LoaderTile className="h-56" />;
}

export function ReferralsSkeleton() {
    return <LoaderTile className="h-56" />;
}

export function CommunityHighlightsSkeleton() {
    return <LoaderTile className="h-48" />;
}

export function ProjectsPreviewSkeleton() {
    return <LoaderTile className="h-64" />;
}

export function MockVoicePreviewSkeleton() {
    return <LoaderTile className="h-64" />;
}

/** Header + 4 counters + the stack of stats-beside-chart module rows. Mirrors the
 *  real dashboard's shape so the route transition doesn't visibly reflow. */
export function HomeDashboardSkeleton() {
    // Same wrapper, spacing and blocks as HomeDashboard (plan/home HOME-1), so the
    // swap to real content does not move anything.
    return (
        <div className="mx-auto w-full space-y-6 px-page pt-6 pb-6">
            <ShimmerStyles />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                    <Shimmer className="h-3 w-40" />
                    <Shimmer className="h-7 w-64" delay={0.05} />
                </div>
                <div className="flex gap-2">
                    <Shimmer className="h-8 w-24 rounded-lg" delay={0.08} />
                    <Shimmer className="h-8 w-32 rounded-lg" delay={0.09} />
                    <Shimmer className="h-8 w-32 rounded-lg" delay={0.1} />
                </div>
            </div>
            <StatBandSkeleton count={4} cols={4} />
            <div className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                <Shimmer className="size-11 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                    <Shimmer className="h-3 w-44" delay={0.05} />
                    <Shimmer className="h-5 w-72 max-w-full" delay={0.08} />
                    <Shimmer className="h-3.5 w-56 max-w-full" delay={0.1} />
                </div>
                <Shimmer className="hidden h-9 w-28 rounded-lg sm:block" delay={0.12} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                        <Shimmer className="h-4 w-32" delay={i * 0.04} />
                        <div className="mt-4 flex items-end justify-between gap-4">
                            <div className="space-y-2">
                                <Shimmer className="h-8 w-20" delay={i * 0.04 + 0.02} />
                                <Shimmer className="h-3.5 w-28" delay={i * 0.04 + 0.04} />
                            </div>
                            <Shimmer className="h-10 w-28" delay={i * 0.04 + 0.06} />
                        </div>
                        <Shimmer className="mt-3 h-3 w-3/4" delay={i * 0.04 + 0.08} />
                    </div>
                ))}
            </div>
        </div>
    );
}
