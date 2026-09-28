"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    BookOpen, CalendarDays, CheckCircle2, Clock, Code2, FolderKanban, GraduationCap,
    ListChecks, Mic, Target, Trophy, Users, Zap, type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import { Shimmer } from "@repo/ui/components/skeleton-kit";
import { StatBand, StatBandSkeleton } from "@repo/ui/components/ui/stat-band";
import { cn } from "@repo/ui/lib/utils";
import { getActivitiesByDate } from "@/actions/(main)/home/home.action";
import { kindOf } from "@/components/progress/activity-kinds";

// ─────────────────────────────────────────────────────────────────────────────
// The full day behind a square of Home's activity graph (plan/home HOME-4): the
// day's totals in a StatBand, then what was done, in order, as a timeline.
// Opened by clicking a day; the graph's tooltip is the overview.
// ─────────────────────────────────────────────────────────────────────────────

interface ActivityItem {
    id: string;
    type: string;
    title: string;
    description: string | null;
    xpEarned: number;
    timeSpent: number;
    createdAt: Date;
}

interface ActivityDaySheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The graph's own day, yyyy-mm-dd. */
    date: string | null;
}

/** yyyy-mm-dd as a local calendar day, never UTC midnight. */
function parseDay(date: string) {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

function formatTime(date: Date) {
    return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatMinutes(min: number) {
    if (min <= 0) return "-";
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
}

export default function ActivityDaySheet({ open, onOpenChange, date }: ActivityDaySheetProps) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!open || !date) return;
        let live = true;
        setIsLoading(true);
        setFailed(false);
        getActivitiesByDate(date)
            .then((result) => {
                if (!live) return;
                setActivities(result.success && result.data ? result.data : []);
                setFailed(!result.success);
            })
            .catch(() => live && (setActivities([]), setFailed(true)))
            .finally(() => live && setIsLoading(false));
        return () => {
            live = false;
        };
    }, [open, date]);

    const day = date ? parseDay(date) : null;
    const title = day?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) ?? "";
    const year = day?.getFullYear();
    const isToday = !!day && day.toDateString() === new Date().toDateString();

    // Oldest first: a day reads in the order it happened.
    const ordered = [...activities].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const xp = activities.reduce((s, a) => s + a.xpEarned, 0);
    const minutes = activities.reduce((s, a) => s + (a.timeSpent ?? 0), 0);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
                <SheetHeader className="border-b border-neutral-200 px-5 py-4 text-left dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-900/10 dark:bg-white/10">
                            <CalendarDays className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
                        </div>
                        <div className="min-w-0">
                            <SheetTitle className="text-base">{isToday ? `Today, ${title}` : title}</SheetTitle>
                            <SheetDescription className="text-xs">
                                {year} · everything you did this day
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-5 px-5 py-5">
                        {isLoading ? (
                            <DaySkeleton />
                        ) : failed ? (
                            <p className="rounded-lg border border-neutral-200 px-4 py-6 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                                This day did not load. Close the panel and click the day again.
                            </p>
                        ) : activities.length === 0 ? (
                            <Empty isToday={isToday} />
                        ) : (
                            <>
                                <StatBand
                                    size="sm"
                                    cols={3}
                                    items={[
                                        { icon: Zap, label: "XP earned", value: `+${xp.toLocaleString("en")}` },
                                        { icon: ListChecks, label: "Activities", value: String(activities.length) },
                                        { icon: Clock, label: "Time", value: formatMinutes(minutes) },
                                    ]}
                                />
                                <section>
                                    <h3 className="mb-3 text-xs font-medium text-neutral-600 dark:text-neutral-400">Timeline</h3>
                                    <ol className="relative">
                                        {ordered.map((a, i) => (
                                            <TimelineRow key={a.id} activity={a} last={i === ordered.length - 1} />
                                        ))}
                                    </ol>
                                </section>
                            </>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

function TimelineRow({ activity, last }: { activity: ActivityItem; last: boolean }) {
    const { label, icon: Icon } = kindOf(activity.type);
    return (
        <li className="relative flex gap-3 pb-4 last:pb-0">
            {/* The rail between icons; stops at the last row. */}
            {!last && <span aria-hidden className="absolute top-9 bottom-0 left-[17px] w-px bg-neutral-200 dark:bg-neutral-800" />}
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                <Icon className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
            </div>
            <div className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
                <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-snug text-neutral-900 dark:text-neutral-100">{activity.title}</p>
                    {activity.xpEarned > 0 && (
                        <span className="shrink-0 rounded-md bg-neutral-900/5 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-neutral-900 dark:bg-white/10 dark:text-neutral-100">
                            +{activity.xpEarned} XP
                        </span>
                    )}
                </div>
                {activity.description && (
                    <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">{activity.description}</p>
                )}
                <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-neutral-500">
                    <span>{label}</span>
                    <span aria-hidden>·</span>
                    <span>{formatTime(activity.createdAt)}</span>
                    {activity.timeSpent > 0 && (
                        <>
                            <span aria-hidden>·</span>
                            <span>{formatMinutes(activity.timeSpent)}</span>
                        </>
                    )}
                </p>
            </div>
        </li>
    );
}

function Empty({ isToday }: { isToday: boolean }) {
    return (
        <div className="rounded-lg border border-dashed border-neutral-300 px-5 py-8 text-center dark:border-neutral-700">
            <CalendarDays className="mx-auto h-6 w-6 text-neutral-400" />
            <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {isToday ? "Nothing yet today" : "Nothing recorded this day"}
            </p>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                Practice, projects, mock interviews and Pathfinder all count.
            </p>
            {isToday && (
                <Link
                    href="/practice"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-900"
                >
                    <Zap className="h-3.5 w-3.5" /> Start a practice session
                </Link>
            )}
        </div>
    );
}

/** The band and three timeline rows, as they will land. */
function DaySkeleton() {
    return (
        <div aria-busy aria-label="Loading the day" className="space-y-5">
            <StatBandSkeleton count={3} cols={3} size="sm" />
            <div>
                <Shimmer className="mb-3 h-3 w-16" />
                {[0, 1, 2].map((i) => (
                    <div key={i} className={cn("flex gap-3", i < 2 && "pb-4")}>
                        <Shimmer className="h-9 w-9 shrink-0 rounded-lg" delay={i * 0.1} />
                        <div className="flex-1 space-y-2 rounded-lg border border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
                            <Shimmer className="h-3.5 w-3/4" delay={i * 0.1} />
                            <Shimmer className="h-3 w-1/2" delay={i * 0.1} />
                            <Shimmer className="h-2.5 w-1/3" delay={i * 0.1} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
