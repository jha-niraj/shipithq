"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronUp, Plus } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import toast from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { IdeaCard, voteBoxClass } from "@repo/ui/components/ideas/idea-card"
import { IDEA_CATEGORY_LABEL, IDEA_STATUSES, IDEA_STATUS_LABEL, type IdeaCategory, type IdeaStatus } from "@repo/db/ideas-types"
// Type-only, erased at build: the queries module never reaches the browser.
import type { IdeaBoard } from "@repo/db/ideas"
import { postIdea, toggleIdeaVote, type BoardIdea } from "@/actions/(main)/ideas/ideas.action"
import { Field, FieldGroup, ProfileSheet } from "@/components/profile/sheets/profile-sheet"

type Tab = "all" | IdeaStatus
const TABS: Tab[] = ["all", ...IDEA_STATUSES]
const POST_CATEGORIES: (IdeaCategory | "BUG")[] = ["FEATURE", "CONTENT", "IMPROVEMENT", "UI", "BUG", "OTHER"]

export function IdeasClient({ board, error }: { board: (IdeaBoard & { ideas: BoardIdea[] }) | null; error: string | null }) {
    const router = useRouter()
    const params = useSearchParams()
    const [ideas, setIdeas] = useState<BoardIdea[]>(board?.ideas ?? [])
    const [sort, setSort] = useState<"top" | "new">("top")
    const [tab, setTab] = useState<Tab>("all")
    const [pending, setPending] = useState<string | null>(null)
    const [posting, setPosting] = useState(params.get("post") === "1")

    useEffect(() => setIdeas(board?.ideas ?? []), [board])

    const counts = board?.counts ?? { all: 0, open: 0, planned: 0, building: 0, shipped: 0 }
    const shown = useMemo(() => {
        const list = tab === "all" ? ideas : ideas.filter((i) => i.status === tab)
        return [...list].sort((a, b) =>
            sort === "top"
                ? b.votes - a.votes || +new Date(b.createdAt) - +new Date(a.createdAt)
                : +new Date(b.createdAt) - +new Date(a.createdAt),
        )
    }, [ideas, sort, tab])

    const vote = async (id: string) => {
        if (pending) return
        setPending(id)
        // Optimistic: flip now, reconcile with the server's count.
        setIdeas((list) => list.map((i) => (i.id === id ? { ...i, voted: !i.voted, votes: i.votes + (i.voted ? -1 : 1) } : i)))
        const r = await toggleIdeaVote(id)
        setPending(null)
        if (!r.success) {
            toast.error(r.error)
            setIdeas((list) => list.map((i) => (i.id === id ? { ...i, voted: !i.voted, votes: i.votes + (i.voted ? -1 : 1) } : i)))
            return
        }
        setIdeas((list) => list.map((i) => (i.id === id ? { ...i, voted: r.voted, votes: r.votes } : i)))
    }

    const pill = (active: boolean) =>
        cn(
            "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors",
            active ? "bg-neutral-200/70 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-white" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white",
        )

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Ideas</h1>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        Ask for features, courses and improvements. One vote per idea; tap again to take it back.
                    </p>
                </div>
                <Button onClick={() => setPosting(true)} className="shrink-0 gap-1.5">
                    <Plus className="size-4" /> Post an idea
                </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1" role="group" aria-label="Sort">
                    {(["top", "new"] as const).map((s) => (
                        <button key={s} type="button" aria-pressed={sort === s} onClick={() => setSort(s)} className={pill(sort === s)}>
                            {s === "top" ? "Top" : "New"}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Status">
                    {TABS.map((t) => (
                        <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)} className={pill(tab === t)}>
                            {t === "all" ? "All" : IDEA_STATUS_LABEL[t]}
                            <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400">{counts[t]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {error ? (
                <p className="mt-6 rounded-xl border border-neutral-200 p-6 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">{error}. Refresh to try again.</p>
            ) : shown.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-neutral-300 px-6 py-14 text-center dark:border-neutral-700">
                    <p className="text-[15px] font-medium text-neutral-900 dark:text-white">{ideas.length ? "Nothing here yet." : "No ideas yet. Be the first."}</p>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Ask for a feature, a course or a fix, and others can vote for it.</p>
                </div>
            ) : (
                <ul className="mt-5 space-y-3">
                    {shown.map((idea) => (
                        <li key={idea.id}>
                            <IdeaCard
                                href={`/ideas/${idea.id}`}
                                renderLink={({ href, className, children }) => <Link href={href} className={className}>{children}</Link>}
                                idea={{ ...idea, categoryLabel: IDEA_CATEGORY_LABEL[idea.category], statusLabel: IDEA_STATUS_LABEL[idea.status] }}
                                vote={
                                    <button
                                        type="button"
                                        onClick={() => void vote(idea.id)}
                                        disabled={pending === idea.id}
                                        aria-pressed={idea.voted}
                                        aria-label={`${idea.voted ? "Remove your vote for" : "Vote for"} ${idea.title}`}
                                        className={cn(voteBoxClass(idea.voted), "cursor-pointer")}
                                    >
                                        <ChevronUp className="size-4" aria-hidden />
                                        <span className="font-mono text-xs">{idea.votes}</span>
                                    </button>
                                }
                            />
                        </li>
                    ))}
                </ul>
            )}

            <PostIdeaSheet
                open={posting}
                onOpenChange={(o) => {
                    setPosting(o)
                    if (!o && params.get("post")) router.replace("/ideas")
                }}
                onPosted={() => router.refresh()}
            />
        </div>
    )
}

