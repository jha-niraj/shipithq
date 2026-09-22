"use client"

import { Check, Pencil } from "lucide-react"
import type { OnboardingTurn } from "@repo/db"
import { cn } from "@repo/ui/lib/utils"
import { onboardingModule, type OnboardingModuleKey } from "@/lib/onboarding/modules"

const INK = "text-neutral-900 dark:text-neutral-50"
const INK_DIM = "text-neutral-600 dark:text-neutral-400"
const HAIRLINE = "border-neutral-200 dark:border-neutral-800"

function shorten(s: string, n: number): string {
    return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s
}

/**
 * The left column of the onboarding: why we ask, what has been answered (each
 * row reopens that question), which question we are on, and what happens
 * after. No total is shown because the flow does not know it.
 */
export function OnboardingRail({
    moduleKey,
    turns,
    questionNumber,
    finished,
    onReopen,
}: {
    moduleKey: OnboardingModuleKey
    turns: OnboardingTurn[]
    questionNumber: number
    finished: boolean
    onReopen: (index: number) => void
}) {
    const mod = onboardingModule(moduleKey)
    const answered = turns.filter((t) => t.answer)

    return (
        <div className="flex h-full min-h-0 flex-col overflow-y-auto p-6 xl:p-8">
            <div>
                <span className={cn("text-xs font-semibold uppercase tracking-wider", INK_DIM)}>{mod.label}</span>
                <h2 className={cn("mt-1.5 text-xl font-semibold leading-tight tracking-tight", INK)}>Where you are</h2>
                <p className={cn("mt-2 text-sm leading-relaxed", INK_DIM)}>{mod.purpose}</p>
            </div>

            <div className="mt-8 flex-1">
                <div className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", INK_DIM)}>
                    {answered.length === 0 ? "Your answers will appear here" : "Answered so far"}
                </div>
                <ol className="space-y-1">
                    {answered.map((t) => (
                        <li key={t.index}>
                            <button
                                type="button"
                                disabled={finished}
                                onClick={() => onReopen(t.index)}
                                title={finished ? undefined : "Change this answer"}
                                className={cn(
                                    "group flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                                    finished ? "cursor-default" : "cursor-pointer hover:bg-neutral-900/[0.04] dark:hover:bg-white/5",
                                )}
                            >
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
                                    <Check className="h-3 w-3" strokeWidth={3} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className={cn("block truncate text-sm font-medium", INK)}>
                                        {shorten(t.question.text, 64)}
                                    </span>
                                    <span className={cn("mt-0.5 block truncate text-xs", INK_DIM)}>
                                        {t.answer?.values.join(", ")}
                                    </span>
                                </span>
                                {!finished && (
                                    <Pencil className={cn("mt-1 h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100", INK_DIM)} />
                                )}
                            </button>
                        </li>
                    ))}
                    {!finished && (
                        <li className="flex items-start gap-3 rounded-xl bg-neutral-900/5 px-3 py-2 dark:bg-white/10">
                            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-900 text-[10px] font-semibold dark:border-neutral-100", INK)}>
                                {questionNumber}
                            </span>
                            <span className={cn("text-sm font-medium", INK)}>Question {questionNumber}</span>
                        </li>
                    )}
                </ol>
            </div>

            <div className={cn("mt-6 border-t pt-5", HAIRLINE)}>
                <div className={cn("text-xs font-semibold uppercase tracking-wider", INK_DIM)}>What happens next</div>
                <p className={cn("mt-1.5 text-sm leading-relaxed", INK_DIM)}>
                    You get a short read on where you stand, then the {mod.label.toLowerCase()} dashboard opens.
                    The read stays there, and you can retake this any time.
                </p>
            </div>
        </div>
    )
}

/** The rail's one-line stand-in below lg. */
export function OnboardingRailCompact({
    moduleKey,
    answeredCount,
    questionNumber,
    finished,
}: {
    moduleKey: OnboardingModuleKey
    answeredCount: number
    questionNumber: number
    finished: boolean
}) {
    const mod = onboardingModule(moduleKey)
    return (
        <div className="flex items-center justify-between px-4 py-3">
            <span className={cn("text-sm font-semibold", INK)}>{mod.label}</span>
            <span className={cn("text-xs", INK_DIM)}>
                {finished ? `${answeredCount} answered` : `Question ${questionNumber}`}
            </span>
        </div>
    )
}
