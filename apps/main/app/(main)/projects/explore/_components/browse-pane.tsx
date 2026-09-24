"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Code2, Search, Target } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui/components/ui/select"
import ProjectGenerateSheet from "@/components/projects/project-generate-sheet"
import { CatalogueCard } from "@/components/projects/catalogue-card"
import type { BrowseFacets, BrowseFilters, BrowseRow, MadeBy } from "@/actions/(main)/projects/explore.action"

/*
 * The Browse tab (plan/projects PJ-19): every public project and every idea
 * still waiting to be built, in one list, instead of the Ideas and Community
 * tabs that showed the same projects twice (Niraj, 2026-09-24).
 *
 * Everything that changes what you see is in the URL - links for the made-by
 * and browse-mode switches, a plain GET form for search, the router for the
 * selects - so a filtered view can be shared, reloaded and gone back to.
 */

const INK = "text-neutral-900 dark:text-white"
const INK_DIM = "text-neutral-600 dark:text-neutral-400"

const DIFFICULTY_LABEL: Record<string, string> = { BEGINNER: "Easy", INTERMEDIATE: "Medium", ADVANCED: "Hard" }
const SORT_LABEL: Record<string, string> = { recommended: "Recommended", popular: "Most started", recent: "Newest" }
const MADE_LABEL: Record<MadeBy, string> = { all: "All", shipithq: "ShipItHQ", community: "Community" }
const pretty = (s: string) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

type Current = Record<string, string | undefined>

/** Values a URL does not need to carry. */
const DEFAULTS: Current = { made: "all", mode: "technology", sort: "recommended" }

/** The same URL with one parameter changed, or removed when cleared (or at its default). */
function withParam(current: Current, key: string, value?: string): string {
    const params = new URLSearchParams()
    params.set("tab", "browse")
    for (const [k, v] of Object.entries(current)) {
        if (k !== key && v && v !== DEFAULTS[k]) params.set(k, v)
    }
    if (value && value !== DEFAULTS[key]) params.set(key, value)
    return `/projects/explore?${params.toString()}`
}

