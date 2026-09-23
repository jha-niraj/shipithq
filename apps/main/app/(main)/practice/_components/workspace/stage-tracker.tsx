"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { PRACTICE_STAGES, type PracticeStage } from "@repo/db/practice";
import { cn } from "@repo/ui/lib/utils";
import { STAGE_GOALS, STAGE_LABELS } from "@/lib/practice/mentor-prompt";

// ─────────────────────────────────────────────────────────────────────────────
// The five guided stages across the top of the mentor panel (PD-7), with one
// line under them on what the mentor is waiting for. The panel is narrow at its
// minimum (20% of the workspace), so pills show numbers and only the current
// one shows its label; from the `@sm` container width every label shows.
// Follows the theme (plan/practice-ui, UI-4); every ink is a light/dark pair.
// ─────────────────────────────────────────────────────────────────────────────

const VISIBLE = PRACTICE_STAGES.filter((s) => s !== "done");

export function StageTracker({ stage }: { stage: PracticeStage }) {
    const current = stage === "done" ? VISIBLE.length : VISIBLE.indexOf(stage);
    return (
        <div className="@container shrink-0 border-b border-neutral-200 dark:border-neutral-800 px-3 py-2.5">
            <ol className="flex items-center gap-1" aria-label="Stages">
                {VISIBLE.map((s, i) => {
                    const done = i < current;
                    const isCurrent = i === current;
                    return (
                        <li key={s} className="flex min-w-0 items-center gap-1" aria-current={isCurrent ? "step" : undefined}>
                            <span
                                className={cn(
                                    "flex h-6 min-w-6 shrink-0 items-center justify-center gap-1 rounded-full border px-1.5 text-[11px] font-semibold transition-colors",
                                    done && "border-neutral-100 bg-neutral-100 text-neutral-900",
                                    // The step you are on has to be the strongest thing in the row; `border-neutral-100`
                                    // was invisible on a white panel, so it read as fainter than the pending ones.
                                    isCurrent && "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100",
                                    !done && !isCurrent && "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400",
                                )}
                            >
                                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                                <span className={cn("whitespace-nowrap", isCurrent ? "inline" : "hidden @sm:inline")}>{STAGE_LABELS[s]}</span>
                            </span>
                            {/* Done is the INKED connector; what is still ahead is the faint one. These
                                were the wrong way round, so the progress bar ran backwards. */}
                            {i < VISIBLE.length - 1 && <span className={cn("h-px w-2 shrink-0", done ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-200 dark:bg-neutral-700")} />}
                        </li>
                    );
                })}
            </ol>
            <motion.p
                key={stage}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-2 text-xs leading-snug text-neutral-700 dark:text-neutral-300"
            >
                {STAGE_GOALS[stage]}
            </motion.p>
        </div>
    );
}
