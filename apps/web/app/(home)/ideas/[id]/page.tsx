import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowUpRight, ChevronUp } from "lucide-react"
import { IDEA_CATEGORY_LABEL, IDEA_STATUS_LABEL } from "@repo/db/ideas-types"
import type { IdeaDetail } from "@repo/db/ideas"
import { IdeaAvatar, IdeaStatusPill, ideaAge } from "@repo/ui/components/ideas/idea-card"
import { IdeaTeamUpdate, IdeaTimeline } from "@repo/ui/components/ideas/idea-detail"
import { cn } from "@repo/ui/lib/utils"
import { APP_URL } from "@/lib/site"
import { pageMeta } from "@/lib/seo"
import { MONO, PrimaryCta } from "@/components/marketing/primitives"

/**
 * One idea on shipithq.com (plan/ideas IDEA-6): the full text, the author (first name
 * and avatar, the team, or Community), the status timeline, the team update and the
 * shipped link. Read-only; the vote button goes to the same idea in the app, where the
 * visitor signs in and returns here-equivalent (/ideas/<id>) after onboarding.
 *
 * Static with a five-minute refresh. `@repo/db` is imported lazily and only with a
 * database configured, like the board (its client throws without DATABASE_URL).
 */

export const revalidate = 300

async function load(id: string): Promise<IdeaDetail | null> {
    if (!process.env.DATABASE_URL) return null
    try {
        const { getPublicIdea } = await import("@repo/db/ideas")
        return await getPublicIdea(id)
    } catch (error: unknown) {
        console.error("Loading an idea failed:", error)
        return null
    }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const idea = await load((await params).id)
    if (!idea) return { title: "Idea" }
    return pageMeta({ title: idea.title.slice(0, 48), description: idea.description.slice(0, 158), path: `/ideas/${idea.id}` })
}

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
    const idea = await load((await params).id)
    if (!idea) notFound()
    const external = idea.shippedHref?.startsWith("http")

    return (
        <main className="bg-neutral-50">
            <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
                <Link href="/ideas" className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900">
                    <ArrowLeft className="size-4" /> All ideas
                </Link>

                <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_17rem]">
                    <article className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-10">
                        <div className="flex flex-wrap items-center gap-2">
                            <IdeaStatusPill status={idea.status} label={IDEA_STATUS_LABEL[idea.status]} />
                            <span className={cn(MONO, "rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-neutral-700")}>{IDEA_CATEGORY_LABEL[idea.category]}</span>
                        </div>
                        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">{idea.title}</h1>
                        <div className="mt-4 flex items-center gap-2 text-[14px] text-neutral-600">
                            <IdeaAvatar author={idea.author} size={26} />
                            <span className="font-medium text-neutral-900">{idea.author.name}</span>
                            <span aria-hidden>·</span>
                            <span>{ideaAge(idea.createdAt)}</span>
                        </div>
                        <p className="mt-8 whitespace-pre-line text-[17px] leading-8 text-neutral-800">{idea.description}</p>
                        <div className="mt-10">
                            <IdeaTeamUpdate
                                text={idea.teamUpdate}
                                link={idea.shippedHref ? (
                                    <a href={idea.shippedHref} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4">
                                        See what shipped <ArrowUpRight className="size-4" />
                                    </a>
                                ) : null}
                            />
                        </div>
                    </article>

                    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                        <a
                            href={`${APP_URL}/ideas/${idea.id}`}
                            className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5 py-4 transition-colors hover:border-neutral-300"
                        >
                            <span className="flex items-center gap-2 text-sm font-medium text-neutral-900"><ChevronUp className="size-5" /> Vote for this</span>
                            <span className={cn(MONO, "text-lg text-neutral-900")}>{idea.votes}</span>
                        </a>
                        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                            <p className={cn(MONO, "mb-4 text-[11px] uppercase tracking-[0.16em] text-neutral-600")}>Status</p>
                            <IdeaTimeline
                                status={idea.status}
                                labels={IDEA_STATUS_LABEL}
                                dates={{ open: idea.createdAt, planned: idea.plannedAt, building: idea.startedAt, shipped: idea.shippedAt }}
                            />
                        </div>
                        <div className="rounded-2xl bg-[#BFE3D0] p-5">
                            <p className="text-[15px] font-semibold text-neutral-900">Have an idea of your own?</p>
                            <p className="mt-1 text-[13px] leading-5 text-neutral-800">Post it and others can vote for it.</p>
                            <PrimaryCta href={`${APP_URL}/ideas?post=1`} size="sm" className="mt-4">Post an idea</PrimaryCta>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    )
}
