"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Flame } from "lucide-react";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@repo/ui/components/ui/tooltip";
import { cn } from "@repo/ui/lib/utils";
import ActivityDaySheet from "./activity-day-sheet";

// ─────────────────────────────────────────────────────────────────────────────
// The year-long contribution grid on /home.
//
// ONE CSS grid holds everything: a label column plus one column per week, a
// month-label row plus seven day rows. Every cell is placed explicitly, so the
// day labels, the month labels and the squares cannot drift out of line the way
// they did when they were three separate flex rows (padding cells had no width,
// the top rows started late and the grid looked sheared, and month names were
// squeezed into one-week slots and truncated to "A…").
//
// The cells fill the card's width and stay square. The legend uses its own
// fixed 12px swatches; it used to share the cell class, which is `w-full`, and
// rendered five squares the width of the card.
// ─────────────────────────────────────────────────────────────────────────────

interface ActivityData {
    date: Date | string;
    totalXp: number;
    activitiesCount: number;
}

type Day = { date: Date; xp: number; count: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS: Record<number, string> = { 1: "Mon", 3: "Wed", 5: "Fri" };
const DAYS = 365;

// Monotonic in BOTH themes: each level is visibly further from the card
// surface than the one before. Level 0 still reads as a cell, not a hole.
const LEVEL_CLASS = [
    "bg-neutral-100 dark:bg-neutral-800",
    "bg-neutral-300 dark:bg-neutral-700",
    "bg-neutral-500 dark:bg-neutral-500",
    "bg-neutral-700 dark:bg-neutral-300",
    "bg-neutral-900 dark:bg-neutral-100",
] as const;

function levelFor(xp: number): number {
    if (xp <= 0) return 0;
    if (xp < 50) return 1;
    if (xp < 100) return 2;
    if (xp < 200) return 3;
    return 4;
}

function formatDate(date: Date) {
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** Days of the last year, padded at the front so column 0 starts on a Sunday. */
function buildWeeks(data: ActivityData[]): { weeks: Array<Array<Day | null>>; days: Day[] } {
    const byDay = new Map(data.map((d) => [new Date(d.date).toDateString(), d]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: Day[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const a = byDay.get(date.toDateString());
        days.push({ date, xp: a?.totalXp ?? 0, count: a?.activitiesCount ?? 0 });
    }
    const cells: Array<Day | null> = [...Array<null>(days[0]!.date.getDay()).fill(null), ...days];
    const weeks: Array<Array<Day | null>> = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return { weeks, days };
}

/**
 * Month labels: one per month, on the column of the week containing the 1st,
 * spanning three columns so the whole name fits. A label within three columns
 * of the previous one (a partial first month) is skipped rather than overlapped.
 */
function monthLabels(weeks: Array<Array<Day | null>>): Array<{ col: number; label: string }> {
    const out: Array<{ col: number; label: string }> = [];
    weeks.forEach((week, w) => {
        const first = week.find((d) => d && d.date.getDate() === 1);
        const lead = w === 0 ? week.find((d) => d) : undefined;
        const day = first ?? lead;
        if (!day) return;
        const prev = out[out.length - 1];
        if (prev && w - prev.col < 3) {
            // A real 1st-of-month beats the partial leading month it collides with.
            if (first && prev.col === 0) out.pop();
            else return;
        }
        out.push({ col: w, label: MONTHS[day.date.getMonth()]! });
    });
    return out;
}

function gridTemplate(weekCount: number): React.CSSProperties {
    return {
        gridTemplateColumns: `auto repeat(${weekCount}, minmax(0, 1fr))`,
        gridTemplateRows: "auto repeat(7, auto)",
    };
}

const CARD = "h-full rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900";
const GRID = "grid min-w-[640px] gap-[3px]";
const LABEL = "text-[11px] leading-none text-neutral-600 dark:text-neutral-400";

function Legend() {
    return (
        <div className={cn("mt-4 flex items-center justify-end gap-1.5", LABEL)}>
            <span className="mr-1">Less</span>
            {LEVEL_CLASS.map((c, i) => (
                <span key={i} className={cn("h-3 w-3 rounded-[3px]", c)} />
            ))}
            <span className="ml-1">More</span>
        </div>
    );
}

function Header({ streak }: { streak: number | null }) {
    return (
        <div className="mb-5 flex items-center justify-between">
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

/** Day-of-week labels in column 1, rows 2 to 8. */
function DayLabels() {
    return (
        <>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <span key={d} className={cn(LABEL, "flex items-center pr-2")} style={{ gridColumn: 1, gridRow: d + 2 }}>
                    {DAY_LABELS[d] ?? ""}
                </span>
            ))}
        </>
    );
}

export default function ActivityCalendar({ data }: { data: ActivityData[] }) {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const { weeks, days } = useMemo(() => buildWeeks(data), [data]);
    const months = useMemo(() => monthLabels(weeks), [weeks]);

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

    return (
        <>
            <div className={CARD}>
                <Header streak={streak} />
                <TooltipProvider delayDuration={100}>
                    <div className="overflow-x-auto pb-1">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                            className={GRID}
                            style={gridTemplate(weeks.length)}
                            role="grid"
                            aria-label={`Activity over the last year: ${active} active day${active === 1 ? "" : "s"}`}
                        >
                            {months.map((m) => (
                                <span
                                    key={`${m.col}-${m.label}`}
                                    className={cn(LABEL, "pb-1.5 whitespace-nowrap")}
                                    style={{ gridColumn: `${m.col + 2} / span 3`, gridRow: 1 }}
                                >
                                    {m.label}
                                </span>
                            ))}
                            <DayLabels />
                            {weeks.map((week, w) =>
                                week.map((day, d) => {
                                    const place = { gridColumn: w + 2, gridRow: d + 2 };
                                    if (!day) return <span key={`${w}-${d}`} style={place} aria-hidden />;
                                    return (
                                        <Tooltip key={`${w}-${d}`}>
                                            <TooltipTrigger asChild>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedDate(day.date);
                                                        setSheetOpen(true);
                                                    }}
                                                    style={place}
                                                    aria-label={`${formatDate(day.date)}: ${day.xp > 0 ? `${day.xp} XP` : "no activity"}`}
                                                    className={cn(
                                                        "aspect-square w-full cursor-pointer rounded-[3px] transition-transform hover:scale-125 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-900 dark:focus-visible:outline-neutral-100",
                                                        LEVEL_CLASS[levelFor(day.xp)],
                                                    )}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">
                                                <p className="font-medium">{formatDate(day.date)}</p>
                                                <p className="text-muted-foreground">
                                                    {day.xp > 0 ? `${day.xp} XP, ${day.count} ${day.count === 1 ? "activity" : "activities"}` : "No activity"}
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                }),
                            )}
                        </motion.div>
                    </div>
                </TooltipProvider>
                <Legend />
            </div>

            <ActivityDaySheet open={sheetOpen} onOpenChange={setSheetOpen} date={selectedDate} />
        </>
    );
}

/**
 * The same card, grid and legend with inert cells, so the loading state has the
 * real height at every width and the page does not reflow when data arrives.
 */
export function ActivityCalendarSkeleton() {
    const { weeks } = buildWeeks([]);
    return (
        <div className={CARD} aria-busy aria-label="Loading activity">
            <Header streak={null} />
            <div className="overflow-hidden pb-1">
                <div className={cn(GRID, "animate-pulse")} style={gridTemplate(weeks.length)}>
                    <span className={cn(LABEL, "pb-1.5")} style={{ gridColumn: "2 / span 3", gridRow: 1 }}>&nbsp;</span>
                    <DayLabels />
                    {weeks.map((week, w) =>
                        week.map((day, d) => (
                            <span
                                key={`${w}-${d}`}
                                style={{ gridColumn: w + 2, gridRow: d + 2 }}
                                className={day ? "aspect-square w-full rounded-[3px] bg-neutral-100 dark:bg-neutral-800" : undefined}
                            />
                        )),
                    )}
                </div>
            </div>
            <Legend />
        </div>
    );
}
