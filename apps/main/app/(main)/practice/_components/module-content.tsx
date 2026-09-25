"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowRight, CheckCircle2, ChevronDown, Circle, Clock, GraduationCap, ListFilter, RotateCcw, Search, Shield, Sparkles, Trophy, Users, X,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { Input } from "@repo/ui/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import {
    DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import { PageHeader } from "@repo/ui/components/ui/page-header";
import { PracticeHeaderTabs } from "./practice-layout-wrapper";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import toast from "@repo/ui/components/ui/sonner";
import type { PathStage } from "@repo/db/practice";
import { PathView } from "./path-view";
import type {
    PracticeCategory, PracticeLeaderboardEntry, PracticeModule, PracticeProblemListItem,
} from "@/types/practice";
import { MODULE_CONFIG } from "@/types/practice";
import { priceLabel } from "@/lib/credits/pricing";

// ─────────────────────────────────────────────────────────────────────────────
// A practice module's problem list (plan/practice-ui, UI-3).
//
// One layout for all four modules: a header with real progress, one filter card
// (search, difficulty, category chips that replaced the old sidebar tree), the
// problem list as a single card of rows with a clear action, and a compact
// leaderboard. Monochrome; the one colour is red for Hard, as before.
// ─────────────────────────────────────────────────────────────────────────────

const INK = "text-neutral-900 dark:text-neutral-50";
const INK_DIM = "text-neutral-600 dark:text-neutral-400";
const CARD = "rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";

const MODULE_PATHS: Record<PracticeModule, string> = {
    DSA: "/practice/dsa",
    SYSTEM_DESIGN: "/practice/system-design",
    WEB_FRONTEND: "/practice/web-frontend",
    WEB_BACKEND: "/practice/web-backend",
};

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
const DIFFICULTY_LABEL: Record<string, string> = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };
const DIFFICULTY_INK: Record<string, string> = {
    EASY: "text-neutral-600 dark:text-neutral-400",
    MEDIUM: "text-neutral-900 dark:text-neutral-100",
    HARD: "text-red-600 dark:text-red-400",
};

interface ModuleContentProps {
    module: PracticeModule;
    moduleLabel: string;
    problems: PracticeProblemListItem[];
    categories: PracticeCategory[];
    leaderboard: PracticeLeaderboardEntry[];
    activeCategory: string | null;
    /** The cached path, read on the server (plan/practice-path). Empty is normal. */
    path: PathStage[];
    /** True when this module's onboarding is finished, so a path can be planned. */
    canPlan: boolean;
}

