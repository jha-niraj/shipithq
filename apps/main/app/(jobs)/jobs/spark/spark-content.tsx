"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Building2, LayoutList, PartyPopper, RefreshCw } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { toast } from "@repo/ui/components/ui/sonner"
import { ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { recordSwipeAction, getSparkJobs, undoSkip } from "@/actions/jobs/tabs"
import { toggleSaveJob, type FeedJobResult } from "@/actions/jobs"
import { SparkPanel } from "../components/spark-panel"
import { SparkPanelSkeleton } from "../components/spark-skeleton"

/*
 * Spark: one job at a time, as a panel on the page (plan/jobs JB-18).
 *
 * Browsing and deciding are separate on purpose. The arrows (and J/K) move
 * through the list and record nothing, so reading ahead is free. Save and
 * Not for me record a decision, as a right or left swipe did, and take the job
 * out of the list; the next one moves into its place. Undo puts the last
 * decided job back, and takes the save or the stored skip back with it.
 *
 * A skip is stored for 30 days (JB-19), which takes the job out of the server's
 * list, so "load more" asks for offset = jobs fetched - skips stored. A plain
 * page number would jump over one unseen job per skip.
 */

interface SparkContentProps {
    initialJobs: FeedJobResult[]
    pagination: { page: number; limit: number; total: number; totalPages: number } | null
    isAuthenticated: boolean
}

type Decision = { job: FeedJobResult; index: number; kind: "save" | "skip"; wasSaved: boolean }

/** Load the next page when this many jobs or fewer are left ahead of the cursor. */
const PREFETCH_AHEAD = 3

export function SparkContent({ initialJobs, pagination, isAuthenticated }: SparkContentProps) {
    const [jobs, setJobs] = useState<FeedJobResult[]>(initialJobs)
    const [index, setIndex] = useState(0)
    const [direction, setDirection] = useState<1 | -1>(1)
    const [decided, setDecided] = useState<Decision[]>([])
    const [savedCount, setSavedCount] = useState(0)
    const [page, setPage] = useState(pagination?.page ?? 1)
    const [hasMore, setHasMore] = useState(pagination ? pagination.page < pagination.totalPages : false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [fetched, setFetched] = useState(initialJobs.length)
    const [storedSkips, setStoredSkips] = useState(0)
    const [busy, setBusy] = useState(false)
    const reduceMotion = useReducedMotion()

    const serverTotal = pagination?.total ?? initialJobs.length
    // Everything still to look at: the server's count less what was decided, never
    // fewer than what is loaded.
    const total = Math.max(jobs.length, serverTotal - decided.length)
    const job = jobs[index] ?? null

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return
        setLoadingMore(true)
        const result = await getSparkJobs(page + 1, 20, { offset: fetched - storedSkips })
        if (result.success && result.data) {
            const next = result.data.jobs as unknown as FeedJobResult[]
            setFetched((n) => n + next.length)
            setJobs((prev) => {
                const seen = new Set(prev.map((j) => j.id))
                return [...prev, ...next.filter((j) => !seen.has(j.id))]
            })
            setPage(result.data.pagination.page)
            setHasMore(result.data.pagination.page < result.data.pagination.totalPages)
        } else {
            setHasMore(false)
        }
        setLoadingMore(false)
    }, [loadingMore, hasMore, page, fetched, storedSkips])

    useEffect(() => {
        if (jobs.length - 1 - index <= PREFETCH_AHEAD) void loadMore()
    }, [index, jobs.length, loadMore])

    const next = useCallback(() => {
        setDirection(1)
        setIndex((i) => Math.min(i + 1, Math.max(0, jobs.length - 1)))
    }, [jobs.length])

    const prev = useCallback(() => {
        setDirection(-1)
        setIndex((i) => Math.max(0, i - 1))
    }, [])

    const decide = useCallback(async (kind: "save" | "skip") => {
        if (!job || busy) return
        if (!isAuthenticated) {
            toast.info(kind === "save" ? "Sign in to save jobs you're interested in" : "Sign in to tune what Spark shows you")
            return
        }
        setBusy(true)
        const at = index
        setDecided((d) => [...d, { job, index: at, kind, wasSaved: job.isSaved }])
        setJobs((prev) => prev.filter((j) => j.id !== job.id))
        // The next job takes this one's place; past the end, step back one.
        setIndex((i) => Math.min(i, Math.max(0, jobs.length - 2)))
        setDirection(1)
        const result = await recordSwipeAction(job.id, kind === "save" ? "right" : "left")
        setBusy(false)
        if (!result.success) {
            toast.error(result.error ?? "Could not record that")
            return
        }
        if (kind === "save") {
            setSavedCount((n) => n + 1)
            toast.success(`Saved ${job.title}`, { description: job.company.name })
        } else {
            setStoredSkips((n) => n + 1)
        }
    }, [job, busy, isAuthenticated, index, jobs.length])

    const undo = useCallback(async () => {
        const last = decided[decided.length - 1]
        if (!last || busy) return
        setBusy(true)
        setDecided((d) => d.slice(0, -1))
        setJobs((prev) => {
            const copy = [...prev]
            copy.splice(Math.min(last.index, copy.length), 0, last.job)
            return copy
        })
        setIndex(Math.min(last.index, jobs.length))
        setDirection(-1)
        // A save this session made is taken back; one that was there before stays.
        if (last.kind === "save" && !last.wasSaved) {
            const r = await toggleSaveJob(last.job.id)
            if (r.success) setSavedCount((n) => Math.max(0, n - 1))
            else toast.error("Could not undo the save")
        }
        if (last.kind === "skip") {
            const r = await undoSkip(last.job.id)
            if (r.success) setStoredSkips((n) => Math.max(0, n - 1))
            else toast.error(r.error ?? "Could not undo that")
        }
        setBusy(false)
    }, [decided, busy, jobs.length])

    // Keys: J/K and the up/down arrows browse; S or right saves; X or left skips;
    // U undoes. Never while typing, never with a modifier (Cmd+Left must still
    // work), and never while a dialog is open over the page.
    const handlers = useRef({ next, prev, decide, undo })
    handlers.current = { next, prev, decide, undo }
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.repeat) return
            const t = e.target as HTMLElement | null
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
            if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) return
            const h = handlers.current
            const map: Record<string, () => void> = {
                ArrowDown: h.next, j: h.next,
                ArrowUp: h.prev, k: h.prev,
                ArrowRight: () => void h.decide("save"), s: () => void h.decide("save"),
                ArrowLeft: () => void h.decide("skip"), x: () => void h.decide("skip"),
                u: () => void h.undo(),
            }
            const fn = map[e.key.length === 1 ? e.key.toLowerCase() : e.key]
            if (!fn) return
            e.preventDefault()
            fn()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])

    const lastDecided = decided[decided.length - 1]

    return (
        <div className="page-frame px-page py-4">
            {/* One compact line under the jobs header (plan/ui-pass UI-11). */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    <span className="font-medium text-neutral-900 dark:text-white">Discover</span>
                    {" · "}One job at a time. Save the ones you like.
                </p>
                <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
                    <Link href="/jobs/browse">
                        <LayoutList className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">List view</span>
                    </Link>
                </Button>
            </div>

            <div className="mx-auto w-full max-w-4xl">
                {job ? (
                    <>
                        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                            <motion.div
                                key={job.id}
                                custom={direction}
                                initial={reduceMotion ? false : { opacity: 0, y: 8 * direction }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 * direction }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                            >
                                <SparkPanel
                                    job={job}
                                    position={index + 1}
                                    total={total}
                                    canPrev={index > 0}
                                    canNext={index < jobs.length - 1}
                                    onPrev={prev}
                                    onNext={next}
                                    onSave={() => void decide("save")}
                                    onSkip={() => void decide("skip")}
                                    onUndo={lastDecided ? () => void undo() : null}
                                    busy={busy}
                                />
                            </motion.div>
                        </AnimatePresence>
                        <p className="mt-3 hidden text-center text-xs text-neutral-500 lg:block dark:text-neutral-400">
                            <Key>J</Key> <Key>K</Key> or <Key>↓</Key> <Key>↑</Key> to browse · <Key>S</Key> or <Key>→</Key> save ·{" "}
                            <Key>X</Key> or <Key>←</Key> not for me · <Key>U</Key> undo
                        </p>
                    </>
                ) : loadingMore ? (
                    // The next page is on its way: its skeleton, not a loader.
                    <div aria-busy aria-label="Loading more jobs">
                        <ShimmerStyles />
                        <SparkPanelSkeleton />
                    </div>
                ) : (
                    <AllCaughtUp savedCount={savedCount} onUndo={lastDecided ? () => void undo() : null} />
                )}
            </div>
        </div>
    )
}

