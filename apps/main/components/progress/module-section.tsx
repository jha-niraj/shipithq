import Link from "next/link";
import {
    ArrowRight, Briefcase, Code2, FileText, FolderKanban, Lightbulb, Mic, Siren, Target, UserRound,
    type LucideIcon,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Shimmer } from "@repo/ui/components/skeleton-kit";
import { cn } from "@repo/ui/lib/utils";
import type { ModuleItem, ModuleKey, ModuleSummary, RangeKey } from "@repo/db/progress";
import TrendChart from "./trend-chart";

/**
 * One module's section, on Home and in a progress report (plan/home HOME-8; Niraj, 2026-09-28: "each section for
 * the things and modules ... showing all the things the user have done and a button to
 * take there"). Header with the module's numbers and an Open button; a line chart on the
 * left; the latest items on the right with See all. Server-rendered; only the chart is a
 * client component.
 */

export interface ModuleMeta {
    title: string;
    icon: LucideIcon;
    open: { href: string; label: string };
    seeAll: string;
    /** What to do first, for someone who has never used the module. */
    empty: string;
}

export const MODULE_META: Record<ModuleKey, ModuleMeta> = {
    projects: { title: "Projects", icon: FolderKanban, open: { href: "/projects", label: "Open projects" }, seeAll: "/projects/explore?tab=mine", empty: "Pick a project from the catalogue or describe your own; it becomes a sprint board of tasks." },
    practice: { title: "Practice", icon: Code2, open: { href: "/practice", label: "Open practice" }, seeAll: "/practice", empty: "Solve a problem in DSA, system design or web; each one solved shows here with its score." },
    mock: { title: "Mock interviews", icon: Mic, open: { href: "/mock", label: "Open mock interviews" }, seeAll: "/mock/voice", empty: "Take a voice mock interview; every scored session and its score shows here." },
    pathfinder: { title: "Pathfinder", icon: Target, open: { href: "/pathfinder", label: "Open Pathfinder" }, seeAll: "/pathfinder", empty: "Set a career goal and Pathfinder builds the steps, notes and checks to get there." },
    incidents: { title: "Incidents", icon: Siren, open: { href: "/incidents", label: "Open incidents" }, seeAll: "/incidents", empty: "Work through a real production incident, answer the lead's checks and earn a report." },
    jobs: { title: "Jobs and rounds", icon: Briefcase, open: { href: "/jobs", label: "Open jobs" }, seeAll: "/jobs/rounds", empty: "Take a company's rounds, send your results, or ask for a referral." },
    aiTools: { title: "AI tools", icon: FileText, open: { href: "/ai", label: "Open AI tools" }, seeAll: "/ai/resume", empty: "Build a resume or write a cover letter tailored to a job." },
    knowme: { title: "KnowMe", icon: UserRound, open: { href: "/knowme", label: "Open KnowMe" }, seeAll: "/knowme/analytics", empty: "Set up KnowMe: a public profile that answers recruiters' questions about you." },
    ideas: { title: "Ideas", icon: Lightbulb, open: { href: "/ideas", label: "Open ideas" }, seeAll: "/ideas", empty: "Post an idea for ShipItHQ or vote on others'; shipped ones show here." },
};

export const RANGE_WORDS: Record<RangeKey, string> = { "30d": "the last 30 days", "90d": "the last 90 days", "1y": "the last year" };

/** A label inside a sentence: lower-cased, except an acronym such as XP. */
function words(label: string) {
    return label.split(" ").map((w) => (w === w.toUpperCase() ? w : w.toLowerCase())).join(" ");
}

export const SECTION_CARD = "rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950";

