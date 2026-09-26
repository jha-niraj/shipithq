"use client";

/**
 * KnowMe analytics.
 *
 * ── What was wrong, beyond the look ──────────────────────────────────────────
 *  - `StatCard` took `color: "blue" | "purple" | "emerald" | "amber"` and mapped
 *    all four to identical neutral classes. A prop dead since the palette change
 *    that still dictated four call sites.
 *  - The daily-activity tooltip was `position: absolute` with no positioned
 *    ancestor, so it anchored to whatever happened to be positioned further up
 *    the tree rather than to its bar.
 *  - `maxQuestions` was recomputed inside the map - once per bar - across the
 *    WHOLE series while the chart rendered only the last 30 days, so a spike
 *    outside the window silently flattened everything inside it.
 *  - The chart had no dates, no scale and no total, which on an all-zero series
 *    is indistinguishable from a chart that failed to render.
 *  - A private `formatRelativeTime` duplicated `utils/knowme/format.ts`.
 *
 * ── Zero is the normal reading ───────────────────────────────────────────────
 * Every number here is 0 until someone opens the public link. That is the
 * expected state, not a failure, and each panel says so in words rather than
 * drawing an empty axis and leaving the owner to guess.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    BarChart3, ArrowLeft, MessageSquare, Users, Clock, TrendingUp,
    TrendingDown, Download, Calendar, HelpCircle, Lightbulb,
    AlertTriangle, Info, ArrowRight, User, Sparkles
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import {
    Avatar, AvatarFallback, AvatarImage
} from "@repo/ui/components/ui/avatar";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import { cn } from "@repo/ui/lib/utils";
import { StatBand } from "@repo/ui/components/ui/stat-band";
import toast from "@repo/ui/components/ui/sonner";
import type { KnowMeAnalyticsFull, TimeRange, TrendData, DailyActivityData } from "@/types/knowme";
import { exportAnalyticsData } from "@/actions/(main)/knowme";
import { formatRelativeDate } from "@/utils/knowme/format";

interface KnowMeAnalyticsProps {
    analytics: KnowMeAnalyticsFull;
    initialRange: TimeRange;
    /** From `hasKnowMeProfile`. Drives the banner when the assistant is not live. */
    profileStatus?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
    TECHNICAL_SKILLS: "Technical skills",
    PROJECTS: "Projects",
    WORK_EXPERIENCE: "Work experience",
    EDUCATION: "Education",
    ASSESSMENTS: "Assessments",
    AVAILABILITY: "Availability",
    COMPENSATION: "Compensation",
    SOFT_SKILLS: "Soft skills",
    GENERAL: "General",
    OTHER: "Other",
};

const RANGE_LABELS: Record<TimeRange, string> = {
    "7d": "the last 7 days",
    "30d": "the last 30 days",
    "90d": "the last 90 days",
    all: "all time",
};

/** Only ERROR gets the alarming treatment. See STATUS_COPY on the dashboard. */
const NOT_LIVE: Record<string, { title: string; body: string; bad: boolean }> = {
    ERROR: {
        title: "Your assistant is not working",
        body: "The last attempt to read your work failed, so nobody can get an answer from your link. Nothing below will move until that is fixed.",
        bad: true,
    },
    SETUP: {
        title: "Your assistant is not online yet",
        body: "Finish onboarding to publish your link. Until then there is nobody to count.",
        bad: false,
    },
    PROCESSING: {
        title: "Still indexing",
        body: "Your work is being read now. Numbers here start moving once the link is live.",
        bad: false,
    },
    PAUSED: {
        title: "Paused",
        body: "Your link is up but is not answering questions.",
        bad: false,
    },
    INACTIVE: {
        title: "Turned off",
        body: "Nobody can reach your assistant while it is off.",
        bad: false,
    },
};

