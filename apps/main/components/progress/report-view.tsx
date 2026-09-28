import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Flame, ListChecks, Trophy, Zap } from "lucide-react";
import { StatBand } from "@repo/ui/components/ui/stat-band";
import { FREQUENCY_LABEL, periodLabel, type ReportEntry, type ReportSnapshot } from "@repo/db/progress";
import { ModuleSection, SECTION_CARD } from "./module-section";
import TrendChart from "./trend-chart";
import { kindOf } from "./activity-kinds";
import { ReportActions } from "./report-actions";
import { BadgeTiles } from "@/components/badges/badge-tiles";
import { INCIDENT_BADGES } from "@/content/incidents/badges";
import type { BadgeView } from "@/lib/badges/load";

/**
 * A progress report, rendered from its stored snapshot (plan/progress PRG-8). The owner
 * sees the share controls, the item links and "next up"; a shared link shows the same
 * report read-only. Nothing here is computed from live tables.
 */

const PERIOD_WORD = { WEEKLY: "week", HALF_MONTHLY: "two weeks", MONTHLY: "month" } as const;
const PERIOD_CAPTION = { WEEKLY: "this week", HALF_MONTHLY: "these two weeks", MONTHLY: "this month" } as const;

function change(v: number | null) {
    if (v === null) return "nothing to compare with";
    if (v === 0) return "same as the period before";
    return `${v > 0 ? "+" : ""}${v}% vs the period before`;
}

