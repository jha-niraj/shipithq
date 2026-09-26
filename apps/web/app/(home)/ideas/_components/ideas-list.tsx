import Link from "next/link"
import { ChevronUp } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { IdeaCard, voteBoxClass } from "@repo/ui/components/ideas/idea-card"
import { Shimmer } from "@repo/ui/components/skeleton-kit"
import { IDEA_CATEGORY_LABEL, IDEA_STATUS_LABEL, type IdeaSort, type IdeaStatus } from "@repo/db/ideas-types"
import type { IdeaRow } from "@repo/db/ideas"
import { MONO } from "@/components/marketing/primitives"
import { APP_URL } from "@/lib/site"

/**
 * One tab's ideas, queried on the server (plan/web/revamp REV-115): two columns at lg,
 * each card linking to its page here, the vote box into the app.
 */
export async function IdeasList({ status, sort, total }: { status?: IdeaStatus; sort: IdeaSort; total: number }) {
    let ideas: IdeaRow[] = []
    if (process.env.DATABASE_URL) try {
        const { listPublicIdeas } = await import("@repo/db/ideas")
        ideas = (await listPublicIdeas({ sort, status })).ideas
    } catch (error: unknown) {
        console.error("Loading ideas failed:", error instanceof Error ? error.message : error)
    }

    if (ideas.length === 0) {
        return (
            <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
                <p className="text-[15px] font-medium text-neutral-900">
                    {total === 0 ? "No ideas yet. Be the first." : status ? `Nothing ${IDEA_STATUS_LABEL[status].toLowerCase()} yet.` : "Nothing here yet."}
                </p>
                <p className="mt-1 text-sm text-neutral-600">Ask for a feature, a course or a fix, and others can vote for it.</p>
            </div>
        )
    }

    return (
        <ul className="mt-6 grid gap-3 lg:grid-cols-2">
            {ideas.map((i) => (
                <li key={i.id}>
                    <IdeaCard
                        href={`/ideas/${i.id}`}
                        renderLink={({ href, className, children }) => <Link href={href} className={className}>{children}</Link>}
                        idea={{
                            id: i.id,
                            title: i.title,
                            description: i.description,
                            categoryLabel: IDEA_CATEGORY_LABEL[i.category],
                            status: i.status,
                            statusLabel: IDEA_STATUS_LABEL[i.status],
                            author: i.author,
                            hasUpdate: i.hasUpdate,
                            createdAt: i.createdAt,
                        }}
                        vote={
                            <a href={`${APP_URL}/ideas/${i.id}`} className={voteBoxClass()} aria-label={`Vote for ${i.title} (${i.votes} votes), in the app`}>
                                <ChevronUp className="size-4" aria-hidden />
                                <span className={cn(MONO, "text-xs")}>{i.votes}</span>
                            </a>
                        }
                    />
                </li>
            ))}
        </ul>
    )
}

/** The list's shape while a tab loads: two columns of idea cards. */
export function IdeasListSkeleton() {
    return (
        <ul className="mt-6 grid gap-3 lg:grid-cols-2" aria-busy="true" aria-label="Loading ideas">
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <li key={i} className="flex gap-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
                    <Shimmer className="h-16 w-12 shrink-0 rounded-xl" delay={i * 0.04} />
                    <div className="flex-1 space-y-2.5">
                        <div className="flex items-center gap-2"><Shimmer className="size-[22px] rounded-full" delay={i * 0.04} /><Shimmer className="h-3 w-28" delay={i * 0.04 + 0.02} /><Shimmer className="ml-auto h-4 w-16 rounded-full" delay={i * 0.04 + 0.03} /></div>
                        <Shimmer className="h-4 w-3/4" delay={i * 0.04 + 0.05} />
                        <Shimmer className="h-3.5 w-full" delay={i * 0.04 + 0.07} />
                        <Shimmer className="h-3.5 w-2/3" delay={i * 0.04 + 0.09} />
                    </div>
                </li>
            ))}
        </ul>
    )
}
