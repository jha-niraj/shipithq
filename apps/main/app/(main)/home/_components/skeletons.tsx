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
    return (
        <div className="space-y-7">
            <ShimmerStyles />

            {/* Header: title + date on the left, 4 stat pills + a completion badge right. */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="space-y-2">
                    <Shimmer className="h-8 w-64" />
                    <Shimmer className="h-4 w-56" delay={0.06} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {[0, 1, 2, 3].map((i) => (
                        <Shimmer key={i} className="h-8 w-28 rounded-full" delay={0.08 + i * 0.05} />
                    ))}
                    <Shimmer className="h-8 w-24 rounded-full" delay={0.28} />
                </div>
            </div>

            {/* Four headline counters. */}
            <StatBandSkeleton count={4} cols={4} />

            {/* The nudge strip is conditional on the real page, so it is deliberately
                absent here - promising a band that may never arrive is worse than the
                small downward shift of it appearing. */}

            {/* Four module rows: stats column (1/3) beside a trend chart (2/3), the
                even ones reversed exactly as the real dashboard alternates them. */}
            <div className="space-y-6">
                {[0, 1, 2, 3].map((row) => (
                    <div key={row} className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Shimmer className="h-8 w-8 rounded-xl" delay={row * 0.06} />
                                <Shimmer className="h-4 w-36" delay={row * 0.06} />
                            </div>
                            <Shimmer className="h-4 w-24" delay={row * 0.06} />
                        </div>
                        <div className={`flex flex-col gap-5 lg:flex-row lg:items-stretch ${row % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
                            <div className="lg:w-1/3 lg:min-w-0">
                                <StatBandSkeleton count={4} cols={1} size="sm" />
                            </div>
                            <div className="lg:w-2/3">
                                <Shimmer className="h-[236px] w-full rounded-lg" delay={row * 0.06 + 0.1} />
                                <div className="mt-2 flex gap-4">
                                    <Shimmer className="h-3 w-20" delay={row * 0.06} />
                                    <Shimmer className="h-3 w-20" delay={row * 0.06} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom split: activity-mix bars (2/3) beside the recent-activity feed (1/3). */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 xl:col-span-2">
                    <div className="mb-5 flex items-center justify-between">
                        <Shimmer className="h-5 w-48" />
                        <Shimmer className="h-4 w-20" delay={0.05} />
                    </div>
                    <Shimmer className="h-44 w-full rounded-lg" delay={0.1} />
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <Shimmer key={i} className="h-3.5 w-28" delay={i * 0.04} />
                        ))}
                    </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="mb-5 flex items-center justify-between">
                        <Shimmer className="h-5 w-32" />
                        <Shimmer className="h-4 w-16" delay={0.05} />
                    </div>
                    <div className="space-y-5">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex gap-3">
                                <Shimmer className="h-7 w-7 shrink-0 rounded-full" delay={i * 0.05} />
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <Shimmer className="h-4 w-full" delay={i * 0.05} />
                                    <Shimmer className="h-3 w-24" delay={i * 0.05} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
