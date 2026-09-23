"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Code2, Target } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui/components/ui/select"
import { Button } from "@repo/ui/components/ui/button"
import ProjectGenerateSheet from "@/components/projects/project-generate-sheet"
import { CatalogueCard } from "@/components/projects/catalogue-card"
import type { IdeaFacets, IdeaFilters, IdeaRow } from "@/actions/(main)/projects/explore.action"

// The Ideas tab (plan/projects, PJ-4): the curated catalogue, with the
// technology-first and problem-first switch and the filters. Everything that
// changes what you see is a LINK carrying the state in the URL, so a filtered
// view can be shared, reloaded and gone back to.

const INK = "text-neutral-900 dark:text-white"
const INK_DIM = "text-neutral-600 dark:text-neutral-400"
/*
 * The readable secondary ink.
 *
 * `INK_DIM` is neutral-400 in dark mode, which on the near-black card surface is
 * around 4:1 - under AA for body text and, at the 11px these rows use, genuinely
 * hard work (Niraj, 2026-09-23: "give text somewhat more white color as this is
 * hard for reading"). neutral-300 clears 7:1 and still reads as secondary.
 */
const INK_META = "text-neutral-700 dark:text-neutral-300"

const DIFFICULTY_LABEL: Record<string, string> = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" }
const pretty = (s: string) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

/** The same URL with one parameter changed, or removed when it is cleared. */
function withParam(current: Record<string, string | undefined>, key: string, value?: string): string {
    const params = new URLSearchParams()
    params.set("tab", "ideas")
    for (const [k, v] of Object.entries(current)) {
        if (k !== "tab" && k !== key && v) params.set(k, v)
    }
    if (value) params.set(key, value)
    return `/projects/explore?${params.toString()}`
}

export function IdeasPane({
    ideas,
    facets,
    filters,
}: {
    ideas: IdeaRow[]
    facets: IdeaFacets
    filters: IdeaFilters
}) {
    const [building, setBuilding] = useState<IdeaRow | null>(null)
    const current: Record<string, string | undefined> = {
        mode: filters.mode,
        technology: filters.technology,
        difficulty: filters.difficulty,
        category: filters.category,
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                {/* Technology first or problem first: the two ways people look for a
                    project. A link each, so the choice is in the URL. */}
                <div className="inline-flex rounded-xl bg-neutral-100/70 p-0.5 dark:bg-neutral-800/50" role="group" aria-label="How to browse">
                    {([
                        { value: "technology", label: "By technology", icon: Code2 },
                        { value: "problem", label: "Problem first", icon: Target },
                    ] as const).map(({ value, label, icon: Icon }) => (
                        <Link
                            key={value}
                            href={withParam(current, "mode", value)}
                            aria-current={filters.mode === value ? "true" : undefined}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                                filters.mode === value
                                    ? "bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-900/5 dark:bg-neutral-700 dark:text-white dark:ring-white/10"
                                    : "text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-700/40",
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" aria-hidden />
                            {label}
                        </Link>
                    ))}
                </div>

                <FilterMenu label="Stack" value={filters.technology} options={facets.technologies} current={current} param="technology" />
                <FilterMenu label="Difficulty" value={filters.difficulty} options={facets.difficulties} current={current} param="difficulty" labels={DIFFICULTY_LABEL} />
                <FilterMenu label="Category" value={filters.category} options={facets.categories} current={current} param="category" />

                <span className={cn("ml-auto text-xs", INK_DIM)}>{ideas.length} shown</span>
            </div>

            {ideas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
                    <p className={cn("text-sm font-medium", INK)}>Nothing matches those filters.</p>
                    <p className={cn("mt-1 text-sm", INK_DIM)}>Clear one of them, or describe what you want to build and have it generated.</p>
                    <Link href="/projects/explore?tab=ideas" className={cn("mt-3 inline-block text-sm font-semibold underline underline-offset-4", INK)}>
                        Clear the filters
                    </Link>
                </div>
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {ideas.map((idea) => (
                        // The same card the Community tab draws - see
                        // `components/projects/catalogue-card.tsx`.
                        <CatalogueCard
                            key={idea.id}
                            title={idea.title}
                            description={idea.description}
                            difficulty={idea.difficulty}
                            technologies={filters.mode === "problem" ? idea.categories : idea.technologies}
                            categories={filters.mode === "problem" ? idea.technologies : idea.categories}
                            outcomes={idea.outcomes}
                            sprintCount={idea.sprintCount}
                            taskCount={idea.taskCount}
                            estimatedHours={idea.estimatedHours}
                            href={idea.slug ? `/projects/${idea.slug}` : null}
                            actionLabel={idea.slug ? "Build this" : "Generate this"}
                            actionVariant={idea.slug ? "default" : "outline"}
                            onAction={idea.slug ? undefined : () => setBuilding(idea)}
                        />
                    ))}
                </ul>
            )}

            <ProjectGenerateSheet
                isOpen={building !== null}
                onOpenChange={(open: boolean) => { if (!open) setBuilding(null) }}
                defaultValues={building ? { title: building.title, description: building.description, difficulty: building.difficulty } : undefined}
            />
        </div>
    )
}