function minutes(m: number) {
    if (m <= 0) return "-";
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h} h ${r} min` : `${h} h`;
}

/** A snapshot's badge as a card; an Incidents badge takes its title from the app's content. */
function reportBadge(b: NonNullable<ReportSnapshot["badges"]>[number]): BadgeView {
    const inc = b.key.startsWith("incidents:") ? INCIDENT_BADGES.find((x) => `incidents:${x.key}` === b.key) : undefined;
    return {
        key: b.key, module: inc ? "incidents" : "streaks", title: inc?.title ?? b.title, description: inc?.description ?? b.description,
        glyph: b.glyph, earned: true, earnedAt: b.earnedAt, progress: null,
    };
}

function EntryRow({ e }: { e: ReportEntry }) {
    const { label, icon: Icon } = kindOf(e.type);
    return (
        <li className="flex items-center gap-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-800">
                <Icon className="h-3.5 w-3.5 text-neutral-900 dark:text-neutral-100" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100" title={e.title}>{e.title}</p>
                <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">
                    {label}
                    {e.description ? ` · ${e.description}` : ""}
                </p>
            </div>
            <div className="shrink-0 text-right">
                {e.xp > 0 && <p className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">+{e.xp} XP</p>}
                <p className="text-[11px] text-neutral-500">
                    {new Date(e.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC
                </p>
            </div>
        </li>
    );
}

export function ReportView({ id, snapshot: r, owner, shareToken }: { id: string; snapshot: ReportSnapshot; owner: boolean; shareToken: string | null }) {
    const word = PERIOD_WORD[r.frequency];
    const first = r.name?.split(" ")[0];
    const byDay = new Map<string, ReportEntry[]>();
    for (const e of r.entries) {
        const d = e.at.slice(0, 10);
        byDay.set(d, [...(byDay.get(d) ?? []), e]);
    }

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 px-page py-6 print:max-w-none print:px-0">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{FREQUENCY_LABEL[r.frequency]} report · {periodLabel(r.period)}</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                        {owner ? `Your ${word} on ShipItHQ` : `${first ? `${first}'s` : "A"} ${word} on ShipItHQ`}
                    </h1>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        {r.totals.activities} {r.totals.activities === 1 ? "thing" : "things"} done across {r.modules.length} {r.modules.length === 1 ? "module" : "modules"}, on {r.totals.activeDays} {r.totals.activeDays === 1 ? "day" : "days"}.
                    </p>
                </div>
                {owner && (
                    <div className="flex flex-col items-start gap-2 sm:items-end print:hidden">
                        <ReportActions id={id} initialToken={shareToken} />
                        <Link href="/settings/reports" className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                            All reports and settings <ArrowRight className="size-3" />
                        </Link>
                    </div>
                )}
            </header>

            <StatBand
                cols={5}
                items={[
                    { icon: Zap, label: "XP earned", value: r.totals.xp.toLocaleString("en"), hint: change(r.change.xp) },
                    { icon: CalendarDays, label: "Active days", value: String(r.totals.activeDays), hint: change(r.change.activeDays) },
                    { icon: ListChecks, label: "Things done", value: String(r.totals.activities), hint: change(r.change.activities) },
                    { icon: Clock, label: "Time", value: minutes(r.totals.minutes), hint: change(r.change.minutes) },
                    { icon: Flame, label: "Streak", value: `${r.streak.current}d`, hint: `longest ${r.streak.longest}d` },
                ]}
            />

            {r.wins.length > 0 && (
                <section className={`${SECTION_CARD} p-5`} aria-label="Top wins">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        <Trophy className="h-4 w-4" /> Top wins
                    </h2>
                    <ol className="grid gap-3 md:grid-cols-3">
                        {r.wins.map((w, i) => {
                            const { label, icon: Icon } = kindOf(w.type);
                            return (
                                <li key={`${w.at}-${i}`} className="flex gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium leading-snug text-neutral-900 dark:text-neutral-100">{w.title}</p>
                                        <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">{label}{w.xp > 0 ? ` · +${w.xp} XP` : ""}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            )}

            {(r.badges?.length ?? 0) > 0 && (
                <section className={`${SECTION_CARD} p-5`} aria-label="Badges earned">
                    <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Badges earned</h2>
                    <BadgeTiles badges={r.badges!.map(reportBadge)} showProgress={false} />
                </section>
            )}

            <section className={`${SECTION_CARD} p-5`} aria-label="XP over the period">
                <div className="mb-3">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">XP, day by day</h2>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">The dashed line is the {word} before: {r.previous.xp.toLocaleString("en")} XP</p>
                </div>
                <TrendChart series={r.xp.series} lines={[{ key: "xp", label: "XP", kind: "count" }]} previousKey="previous" bucket={r.xp.bucket} aspectRatio="4 / 1" />
            </section>

            {r.modules.map((m) => (
                <ModuleSection key={m.key} summary={m} period={PERIOD_CAPTION[r.frequency]} readOnly={!owner} />
            ))}

            {owner && r.nextUp.length > 0 && (
                <section className={`${SECTION_CARD} p-5 print:hidden`} aria-label="Next up">
                    <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Pick up next</h2>
                    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {r.nextUp.map((n) => (
                            <li key={n.href}>
                                <Link href={n.href} className="group flex items-center gap-3 py-2.5">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{n.title}</p>
                                        <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{n.detail}</p>
                                    </div>
                                    <ArrowRight className="size-3.5 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className={`${SECTION_CARD} p-5`} aria-label="Everything done">
                <h2 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Everything, day by day</h2>
                <p className="mb-3 text-xs text-neutral-600 dark:text-neutral-400">{r.entries.length} {r.entries.length === 1 ? "entry" : "entries"}, newest first</p>
                <div className="space-y-4">
                    {[...byDay].map(([day, list]) => (
                        <div key={day}>
                            <p className="border-b border-neutral-200 pb-1.5 text-xs font-medium text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
                                {new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
                                <span className="ml-2 font-normal text-neutral-500">{list.length} · +{list.reduce((s, e) => s + e.xp, 0)} XP</span>
                            </p>
                            <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
                                {list.map((e, i) => <EntryRow key={`${e.at}-${i}`} e={e} />)}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            <p className="pb-4 text-center text-xs text-neutral-500">
                Every number here comes from what was recorded in the period; nothing is estimated.
            </p>
        </div>
    );
}
