"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import { cn } from "@repo/ui/lib/utils";
import { priceLabel } from "@/lib/credits/pricing";
import { creditErrorMessage } from "@/lib/credits/notify";
import { startGuidedSession } from "@/actions/(main)/practice/practice.action";
import { STAGE_GOALS, STAGE_LABELS } from "@/lib/practice/mentor-prompt";
import type { PracticeProblemDetail } from "@/types/practice";

// ─────────────────────────────────────────────────────────────────────────────
// Shown on a DSA problem before its guided session exists (PD-10): what the
// session is, what it costs, one button. Problems whose tests are not ready
// cannot be started, so nobody pays for a session that cannot run tests.
// Same light/dark card language as the rest of the app.
// ─────────────────────────────────────────────────────────────────────────────

const INK = "text-neutral-900 dark:text-neutral-50";
const INK_DIM = "text-neutral-600 dark:text-neutral-400";
const STAGES = ["understand", "approach", "brute_force", "optimise", "reflect"] as const;

export function StartSessionCard({ problem }: { problem: PracticeProblemDetail }) {
    const router = useRouter();
    const [error, setError] = useState<{ message: string; buy: boolean } | null>(null);
    const [starting, setStarting] = useState(false);
    const [refreshing, startTransition] = useTransition();
    const price = priceLabel("practice_set");
    const status = problem.judge.judgeStatus;

    const start = async () => {
        if (starting) return;
        setStarting(true);
        setError(null);
        const res = await startGuidedSession(problem.slug);
        if (!res.success) {
            setStarting(false);
            setError({ message: creditErrorMessage(res, res.error), buy: res.code === "INSUFFICIENT_CREDITS" });
            return;
        }
        // The page re-renders on the server with the session and mounts the workspace.
        startTransition(() => router.refresh());
    };

    const busy = starting || refreshing;

    return (
        <div className="flex h-dvh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
            <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900">
                <Link href="/practice/dsa" className={cn("inline-flex items-center gap-1.5 text-xs font-medium hover:underline", INK_DIM)}>
                    <ArrowLeft className="h-3.5 w-3.5" /> All DSA problems
                </Link>
                <h1 className={cn("mt-4 text-2xl font-semibold tracking-tight", INK)}>{problem.title}</h1>
                <p className={cn("mt-1 text-sm", INK_DIM)}>
                    {problem.difficulty.charAt(0) + problem.difficulty.slice(1).toLowerCase()} · guided session with the mentor
                </p>

                <ol className="mt-6 space-y-2.5">
                    {STAGES.map((s, i) => (
                        <li key={s} className="flex items-start gap-3">
                            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-[10px] font-semibold dark:border-neutral-700", INK)}>
                                {i + 1}
                            </span>
                            <span className="text-sm leading-snug">
                                <span className={cn("font-medium", INK)}>{STAGE_LABELS[s]}.</span>{" "}
                                <span className={INK_DIM}>{STAGE_GOALS[s]}</span>
                            </span>
                        </li>
                    ))}
                </ol>

                <p className={cn("mt-6 flex items-start gap-2 text-sm", INK_DIM)}>
                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0", INK)} />
                    The mentor asks, checks and explains. It never writes the solution.
                </p>

                <div className="mt-6 border-t border-neutral-200 pt-5 dark:border-neutral-800">
                    {status === "ready" ? (
                        <>
                            <div className="flex flex-wrap items-center gap-3">
                                <Button type="button" onClick={start} disabled={busy} className="h-11 rounded-xl px-6">
                                    {busy ? <><InlineLoader size="sm" className="mr-2" />Starting</> : "Start guided session"}
                                </Button>
                                <span className={cn("text-sm", INK_DIM)}>
                                    {price ? `${price}, once. Reopening is free.` : "Free."}
                                </span>
                            </div>
                            {error && (
                                <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                                    {error.message}{" "}
                                    {error.buy && (
                                        <Link href="/purchase" className="font-medium underline underline-offset-4">Get credits</Link>
                                    )}
                                </p>
                            )}
                        </>
                    ) : (
                        <p className={cn("text-sm", INK_DIM)} role="status">
                            {status === "failed"
                                ? "Tests could not be prepared for this problem, so a guided session cannot start yet."
                                : "Preparing tests for this problem. A guided session can start once they are ready."}
                        </p>
                    )}
                    <Link href={`/practice/dsa/${problem.slug}?mode=exam`} className={cn("mt-4 inline-block text-sm font-medium underline-offset-4 hover:underline", INK)}>
                        Practise without the mentor (exam mode)
                    </Link>
                </div>
            </div>
        </div>
    );
}
