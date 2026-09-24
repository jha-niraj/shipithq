import type { Metadata } from "next"
import { Suspense } from "react"
import { getBrowse, type BrowseFilters, type BrowseSort, type MadeBy } from "@/actions/(main)/projects/explore.action"
import { ExploreShell, type ExploreTab } from "./_components/explore-shell"
import { BrowsePane } from "./_components/browse-pane"
import MyProjectsClient from "../myprojects/_components/MyProjectsClient"

export const metadata: Metadata = {
    title: "Explore projects | ShipItHQ",
    description: "Browse every project you can build, and your own projects.",
}

interface PageProps {
    searchParams: Promise<{
        tab?: string
        made?: string
        mode?: string
        technology?: string
        difficulty?: string
        category?: string
        q?: string
        sort?: string
    }>
}

const pick = <T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T =>
    (allowed as readonly string[]).includes(value ?? "") ? (value as T) : fallback

/**
 * One page for browsing projects (plan/projects PJ-4, PJ-19).
 *
 * Two tabs: Browse (every public project and every idea waiting to be built)
 * and Mine. Browse replaced Ideas and Community on 2026-09-24, which showed the
 * same projects twice; their old links still land here - `tab=ideas` on
 * Browse, `tab=community` on Browse filtered to what learners published.
 *
 * Every choice is in the URL, so a view can be shared, reloaded and returned
 * to with the back button.
 */
export default async function ExplorePage({ searchParams }: PageProps) {
    const params = await searchParams
    const tab: ExploreTab = params.tab === "mine" ? "mine" : "browse"
    const made: MadeBy = params.tab === "community" && !params.made ? "community" : pick(params.made, ["all", "shipithq", "community"] as const, "all")

    return (
        <ExploreShell tab={tab}>
            {tab === "browse" && (
                <Suspense fallback={<BrowseSkeleton />}>
                    <Browse
                        filters={{
                            made,
                            mode: params.mode === "problem" ? "problem" : "technology",
                            technology: params.technology,
                            difficulty: params.difficulty,
                            category: params.category,
                            q: params.q,
                            sort: pick<BrowseSort>(params.sort, ["recommended", "popular", "recent"] as const, "recommended"),
                        }}
                    />
                </Suspense>
            )}
            {/* Keeps its own layout; `embedded` drops the heading it used to draw. */}
            {tab === "mine" && <MyProjectsClient embedded />}
        </ExploreShell>
    )
}

async function Browse({ filters }: { filters: BrowseFilters }) {
    const { rows, facets, counts } = await getBrowse(filters)
    return <BrowsePane rows={rows} facets={facets} filters={filters} counts={counts} />
}

function BrowseSkeleton() {
    const bar = "animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800"
    return (
        <div className="space-y-4" aria-busy aria-label="Loading projects">
            <div className="flex flex-wrap gap-2">
                <div className={`${bar} h-8 w-64 rounded-xl`} />
                <div className={`${bar} h-8 w-52 rounded-xl`} />
                <div className={`${bar} ml-auto h-8 w-72 rounded-xl`} />
            </div>
            <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className={`${bar} h-8 w-32 rounded-xl`} />)}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`${bar} h-60 rounded-2xl`} />
                ))}
            </div>
        </div>
    )
}