function PostIdeaSheet({ open, onOpenChange, onPosted }: { open: boolean; onOpenChange: (o: boolean) => void; onPosted: () => void }) {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [category, setCategory] = useState<IdeaCategory | "BUG">("FEATURE")
    const [anonymous, setAnonymous] = useState(false)
    const [busy, setBusy] = useState(false)
    const [touched, setTouched] = useState(false)

    useEffect(() => {
        if (open) {
            setTitle("")
            setDescription("")
            setCategory("FEATURE")
            setAnonymous(false)
            setTouched(false)
        }
    }, [open])

    const errors = {
        title: title.trim().length < 6 ? "Give it a title of at least 6 characters" : null,
        description: description.trim().length < 10 ? "Describe it in at least 10 characters" : null,
    }

    const submit = async () => {
        setTouched(true)
        if (errors.title || errors.description) return
        setBusy(true)
        const r = await postIdea({ title, description, category, isAnonymous: anonymous })
        setBusy(false)
        if (!r.success) {
            toast.error(r.error)
            return
        }
        toast.success(r.isPublic ? "Posted. Others can vote on it now." : "Sent to the team. Bug reports stay private.")
        onOpenChange(false)
        onPosted()
    }

    return (
        <ProfileSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Post an idea"
            description="Ideas are public: anyone can read and vote on them, with your first name and photo unless you post anonymously. Bug reports go privately to the team."
            onSubmit={submit}
            submitLabel="Post"
            busyLabel="Posting"
            busy={busy}
            dirty={!!(title || description)}
        >
            <FieldGroup>
                <Field label="What kind" >
                    <div className="flex flex-wrap gap-1.5">
                        {POST_CATEGORIES.map((c) => (
                            <button
                                key={c}
                                type="button"
                                aria-pressed={category === c}
                                onClick={() => setCategory(c)}
                                className={cn(
                                    "h-8 cursor-pointer rounded-md border px-3 text-[13px] transition-colors",
                                    category === c
                                        ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                                        : "border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900",
                                )}
                            >
                                {IDEA_CATEGORY_LABEL[c]}
                            </button>
                        ))}
                    </div>
                </Field>
                <Field label="Title" htmlFor="idea-title" required error={touched ? errors.title : null}>
                    <Input id="idea-title" autoFocus maxLength={120} placeholder="A course on system design interviews" value={title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
                <Field label="Details" htmlFor="idea-desc" required error={touched ? errors.description : null} hint="What would you use it for? The more specific, the easier to build.">
                    <Textarea id="idea-desc" rows={6} maxLength={2000} className="resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
                </Field>
                <label className="flex w-fit cursor-pointer items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                    <Checkbox checked={anonymous} onCheckedChange={(c) => setAnonymous(c === true)} />
                    Post anonymously (shows as Community instead of your first name)
                </label>
                {busy && <p className="flex items-center gap-2 text-xs text-neutral-500"><InlineLoader size="sm" /> Posting</p>}
            </FieldGroup>
        </ProfileSheet>
    )
}
