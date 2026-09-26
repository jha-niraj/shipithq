import type { Metadata } from "next"
import { Suspense } from "react"
import { IDEA_STATUSES, IDEA_STATUS_LABEL, type IdeaSort, type IdeaStatus } from "@repo/db/ideas-types"
import type { IdeaBoard } from "@repo/db/ideas"
import { pageMeta } from "@/lib/seo"
import { PageHero } from "@/components/page-hero"
import { IdeasTabs } from "./_components/ideas-tabs"
import { IdeasList, IdeasListSkeleton } from "./_components/ideas-list"

export const metadata: Metadata = pageMeta({
    title: "Ideas",
    description: "Ask for features, courses and improvements to ShipItHQ, vote on what others asked for, and see what is planned and shipped.",
    path: "/ideas",
})

/**
 * shipithq.com/ideas (plan/web/revamp REV-42, REV-115). The counts sit in the hero under
 * the copy; the board below is as wide as the hero. The tabs and the sort are URL
 * params (`?status=planned&sort=new`) read here and sent to the database, so a tab is a
 * real query and a shareable link. Only the list re-renders when they change: it sits
 * in a Suspense boundary keyed on the params, whose fallback is the list's own skeleton.
 *
 * The only user data that leaves the database is a poster's first name and avatar
 * (apps/web/CLAUDE.md). Posting and voting happen in the app.
 */

type Params = Promise<{ status?: string; sort?: string }>

const EMPTY: IdeaBoard["counts"] = { all: 0, open: 0, planned: 0, building: 0, shipped: 0 }

function parse(sp: { status?: string; sort?: string }): { status: IdeaStatus | undefined; sort: IdeaSort } {
    const status = IDEA_STATUSES.includes(sp.status as IdeaStatus) ? (sp.status as IdeaStatus) : undefined
    return { status, sort: sp.sort === "new" ? "new" : "top" }
}

async function loadCounts(): Promise<IdeaBoard["counts"]> {
    // Lazy, and only with a database configured: @repo/db's client calls neon() at
    // module load, which throws when DATABASE_URL is missing (a local web checkout).
    if (!process.env.DATABASE_URL) return EMPTY
    try {
        const { countPublicIdeas } = await import("@repo/db/ideas")
        return await countPublicIdeas()
    } catch (error: unknown) {
        console.error("Counting ideas failed:", error instanceof Error ? error.message : error)
        return EMPTY
    }
}

export default async function IdeasPage({ searchParams }: { searchParams: Params }) {
    const { status, sort } = parse(await searchParams)
    const counts = await loadCounts()

    return (
        <main className="bg-neutral-50">
            <PageHero
                eyebrow="Feature requests"
                title="Ideas"
                sub="Ask for features, courses and improvements, and vote on what we build next. Posting and voting happen in the app, one vote per person."
                tone="mint"
                art="ideas"
                facts={IDEA_STATUSES.map((st) => ({ value: counts[st].toLocaleString("en-IN"), label: IDEA_STATUS_LABEL[st] }))}
            />
            <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6">
                <IdeasTabs status={status ?? "all"} sort={sort} counts={counts} />
                <Suspense key={`${status ?? "all"}-${sort}`} fallback={<IdeasListSkeleton />}>
                    <IdeasList status={status} sort={sort} total={counts.all} />
                </Suspense>
            </div>
        </main>
    )
}
