"use client";
import Link from "next/link";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Trophy, ChevronRight, CheckCircle2, Circle, Clock, Filter, Users,
    Brain, Shield, Sparkles, X,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { cn } from "@repo/ui/lib/utils";
import type {
    PracticeProblemListItem, PracticeCategory, PracticeLeaderboardEntry,
    PracticeModule
} from "@/types/practice";
import { MODULE_CONFIG } from "@/types/practice";
import Image from "next/image";
import { AddProblemSheet } from "./add-problem-sheet";

const DIFFICULTY_COLORS = {
    EASY: "text-neutral-800 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-800/20 border-neutral-200 dark:border-neutral-800",
    MEDIUM: "text-neutral-800 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-800/20 border-neutral-200 dark:border-neutral-800",
    HARD: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
};

const STATUS_ICON = {
    COMPLETED: <CheckCircle2 className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />,
    IN_PROGRESS: <Clock className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />,
    NOT_STARTED: <Circle className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />,
};

const MODULE_PATHS: Record<PracticeModule, string> = {
    DSA: "/practice/dsa",
    SYSTEM_DESIGN: "/practice/system-design",
    WEB_FRONTEND: "/practice/web-frontend",
    WEB_BACKEND: "/practice/web-backend",
};

interface ModuleContentProps {
    module: PracticeModule;
    moduleLabel: string;
    problems: PracticeProblemListItem[];
    categories: PracticeCategory[];
    leaderboard: PracticeLeaderboardEntry[];
    activeCategory: string | null;
    /** Rendered above the header. The onboarding "where you stand" widget lives here. */
    headerSlot?: React.ReactNode;
}

export function ModuleContent({
    module,
    moduleLabel,
    problems,
    categories,
    leaderboard,
    activeCategory,
    headerSlot,
}: ModuleContentProps) {
    const router = useRouter();
    const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
    const [selectedProblem, setSelectedProblem] = useState<PracticeProblemListItem | null>(null);
    const basePath = MODULE_PATHS[module];

    const filteredProblems = difficultyFilter
        ? problems.filter((p) => p.difficulty === difficultyFilter)
        : problems;

    const activeCategoryName = activeCategory
        ? MODULE_CONFIG[module]?.categories[activeCategory]?.name ?? activeCategory
        : null;

    return (
        <div className="p-6 lg:p-8 space-y-6 w-full mx-auto">
            {headerSlot}
            {/* The left breadcrumb+title block and the right add-button+filter-pills
                cluster (~320px alone) had no responsive stacking and exceeded a
                328px phone. See docs/responsiveness.md section 4. */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                        <Link href="/practice" className="hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-white transition-colors">
                            Practice
                        </Link>
                        <ChevronRight className="h-3 w-3" />
                        {
                            activeCategory ? (
                                <>
                                    <Link href={basePath} className="hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-white transition-colors">
                                        {moduleLabel}
                                    </Link>
                                    <ChevronRight className="h-3 w-3" />
                                    <span className="text-neutral-600 dark:text-neutral-300">
                                        {activeCategoryName}
                                    </span>
                                </>
                            ) : (
                                <span className="text-neutral-600 dark:text-neutral-300">
                                    {moduleLabel}
                                </span>
                            )
                        }
                    </div>
                    <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                        {activeCategoryName ?? moduleLabel}
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {filteredProblems.length} problem{filteredProblems.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <AddProblemSheet
                        module={module}
                        onProblemAdded={() => router.refresh()}
                    />
                    <div className="flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400 mr-1" />
                        {
                            ["EASY", "MEDIUM", "HARD"].map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDifficultyFilter(difficultyFilter === d ? null : d)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                                        difficultyFilter === d
                                            ? DIFFICULTY_COLORS[d as keyof typeof DIFFICULTY_COLORS]
                                            : "text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"
                                    )}
                                >
                                    {d}
                                </button>
                            ))
                        }
                    </div>
                </div>
            </div>

            {
                !activeCategory && categories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {
                            categories.map((cat) => (
                                <Link href={`${basePath}?topic=${cat.slug}`} key={cat.slug} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors">
                                    <span>{cat.icon}</span>
                                    <span>{cat.name}</span>
                                    <span className="text-neutral-600 dark:text-neutral-400 ml-1">
                                        {cat.completedCount}/{cat.problemCount}
                                    </span>
                                </Link>
                            ))
                        }
                    </div>
                )
            }

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-2">
                    {
                        filteredProblems.length === 0 ? (
                            <div className="text-center py-16">
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">No problems found.</p>
                            </div>
                        ) : (
                            filteredProblems.map((problem) => (
                                <ProblemRow
                                    key={problem.id}
                                    problem={problem}
                                    onClick={() => setSelectedProblem(problem)}
                                />
                            ))
                        )
                    }
                </div>
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 h-fit sticky top-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                            Leaderboard
                        </h2>
                    </div>
                    {
                        leaderboard.length === 0 ? (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">Be the first to complete a problem!</p>
                        ) : (
                            <div className="space-y-2">
                                {
                                    leaderboard.map((entry) => (
                                        <LeaderboardRow key={entry.userId} entry={entry} />
                                    ))
                                }
                            </div>
                        )
                    }
                </div>
            </div>

            {
                selectedProblem && (
                    <ModeSelectionDialog
                        problem={selectedProblem}
                        basePath={basePath}
                        onClose={() => setSelectedProblem(null)}
                    />
                )
            }
        </div>
    );
}