export function BrowsePane({ rows, facets, filters, counts }: {
    rows: BrowseRow[]
    facets: BrowseFacets
    filters: BrowseFilters
    counts: Record<MadeBy, number>
}) {
    const [building, setBuilding] = useState<BrowseRow | null>(null)
    const current: Current = {
        made: filters.made,
        mode: filters.mode,
        technology: filters.technology,
        difficulty: filters.difficulty,
        category: filters.category,
        q: filters.q,
        sort: filters.sort,
    }
    const filtered = !!(filters.technology || filters.difficulty || filters.category || filters.q)

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                {/* Who made it: the one real difference between the old two tabs. */}
                <Segmented label="Made by">
                    {(["all", "shipithq", "community"] as const).map((made) => (
                        <SegmentLink key={made} href={withParam(current, "made", made)} active={filters.made === made}>
                            {MADE_LABEL[made]}
                            <span className="tabular-nums opacity-60">{counts[made]}</span>
                        </SegmentLink>
                    ))}
                </Segmented>

                <Segmented label="How to browse">
                    {([
                        { value: "technology", label: "By stack", icon: Code2 },
                        { value: "problem", label: "Problem first", icon: Target },
                    ] as const).map(({ value, label, icon: Icon }) => (
                        <SegmentLink key={value} href={withParam(current, "mode", value)} active={filters.mode === value}>
                            <Icon className="h-3.5 w-3.5" aria-hidden />
                            {label}
                        </SegmentLink>
                    ))}
                </Segmented>

                <form action="/projects/explore" method="get" className="relative ml-auto min-w-[14rem] flex-1 sm:max-w-xs" role="search">
                    {/* Only what differs from the defaults, so the URL stays as short as a link's. */}
                    {Object.entries(current).map(([k, v]) => (k !== "q" && v && v !== DEFAULTS[k] ? <input key={k} type="hidden" name={k} value={v} /> : null))}
                    <input type="hidden" name="tab" value="browse" />
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" aria-hidden />
                    <input
                        type="search"
                        name="q"
                        defaultValue={filters.q ?? ""}
                        placeholder="Search projects or stacks"
                        aria-label="Search projects"
                        className="h-8 w-full rounded-xl border border-neutral-200 bg-white pl-8 pr-3 text-xs text-neutral-900 outline-none placeholder:text-neutral-500 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white dark:focus:border-neutral-600"
                    />
                </form>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <FilterMenu label="Stack" value={filters.technology} options={facets.technologies} current={current} param="technology" />
                <FilterMenu label="Difficulty" value={filters.difficulty} options={facets.difficulties} current={current} param="difficulty" labels={DIFFICULTY_LABEL} />
                <FilterMenu label="Category" value={filters.category} options={facets.categories} current={current} param="category" />
                <FilterMenu label="Sort" value={filters.sort === "recommended" ? undefined : filters.sort} options={["popular", "recent"]} current={current} param="sort" labels={SORT_LABEL} anyLabel="Recommended" />
                {filtered && (
                    <Link href={withParam({ made: filters.made, mode: filters.mode, sort: filters.sort }, "")} className={cn("text-xs font-medium underline-offset-4 hover:underline", INK_DIM)}>
                        Clear filters
                    </Link>
                )}
                <span className={cn("ml-auto text-xs", INK_DIM)}>{rows.length} shown</span>
            </div>

            {rows.length === 0 ? (
                <Empty filters={filters} filtered={filtered} />
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {rows.map((row) => (
                        <CatalogueCard
                            key={row.id}
                            title={row.title}
                            description={row.description}
                            difficulty={row.difficulty}
                            technologies={filters.mode === "problem" && row.categories.length ? row.categories : row.technologies}
                            categories={filters.mode === "problem" && row.categories.length ? row.technologies : row.categories}
                            outcomes={row.outcomes}
                            sprintCount={row.sprintCount}
                            taskCount={row.taskCount}
                            estimatedHours={row.estimatedHours}
                            author={row.madeBy === "community" ? row.author : { name: "ShipItHQ" }}
                            href={row.slug ? `/projects/${row.slug}` : null}
                            actionLabel={row.slug ? (row.madeBy === "community" ? "View project" : "Build this") : "Generate this"}
                            actionVariant={row.slug ? "default" : "outline"}
                            onAction={row.slug ? undefined : () => setBuilding(row)}
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

function Empty({ filters, filtered }: { filters: BrowseFilters; filtered: boolean }) {
    const community = filters.made === "community" && !filtered
    return (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
            <p className={cn("text-sm font-medium", INK)}>{community ? "Nothing published by the community yet." : "Nothing matches those filters."}</p>
            <p className={cn("mt-1 text-sm", INK_DIM)}>
                {community
                    ? "When a learner makes a project public from its page, it is listed here for anyone to build."
                    : "Clear one of them, or describe what you want to build and have it generated."}
            </p>
            <Link href={community ? "/projects/explore?tab=browse" : withParam({ made: filters.made, mode: filters.mode }, "")} className={cn("mt-3 inline-block text-sm font-semibold underline underline-offset-4", INK)}>
                {community ? "Browse ShipItHQ's projects" : "Clear the filters"}
            </Link>
        </div>
    )
}

function Segmented({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="inline-flex rounded-xl bg-neutral-100/70 p-0.5 dark:bg-neutral-800/50" role="group" aria-label={label}>
            {children}
        </div>
    )
}

function SegmentLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            aria-current={active ? "true" : undefined}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                active
                    ? "bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-900/5 dark:bg-neutral-700 dark:text-white dark:ring-white/10"
                    : "text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-700/40",
            )}
        >
            {children}
        </Link>
    )
}

/**
 * One filter, as a select that writes the URL.
 *
 * Not a DropdownMenu of `<DropdownMenuCheckboxItem asChild>` links: our checkbox
 * item always renders two children (the tick and yours), so `asChild` hits
 * Radix's `React.Children.only` and throws during render - which took the whole
 * page to the error boundary once (Niraj, 2026-09-23).
 *
 * The trigger's text is passed as CHILDREN so it is the same on the server and
 * the client; left to Radix it renders empty until hydration.
 */
function FilterMenu({ label, value, options, current, param, labels, anyLabel }: {
    label: string
    value?: string
    options: string[]
    current: Current
    param: string
    labels?: Record<string, string>
    anyLabel?: string
}) {
    const router = useRouter()
    if (options.length === 0) return null
    const ANY = "__any"
    const shown = value ? (labels?.[value] ?? pretty(value)) : (anyLabel ?? label)

    return (
        <Select value={value ?? ANY} onValueChange={(next: string) => router.push(withParam(current, param, next === ANY ? undefined : next))}>
            <SelectTrigger
                size="sm"
                aria-label={label}
                className={cn(
                    "w-auto min-w-[7.5rem] gap-1.5",
                    value && "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200",
                )}
            >
                <SelectValue placeholder={label}>{shown}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-80">
                <SelectItem value={ANY}>{anyLabel ?? `Any ${label.toLowerCase()}`}</SelectItem>
                {options.map((option) => (
                    <SelectItem key={option} value={option}>{labels?.[option] ?? pretty(option)}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