function Key({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-neutral-200 bg-white px-1 font-sans text-[11px] font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            {children}
        </kbd>
    )
}

function AllCaughtUp({ savedCount, onUndo }: { savedCount: number; onUndo: (() => void) | null }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900"
        >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                <PartyPopper className="h-7 w-7 text-neutral-800 dark:text-neutral-100" />
            </div>
            <h3 className="mb-1.5 text-xl font-semibold text-neutral-900 dark:text-white">You&apos;re all caught up</h3>
            <p className="mb-6 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
                You&apos;ve been through every open job.
                {savedCount > 0 && <span className="mt-1 block font-medium text-neutral-800 dark:text-neutral-100">{savedCount} saved to your list.</span>}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
                {savedCount > 0 && (
                    <Button asChild className="gap-2">
                        <Link href="/jobs/saved">View saved jobs <ArrowRight className="h-4 w-4" /></Link>
                    </Button>
                )}
                <Button asChild variant="outline" className="gap-2">
                    <Link href="/companies"><Building2 className="h-4 w-4" /> Explore companies</Link>
                </Button>
                {onUndo && (
                    <Button variant="ghost" className="gap-2" onClick={onUndo}>Undo last</Button>
                )}
                <Button variant="ghost" className="gap-2" onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </div>
        </motion.div>
    )
}
