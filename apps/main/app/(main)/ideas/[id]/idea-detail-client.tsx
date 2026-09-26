"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, ChevronUp } from "lucide-react"
import toast from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { IdeaAvatar, IdeaStatusPill, ideaAge } from "@repo/ui/components/ideas/idea-card"
import { IdeaTeamUpdate, IdeaTimeline } from "@repo/ui/components/ideas/idea-detail"
import { IDEA_CATEGORY_LABEL, IDEA_STATUS_LABEL } from "@repo/db/ideas-types"
import type { IdeaDetail } from "@repo/db/ideas"
import { toggleIdeaVote } from "@/actions/(main)/ideas/ideas.action"

export function IdeaDetailClient({ idea }: { idea: IdeaDetail & { voted: boolean } }) {
    const [voted, setVoted] = useState(idea.voted)
    const [votes, setVotes] = useState(idea.votes)
    const [busy, setBusy] = useState(false)

    const vote = async () => {
        if (busy) return
        setBusy(true)
        setVoted(!voted)
        setVotes(votes + (voted ? -1 : 1))
        const r = await toggleIdeaVote(idea.id)
        setBusy(false)
        if (!r.success) {
            toast.error(r.error)
            setVoted(voted)
            setVotes(votes)
            return
        }
        setVoted(r.voted)
        setVotes(r.votes)
    }

    const external = idea.shippedHref?.startsWith("http")
    return (
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
            <Link href="/ideas" className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                <ArrowLeft className="size-4" /> All ideas
            </Link>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_16rem]">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <IdeaStatusPill status={idea.status} label={IDEA_STATUS_LABEL[idea.status]} />
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{IDEA_CATEGORY_LABEL[idea.category]}</span>
                    </div>
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">{idea.title}</h1>
                    <div className="mt-3 flex items-center gap-2 text-[13px] text-neutral-600 dark:text-neutral-400">
                        <IdeaAvatar author={idea.author} size={24} />
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{idea.author.name}</span>
                        <span aria-hidden>·</span>
                        <span>{ideaAge(idea.createdAt)}</span>
                    </div>
                    <p className="mt-6 whitespace-pre-line text-[16px] leading-7 text-neutral-800 dark:text-neutral-200">{idea.description}</p>

                    <div className="mt-8">
                        <IdeaTeamUpdate
                            text={idea.teamUpdate}
                            link={idea.shippedHref ? (
                                <a href={idea.shippedHref} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4">
                                    See what shipped <ArrowUpRight className="size-4" />
                                </a>
                            ) : null}
                        />
                    </div>
                </div>

                <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
                    <button
                        type="button"
                        onClick={() => void vote()}
                        disabled={busy}
                        aria-pressed={voted}
                        className={cn(
                            "flex w-full cursor-pointer items-center justify-between rounded-2xl border px-5 py-4 transition-colors",
                            voted ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-900",
                        )}
                    >
                        <span className="flex items-center gap-2 text-sm font-medium"><ChevronUp className="size-5" /> {voted ? "Voted" : "Vote for this"}</span>
                        <span className="font-mono text-lg">{votes}</span>
                    </button>
                    <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
                        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-600 dark:text-neutral-400">Status</p>
                        <IdeaTimeline
                            status={idea.status}
                            labels={IDEA_STATUS_LABEL}
                            dates={{ open: idea.createdAt, planned: idea.plannedAt, building: idea.startedAt, shipped: idea.shippedAt }}
                        />
                    </div>
                </aside>
            </div>
        </div>
    )
}
