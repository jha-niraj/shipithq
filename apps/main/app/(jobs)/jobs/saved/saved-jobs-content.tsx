"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Bookmark, ChevronDown, UserCheck,
    Sparkles
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import Link from "next/link"
import { JobCard } from "../components/job-card"
import { SkillGapModal } from "../components/skill-gap-modal"
import { getSavedFeedJobs, toggleSaveJob, type FeedJobResult } from "@/actions/jobs"
import { toast } from "@repo/ui/components/ui/sonner"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

interface SavedJobsContentProps {
    initialData: {
        success: boolean
        data?: {
            jobs: FeedJobResult[]
            pagination: {
                page: number
                limit: number
                total: number
                totalPages: number
            }
        }
        error?: string
        requiresAuth?: boolean
    }
    isAuthenticated: boolean
}

export function SavedJobsContent({ initialData, isAuthenticated }: SavedJobsContentProps) {
    const [jobs, setJobs] = useState<FeedJobResult[]>(
        initialData.success && initialData.data ? initialData.data.jobs : []
    )
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(
        initialData.success && initialData.data
            ? initialData.data.pagination.page < initialData.data.pagination.totalPages
            : false
    )
    const [total, setTotal] = useState(
        initialData.success && initialData.data ? initialData.data.pagination.total : 0
    )

    // Modal state
    const [selectedJob, setSelectedJob] = useState<FeedJobResult | null>(null)
    const [showSkillGapModal, setShowSkillGapModal] = useState(false)

    const requiresAuth = initialData.requiresAuth || false

    const handleUnsaveJob = useCallback(async (jobId: string) => {
        const result = await toggleSaveJob(jobId)
        if (result.success && !result.saved) {
            setJobs(prev => prev.filter(j => j.id !== jobId))
            setTotal(prev => prev - 1)
            toast.success("Job removed from saved")
        }
    }, [])

    const handleViewDetails = useCallback((job: FeedJobResult) => {
        setSelectedJob(job)
        setShowSkillGapModal(true)
    }, [])

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return

        setLoading(true)
        const result = await getSavedFeedJobs(page + 1, 20)

        if (result.success && result.data) {
            setJobs(prev => [...prev, ...result.data!.jobs])
            setPage(result.data.pagination.page)
            setHasMore(result.data.pagination.page < result.data.pagination.totalPages)
            setTotal(result.data.pagination.total)
        }
        setLoading(false)
    }, [loading, hasMore, page])

    // Not authenticated state
    if (requiresAuth || !isAuthenticated) {
        return (
            <div className="page-frame px-page py-4">
                <AuthRequiredState />
            </div>
        )
    }

    return (
        <div className="page-frame px-page py-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
                        <Bookmark className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                            Saved Jobs
                        </h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {total} job{total !== 1 ? 's' : ''} saved for later
                        </p>
                    </div>
                </div>
            </div>

            {/* Jobs List */}
            <AnimatePresence mode="popLayout">
                {jobs.length > 0 ? (
                    <div className="space-y-4">
                        {jobs.map((job, index) => (
                            <JobCard
                                key={job.id}
                                job={job}
                                onSave={handleUnsaveJob}
                                onViewDetails={handleViewDetails}
                                index={index}
                            />
                        ))}
                    </div>
                ) : (
                    <SavedEmptyState />
                )}
            </AnimatePresence>

            {/* Load More */}
            {hasMore && (
                <div className="mt-8 text-center">
                    <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={loadMore}
                        disabled={loading}
                    >
                        {loading ? (
                            <InlineLoader size="sm" className="mr-2" />
                        ) : (
                            <ChevronDown className="w-4 h-4 mr-2" />
                        )}
                        Load More
                    </Button>
                </div>
            )}

            {/* Count */}
            {jobs.length > 0 && (
                <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-4">
                    Showing {jobs.length} of {total} saved jobs
                </p>
            )}

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

function AuthRequiredState() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 px-4"
        >
            <div className="w-20 h-20 bg-gradient-to-br from-neutral-100 to-pink-100 dark:from-neutral-800/30 dark:to-pink-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <UserCheck className="w-10 h-10 text-neutral-800 dark:text-neutral-100" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Sign in to see your saved jobs
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-6">
                Create an account or sign in to save jobs and access them later.
            </p>
            <Link href="/signin">
                <Button className="rounded-xl">
                    Sign In
                </Button>
            </Link>
        </motion.div>
    )
}

function SavedEmptyState() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 px-4"
        >
            <div className="w-20 h-20 bg-gradient-to-br from-neutral-100 to-neutral-100 dark:from-neutral-800/30 dark:to-neutral-800/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Bookmark className="w-10 h-10 text-neutral-800 dark:text-neutral-100" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                No saved jobs yet
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-6">
                Swipe right on jobs you like or click the bookmark icon to save them for later.
            </p>
            <Link href="/jobs">
                <Button className="rounded-xl">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Discover Jobs
                </Button>
            </Link>
        </motion.div>
    )
}