export default function KnowMeAnalytics({ analytics, initialRange, profileStatus }: KnowMeAnalyticsProps) {
    const router = useRouter();
    const [timeRange, setTimeRange] = useState<TimeRange>(initialRange);
    const [isExporting, setIsExporting] = useState(false);

    const { overview, questionsByCategory, topQuestions, recentVisitors, insights, dailyActivity } = analytics;
    const notLive = profileStatus && profileStatus !== "ACTIVE" ? NOT_LIVE[profileStatus] : undefined;

    const handleRangeChange = (range: string) => {
        setTimeRange(range as TimeRange);
        router.push(`/knowme/analytics?range=${range}`);
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const result = await exportAnalyticsData(timeRange);
            if (result.success && result.data) {
                const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `knowme-analytics-${timeRange}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Exported");
            } else {
                toast.error(result.error || "Failed to export");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="w-full px-4 py-6 sm:px-6">
            <motion.header
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
                <div className="flex min-w-0 items-center gap-3">
                    <Button asChild variant="ghost" size="icon" className="shrink-0">
                        <Link href="/knowme" aria-label="Back to KnowMe">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="min-w-0">
                        <h1 className="flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-white">
                            <BarChart3 className="h-5 w-5" />
                            Analytics
                        </h1>
                        <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                            Who asked what, over {RANGE_LABELS[timeRange]}
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Select value={timeRange} onValueChange={handleRangeChange}>
                        <SelectTrigger className="w-40">
                            <Calendar className="mr-2 h-4 w-4" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="all">All time</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleExport} disabled={isExporting} className="gap-2">
                        {isExporting ? <InlineLoader size="sm" /> : <Download className="h-4 w-4" />}
                        Export
                    </Button>
                </div>
            </motion.header>

            {notLive && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "mb-6 flex items-start gap-3 rounded-2xl border p-4",
                        notLive.bad
                            ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30"
                            : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
                    )}
                >
                    {notLive.bad ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                    ) : (
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                    )}
                    <div className="min-w-0 flex-1">
                        <p className={cn(
                            "text-sm font-medium",
                            notLive.bad ? "text-red-900 dark:text-red-200" : "text-neutral-900 dark:text-white",
                        )}>
                            {notLive.title}
                        </p>
                        <p className={cn(
                            "mt-0.5 text-sm",
                            notLive.bad ? "text-red-800/80 dark:text-red-300/80" : "text-neutral-600 dark:text-neutral-400",
                        )}>
                            {notLive.body}
                        </p>
                    </div>
                    <Button asChild variant={notLive.bad ? "default" : "outline"} size="sm" className="shrink-0 gap-1.5">
                        <Link href="/knowme">
                            Fix it
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </motion.div>
            )}

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-6"
            >
                <StatBand
                    cols={4}
                    items={[
                        { icon: MessageSquare, label: "Questions", value: overview.totalQuestions, hint: <TrendHint trend={overview.trends.questions} /> },
                        { icon: Users, label: "Visitors", value: overview.totalVisitors, hint: <TrendHint trend={overview.trends.visitors} /> },
                        { icon: Clock, label: "Sessions", value: overview.totalSessions, hint: <TrendHint trend={overview.trends.sessions} /> },
                        { icon: HelpCircle, label: "Questions per session", value: overview.avgQuestionsPerSession.toFixed(1) },
                    ]}
                />
            </motion.div>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
                <Panel title="What they asked about" delay={0.1}>
                    {questionsByCategory.length > 0 ? (
                        <div className="space-y-4">
                            {questionsByCategory.map((cat) => (
                                <div key={cat.category} className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <span className="truncate text-neutral-700 dark:text-neutral-300">
                                            {CATEGORY_LABELS[cat.category] || cat.category}
                                        </span>
                                        <span className="shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">
                                            {cat.count} ({cat.percentage}%)
                                        </span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${cat.percentage}%` }}
                                            transition={{ duration: 0.5, delay: 0.2 }}
                                            className="h-full rounded-full bg-neutral-900 dark:bg-white"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Empty
                            title="No questions yet"
                            body="Once someone asks something, the topics they care about show up here."
                        />
                    )}
                </Panel>

                <Panel title="Asked most often" delay={0.15}>
                    {topQuestions.length > 0 ? (
                        <ol className="space-y-2">
                            {topQuestions.slice(0, 8).map((q, index) => (
                                <li
                                    key={`${q.question}-${index}`}
                                    className="flex items-start gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60"
                                >
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-neutral-800 dark:text-neutral-200">{q.question}</p>
                                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                                            Asked {q.count} time{q.count === 1 ? "" : "s"}
                                            {" · "}
                                            {CATEGORY_LABELS[q.category] || q.category}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <Empty
                            title="No questions yet"
                            body="The questions people repeat are the ones worth answering well. None so far."
                        />
                    )}
                </Panel>
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-3">
                <Panel title="Who is asking" delay={0.2} className="lg:col-span-2">
                    {recentVisitors.length > 0 ? (
                        <div className="space-y-3">
                            {recentVisitors.slice(0, 6).map((visitor, index) => (
                                <div
                                    key={`${visitor.userId ?? "anon"}-${index}`}
                                    className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <Avatar className="h-9 w-9 shrink-0">
                                            <AvatarImage src={visitor.userImage || undefined} alt="" />
                                            <AvatarFallback>
                                                {visitor.userName?.charAt(0) || <User className="h-4 w-4" />}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                                                {visitor.userName || "Anonymous visitor"}
                                            </p>
                                            <div className="mt-0.5 flex min-w-0 items-center gap-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    {visitor.viewerType.replace(/_/g, " ").toLowerCase()}
                                                </Badge>
                                                {visitor.companyName && (
                                                    <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                                                        {visitor.companyName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm font-medium tabular-nums text-neutral-900 dark:text-white">
                                            {visitor.questionsAsked}
                                        </p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                            {formatRelativeDate(visitor.lastActive)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Empty
                            title="Nobody has visited yet"
                            body="Share your public link and the people who open it appear here, named when they are signed in."
                        />
                    )}
                </Panel>

                <Panel title="Insights" delay={0.25} icon={<Lightbulb className="h-4 w-4" />}>
                    {insights.length > 0 ? (
                        <div className="space-y-3">
                            {insights.map((insight, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "rounded-xl border p-3",
                                        insight.type === "warning"
                                            ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30"
                                            : "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/60",
                                    )}
                                >
                                    <div className="flex items-start gap-2.5">
                                        <InsightIcon type={insight.type} />
                                        <div className="min-w-0 flex-1">
                                            <p className={cn(
                                                "text-sm",
                                                insight.type === "warning"
                                                    ? "text-red-900 dark:text-red-200"
                                                    : "text-neutral-700 dark:text-neutral-300",
                                            )}>
                                                {insight.message}
                                            </p>
                                            {insight.actionUrl && (
                                                <Button asChild variant="link" size="sm" className="mt-1 h-auto gap-1 p-0">
                                                    <Link href={insight.actionUrl}>
                                                        {insight.actionText || "Learn more"}
                                                        <ArrowRight className="h-3 w-3" />
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Empty
                            title="Not enough to say yet"
                            body="Insights need a handful of questions before they mean anything."
                        />
                    )}
                </Panel>
            </div>

            <ActivityChart dailyActivity={dailyActivity} timeRange={timeRange} />
        </div>
    );
}

/**
 * Daily questions.
 *
 * Deliberately not a chart library: it is one series of small integers, and
 * `recharts` would be ~100KB to draw thirty rectangles. What it DOES take from a
 * real chart is the parts that make one readable - a scale that says what the
 * top of the axis is, a first and last date so the window is unambiguous, and a
 * tooltip anchored to its own bar rather than to the page.
 */
function ActivityChart({
    dailyActivity,
    timeRange,
}: {
    dailyActivity: DailyActivityData[];
    timeRange: TimeRange;
}) {
    // Slice FIRST, then take the max of what is actually drawn. Scaling the drawn
    // window against a spike outside it flattens every bar on screen.
    const days = useMemo(() => dailyActivity.slice(-30), [dailyActivity]);
    const peak = useMemo(() => Math.max(...days.map((d) => d.questions), 0), [days]);
    const total = useMemo(() => days.reduce((sum, d) => sum + d.questions, 0), [days]);

    return (
        <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
        >
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                    Questions per day
                </h2>
                {days.length > 0 && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        <span className="font-medium tabular-nums text-neutral-900 dark:text-white">{total}</span>
                        {" over "}
                        {days.length} day{days.length === 1 ? "" : "s"}
                    </p>
                )}
            </div>

            {days.length === 0 ? (
                <Empty
                    title="No activity yet"
                    body={`Nothing was asked in ${RANGE_LABELS[timeRange]}.`}
                />
            ) : (
                <>
                    <div className="flex gap-3">
                        {/* The scale. Without it a chart of all-zero bars is
                            indistinguishable from a chart that failed to draw. */}
                        <div className="flex w-8 shrink-0 flex-col justify-between py-0.5 text-right text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
                            <span>{peak}</span>
                            <span>0</span>
                        </div>
                        <div className="flex h-40 min-w-0 flex-1 items-end gap-[3px] border-b border-l border-neutral-200 pl-1 dark:border-neutral-800">
                            {days.map((day) => {
                                // `relative` on the bar's own column is what makes the
                                // tooltip below anchor to the bar. The old one had no
                                // positioned ancestor at all.
                                const height = peak > 0 ? (day.questions / peak) * 100 : 0;
                                return (
                                    <div
                                        key={day.date}
                                        className="group relative flex h-full min-w-0 flex-1 items-end"
                                    >
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${Math.max(height, 2)}%` }}
                                            transition={{ duration: 0.35 }}
                                            className={cn(
                                                "w-full rounded-t-sm transition-colors",
                                                day.questions > 0
                                                    ? "bg-neutral-900 group-hover:bg-neutral-700 dark:bg-white dark:group-hover:bg-neutral-300"
                                                    : "bg-neutral-200 dark:bg-neutral-700",
                                            )}
                                        />
                                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs text-white group-hover:block dark:bg-white dark:text-neutral-900">
                                            {day.questions} on {formatDay(day.date)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="mt-1.5 flex justify-between pl-11 text-xs text-neutral-400 dark:text-neutral-500">
                        <span>{formatDay(days[0]!.date)}</span>
                        <span>{formatDay(days[days.length - 1]!.date)}</span>
                    </div>
                </>
            )}
        </motion.section>
    );
}

/** `2026-08-29` -> `29 Aug`. Parsed as UTC so the label never slips a day. */
function formatDay(date: string): string {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
}

/** The delta beside a headline figure, or nothing when there is no honest comparison. */
function TrendHint({ trend }: { trend?: TrendData }) {
    // A trend against an EMPTY previous period is arithmetic, not information.
    // `calculateTrend` returns a flat 100% whenever `previous` is 0 and there is
    // anything at all now, so this page was reporting "8 sessions, up 100%" for
    // the first eight sessions ever recorded. There is nothing to compare
    // against, so nothing is shown.
    if (!trend || trend.previous <= 0 || trend.direction === "stable") return null;

    return (
        <span className={cn(
            "inline-flex items-center gap-1 font-medium tabular-nums",
            trend.direction === "down"
                ? "text-red-600 dark:text-red-400"
                : "text-neutral-700 dark:text-neutral-300",
        )}>
            {trend.direction === "up" ? (
                <TrendingUp className="h-3 w-3" />
            ) : (
                <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend.changePercent)}%
        </span>
    );
}

function Panel({
    title,
    icon,
    delay,
    className,
    children,
}: {
    title: string;
    icon?: React.ReactNode;
    delay: number;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={cn(
                "rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900",
                className,
            )}
        >
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
                {icon && <span className="text-neutral-500 dark:text-neutral-400">{icon}</span>}
                {title}
            </h2>
            {children}
        </motion.section>
    );
}

function InsightIcon({ type }: { type: "strength" | "suggestion" | "warning" | "info" }) {
    const className = "mt-0.5 h-4 w-4 shrink-0";
    if (type === "warning") return <AlertTriangle className={cn(className, "text-red-600 dark:text-red-400")} />;
    if (type === "strength") return <Sparkles className={cn(className, "text-neutral-700 dark:text-neutral-300")} />;
    if (type === "suggestion") return <Lightbulb className={cn(className, "text-neutral-700 dark:text-neutral-300")} />;
    return <Info className={cn(className, "text-neutral-700 dark:text-neutral-300")} />;
}

function Empty({ title, body }: { title: string; body: string }) {
    return (
        <div className="py-8 text-center">
            <MessageSquare className="mx-auto mb-2 h-7 w-7 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{title}</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">{body}</p>
        </div>
    );
}