export function ModuleContent({
    module,
    moduleLabel,
    problems,
    categories,
    leaderboard,
    activeCategory,
    path,
    canPlan,
}: ModuleContentProps) {
    const [difficulty, setDifficulty] = useState<string | null>(null);
    /*
     * Topics are a MULTI-SELECT now (Niraj, 2026-09-22): a dropdown of checkboxes on
     * the filter line instead of a wrapping field of chips that took three rows.
     * "All topics" is the empty selection, and picking it clears the rest.
     *
     * Filtering is client-side over the module's problems, so ticking a second topic
     * costs no round trip. The URL still carries the selection (`?topic=a,b`) so a
     * filtered list stays shareable and survives a reload.
     */
    const [topics, setTopics] = useState<string[]>(() => (activeCategory ? activeCategory.split(",").filter(Boolean) : []));
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<PracticeProblemListItem | null>(null);
    const basePath = MODULE_PATHS[module];
    const categoryNames = MODULE_CONFIG[module]?.categories ?? {};

    // ── The path (plan/practice-path) ────────────────────────────────────────
    // Stages of problems by topic, each ending in a checkpoint. This is the first
    // tab: it replaced a flat list of recommendations, which named 30 problems and
    // said nothing about the order or about being ready to move on.
    const [stages, setStages] = useState<PathStage[]>(path);
    const [tab, setTab] = useState<"path" | "all">(path.length > 0 ? "path" : "all");
    const [pathPending, setPathPending] = useState(false);
    const [pathError, setPathError] = useState<string | null>(null);
    const asked = useRef(path.length > 0);

    const loadPath = useCallback(async (force: boolean) => {
        setPathPending(true);
        setPathError(null);
        try {
            const res = await fetch("/api/practice/path", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ module, force }),
            });
            const data = (await res.json()) as { stages?: PathStage[]; error?: string };
            if (!res.ok) {
                setPathError(data.error ?? "Could not lay out your path.");
                return;
            }
            setStages(data.stages ?? []);
            if (force) toast.success("Path re-planned");
        } catch {
            setPathError("Could not reach the planner. Try again.");
        } finally {
            setPathPending(false);
        }
    }, [module]);

    // Once, when the tab is first opened with nothing stored.
    useEffect(() => {
        if (tab !== "path" || asked.current || !canPlan) return;
        asked.current = true;
        void loadPath(false);
    }, [tab, canPlan, loadPath]);

    const bySlug = useMemo(() => new Map(problems.map((p) => [p.slug, p])), [problems]);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        const picked = new Set(topics);
        return problems.filter((p) =>
            (picked.size === 0 || picked.has(p.category)) &&
            (!difficulty || p.difficulty === difficulty) &&
            (!q || p.title.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q))),
        );
    }, [problems, topics, difficulty, query]);

    /** Keep the URL in step without re-running the server query (the list is already here). */
    const syncTopics = useCallback((next: string[]) => {
        setTopics(next);
        const url = next.length ? `${basePath}?topic=${next.join(",")}` : basePath;
        window.history.replaceState(null, "", url);
    }, [basePath]);
    const toggleTopic = useCallback((slug: string) => {
        setTopics((prev) => {
            const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
            const url = next.length ? `${basePath}?topic=${next.join(",")}` : basePath;
            window.history.replaceState(null, "", url);
            return next;
        });
    }, [basePath]);

    // Totals are for the whole module, not the current category or filter.
    const total = categories.reduce((n, c) => n + c.problemCount, 0);
    const solved = categories.reduce((n, c) => n + c.completedCount, 0);
    const inProgress = categories.reduce((n, c) => n + c.inProgressCount, 0);
    const topicName = (slug: string) => categoryNames[slug]?.name ?? slug;
    const activeName = topics.length === 0
        ? null
        : topics.length === 1
            ? topicName(topics[0]!)
            : `${topics.length} topics`;
    const topicsLabel = topics.length === 0
        ? "All topics"
        : topics.length === 1
            ? topicName(topics[0]!)
            : `${topics.length} topics`;

    return (
        // On lg+ the page is exactly one screen and does not scroll: the problem list
        // and the leaderboard scroll inside themselves (UI-9). Below lg the columns
        // stack and the page scrolls normally, because a phone has no room to nest
        // two scrollers.
        <div className="flex w-full flex-col gap-3 px-page pb-6 pt-2 lg:h-[var(--page-h,100vh)] lg:overflow-hidden">
            {/* "Add problem" used to sit at the right of this header. It is off the page
                (Niraj, 2026-09-22): the catalogue is curated, a generated problem carries
                generated tests, and a wrong test makes the mentor wrong. The generator and
                its route are still in the repo (`add-problem-sheet.tsx`,
                `generate-problem.action.ts`), unused, for a future "stuck on a problem from
                elsewhere?" inside the mentor rather than a way to add to the catalogue. */}
            <PageHeader
                className="shrink-0"
                title={moduleLabel}
                subtitle={`${total} problem${total === 1 ? "" : "s"} · ${solved} solved${inProgress ? ` · ${inProgress} in progress` : ""}`}
                tabs={<PracticeHeaderTabs />}
            />

            <div className={cn(CARD, "shrink-0 space-y-3 p-3")}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="relative min-w-0 flex-1">
                        <span className="sr-only">Search problems</span>
                        <Search className={cn("pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2", INK_DIM)} />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by title or tag"
                            className="h-9 pl-9"
                        />
                    </label>

                    {categories.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        "inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors",
                                        topics.length > 0
                                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                                            : "border-neutral-200 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800",
                                    )}
                                >
                                    <ListFilter className="h-4 w-4 shrink-0" aria-hidden />
                                    <span className="max-w-[12rem] truncate">{topicsLabel}</span>
                                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
                                {/* "All topics" is not a topic, it is the empty selection - so it
                                    clears the ticks rather than adding a fifteenth one. */}
                                <DropdownMenuCheckboxItem
                                    checked={topics.length === 0}
                                    onCheckedChange={() => syncTopics([])}
                                    onSelect={(e) => e.preventDefault()}
                                >
                                    <span className="flex-1">All topics</span>
                                    <span className={cn("ml-2 tabular-nums", INK_DIM)}>{total}</span>
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                {categories.map((c) => (
                                    <DropdownMenuCheckboxItem
                                        key={c.slug}
                                        checked={topics.includes(c.slug)}
                                        onCheckedChange={() => toggleTopic(c.slug)}
                                        onSelect={(e) => e.preventDefault()}
                                    >
                                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                                        <span className={cn("ml-2 tabular-nums", INK_DIM)}>{c.problemCount}</span>
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    <Tabs value={difficulty ?? "ALL"} onValueChange={(v) => setDifficulty(v === "ALL" ? null : v)}>
                        <TabsList variant="segmented" size="sm" fit aria-label="Difficulty">
                            <TabsTrigger value="ALL">All</TabsTrigger>
                            {DIFFICULTIES.map((d) => (
                                <TabsTrigger key={d} value={d}>{DIFFICULTY_LABEL[d]}</TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <div className="grid min-h-0 grid-cols-1 gap-5 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_280px]">
                <section aria-label={activeName ? `${activeName} problems` : "Problems"} className={cn(CARD, "flex min-h-0 flex-col overflow-hidden")}>
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
                        <Tabs value={tab} onValueChange={(v) => setTab(v as "path" | "all")}>
                            <TabsList variant="segmented" size="sm" fit aria-label="Which problems">
                                <TabsTrigger value="path" icon={<Sparkles />}>Path</TabsTrigger>
                                <TabsTrigger value="all">All</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className={cn("flex items-center gap-2 text-xs font-medium", INK_DIM)}>
                            {tab === "path" ? (
                                <span>{pathPending && stages.length === 0 ? "Planning" : stages.length > 0 ? `${stages.length} stages` : ""}</span>
                            ) : (
                                <>
                                    <span>{activeName ?? "All topics"}</span>
                                    <span aria-hidden>·</span>
                                    <span>{shown.length} shown</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Both tabs scroll inside this card. The page itself does not move,
                        so the filters and the heading stay put while you read. */}
                    <ScrollArea className="min-h-0 flex-1" reflow>
                        {tab === "path" ? (
                            pathPending && stages.length === 0 ? (
                                <RecommendationsPending />
                            ) : pathError ? (
                                <ListNotice
                                    title="That did not work."
                                    body={pathError}
                                    action={<button type="button" onClick={() => void loadPath(true)} className={cn("text-sm font-semibold underline underline-offset-4", INK)}>Try again</button>}
                                />
                            ) : !canPlan ? (
                                <ListNotice
                                    title="Finish the short onboarding first."
                                    body="The path is laid out from what you say about where you are, so there is nothing to plan from yet."
                                />
                            ) : stages.length === 0 ? (
                                <ListNotice
                                    title="No path yet."
                                    body="Ask for one and the mentor will lay the catalogue out in stages, starting where you can succeed and working toward what you avoid."
                                    action={<button type="button" onClick={() => void loadPath(true)} className={cn("text-sm font-semibold underline underline-offset-4", INK)}>Plan my path</button>}
                                />
                            ) : (
                                <PathView
                                    stages={stages}
                                    bySlug={bySlug}
                                    basePath={basePath}
                                    pending={pathPending}
                                    onReplan={() => void loadPath(true)}
                                    onOpenProblem={setSelected}
                                    // The quiz itself is PP-4. Until it exists the row says so in
                                    // the user's terms rather than naming a plan file at them.
                                    onStartQuiz={() => toast.message("The stage quiz is not ready yet.", { description: "The mock interview and the timed problem are, and they both count." })}
                                    mockHref="/mock"
                                />
                            )
                        ) : shown.length === 0 ? (
                            <ListNotice title="No problems match." body="Clear the search or pick another difficulty." />
                        ) : (
                            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                {shown.map((p) => (
                                    <li key={p.id}>
                                        <ProblemRow problem={p} categoryName={categoryNames[p.category]?.name ?? p.category} onOpen={() => setSelected(p)} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </ScrollArea>
                </section>

                <aside className={cn(CARD, "flex min-h-0 flex-col p-4 lg:overflow-hidden")}>
                    <div className="mb-3 flex shrink-0 items-center gap-2">
                        <Trophy className={cn("h-4 w-4", INK)} />
                        <h2 className={cn("text-sm font-semibold", INK)}>Leaderboard</h2>
                    </div>
                    {leaderboard.length === 0 ? (
                        <p className={cn("text-sm", INK_DIM)}>Nobody has finished a problem here yet.</p>
                    ) : (
                        <ScrollArea className="min-h-0 flex-1" reflow>
                            <ol className="space-y-1 pr-1">
                                {leaderboard.map((e) => <LeaderboardRow key={e.userId} entry={e} />)}
                            </ol>
                        </ScrollArea>
                    )}
                </aside>
            </div>

            {selected && (
                <ModeDialog
                    problem={selected}
                    module={module}
                    href={(mode) => `${basePath}/${selected.slug}${mode === "exam" ? "?mode=exam" : ""}`}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );
}

/** One line of explanation where a list would be, instead of an empty card. */
function ListNotice({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
    return (
        <div className="px-4 py-14 text-center">
            <p className={cn("text-sm font-medium", INK)}>{title}</p>
            <p className={cn("mx-auto mt-1 max-w-sm text-sm", INK_DIM)}>{body}</p>
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

/** Rows in the shape they will arrive in, while the model picks them. */
function RecommendationsPending() {
    const bar = "animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800";
    return (
        <div aria-busy aria-label="Picking problems for you">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 last:border-0 dark:border-neutral-800">
                    <div className={cn(bar, "h-4 w-4 rounded-full")} />
                    <div className="flex-1 space-y-1.5">
                        <div className={cn(bar, "h-4 w-1/2")} />
                        <div className={cn(bar, "h-3 w-2/3")} />
                    </div>
                    <div className={cn(bar, "h-4 w-12")} />
                </div>
            ))}
        </div>
    );
}

function ProblemRow({ problem, categoryName, why, onOpen }: { problem: PracticeProblemListItem; categoryName: string; /** The model's reason, on the Recommended tab only. */ why?: string; onOpen: () => void }) {
    const status = problem.userStatus ?? "NOT_STARTED";
    const preparing = problem.module === "DSA" && problem.judgeStatus !== "ready";
    const action = status === "COMPLETED" ? "Solved" : status === "IN_PROGRESS" ? "Continue" : "Start";
    return (
        <button
            type="button"
            onClick={onOpen}
            className="group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
        >
            <span className="shrink-0" aria-label={status === "COMPLETED" ? "Solved" : status === "IN_PROGRESS" ? "In progress" : "Not started"}>
                {status === "COMPLETED" ? (
                    <CheckCircle2 className={cn("h-4 w-4", INK)} />
                ) : status === "IN_PROGRESS" ? (
                    <Clock className={cn("h-4 w-4", INK)} />
                ) : (
                    <Circle className="h-4 w-4 text-neutral-400 dark:text-neutral-600" />
                )}
            </span>
            <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-sm font-medium", INK)}>{problem.title}</span>
                <span className={cn("mt-0.5 block truncate text-xs", INK_DIM)}>
                    {categoryName}
                    {problem.tags.length > 0 && <span className="hidden sm:inline"> · {problem.tags.slice(0, 3).join(", ")}</span>}
                </span>
                {why && (
                    // The model's words, as text and nothing else.
                    <span className={cn("mt-1 block truncate text-xs italic", INK_DIM)}>{why}</span>
                )}
            </span>
            {preparing && (
                <span className={cn("hidden shrink-0 rounded-md border border-neutral-200 px-2 py-0.5 text-xs sm:inline dark:border-neutral-700", INK_DIM)}>
                    {problem.judgeStatus === "failed" ? "Tests failed" : "Preparing tests"}
                </span>
            )}
            <span className={cn("w-16 shrink-0 text-right text-xs font-medium", DIFFICULTY_INK[problem.difficulty])}>
                {DIFFICULTY_LABEL[problem.difficulty]}
            </span>
            <span className={cn("hidden w-24 shrink-0 items-center justify-end gap-1 text-xs font-medium sm:flex", status === "COMPLETED" ? INK_DIM : INK)}>
                {action}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
        </button>
    );
}

function ModeDialog({
    problem,
    module,
    href,
    onClose,
}: {
    problem: PracticeProblemListItem;
    module: PracticeModule;
    href: (mode: "assist" | "exam") => string;
    onClose: () => void;
}) {
    // Guided DSA sessions cost practice_set once per problem (plan/practice-dsa PD-10).
    const guidedPrice = module === "DSA" ? priceLabel("practice_set") : null;
    return (
        <div role="dialog" aria-modal="true" aria-labelledby="mode-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className={cn(CARD, "w-full max-w-md overflow-hidden shadow-2xl")} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 border-b border-neutral-200 p-5 dark:border-neutral-800">
                    <div className="min-w-0">
                        <h2 id="mode-title" className={cn("text-base font-semibold", INK)}>How do you want to practise?</h2>
                        <p className={cn("mt-0.5 truncate text-sm", INK_DIM)}>{problem.title}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className={cn("cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800", INK_DIM)}>
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="space-y-2.5 p-5">
                    <ModeOption
                        href={href("assist")}
                        icon={<GraduationCap className={cn("h-5 w-5", INK)} />}
                        title="With the mentor"
                        note={module === "DSA" ? "Recommended" : undefined}
                        body={module === "DSA"
                            ? "Explain, plan, solve and optimise step by step. The mentor asks and checks; it never writes the solution."
                            : "Ask the mentor for hints and explanations while you work."}
                        meta={guidedPrice ? `${guidedPrice}, once per problem` : undefined}
                    />
                    <ModeOption
                        href={href("exam")}
                        icon={<Shield className={cn("h-5 w-5", INK)} />}
                        title="On your own"
                        body="No mentor, like a real interview. Your work is tested and reviewed when you submit."
                        meta="Free"
                    />
                </div>
            </div>
        </div>
    );
}

function ModeOption({ href, icon, title, note, body, meta }: { href: string; icon: React.ReactNode; title: string; note?: string; body: string; meta?: string }) {
    return (
        <Link
            href={href}
            className="group flex items-start gap-3 rounded-xl border border-neutral-200 p-4 transition-colors hover:border-neutral-900 dark:border-neutral-800 dark:hover:border-neutral-300"
        >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">{icon}</span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                    <span className={cn("text-sm font-semibold", INK)}>{title}</span>
                    {note && <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-[11px] font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">{note}</span>}
                </span>
                <span className={cn("mt-1 block text-sm leading-relaxed", INK_DIM)}>{body}</span>
                {meta && <span className={cn("mt-2 block text-xs font-medium", INK)}>{meta}</span>}
            </span>
        </Link>
    );
}

function LeaderboardRow({ entry }: { entry: PracticeLeaderboardEntry }) {
    return (
        <li className="flex items-center gap-2.5 py-1">
            <span className={cn("w-5 shrink-0 text-center text-xs font-semibold", entry.rank <= 3 ? INK : INK_DIM)}>{entry.rank}</span>
            {entry.userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.userImage} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
            ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <Users className={cn("h-3 w-3", INK_DIM)} />
                </span>
            )}
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-neutral-700 dark:text-neutral-300">{entry.userName ?? "Anonymous"}</span>
            <span className={cn("shrink-0 text-xs", INK_DIM)}>{entry.totalXP} XP</span>
        </li>
    );
}

/** The module page's loading state, hand-matched to the layout above. */
export function ModuleContentSkeleton() {
    const bar = "animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800";
    return (
        <div className="flex w-full flex-col gap-3 px-page pb-6 pt-2 lg:h-[var(--page-h,100vh)] lg:overflow-hidden" aria-busy aria-label="Loading problems">
            <div className="shrink-0 space-y-2">
                <div className={cn(bar, "h-6 w-56")} />
                <div className={cn(bar, "h-4 w-40")} />
            </div>
            <div className={cn(CARD, "shrink-0 space-y-3 p-3")}>
                <div className="flex gap-2">
                    <div className={cn(bar, "h-9 flex-1 rounded-lg")} />
                    <div className={cn(bar, "h-9 w-32 rounded-xl")} />
                    <div className={cn(bar, "h-9 w-56 rounded-lg")} />
                </div>
                {/* Search, the topics dropdown and the difficulty tabs: one row, as the
                    real filter card has been since the chips went (UI-11). */}
            </div>
            <div className="grid min-h-0 grid-cols-1 gap-5 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className={cn(CARD, "flex min-h-0 flex-col overflow-hidden")}>
                    {/* The Recommended / All row, then the rows themselves. */}
                    <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
                        <div className={cn(bar, "h-7 w-52 rounded-lg")} />
                        <div className={cn(bar, "h-4 w-20")} />
                    </div>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 last:border-0 dark:border-neutral-800">
                            <div className={cn(bar, "h-4 w-4 rounded-full")} />
                            <div className="flex-1 space-y-1.5"><div className={cn(bar, "h-4 w-1/2")} /><div className={cn(bar, "h-3 w-1/3")} /></div>
                            <div className={cn(bar, "h-4 w-12")} />
                        </div>
                    ))}
                </div>
                <div className={cn(CARD, "h-fit space-y-2 p-4 lg:h-full")}>
                    <div className={cn(bar, "h-4 w-28")} />
                    {Array.from({ length: 5 }).map((_, i) => <div key={i} className={cn(bar, "h-6 w-full")} />)}
                </div>
            </div>
        </div>
    );
}
