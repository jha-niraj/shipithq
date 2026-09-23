"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowRight, Check, CheckCircle2, ChevronDown, Circle, Clock, Mic, RotateCcw, Sparkles, Timer,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import type { CheckpointPart, CheckpointPartState, PathStage } from "@repo/db/practice";
import type { PracticeProblemListItem } from "@/types/practice";

// ─────────────────────────────────────────────────────────────────────────────
// The Path tab (plan/practice-path, PP-3): where you are, what is next, and the
// stages in order. It replaced a flat list of 30 recommended problems, which said
// which problems but nothing about the order or about being ready to move on
// (Niraj, 2026-09-22: "you don't even have an idea how way to move").
//
// A stage is a topic, a goal, its problems in order, and ONE checkpoint with
// three parts: a quiz on the choice, a mock on saying the approach out loud, and
// a timed problem on what the stage taught.
// ─────────────────────────────────────────────────────────────────────────────

const INK = "text-neutral-900 dark:text-neutral-50";
const INK_DIM = "text-neutral-600 dark:text-neutral-400";

const PART_LABEL: Record<CheckpointPart, { title: string; blurb: string; icon: typeof Sparkles }> = {
    quiz: { title: "Quiz", blurb: "Which structure, and why. Free.", icon: Sparkles },
    mock: { title: "Mock interview", blurb: "Say the approach out loud, as you would to an interviewer.", icon: Mic },
    exam: { title: "Timed problem", blurb: "The stage's hardest problem, under exam rules.", icon: Timer },
};

export interface PathProblem {
    slug: string;
    problem: PracticeProblemListItem | undefined;
}

function stageDone(stage: PathStage, solved: Set<string>): number {
    return [...stage.slugs, ...(stage.addedSlugs ?? [])].filter((s) => solved.has(s)).length;
}

function checkpointDone(stage: PathStage): number {
    return (["quiz", "mock", "exam"] as const).filter((p) => stage.checkpoint[p].status === "passed").length;
}

