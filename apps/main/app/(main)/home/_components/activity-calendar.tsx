"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Flame } from "lucide-react";
import {
    ContributionGraph, ContributionGraphBlock, ContributionGraphCalendar,
    ContributionGraphFooter, ContributionGraphLegend, ContributionGraphTotalCount,
    type Activity,
} from "@repo/ui/components/contribution-graph";
import { cn } from "@repo/ui/lib/utils";
import ActivityDaySheet from "./activity-day-sheet";

// ─────────────────────────────────────────────────────────────────────────────
// The year-long activity grid on /home, drawn with the shared ContributionGraph
// (packages/ui, from @ncdai/github-contributions; Niraj, 2026-09-28: "use this for
// the contributions that we are showing on the home page").
//
// The graph is an SVG with fixed block sizes. The card is as wide as the page, so
// the block size is measured from the card: the year fills the width, as the old
// CSS grid did, between 10px and 18px a block. Below 10px it scrolls sideways.
// ─────────────────────────────────────────────────────────────────────────────

interface ActivityData {
    date: Date | string;
    totalXp: number;
    activitiesCount: number;
}

type Day = Activity & { xp: number; day: Date };

const DAYS = 365;
const MARGIN = 3;
const WEEKS = 53;

// Monotonic in BOTH themes: each level is visibly further from the card surface
// than the one before. Level 0 still reads as a cell, not a hole. Overrides the
// graph's own muted fills (same data-level variants, so tailwind-merge drops them).
const LEVELS = cn(
    'data-[level="0"]:fill-neutral-100 dark:data-[level="0"]:fill-neutral-800',
    'data-[level="1"]:fill-neutral-300 dark:data-[level="1"]:fill-neutral-700',
    'data-[level="2"]:fill-neutral-500 dark:data-[level="2"]:fill-neutral-500',
    'data-[level="3"]:fill-neutral-700 dark:data-[level="3"]:fill-neutral-300',
    'data-[level="4"]:fill-neutral-900 dark:data-[level="4"]:fill-neutral-100',
);

function levelFor(xp: number): number {
    if (xp <= 0) return 0;
    if (xp < 50) return 1;
    if (xp < 100) return 2;
    if (xp < 200) return 3;
    return 4;
}

