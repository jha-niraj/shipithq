"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    LayoutList, PartyPopper,
    Building2, RefreshCw, ArrowRight
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import Link from "next/link"
import { SwipeStack } from "../components/swipe-card"
import { SkillGapModal } from "../components/skill-gap-modal"
import { recordSwipeAction, getSparkJobs } from "@/actions/jobs/tabs"
import { toggleSaveJob, type FeedJobResult } from "@/actions/jobs"
import { toast } from "@repo/ui/components/ui/sonner"
import { ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { SparkDeckSkeleton } from "../components/spark-skeleton"

interface SparkContentProps {
    initialJobs: FeedJobResult[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    } | null
    isAuthenticated: boolean
}

type SwipedJob = FeedJobResult & { swipeDirection: "left" | "right" }

export function SparkContent({ initialJobs, pagination, isAuthenticated }: SparkContentProps) {
    const [jobs, setJobs] = useState<FeedJobResult[]>(initialJobs)
    const [swipedJobs, setSwipedJobs] = useState<SwipedJob[]>([])
    const [lastSwipedJob, setLastSwipedJob] = useState<FeedJobResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(pagination?.page || 1)
    const [hasMore, setHasMore] = useState(
        pagination ? pagination.page < pagination.totalPages : false
    )

    // Modal states
    const router = useRouter()
    const [selectedJob, setSelectedJob] = useState<FeedJobResult | null>(null)
    const [showSkillGapModal, setShowSkillGapModal] = useState(false)

    const handleSwipeLeft = useCallback(async (job: FeedJobResult) => {
        // Remove from current jobs
        setJobs(prev => prev.filter(j => j.id !== job.id))
        setSwipedJobs(prev => [...prev, { ...job, swipeDirection: "left" as const }])
        setLastSwipedJob(job)

        // Record the swipe (skip action)
        if (isAuthenticated) {
            await recordSwipeAction(job.id, "left")
        }
    }, [isAuthenticated])

    const handleSwipeRight = useCallback(async (job: FeedJobResult) => {
        // Remove from current jobs
        setJobs(prev => prev.filter(j => j.id !== job.id))
        setSwipedJobs(prev => [...prev, { ...job, swipeDirection: "right" as const }])
        setLastSwipedJob(job)
        setSelectedJob(job)

        // NO modal.
        //
        // A "Great Choice!" dialog fired on every right swipe, which stops the one
        // gesture this screen exists for: swipe, dialog, dismiss, swipe, dialog.
        // The deck is meant to be flicked through. A toast says the same thing
        // without taking the pointer away, and the Undo button beside the stack is
        // the real recovery path. Niraj, 2026-08-29. See JB-12.
        if (isAuthenticated) {
            await recordSwipeAction(job.id, "right")
            toast.success(`Saved ${job.title}`, {
                description: job.company.name,
                action: { label: "View saved", onClick: () => router.push("/jobs/saved") },
            })
        } else {
            toast.info("Sign in to save jobs you're interested in")
        }
    }, [isAuthenticated])

    const handleSave = useCallback(async (job: FeedJobResult) => {
        if (!isAuthenticated) {
            toast.info("Sign in to save jobs")
            return
        }

        const result = await toggleSaveJob(job.id)
        if (result.success) {
            setJobs(prev => prev.map(j => 
                j.id === job.id ? { ...j, isSaved: result.saved ?? false } : j
            ))
            toast.success(result.saved ? "Job saved!" : "Job removed from saved")
        }
    }, [isAuthenticated])

    const handleViewDetails = useCallback((job: FeedJobResult) => {
        setSelectedJob(job)
        setShowSkillGapModal(true)
    }, [])

    const handleUndo = useCallback(() => {
        if (lastSwipedJob) {
            setJobs(prev => [lastSwipedJob, ...prev])
            setSwipedJobs(prev => prev.filter(j => j.id !== lastSwipedJob.id))
            setLastSwipedJob(null)
        }
    }, [lastSwipedJob])

    const loadMoreJobs = useCallback(async () => {
        if (loading || !hasMore) return

        setLoading(true)
        const result = await getSparkJobs(page + 1, 20)
        
        if (result.success && result.data) {
            setJobs(prev => [...prev, ...(result.data!.jobs as unknown as FeedJobResult[])])
            setPage(result.data.pagination.page)
            setHasMore(result.data.pagination.page < result.data.pagination.totalPages)
        }
        setLoading(false)
    }, [loading, hasMore, page])

    // Check if we need to load more jobs
    if (jobs.length < 5 && hasMore && !loading) {
        loadMoreJobs()
    }

    return (
        // overflow-x-clip below lg: the fanned cards behind the top one lean past the
        // column and made the whole page scroll sideways on a phone (UI-17). `clip`,
        // not `hidden`, so it is not a scroll container and nothing vertical is cut;
        // not on lg+, where the frame sits inside the window and a swiped card
        // flying out would be cut at the frame's edge.
        <div className="page-frame px-page py-4 max-lg:overflow-x-clip">
            {/* One compact line under the jobs header (plan/ui-pass UI-11), not a
                second icon-tile header. */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    <span className="font-medium text-neutral-900 dark:text-white">Discover</span>
                    {" · "}Swipe right on jobs you like
                </p>
                <Link href="/jobs/browse">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
                        <LayoutList className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">List view</span>
                    </Button>
                </Link>
            </div>

            {/* Swipe Area */}
            <AnimatePresence mode="wait">
                {jobs.length > 0 ? (
                    <motion.div
                        key="swipe-stack"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center"
                    >
                        <SwipeStack
                            jobs={jobs}
                            onSwipeLeft={handleSwipeLeft}
                            onSwipeRight={handleSwipeRight}
                            onSave={handleSave}
                            onViewDetails={handleViewDetails}
                            onUndo={handleUndo}
                            lastSwipedJob={lastSwipedJob}
                        />

                        {/* Stats */}
                        <div className="mt-8 text-center">
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                {jobs.length} jobs remaining
                                {swipedJobs.length > 0 && ` • ${swipedJobs.filter(j => j.swipeDirection === "right").length} interested`}
                            </p>
                        </div>
                    </motion.div>
                ) : loading ? (
                    // The next card is on its way: its skeleton, not a loader (UI-12).
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} aria-busy aria-label="Loading more jobs">
                        <ShimmerStyles />
                        <SparkDeckSkeleton />
                    </motion.div>
                ) : (
                    <AllCaughtUpState 
                        interestedCount={swipedJobs.filter(j => j.swipeDirection === "right").length}
                        onRefresh={() => window.location.reload()}
                    />
                )}
            </AnimatePresence>

            {/* Skill Gap Modal */}
            <SkillGapModal
                job={selectedJob}
                open={showSkillGapModal}
                onClose={() => {
                    setShowSkillGapModal(false)
                    setSelectedJob(null)
                }}
            />

        </div>
    )
}

function AllCaughtUpState({ 
    interestedCount,
    onRefresh 
}: { 
    interestedCount: number
    onRefresh: () => void 
}) {
    return (
        <motion.div
            key="caught-up"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 px-4 text-center"
        >
            <div className="w-24 h-24 bg-gradient-to-br from-neutral-100 to-neutral-100 dark:from-neutral-800/30 dark:to-neutral-800/30 rounded-3xl flex items-center justify-center mb-6">
                <PartyPopper className="w-12 h-12 text-neutral-800 dark:text-neutral-100" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                You&apos;re All Caught Up!
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
                You&apos;ve reviewed all available jobs. 
                {interestedCount > 0 && (
                    <span className="block mt-1 text-neutral-800 dark:text-neutral-100 font-medium">
                        {interestedCount} jobs saved to your list!
                    </span>
                )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
                {interestedCount > 0 && (
                    <Link href="/jobs/saved">
                        <Button className="rounded-xl gap-2">
                            View Saved Jobs
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                )}
                <Link href="/companies">
                    <Button variant="outline" className="rounded-xl gap-2">
                        <Building2 className="w-4 h-4" />
                        Explore Companies
                    </Button>
                </Link>
                <Button 
                    variant="ghost" 
                    className="rounded-xl gap-2"
                    onClick={onRefresh}
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </Button>
            </div>
        </motion.div>
    )
}
