import { Suspense } from "react";
import { TrendingDown, TrendingUp, Zap } from "lucide-react";
import { db } from "@repo/db";
import {
    MODULE_ORDER, SUMMARIZE, rangeFor, summarizeXp, type ModuleKey, type RangeKey,
} from "@repo/db/progress";
import { Shimmer } from "@repo/ui/components/skeleton-kit";
import { TabsNav } from "@repo/ui/components/ui/tabs";
import { cn } from "@repo/ui/lib/utils";
import { ModuleSection, ModuleSectionSkeleton, RANGE_WORDS, SECTION_CARD } from "@/components/progress/module-section";
import TrendChart from "@/components/progress/trend-chart";

/**
 * Home's progress area, below the activity graph (plan/home HOME-7, HOME-8): the range
 * switch, the XP chart, then one section per module. Each streams in its own Suspense,
 * so one slow module never holds the page.
 */

const RANGES: { key: RangeKey; label: string }[] = [
    { key: "30d", label: "30 days" },
    { key: "90d", label: "90 days" },
    { key: "1y", label: "1 year" },
];

export function RangeSwitch({ range }: { range: RangeKey }) {
    // The shared tabs (CLAUDE.md); `scroll: false` so changing the range doesn't jump to the top.
    return (
        <TabsNav
            aria-label="Chart range"
            items={RANGES.map((r) => ({
                href: r.key === "90d" ? "/home" : `/home?range=${r.key}`,
                label: r.label,
                active: r.key === range,
                scroll: false,
            }))}
        />
    );
}

async function XpOverview({ userId, range }: { userId: string; range: RangeKey }) {
    const xp = await summarizeXp(db, userId, rangeFor(range));
    const Trend = xp.change !== null && xp.change < 0 ? TrendingDown : TrendingUp;
    return (
        <section className={cn(SECTION_CARD, "p-5")} aria-label="XP over time">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900/10 dark:bg-white/10">
                        <Zap className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
                    </span>
                    <div>
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">XP over time</h2>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">Every module, {xp.bucket === "week" ? "per week" : "per day"}; the dashed line is the period before</p>
                    </div>
                </div>
                <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                    <div className="flex items-baseline gap-1.5">
                        <dd className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">{xp.total.toLocaleString("en")}</dd>
                        <dt className="text-xs text-neutral-600 dark:text-neutral-400">XP</dt>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <dd className={cn(
                            "inline-flex items-center gap-1 text-sm font-semibold tabular-nums",
                            xp.change === null ? "text-neutral-500" : xp.change < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400",
                        )}>
                            {xp.change !== null && <Trend className="size-3.5" />}
                            {xp.change === null ? "-" : `${xp.change > 0 ? "+" : ""}${xp.change}%`}
                        </dd>
                        <dt className="text-xs text-neutral-600 dark:text-neutral-400">vs before</dt>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <dd className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">{xp.activeDays}</dd>
                        <dt className="text-xs text-neutral-600 dark:text-neutral-400">days with XP</dt>
                    </div>
                </dl>
            </div>
            {xp.total === 0 && xp.previousTotal === 0 ? (
                <div className="flex aspect-[4/1] items-center justify-center rounded-lg border border-dashed border-neutral-200 text-sm text-neutral-500 dark:border-neutral-800">
                    No XP in this period yet. Solve a problem, finish a task or answer an incident check to start the line.
                </div>
            ) : (
                <TrendChart
                    series={xp.series}
                    lines={[{ key: "xp", label: "XP", kind: "count" }]}
                    previousKey="previous"
                    bucket={xp.bucket}
                    aspectRatio="4 / 1"
                />
            )}
        </section>
    );
}

function XpOverviewSkeleton() {
    return (
        <section className={cn(SECTION_CARD, "p-5")} aria-busy aria-label="Loading XP">
            <div className="mb-3 flex items-end justify-between">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900/10 dark:bg-white/10">
                        <Zap className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
                    </span>
                    <div className="space-y-1.5">
                        <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">XP over time</span>
                        <Shimmer className="h-3 w-56" />
                    </div>
                </div>
                <Shimmer className="h-7 w-48" />
            </div>
            <Shimmer className="aspect-[4/1] w-full rounded-lg" />
        </section>
    );
}

async function ModuleSectionLoader({ module, userId, range }: { module: ModuleKey; userId: string; range: RangeKey }) {
    const summary = await SUMMARIZE[module](db, userId, rangeFor(range));
    return <ModuleSection summary={summary} period={RANGE_WORDS[range]} />;
}

export default function ProgressSections({ userId, range }: { userId: string; range: RangeKey }) {
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div>
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Your progress</h2>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Everything you have done, module by module</p>
                </div>
                <RangeSwitch range={range} />
            </div>
            <Suspense key={`xp-${range}`} fallback={<XpOverviewSkeleton />}>
                <XpOverview userId={userId} range={range} />
            </Suspense>
            {MODULE_ORDER.map((m) => (
                <Suspense key={`${m}-${range}`} fallback={<ModuleSectionSkeleton module={m} />}>
                    <ModuleSectionLoader module={m} userId={userId} range={range} />
                </Suspense>
            ))}
        </div>
    );
}

/** For `loading.tsx`: the same area before anything has loaded. */
export function ProgressSectionsSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pt-2">
                <div className="space-y-1.5">
                    <span className="block text-base font-semibold text-neutral-900 dark:text-white">Your progress</span>
                    <Shimmer className="h-3 w-52" />
                </div>
                <Shimmer className="h-8 w-52 rounded-lg" />
            </div>
            <XpOverviewSkeleton />
            {MODULE_ORDER.map((m) => <ModuleSectionSkeleton key={m} module={m} />)}
        </div>
    );
}