export function PathView({
    stages,
    bySlug,
    basePath,
    pending,
    onReplan,
    onOpenProblem,
    onStartQuiz,
    mockHref,
}: {
    stages: PathStage[];
    bySlug: Map<string, PracticeProblemListItem>;
    basePath: string;
    pending: boolean;
    onReplan: () => void;
    onOpenProblem: (problem: PracticeProblemListItem) => void;
    /** Opens the stage's quiz. */
    onStartQuiz: (stageIndex: number) => void;
    /** Where a mock interview is started. */
    mockHref: string;
}) {
    const solved = useMemo(
        () => new Set([...bySlug.values()].filter((p) => p.userStatus === "COMPLETED").map((p) => p.slug)),
        [bySlug],
    );

    // The stage you are on: the first one that is not finished. A stage is finished
    // when its problems are solved AND its checkpoint's three parts are done.
    const currentIndex = useMemo(() => {
        const i = stages.findIndex((s) => {
            const all = [...s.slugs, ...(s.addedSlugs ?? [])];
            return stageDone(s, solved) < all.length || checkpointDone(s) < 3;
        });
        return i === -1 ? stages.length - 1 : i;
    }, [stages, solved]);
    const [open, setOpen] = useState<number>(currentIndex);

    const totalProblems = stages.reduce((n, s) => n + s.slugs.length + (s.addedSlugs?.length ?? 0), 0);
    const doneProblems = stages.reduce((n, s) => n + stageDone(s, solved), 0);

    // What to do right now: the first unsolved problem of the current stage, or its
    // checkpoint when they are all solved.
    const current = stages[currentIndex];
    const nextSlug = current ? [...current.slugs, ...(current.addedSlugs ?? [])].find((s) => !solved.has(s)) : undefined;
    const nextProblem = nextSlug ? bySlug.get(nextSlug) : undefined;

    return (
        <div className="space-y-4 px-3 py-3">
            {/* Where you are */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={cn("text-xs font-medium", INK_DIM)}>
                    Stage {Math.min(currentIndex + 1, stages.length)} of {stages.length}
                    <span aria-hidden> · </span>
                    {doneProblems} of {totalProblems} problems
                </p>
                <button
                    type="button"
                    onClick={onReplan}
                    disabled={pending}
                    title="Plan it again from what you know now"
                    className={cn("inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium disabled:opacity-40", INK_DIM, "hover:text-neutral-900 dark:hover:text-white")}
                >
                    {pending ? <InlineLoader size="sm" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Re-plan
                </button>
            </div>

            {/* Next up */}
            {nextProblem ? (
                <button
                    type="button"
                    onClick={() => onOpenProblem(nextProblem)}
                    className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-neutral-900 bg-neutral-900 px-4 py-3 text-left text-white transition-colors hover:bg-neutral-800 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
                >
                    <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider opacity-70">Next up</span>
                        <span className="mt-0.5 block truncate text-sm font-semibold">{nextProblem.title}</span>
                        {current?.goal && <span className="mt-0.5 block truncate text-xs opacity-80">{current.goal}</span>}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </button>
            ) : current ? (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                    <p className={cn("text-[11px] font-semibold uppercase tracking-wider", INK_DIM)}>Next up</p>
                    <p className={cn("mt-0.5 text-sm font-semibold", INK)}>The {current.topic} checkpoint</p>
                    <p className={cn("mt-0.5 text-xs", INK_DIM)}>Every problem in this stage is solved. Three parts, in order.</p>
                </div>
            ) : null}

            {/* The stages */}
            <ol className="space-y-2">
                {stages.map((stage, i) => {
                    const all = [...stage.slugs, ...(stage.addedSlugs ?? [])];
                    const done = stageDone(stage, solved);
                    const parts = checkpointDone(stage);
                    const complete = done === all.length && parts === 3;
                    const isOpen = open === i;
                    return (
                        <li key={`${stage.topic}-${i}`} className={cn(
                            "overflow-hidden rounded-xl border",
                            i === currentIndex
                                ? "border-neutral-400 dark:border-neutral-500"
                                : "border-neutral-200 dark:border-neutral-800",
                        )}>
                            <button
                                type="button"
                                onClick={() => setOpen(isOpen ? -1 : i)}
                                aria-expanded={isOpen}
                                className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                            >
                                <span className={cn(
                                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                                    complete
                                        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                                        : "border border-neutral-300 dark:border-neutral-600",
                                    !complete && INK,
                                )}>
                                    {complete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className={cn("block truncate text-sm font-semibold", INK)}>{stage.topic}</span>
                                    <span className={cn("mt-0.5 block truncate text-xs", INK_DIM)}>{stage.goal}</span>
                                </span>
                                <span className={cn("shrink-0 text-xs tabular-nums", INK_DIM)}>
                                    {done}/{all.length}
                                    {parts > 0 && <span> · {parts}/3</span>}
                                </span>
                                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", INK_DIM, isOpen && "rotate-180")} aria-hidden />
                            </button>

                            {isOpen && (
                                <div className="border-t border-neutral-200 dark:border-neutral-800">
                                    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                        {all.map((slug) => {
                                            const problem = bySlug.get(slug);
                                            const isSolved = solved.has(slug);
                                            const added = stage.addedSlugs?.includes(slug);
                                            if (!problem) return null;
                                            return (
                                                <li key={slug}>
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenProblem(problem)}
                                                        className="group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                                                    >
                                                        {isSolved ? <CheckCircle2 className={cn("h-4 w-4 shrink-0", INK)} /> : problem.userStatus === "IN_PROGRESS" ? <Clock className={cn("h-4 w-4 shrink-0", INK)} /> : <Circle className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-600" />}
                                                        <span className="min-w-0 flex-1">
                                                            <span className={cn("block truncate text-sm", isSolved ? INK_DIM : INK)}>{problem.title}</span>
                                                            {added && <span className={cn("mt-0.5 block text-xs", INK_DIM)}>Added after your checkpoint</span>}
                                                        </span>
                                                        <span className={cn("shrink-0 text-xs", INK_DIM)}>{problem.difficulty === "EASY" ? "Easy" : problem.difficulty === "MEDIUM" ? "Medium" : "Hard"}</span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>

                                    <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
                                        <p className={cn("text-xs font-semibold uppercase tracking-wider", INK_DIM)}>Checkpoint</p>
                                        <ul className="mt-2 space-y-1.5">
                                            <CheckpointRow
                                                part="quiz"
                                                state={stage.checkpoint.quiz}
                                                action={<button type="button" onClick={() => onStartQuiz(i)} className={cn("cursor-pointer text-xs font-semibold underline underline-offset-4", INK)}>{stage.checkpoint.quiz.status === "todo" ? "Take it" : "Retake"}</button>}
                                            />
                                            <CheckpointRow
                                                part="mock"
                                                state={stage.checkpoint.mock}
                                                action={<Link href={`${mockHref}?topic=${encodeURIComponent(stage.topic)}`} className={cn("text-xs font-semibold underline underline-offset-4", INK)}>Start</Link>}
                                            />
                                            <CheckpointRow
                                                part="exam"
                                                state={stage.checkpoint.exam}
                                                action={stage.checkpoint.examSlug ? (
                                                    <Link href={`${basePath}/${stage.checkpoint.examSlug}?mode=exam`} className={cn("text-xs font-semibold underline underline-offset-4", INK)}>Start</Link>
                                                ) : null}
                                            />
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

function CheckpointRow({ part, state, action, note }: { part: CheckpointPart; state: CheckpointPartState; action: React.ReactNode; note?: string }) {
    const { title, blurb, icon: Icon } = PART_LABEL[part];
    return (
        <li className="flex items-start gap-2.5">
            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", state.status === "passed" ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900" : "border border-neutral-300 dark:border-neutral-600")}>
                {state.status === "passed" ? <Check className="h-3 w-3" strokeWidth={3} /> : <Icon className={cn("h-3 w-3", INK_DIM)} />}
            </span>
            <span className="min-w-0 flex-1">
                <span className={cn("block text-sm font-medium", INK)}>
                    {title}
                    {state.status === "weak" && <span className={cn("ml-2 text-xs font-normal", INK_DIM)}>needs another go</span>}
                    {typeof state.score === "number" && <span className={cn("ml-2 text-xs font-normal tabular-nums", INK_DIM)}>{state.score}%</span>}
                </span>
                <span className={cn("mt-0.5 block text-xs", INK_DIM)}>{blurb}{note ? ` ${note}.` : ""}</span>
            </span>
            <span className="shrink-0">{action}</span>
        </li>
    );
}

export default PathView;
