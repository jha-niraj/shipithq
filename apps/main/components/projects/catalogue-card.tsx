"use client"

import Link from "next/link"
import { ArrowRight, Clock, Eye } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"

/*
 * ONE card for the catalogue (plan/projects, PJ-15).
 *
 * The Ideas tab and the Community tab were two different cards showing the same
 * kind of thing, and the Community one was the weaker of the two: a tag cloud on
 * top, the title buried under it, and the author in a footer nobody reads
 * (Niraj, 2026-09-23: "the community projects card should be same as the ideas
 * cards"). This is the Ideas card, with an optional author line.
 *
 * It is a COLUMN with the body on `flex-1`, which is what makes a row of three
 * put their three buttons on the same line whatever the titles wrapped to, and
 * the meta and the button share one row at the bottom.
 */

const INK = "text-neutral-900 dark:text-white"
/*
 * The readable secondary ink. `neutral-400` on this near-black surface measures
 * around 4:1 - under AA for body text and hard work at 11px. `neutral-300`
 * clears 7:1 and still reads as secondary.
 */
const INK_META = "text-neutral-700 dark:text-neutral-300"

const DIFFICULTY_LABEL: Record<string, string> = {
    EASY: "Easy", MEDIUM: "Medium", HARD: "Hard",
    BEGINNER: "Easy", INTERMEDIATE: "Medium", ADVANCED: "Hard",
}

export const pretty = (s: string) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

/** Name first, username second, and only then a stand-in. */
export function authorLabel(author?: { name?: string | null; username?: string | null } | null): string {
    return author?.name?.trim() || author?.username?.trim() || "ShipItHQ"
}

export interface CatalogueCardProps {
    title: string
    description: string
    difficulty: string
    /** What it is built with. */
    technologies: string[]
    /** What it is for. Shown under the stack when there are any. */
    categories?: string[]
    /** Up to three, as chips. */
    outcomes?: string[]
    sprintCount?: number
    taskCount?: number
    estimatedHours?: number | null
    views?: number | null
    author?: { name?: string | null; username?: string | null } | null
    /** Where the primary action goes. Omit for `onAction`. */
    href?: string | null
    actionLabel: string
    onAction?: () => void
    actionVariant?: "default" | "outline"
}

export function CatalogueCard({
    title, description, difficulty, technologies, categories = [], outcomes = [],
    sprintCount, taskCount, estimatedHours, views, author,
    href, actionLabel, onAction, actionVariant = "default",
}: CatalogueCardProps) {
    const meta = [
        sprintCount ? `${sprintCount} sprints` : null,
        taskCount ? `${taskCount} tasks` : null,
        estimatedHours ? `~${estimatedHours} hours` : null,
    ].filter(Boolean)

    return (
        <li className="flex min-w-0 flex-col rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-start justify-between gap-2">
                <h3 className={cn("min-w-0 text-sm font-semibold", INK)}>{title}</h3>
                <span className={cn("shrink-0 rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] font-medium dark:border-neutral-700", INK_META)}>
                    {DIFFICULTY_LABEL[difficulty] ?? difficulty}
                </span>
            </div>

            <div className="flex-1">
                <p className={cn("mt-2 line-clamp-3 text-xs leading-relaxed", INK_META)}>{description}</p>
                {outcomes.length > 0 && (
                    <ul className="mt-2.5 flex flex-wrap gap-1">
                        {outcomes.slice(0, 3).map((o) => (
                            <li key={o} className={cn("rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] dark:bg-neutral-800", INK_META)}>{o}</li>
                        ))}
                    </ul>
                )}
            </div>

            <p className={cn("mt-2.5 truncate text-[11px]", INK_META)}>{technologies.map(pretty).slice(0, 4).join(" · ")}</p>
            {categories.length > 0 && (
                <p className={cn("mt-1 truncate text-[11px] opacity-80", INK_META)}>{categories.map(pretty).slice(0, 3).join(" · ")}</p>
            )}

            {(author || views != null) && (
                <p className={cn("mt-2 flex items-center gap-2 truncate text-[11px]", INK_META)}>
                    {author && <span className="truncate">by {authorLabel(author)}</span>}
                    {views != null && (
                        <span className="inline-flex shrink-0 items-center gap-1">
                            <Eye className="h-3 w-3" aria-hidden />
                            {views}
                        </span>
                    )}
                </p>
            )}

            {/* The size of the job and the way in, on one line. */}
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                {meta.length > 0 ? (
                    <p className={cn("min-w-0 truncate text-[11px] font-medium", INK_META)}>{meta.join(" · ")}</p>
                ) : estimatedHours ? (
                    <p className={cn("inline-flex min-w-0 items-center gap-1 text-[11px] font-medium", INK_META)}>
                        <Clock className="h-3 w-3" aria-hidden />
                        ~{estimatedHours} hours
                    </p>
                ) : (
                    <span />
                )}
                {href ? (
                    <Button asChild size="sm" variant={actionVariant} className="shrink-0 gap-1.5">
                        <Link href={href}>
                            {actionLabel}
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                    </Button>
                ) : (
                    <Button size="sm" variant={actionVariant} className="shrink-0 gap-1.5" onClick={onAction}>
                        {actionLabel}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                )}
            </div>
        </li>
    )
}
