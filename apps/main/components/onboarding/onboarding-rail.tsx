"use client"

import { useEffect, useRef } from "react"
import { Check, Pencil } from "lucide-react"
import type { OnboardingTurn } from "@repo/db"
import { cn } from "@repo/ui/lib/utils"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { onboardingModule, type OnboardingModuleKey } from "@/lib/onboarding/modules"

const INK = "text-neutral-900 dark:text-neutral-50"
const INK_DIM = "text-neutral-600 dark:text-neutral-400"
const HAIRLINE = "border-neutral-200 dark:border-neutral-800"

function shorten(s: string, n: number): string {
    return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s
}

/**
 * The left column of the onboarding: why we ask, what has been answered (each
 * row edits that answer in place, MO-8), which question we are on, and what
 * happens after. No total is shown because the flow does not know it.
 *
 * Layout (MO-10): the rail has a surface of its own so it reads as a panel
 * beside the question, the header and "What happens next" stay put, and only
 * the answered list scrolls - ten answers never push the page or spill past it.
 */
export function OnboardingRail({
    moduleKey,
    turns,
    questionNumber,
    finished,
    editingIndex,
    busy,
    onEdit,
    onReturn,
}: {
    moduleKey: OnboardingModuleKey
    turns: OnboardingTurn[]
    questionNumber: number
    finished: boolean
    /** The answered turn being changed, or null. */
    editingIndex: number | null
    /** A question is loading or saving; rows cannot be picked meanwhile. */
    busy: boolean
    onEdit: (index: number) => void
    /** Leave editing and go back to the current question. */
    onReturn: () => void
}) {
    const mod = onboardingModule(moduleKey)
    const answered = turns.filter((t) => t.answer)
    const editing = editingIndex !== null

    // The rail follows the question (MO-11). With ten answers the current row sits
    // below the fold, and the reader had to scroll the rail themselves to see where
    // they were. Only when the row is actually out of sight, so a list somebody is
    // reading is never yanked.
    const activeRowRef = useRef<HTMLLIElement>(null)
    useEffect(() => {
        const el = activeRowRef.current
        if (!el) return
        const viewport = el.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null
        if (!viewport) return
        const vp = viewport.getBoundingClientRect()
        const row = el.getBoundingClientRect()
        if (row.top >= vp.top && row.bottom <= vp.bottom) return
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        viewport.scrollTo({
            top: viewport.scrollTop + (row.top - vp.top) - (viewport.clientHeight - row.height) / 2,
            behavior: reduced ? "auto" : "smooth",
        })
    }, [questionNumber, editingIndex, answered.length])

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-neutral-50 dark:bg-neutral-900/50">
            <div className="shrink-0 px-6 pb-5 pt-6 xl:px-8 xl:pt-8">
                <span className={cn("text-xs font-semibold uppercase tracking-wider", INK_DIM)}>{mod.label}</span>
                <h2 className={cn("mt-1.5 text-xl font-semibold leading-tight tracking-tight", INK)}>Where you are</h2>
                <p className={cn("mt-2 text-sm leading-relaxed", INK_DIM)}>{mod.purpose}</p>
                <div className={cn("mt-6 text-sm font-semibold", INK)}>
                    {answered.length === 0 ? "Your answers will appear here" : "Answered so far"}
                </div>
            </div>

            <ScrollArea className="min-h-0 flex-1" reflow>
                <ol className="space-y-1 px-3 pb-3 xl:px-5">
                    {answered.map((t) => {
                        const isEditing = editingIndex === t.index
                        return (
                            <li key={t.index} ref={isEditing ? activeRowRef : undefined}>
                                <button
                                    type="button"
                                    disabled={finished || busy}
                                    onClick={() => (isEditing ? onReturn() : onEdit(t.index))}
                                    aria-current={isEditing ? "step" : undefined}
                                    title={finished ? undefined : isEditing ? "Stop editing" : "Change this answer"}
                                    className={cn(
                                        "group flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                                        isEditing
                                            ? "bg-white shadow-sm ring-1 ring-neutral-300 dark:bg-neutral-800 dark:ring-neutral-600"
                                            : finished
                                                ? "cursor-default"
                                                : "cursor-pointer hover:bg-neutral-900/[0.05] disabled:cursor-default dark:hover:bg-white/5",
                                    )}
                                >
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
                                        {isEditing ? <Pencil className="h-2.5 w-2.5" strokeWidth={3} /> : <Check className="h-3 w-3" strokeWidth={3} />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className={cn("block truncate text-sm font-medium", INK)}>
                                            {shorten(t.question.text, 64)}
                                        </span>
                                        <span className={cn("mt-0.5 block truncate text-xs", INK_DIM)}>
                                            {isEditing ? "Editing" : t.answer?.values.join(", ")}
                                        </span>
                                    </span>
                                    {!finished && !isEditing && (
                                        <Pencil className={cn("mt-1 h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100", INK_DIM)} />
                                    )}
                                </button>
                            </li>
                        )
                    })}
                    {!finished && (
                        <li ref={editing ? undefined : activeRowRef}>
                            {/* The question you were on. While editing, it is the way back. */}
                            <button
                                type="button"
                                disabled={!editing}
                                onClick={onReturn}
                                title={editing ? `Back to question ${questionNumber}` : undefined}
                                className={cn(
                                    "flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left",
                                    editing
                                        ? "cursor-pointer transition-colors hover:bg-neutral-900/[0.05] dark:hover:bg-white/5"
                                        : "cursor-default bg-white shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-700",
                                )}
                            >
                                <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-900 text-[10px] font-semibold dark:border-neutral-100", INK)}>
                                    {questionNumber}
                                </span>
                                <span className={cn("text-sm font-medium", INK)}>Question {questionNumber}</span>
                            </button>
                        </li>
                    )}
                </ol>
            </ScrollArea>

            <div className={cn("shrink-0 border-t px-6 py-5 xl:px-8", HAIRLINE)}>
                <div className={cn("text-sm font-semibold", INK)}>What happens next</div>
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
