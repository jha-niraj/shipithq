"use client";

import Link from "next/link";
import {
    Trophy, Flame, Zap, Target, Code2, Network, Globe, Server,
    ChevronRight, Sparkles, ArrowRight
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { cn } from "@repo/ui/lib/utils";
import { StatBand } from "@repo/ui/components/ui/stat-band";
import { ActivityChart, type ActivityPoint } from "@/components/common/activity-chart";
import type {
    PracticeUserStats, PracticeModule, PracticeProgressData,
    PracticeRecentSession
} from "@/types/practice";
import { MODULE_CONFIG } from "@/types/practice";

const MODULE_ICONS: Record<PracticeModule, typeof Code2> = {
    DSA: Code2,
    SYSTEM_DESIGN: Network,
    WEB_FRONTEND: Globe,
    WEB_BACKEND: Server,
};

const MODULE_PATHS: Record<PracticeModule, string> = {
    DSA: "/practice/dsa",
    SYSTEM_DESIGN: "/practice/system-design",
    WEB_FRONTEND: "/practice/web-frontend",
    WEB_BACKEND: "/practice/web-backend",
};

const DIFFICULTY_COLORS = {
    EASY: "text-neutral-800 dark:text-neutral-100",
    MEDIUM: "text-neutral-800 dark:text-neutral-100",
    HARD: "text-red-600 dark:text-red-400",
};

interface DailyChallengeData {
    slug: string;
    title: string;
    module: PracticeModule;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    category: string;
}

interface PracticeDashboardProps {
    stats: PracticeUserStats | null;
    dailyChallenge?: DailyChallengeData | null;
    activity: { series: ActivityPoint[]; unit: string; total: number };
}

export function PracticeDashboard({ stats, dailyChallenge, activity }: PracticeDashboardProps) {
    if (!stats) {
        return <EmptyDashboard dailyChallenge={dailyChallenge} />;
    }

    return (
        <div className="px-page py-6 space-y-8 w-full mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                    Practice
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Sharpen your skills with hands-on coding challenges
                </p>
            </div>
            {dailyChallenge && <DailyChallengeCard challenge={dailyChallenge} />}
            <StatBand
                cols={4}
                items={[
                    {
                        icon: Target,
                        label: "Problems Solved",
                        value: stats.totalSolved,
                        hint: `of ${stats.difficultyBreakdown.easy.total + stats.difficultyBreakdown.medium.total + stats.difficultyBreakdown.hard.total}`,
                    },
                    { icon: Zap, label: "Total XP", value: stats.totalXP.toLocaleString() },
                    { icon: Flame, label: "Current Streak", value: stats.currentStreak, hint: `Best: ${stats.longestStreak}` },
                    { icon: Trophy, label: "Avg Score", value: `${stats.averageScore}%` },
                ]}
            />
            {/* Sessions per day, over the same 30-day window every module uses, so
                the reader can compare across the product rather than learning a new
                axis on each page. */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                        Practice sessions
                    </h2>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        <span className="font-medium text-neutral-900 tabular-nums dark:text-white">
                            {activity.total}
                        </span>
                        {" in 30 days"}
                    </span>
                </div>
                <ActivityChart data={activity.series} unit={activity.unit} />
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
                    Difficulty Progress
                </h2>
                <div className="grid grid-cols-3 gap-6">
                    <DifficultyBar
                        label="Easy"
                        completed={stats.difficultyBreakdown.easy.completed}
                        total={stats.difficultyBreakdown.easy.total}
                        color="bg-neutral-900"
                    />
                    <DifficultyBar
                        label="Medium"
                        completed={stats.difficultyBreakdown.medium.completed}
                        total={stats.difficultyBreakdown.medium.total}
                        color="bg-neutral-900"
                    />
                    <DifficultyBar
                        label="Hard"
                        completed={stats.difficultyBreakdown.hard.completed}
                        total={stats.difficultyBreakdown.hard.total}
                        color="bg-red-500"
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
                        Modules
                    </h2>
                    <div className="space-y-3">
                        {
                            stats.moduleBreakdown.map((mod) => (
                                <ModuleCard key={mod.module} data={mod} />
                            ))
                        }
                    </div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
                        Recent Sessions
                    </h2>
                    {
                        stats.recentSessions.length === 0 ? (
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">No sessions yet. Start practicing!</p>
                        ) : (
                            <div className="space-y-2">
                                {
                                    stats.recentSessions.slice(0, 8).map((s, i) => (
                                        <RecentSessionRow key={i} session={s} />
                                    ))
                                }
                            </div>
                        )
                    }
                </div>
            </div>
        </div>
    );
}

function DailyChallengeCard({ challenge }: { challenge: DailyChallengeData }) {
    const config = MODULE_CONFIG[challenge.module];
    const path = MODULE_PATHS[challenge.module];

    return (
        <Link
            href={`${path}/${challenge.slug}?mode=assist`}
            className="group block rounded-xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-neutral-50/50 via-neutral-50/30 to-transparent dark:from-neutral-900/20 dark:via-neutral-900/10 dark:to-transparent p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-neutral-800 dark:text-neutral-100" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
                                Daily Challenge
                            </span>
                            <Badge variant="outline" className={cn("text-xs border", DIFFICULTY_COLORS[challenge.difficulty])}>
                                {challenge.difficulty}
                            </Badge>
                        </div>
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white group-hover:text-neutral-700 dark:group-hover:text-neutral-100 transition-colors">
                            {challenge.title}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {config.icon} {config.label}
                        </p>
                    </div>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
            </div>
        </Link>
    );
}

function EmptyDashboard({ dailyChallenge }: { dailyChallenge?: DailyChallengeData | null }) {
    return (
        <div className="px-page py-6 space-y-8 max-w-6xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                    Practice
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Sharpen your skills with hands-on coding challenges
                </p>
            </div>
            {dailyChallenge && <DailyChallengeCard challenge={dailyChallenge} />}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {
                    (Object.keys(MODULE_CONFIG) as PracticeModule[]).map((mod) => {
                        const config = MODULE_CONFIG[mod];
                        const Icon = MODULE_ICONS[mod];
                        return (
                            <Link
                                key={mod}
                                href={MODULE_PATHS[mod]}
                                className="group rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-10 w-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                        <Icon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-neutral-900 dark:text-white">
                                            {config.label}
                                        </h3>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                            {Object.keys(config.categories).length} topics
                                        </p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-neutral-600 dark:text-neutral-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                    Start solving {config.label.toLowerCase()} problems to build your skills
                                </p>
                            </Link>
                        );
                    })
                }
            </div>
        </div>
    );
}

function DifficultyBar({
    label,
    completed,
    total,
    color,
}: {
    label: string;
    completed: number;
    total: number;
    color: string;
}) {
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{label}</span>
                <span className="text-xs text-neutral-600 dark:text-neutral-400">
                    {completed}/{total}
                </span>
            </div>
            <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all", color)}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

function ModuleCard({ data }: { data: PracticeProgressData }) {
    const config = MODULE_CONFIG[data.module];
    const Icon = MODULE_ICONS[data.module];
    const path = MODULE_PATHS[data.module];

    return (
        <Link
            href={path}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors group"
        >
            <div className="h-9 w-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {config.label}
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {data.completed} solved · {data.totalXP} XP
                </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-500 transition-colors" />
        </Link>
    );
}

function RecentSessionRow({ session }: { session: PracticeRecentSession }) {
    const config = MODULE_CONFIG[session.module];
    const path = MODULE_PATHS[session.module];

    return (
        <Link
            href={`${path}/${session.problemSlug}`}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
        >
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {session.problemTitle}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{config.label}</span>
                    <span className={cn("text-xs font-medium", DIFFICULTY_COLORS[session.difficulty])}>
                        {session.difficulty}
                    </span>
                </div>
            </div>
            {
                session.status === "COMPLETED" ? (
                    <Badge variant="outline" className="text-xs border-neutral-200 text-neutral-800 dark:border-neutral-800 dark:text-neutral-100">
                        {session.bestScore}%
                    </Badge>
                ) : (
                    <Badge variant="outline" className="text-xs border-neutral-200 text-neutral-800 dark:border-neutral-800 dark:text-neutral-100">
                        In Progress
                    </Badge>
                )
            }
        </Link>
    );
}