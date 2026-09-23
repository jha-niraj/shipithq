"use client"

import { Check, X } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import type { AIChatStep } from "@/lib/ai/chat-types"

// ─────────────────────────────────────────────────────────────────────────────
// The agent's activity timeline, rendered above a reply while it works.
//
// Ported from the Orbital chat. The point is not decoration: before this, the
// panel ran every database read to completion behind a motionless spinner and
// then printed prose. A user could not tell the difference between "reading your
// projects" and "hung", and the two look identical for the eight seconds it takes
// to answer a question that touches four tables.
//
// Each step is one tool call, matched to its result by id - calls in a round run
// concurrently and land out of order.
// ─────────────────────────────────────────────────────────────────────────────

/** One tool call on a turn. The shape lives in lib/ai/chat-types.ts, because saved
 *  turns carry their steps too (plan/ai-chat, AC-6). */
export type ToolStep = AIChatStep

/**
 * Present-tense while running, past-tense when done.
 *
 * Written out per tool rather than derived from the function name: "get_my_resume"
 * mechanically becomes "Get my resume", which reads like a menu item rather than
 * something happening. These are the seven tools in `lib/ai/tools.ts`.
 */
const TOOL_LABELS: Record<string, { running: string; done: string }> = {
    get_my_profile: { running: "Reading your profile", done: "Read your profile" },
    get_my_resume: { running: "Reading your resume", done: "Read your resume" },
    list_my_projects: { running: "Listing your projects", done: "Listed your projects" },
    list_my_goals: { running: "Checking your goals", done: "Checked your goals" },
    get_my_practice_stats: { running: "Reading your practice stats", done: "Read your practice stats" },
    search_project_ideas: { running: "Searching project ideas", done: "Searched project ideas" },
    search_jobs: { running: "Searching jobs", done: "Searched jobs" },
    // The one tool that writes. Present tense says what it is doing to the user's account,
    // because this is the step where credits get spent and a vague "Working" would be
    // hiding that.
    create_cover_letter: { running: "Writing your cover letter", done: "Started your cover letter" },
    create_project: { running: "Setting up your project", done: "Started your project" },
    create_goal: { running: "Adding your goal", done: "Added your goal" },
    link_to: { running: "Finding the page", done: "Found the page" },
}

/** Unknown tool: say something honest rather than printing a function name. */
function toolLabel(name: string): { running: string; done: string } {
    return TOOL_LABELS[name] ?? { running: "Working", done: "Done" }
}

export function ToolSteps({ steps }: { steps: ToolStep[] }) {
    if (!steps.length) return null

    return (
        <div
            // gurukulhq's pill (plan/ai-chat, AC-6): one line per step, fitted to its
            // content, above the reply it belongs to. Done is a quiet check in ink; only a
            // failure gets a colour, because that is the one that needs reading.
            className="flex w-fit max-w-full flex-col gap-1 rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 dark:border-neutral-800 dark:bg-neutral-900/60"
            // A live region: the steps are the only feedback that anything is
            // happening, so a screen reader has to hear them too.
            role="status"
            aria-live="polite"
        >
            {steps.map((s) => (
                <div key={s.id} className="flex min-w-0 max-w-full items-center gap-2 text-xs font-medium">
                    {s.status === "running" ? (
                        <InlineLoader size="sm" className="shrink-0 text-neutral-500 dark:text-neutral-400" />
                    ) : s.status === "error" ? (
                        <X className="h-3 w-3 shrink-0 text-red-600 dark:text-red-400" />
                    ) : (
                        <Check className="h-3 w-3 shrink-0 text-neutral-900 dark:text-neutral-100" />
                    )}
                    <span
                        className={cn(
                            "truncate",
                            s.status === "running"
                                ? "text-neutral-600 dark:text-neutral-400"
                                : "text-neutral-700 dark:text-neutral-300",
                        )}
                    >
                        {s.summary ??
                            (s.status === "running"
                                ? `${toolLabel(s.name).running}…`
                                : s.status === "error"
                                    ? `${toolLabel(s.name).done} - failed`
                                    : toolLabel(s.name).done)}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default ToolSteps