function ProblemRow({
    problem,
    onClick,
}: {
    problem: PracticeProblemListItem;
    onClick: () => void;
}) {
    const status = problem.userStatus ?? "NOT_STARTED";

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors group text-left"
        >
            <div className="flex-shrink-0">
                {STATUS_ICON[status]}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate group-hover:text-neutral-700 dark:group-hover:text-neutral-200">
                    {problem.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    {
                        problem.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-xs text-neutral-600 dark:text-neutral-400">
                                {tag}
                            </span>
                        ))
                    }
                </div>
            </div>
            <Badge
                variant="outline"
                className={cn(
                    "text-xs font-medium border",
                    DIFFICULTY_COLORS[problem.difficulty]
                )}
            >
                {problem.difficulty}
            </Badge>
            {
                problem.userBestScore !== undefined && problem.userBestScore > 0 && (
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        {problem.userBestScore}%
                    </span>
                )
            }
            <ChevronRight className="h-4 w-4 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-500 transition-colors" />
        </button>
    );
}

function ModeSelectionDialog({
    problem,
    basePath,
    onClose,
}: {
    problem: PracticeProblemListItem;
    basePath: string;
    onClose: () => void;
}) {
    const router = useRouter();

    const selectMode = (mode: "exam" | "assist") => {
        router.push(`${basePath}/${problem.slug}?mode=${mode}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
                    <div>
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                            Choose Practice Mode
                        </h2>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate max-w-[280px]">
                            {problem.title}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-5 space-y-3">
                    <button
                        onClick={() => selectMode("assist")}
                        className="w-full p-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-800/50 bg-neutral-50/50 dark:bg-neutral-800/10 hover:border-neutral-800 dark:hover:border-neutral-300 transition-all text-left group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center flex-shrink-0">
                                <Sparkles className="h-5 w-5 text-neutral-800 dark:text-neutral-100" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                                        Assist Mode
                                    </h3>
                                    <Badge className="text-xs bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100 border-0">
                                        Recommended
                                    </Badge>
                                </div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                                    Get AI mentoring with hints, guidance, and real-time chat.
                                    Perfect for learning new concepts.
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                                    <span className="flex items-center gap-1">
                                        <Brain className="h-3 w-3" /> AI Chat
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Sparkles className="h-3 w-3" /> Hints Available
                                    </span>
                                </div>
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => selectMode("exam")}
                        className="w-full p-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-red-300 dark:hover:border-red-800 transition-all text-left group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                                <Shield className="h-5 w-5 text-red-500 dark:text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                                    Exam Mode
                                </h3>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                                    No AI help. Solve the problem on your own like a real interview.
                                    Higher XP rewards.
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                                    <span className="flex items-center gap-1">
                                        <Shield className="h-3 w-3" /> No AI Chat
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Trophy className="h-3 w-3" /> 2x XP
                                    </span>
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

function LeaderboardRow({ entry }: { entry: PracticeLeaderboardEntry }) {
    const rankColors: Record<number, string> = {
        1: "text-neutral-900",
        2: "text-neutral-600 dark:text-neutral-400",
        3: "text-neutral-700",
    };

    return (
        <div className="flex items-center gap-2.5 py-1.5">
            <span
                className={cn(
                    "text-xs font-bold w-5 text-center",
                    rankColors[entry.rank] ?? "text-neutral-600 dark:text-neutral-400"
                )}
            >
                {entry.rank}
            </span>
            {
                entry.userImage ? (
                    <Image
                        src={entry.userImage}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover"
                        fill
                    />
                ) : (
                    <div className="h-6 w-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                        <Users className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
                    </div>
                )
            }
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex-1 truncate">
                {entry.userName ?? "Anonymous"}
            </span>
            <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                {entry.totalXP} XP
            </span>
        </div>
    );
}