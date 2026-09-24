"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { cn } from "@repo/ui/lib/utils"
import toast from "@repo/ui/components/ui/sonner"
import ProjectGenerateSheet from "@/components/projects/project-generate-sheet"
import type { RecommendedIdeaView } from "@/actions/(main)/projects/recommendations.action"

// ─────────────────────────────────────────────────────────────────────────────
// "Picked for you" on the projects hub (plan/projects, PJ-1).
//
// The onboarding asks what this person has built, what stopped the projects that
// died, and how many hours they have. This is what that is FOR: ideas chosen
// against those answers, each saying why, and each one click from being
// generated with the idea's title and description already filled in.
// ─────────────────────────────────────────────────────────────────────────────

const INK = "text-neutral-900 dark:text-white"
const INK_DIM = "text-neutral-600 dark:text-neutral-400"

export function ProjectPicks({
    initial,
    canRecommend,
}: {
    initial: RecommendedIdeaView[]
    /** False until the projects onboarding is finished; there is nothing to pick from. */
    canRecommend: boolean
}) {
    const [picks, setPicks] = useState<RecommendedIdeaView[]>(initial)
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [building, setBuilding] = useState<RecommendedIdeaView | null>(null)
    const asked = useRef(initial.length > 0)

    const load = useCallback(async (force: boolean) => {
        setPending(true)
        setError(null)
        try {
            const res = await fetch("/api/projects/recommendations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ force }),
            })
            const data = (await res.json()) as { items?: RecommendedIdeaView[]; error?: string }
            if (!res.ok) {
                setError(data.error ?? "Could not work out your picks.")
                return
            }
            setPicks(data.items ?? [])
            if (force) toast.success("Picks refreshed")
        } catch {
            setError("Could not reach the recommender. Try again.")
        } finally {
            setPending(false)
        }
    }, [])

    // Once, when the hub opens with nothing cached.
    useEffect(() => {
        if (asked.current || !canRecommend) return
        asked.current = true
        void load(false)
    }, [canRecommend, load])

    if (!canRecommend) return null

    return (
        <section aria-label="Projects picked for you" className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Sparkles className={cn("h-4 w-4", INK)} aria-hidden />
                    <h2 className={cn("text-sm font-semibold", INK)}>Picked for you</h2>
                    <span className={cn("hidden text-xs sm:inline", INK_DIM)}>shaped to the hours you have and what stopped your last ones</span>
                </div>
                <button
                    type="button"
                    onClick={() => void load(true)}
                    disabled={pending}
                    title="Pick again"
                    className={cn("inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium disabled:opacity-40", INK_DIM, "hover:text-neutral-900 dark:hover:text-white")}
                >
                    {pending ? <InlineLoader size="sm" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Pick again
                </button>
            </div>

            {pending && picks.length === 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-36 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className={cn("text-sm font-medium", INK)}>That did not work.</p>
                    <p className={cn("mt-1 text-sm", INK_DIM)}>{error}</p>
                    <button type="button" onClick={() => void load(true)} className={cn("mt-2 cursor-pointer text-sm font-semibold underline underline-offset-4", INK)}>Try again</button>
                </div>
            ) : picks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-900/50">
                    <p className={cn("text-sm font-medium", INK)}>No picks yet.</p>
                    <p className={cn("mt-1 max-w-xl text-sm", INK_DIM)}>Ask for a set and the ideas will be chosen against the hours you have and what stopped your last projects.</p>
                    <button type="button" onClick={() => void load(true)} className={cn("mt-2 cursor-pointer text-sm font-semibold underline underline-offset-4", INK)}>Pick projects for me</button>
                </div>
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {picks.map((pick) => (
                        <li key={pick.title} className="flex min-w-0 flex-col rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                            <div className="flex items-start justify-between gap-2">
                                <h3 className={cn("min-w-0 text-sm font-semibold", INK)}>{pick.title}</h3>
                                <span className={cn("shrink-0 rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] font-medium dark:border-neutral-700", INK_DIM)}>
                                    {pick.difficulty.toLowerCase()}
                                </span>
                            </div>
                            {pick.why && <p className={cn("mt-1.5 text-xs italic", INK_DIM)}>{pick.why}</p>}
                            <p className={cn("mt-2 line-clamp-2 text-xs leading-relaxed", INK_DIM)}>{pick.description}</p>
                            {pick.technologies.length > 0 && (
                                <p className={cn("mt-2 truncate text-[11px]", INK_DIM)}>{pick.technologies.slice(0, 4).join(" · ")}</p>
                            )}
                            <div className="mt-3 flex items-center gap-2 pt-1">
                                <Button size="sm" className="gap-1.5" onClick={() => setBuilding(pick)}>
                                    Build this
                                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                                </Button>
                                <Link href="/projects/explore?tab=browse" className={cn("text-xs font-medium underline-offset-4 hover:underline", INK_DIM)}>
                                    Browse the catalogue
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* One sheet, opened with the chosen idea already in it, so "build this"
                is one press rather than a form to retype. */}
            <ProjectGenerateSheet
                isOpen={building !== null}
                onOpenChange={(open: boolean) => { if (!open) setBuilding(null) }}
                defaultValues={building ? { title: building.title, description: building.description, difficulty: building.difficulty } : undefined}
            />
        </section>
    )
}

export default ProjectPicks