function ago(isoTime: string, now = Date.now()) {
    const s = Math.max(0, Math.round((now - new Date(isoTime).getTime()) / 1000));
    if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
    if (s < 86_400) return `${Math.round(s / 3600)}h ago`;
    const d = Math.round(s / 86_400);
    if (d < 7) return `${d}d ago`;
    if (d < 60) return `${Math.round(d / 7)}w ago`;
    return new Date(isoTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SectionHeader({ meta, numbers, readOnly }: { meta: ModuleMeta; numbers: ModuleSummary["numbers"]; readOnly?: boolean }) {
    const Icon = meta.icon;
    return (
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center dark:border-neutral-800">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900/10 dark:bg-white/10">
                        <Icon className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
                    </span>
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{meta.title}</h2>
                </div>
                {numbers.length > 0 && (
                    <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        {numbers.map((x) => (
                            <div key={x.label} className="flex items-baseline gap-1.5">
                                <dd className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{x.value}</dd>
                                <dt className="text-xs text-neutral-600 dark:text-neutral-400">{x.label}</dt>
                            </div>
                        ))}
                    </dl>
                )}
            </div>
            {!readOnly && (
                <Button asChild variant="outline" size="sm" className="shrink-0 self-start sm:self-auto">
                    <Link href={meta.open.href}>{meta.open.label} <ArrowRight className="ml-1.5 size-3.5" /></Link>
                </Button>
            )}
        </div>
    );
}

function ItemRow({ item, readOnly }: { item: ModuleItem; readOnly?: boolean }) {
    const progress = item.status === "progress" && item.score != null;
    const body = (
        <>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100" title={item.title}>{item.title}</p>
                <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{item.detail}</p>
                {progress && (
                    <div className="mt-1.5 h-1 max-w-40 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div className="h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${Math.max(2, Math.min(100, item.score!))}%` }} />
                    </div>
                )}
            </div>
            <div className="shrink-0 text-right">
                {progress ? (
                    <p className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{item.score}%</p>
                ) : item.score != null ? (
                    <p className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{item.score}<span className="font-normal text-neutral-500">/100</span></p>
                ) : item.status ? (
                    <p className="text-xs text-neutral-700 dark:text-neutral-300">{item.status}</p>
                ) : null}
                <p className="text-[11px] text-neutral-500">{ago(item.when)}</p>
            </div>
        </>
    );
    const row = "flex items-center gap-3 rounded-lg px-2 py-2";
    return (
        <li>
            {readOnly
                ? <div className={row}>{body}</div>
                : <Link href={item.href} className={cn(row, "transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60")}>{body}</Link>}
        </li>
    );
}

/**
 * `period` finishes the chart's caption: "the last 90 days" on Home, "this week" in a
 * report. `readOnly` (a shared report) drops the buttons and item links, which lead
 * into the owner's app.
 */
export function ModuleSection({ summary, period, readOnly }: { summary: ModuleSummary; period: string; readOnly?: boolean }) {
    const meta = MODULE_META[summary.key];
    const counts = summary.lines.filter((l) => l.kind === "count");
    const caption = counts.length
        ? counts.map((l) => { const n = summary.periodTotals[l.key] ?? 0; return `${n.toLocaleString("en")} ${words(n === 1 && l.one ? l.one : l.label)}` }).join(" · ") + ` in ${period}`
        : `${summary.lines.map((l) => l.label).join(", ")} in ${period}`;

    return (
        <section className={SECTION_CARD} aria-label={meta.title}>
            <SectionHeader meta={meta} numbers={summary.empty ? [] : summary.numbers} readOnly={readOnly} />
            <div className="grid gap-5 p-5 lg:grid-cols-5">
                <div className="min-w-0 lg:col-span-3">
                    <p className="mb-2 text-xs text-neutral-600 dark:text-neutral-400">{caption}</p>
                    <TrendChart series={summary.series} lines={summary.lines} bucket={summary.bucket} />
                </div>
                <div className="flex min-w-0 flex-col lg:col-span-2">
                    <p className="mb-1 px-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">Latest</p>
                    {summary.items.length === 0 && readOnly ? (
                        <p className="px-2 text-sm text-neutral-500">Nothing to list.</p>
                    ) : summary.items.length === 0 ? (
                        <div className="flex flex-1 flex-col items-start justify-center gap-3 rounded-lg border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
                            <p className="text-sm text-neutral-700 dark:text-neutral-300">{meta.empty}</p>
                            <Button asChild size="sm"><Link href={meta.open.href}>Start <ArrowRight className="ml-1.5 size-3.5" /></Link></Button>
                        </div>
                    ) : (
                        <>
                            <ul className="-mx-0 flex-1 space-y-0.5">
                                {summary.items.map((item, i) => <ItemRow key={`${i}-${item.href}`} item={item} readOnly={readOnly} />)}
                            </ul>
                            {!readOnly && summary.total > summary.items.length && (
                                <Link href={meta.seeAll} className="group mt-2 inline-flex items-center gap-1 self-start px-2 text-xs font-medium text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
                                    See all {summary.total.toLocaleString("en")} <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                                </Link>
                            )}
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

/** The same card: header, caption, chart and five rows, so nothing moves when it lands. */
export function ModuleSectionSkeleton({ module }: { module: ModuleKey }) {
    const meta = MODULE_META[module];
    const Icon = meta.icon;
    return (
        <section className={SECTION_CARD} aria-busy aria-label={`Loading ${meta.title}`}>
            <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900/10 dark:bg-white/10">
                    <Icon className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
                </span>
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{meta.title}</span>
                <Shimmer className="h-4 w-48" />
                <Shimmer className="ml-auto h-8 w-32" />
            </div>
            <div className="grid gap-5 p-5 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    <Shimmer className="mb-2 h-3 w-40" />
                    <Shimmer className="aspect-[5/2] w-full rounded-lg" />
                </div>
                <div className="space-y-3 lg:col-span-2">
                    <Shimmer className="h-3 w-12" />
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className={cn("flex items-center gap-3 px-2")}>
                            <div className="flex-1 space-y-1.5">
                                <Shimmer className="h-3.5 w-3/4" delay={i * 0.08} />
                                <Shimmer className="h-3 w-1/2" delay={i * 0.08} />
                            </div>
                            <Shimmer className="h-6 w-10" delay={i * 0.08} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
