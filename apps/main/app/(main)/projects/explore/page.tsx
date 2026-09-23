import type { Metadata } from "next"
import { Suspense } from "react"
import { getIdeas } from "@/actions/(main)/projects/explore.action"
import { ExploreShell, EXPLORE_TABS, type ExploreTab } from "./_components/explore-shell"
import { IdeasPane } from "./_components/ideas-pane"
import AllProjectsClient from "../allprojects/_components/AllProjectsClient"
import MyProjectsClient from "../myprojects/_components/MyProjectsClient"

export const metadata: Metadata = {
    title: "Explore projects | ShipItHQ",
    description: "Browse project ideas, what the community has built, and your own projects.",
}

interface PageProps {
    searchParams: Promise<{
        tab?: string
        mode?: string
        technology?: string
        difficulty?: string
        category?: string
    }>
}

/**
 * One page for browsing projects (plan/projects, PJ-4).
 *
 * It replaced three routes that each did a third of the job and none of which was
 * obviously the one to open: `/projects/ideas`, `/projects/allprojects` and
 * `/projects/myprojects` now redirect into the matching tab here. The dashboard
 * stays at `/projects`.
 *
 * Every choice is in the URL - the tab, the browse mode and each filter - so a
 * view can be shared, reloaded and returned to with the back button.
 */
export default async function ExplorePage({ searchParams }: PageProps) {
    const params = await searchParams
    const tab: ExploreTab = EXPLORE_TABS.some((t) => t.value === params.tab) ? (params.tab as ExploreTab) : "ideas"

    return (
        <ExploreShell tab={tab}>
            {tab === "ideas" && (
                <Suspense fallback={<IdeasSkeleton />}>
                    <Ideas
                        mode={params.mode === "problem" ? "problem" : "technology"}
                        technology={params.technology}
                        difficulty={params.difficulty}
                        category={params.category}
                    />
                </Suspense>
            )}
            {/* The two lists keep their own layouts; `embedded` drops the page
                heading each used to draw, because this page has one. */}
            {tab === "community" && <AllProjectsClient embedded />}
            {tab === "mine" && <MyProjectsClient embedded />}
        </ExploreShell>
    )
}

async function Ideas({ mode, technology, difficulty, category }: {
    mode: "technology" | "problem"
    technology?: string
    difficulty?: string
    category?: string
}) {
    const filters = { mode, technology, difficulty, category }
    const { ideas, facets } = await getIdeas(filters)
    return <IdeasPane ideas={ideas} facets={facets} filters={filters} />
}

function IdeasSkeleton() {
    const bar = "animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800"
    return (
        <div className="space-y-4" aria-busy aria-label="Loading ideas">
            <div className="flex flex-wrap gap-2">
                <div className={`${bar} h-8 w-56 rounded-xl`} />
                <div className={`${bar} h-8 w-32 rounded-xl`} />
                <div className={`${bar} h-8 w-32 rounded-xl`} />
                <div className={`${bar} h-8 w-32 rounded-xl`} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`${bar} h-60 rounded-2xl`} />
                ))}
            </div>
        </div>
    )
}