/** yyyy-mm-dd in local time: the graph parses dates as local days. */
function isoDay(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(date: Date) {
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** Every day of the last year, today last, with its XP and level. */
function buildDays(data: ActivityData[]): Day[] {
    // A stored day is a yyyy-mm-dd string: keep it as that day, never as UTC midnight
    // (which lands on the day before anywhere west of UTC).
    const byDay = new Map(data.map((d) => [typeof d.date === "string" ? d.date.slice(0, 10) : isoDay(new Date(d.date)), d]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: Day[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
        const day = new Date(today);
        day.setDate(today.getDate() - i);
        const a = byDay.get(isoDay(day));
        const xp = a?.totalXp ?? 0;
        days.push({ date: isoDay(day), day, xp, count: a?.activitiesCount ?? 0, level: levelFor(xp) });
    }
    return days;
}

/** The block size that makes a year fill `width`, clamped to 10 to 18px. */
function useBlockSize() {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState(12);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => {
            const fit = Math.floor((el.clientWidth + MARGIN) / WEEKS) - MARGIN;
            setSize(Math.max(10, Math.min(18, fit)));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return { ref, size };
}

// Same surface as the Home module cards (plan/home HOME-2).
const CARD = "h-full rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950";
const TEXT = "text-xs text-neutral-600 dark:text-neutral-400";

function Header({ streak }: { streak: number | null }) {
    return (
        <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900/10 dark:bg-white/10">
                    <CalendarDays className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
                </div>
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Activity</span>
            </div>
            {streak !== null && (
                <div className="flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
                    <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{streak}</span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">day streak</span>
                </div>
            )}
        </div>
    );
}

function Legend({ size }: { size: number }) {
    return (
        <ContributionGraphLegend className={TEXT}>
            {({ level }) => (
                <svg width={size} height={size} aria-hidden>
                    <rect className={LEVELS} data-level={level} width={size} height={size} rx={2} ry={2} />
                </svg>
            )}
        </ContributionGraphLegend>
    );
}

export default function ActivityCalendar({ data }: { data: ActivityData[] }) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const { ref, size } = useBlockSize();
    // One tooltip for the whole graph, placed over the hovered (or focused) day.
    // A Radix Tooltip per day never opened: its trigger does not take an SVG <g>.
    const [hover, setHover] = useState<{ day: Day; x: number; y: number } | null>(null);
    const show = (day: Day, el: Element) => {
        const box = ref.current?.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        if (!box) return;
        const x = r.left + r.width / 2 - box.left;
        setHover({ day, x: Math.max(96, Math.min(box.width - 96, x)), y: r.top - box.top });
    };

    const days = useMemo(() => buildDays(data), [data]);
    const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

    // Consecutive active days ending today, or yesterday when today is still empty.
    const streak = useMemo(() => {
        let n = 0;
        for (let i = days.length - 1; i >= 0; i--) {
            if (days[i]!.xp > 0) n++;
            else if (i < days.length - 1) break;
        }
        return n;
    }, [days]);

    const active = days.filter((d) => d.xp > 0).length;
    const totalXp = days.reduce((sum, d) => sum + d.xp, 0);
    const open = (day: string) => {
        setSelectedDate(day);
        setSheetOpen(true);
    };

    return (
        <>
            <div className={CARD}>
                <Header streak={streak} />
                <div ref={ref} className="relative animate-in fade-in-0 duration-300 [animation-fill-mode:both] motion-reduce:animate-none">
                    <ContributionGraph data={days} blockSize={size} blockMargin={MARGIN} blockRadius={2} fontSize={12} className="mx-auto">
                        <ContributionGraphCalendar
                            title={`Activity over the last year: ${active} active day${active === 1 ? "" : "s"}`}
                            className="text-neutral-600 dark:text-neutral-400"
                        >
                            {({ activity, dayIndex, weekIndex }) => {
                                const day = byDate.get(activity.date);
                                if (!day) return null;
                                const label = `${formatDate(day.day)}: ${day.xp > 0 ? `${day.xp} XP` : "no activity"}`;
                                return (
                                    <ContributionGraphBlock
                                        activity={activity}
                                        dayIndex={dayIndex}
                                        weekIndex={weekIndex}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`${label}. Open the full day.`}
                                        onPointerEnter={(e) => show(day, e.currentTarget)}
                                        onPointerLeave={() => setHover(null)}
                                        onFocus={(e) => show(day, e.currentTarget)}
                                        onBlur={() => setHover(null)}
                                        onClick={() => open(day.date)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                open(day.date);
                                            }
                                        }}
                                        className={cn(LEVELS, "cursor-pointer outline-none focus-visible:stroke-neutral-900 focus-visible:stroke-2 dark:focus-visible:stroke-neutral-100", hover?.day.date === day.date && "stroke-neutral-900 stroke-1 dark:stroke-neutral-100")}
                                    />
                                );
                            }}
                        </ContributionGraphCalendar>
                        <ContributionGraphFooter className="mt-2 items-center">
                            <ContributionGraphTotalCount>
                                {() => (
                                    <span className={TEXT}>
                                        {active} active day{active === 1 ? "" : "s"}, {totalXp.toLocaleString("en")} XP in the last year
                                    </span>
                                )}
                            </ContributionGraphTotalCount>
                            <Legend size={Math.min(size, 12)} />
                        </ContributionGraphFooter>
                    </ContributionGraph>
                    {hover && (
                        <div
                            role="tooltip"
                            className="pointer-events-none absolute z-20 w-max max-w-48 -translate-x-1/2 -translate-y-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md dark:border-neutral-800 dark:bg-neutral-900"
                            style={{ left: hover.x, top: hover.y - 6 }}
                        >
                            <p className="font-medium text-neutral-900 dark:text-neutral-100">{formatDate(hover.day.day)}</p>
                            <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">
                                {hover.day.xp > 0
                                    ? `${hover.day.xp} XP from ${hover.day.count} ${hover.day.count === 1 ? "activity" : "activities"}`
                                    : "No activity"}
                            </p>
                            <p className="mt-1.5 border-t border-neutral-200 pt-1.5 text-[11px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-500">
                                Click to see the full day
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <ActivityDaySheet open={sheetOpen} onOpenChange={setSheetOpen} date={selectedDate} />
        </>
    );
}

/**
 * The same card and graph with every day empty, so the loading state has the real
 * height at every width and the page does not reflow when data arrives.
 */
export function ActivityCalendarSkeleton() {
    const days = useMemo(() => buildDays([]), []);
    const { ref, size } = useBlockSize();
    return (
        <div className={CARD} aria-busy aria-label="Loading activity">
            <Header streak={null} />
            <div ref={ref} className="animate-pulse">
                <ContributionGraph data={days} blockSize={size} blockMargin={MARGIN} blockRadius={2} fontSize={12} className="mx-auto">
                    <ContributionGraphCalendar title="Loading activity" className="text-neutral-600 dark:text-neutral-400">
                        {({ activity, dayIndex, weekIndex }) => (
                            <ContributionGraphBlock activity={activity} dayIndex={dayIndex} weekIndex={weekIndex} className={LEVELS} />
                        )}
                    </ContributionGraphCalendar>
                    <ContributionGraphFooter className="mt-2 items-center">
                        <span className={TEXT}>&nbsp;</span>
                        <Legend size={Math.min(size, 12)} />
                    </ContributionGraphFooter>
                </ContributionGraph>
            </div>
        </div>
    );
}