/**
 * One filter, as a select.
 *
 * This was a DropdownMenu whose rows were `<DropdownMenuCheckboxItem asChild>`
 * wrapping a `<Link>`, and clicking ANY of the three filters took the whole page
 * to the error boundary ("This page didn't load", Niraj 2026-09-23). Our
 * `DropdownMenuCheckboxItem` always renders two children - the tick indicator
 * and whatever you pass - so `asChild` reaches Radix's `React.Children.only` and
 * throws during render. `asChild` on any menu item that draws its own indicator
 * is the same trap.
 *
 * A select cannot be a link, so this is the one control on the page that
 * navigates with the router rather than an `<a>`. The URL is still what holds
 * the filter: the push writes it, the server reads it, and a filtered view is
 * still shareable and reloadable.
 */
function FilterMenu({
    label,
    value,
    options,
    current,
    param,
    labels,
}: {
    label: string
    value?: string
    options: string[]
    current: Record<string, string | undefined>
    param: string
    labels?: Record<string, string>
}) {
    const router = useRouter()
    if (options.length === 0) return null

    // Radix refuses an empty item value, so "no filter" needs a name of its own.
    const ANY = "__any"

    /*
     * The trigger's text is passed as CHILDREN rather than left to Radix.
     *
     * Radix fills an empty `SelectValue` by portalling the selected item's text
     * into it, and it can only do that once the content has mounted - which in a
     * browser happens into a detached fragment, and on the server not at all. Left
     * to itself the trigger therefore renders EMPTY in the server HTML and fills in
     * after hydration: three blank pills on first paint. Children set
     * `valueNodeHasChildren`, which turns the portal off and makes the label the
     * same string on the server and the client.
     */
    const shown = value ? (labels?.[value] ?? pretty(value)) : label

    return (
        <Select
            value={value ?? ANY}
            onValueChange={(next: string) => router.push(withParam(current, param, next === ANY ? undefined : next))}
        >
            <SelectTrigger
                size="sm"
                aria-label={label}
                className={cn(
                    // The base control is square (packages/ui). A filter pill in a
                    // row of pills is where a radius belongs, so it is asked for
                    // here - Niraj, 2026-09-23.
                    "w-auto min-w-[7.5rem] gap-1.5",
                    value && "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200",
                )}
            >
                <SelectValue placeholder={label}>{shown}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-80">
                <SelectItem value={ANY}>Any {label.toLowerCase()}</SelectItem>
                {options.map((option) => (
                    <SelectItem key={option} value={option}>
                        {labels?.[option] ?? pretty(option)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

export default IdeasPane
