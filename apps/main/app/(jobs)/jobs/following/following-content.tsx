"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    UserCheck, Building2, ChevronDown
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import Link from "next/link"
import { JobCard } from "../components/job-card"
import { SkillGapModal } from "../components/skill-gap-modal"
import { getFollowingFeedJobs, toggleSaveJob, type FeedJobResult } from "@/actions/jobs"
import { toast } from "@repo/ui/components/ui/sonner"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

interface FollowingContentProps {
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
            followedCompaniesCount?: number
            isEmpty?: boolean
        }
        error?: string
        requiresAuth?: boolean
    }
    isAuthenticated: boolean
}

export function FollowingContent({ initialData, isAuthenticated }: FollowingContentProps) {
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

    const isEmpty = initialData.data?.isEmpty || false
    const requiresAuth = initialData.requiresAuth || false

    const handleSaveJob = useCallback(async (jobId: string) => {
        if (!isAuthenticated) {
            toast.info("Sign in to save jobs")
            return
        }

        const result = await toggleSaveJob(jobId)
        if (result.success) {
            setJobs(prev => prev.map(j =>
                j.id === jobId ? { ...j, isSaved: result.saved ?? false } : j
            ))
            toast.success(result.saved ? "Job saved!" : "Job removed from saved")
        }
    }, [isAuthenticated])

    const handleViewDetails = useCallback((job: FeedJobResult) => {
        setSelectedJob(job)
        setShowSkillGapModal(true)
    }, [])

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return

        setLoading(true)
        const result = await getFollowingFeedJobs(page + 1, 20)

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

    // Empty state - no followed companies
    if (isEmpty) {
        return (
            <div className="page-frame px-page py-4">
                <FollowingEmptyState />
            </div>
        )
    }

    return (
        <div className="page-frame px-page py-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                            From Companies You Follow
                        </h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {total} jobs from your followed companies
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
                                onSave={handleSaveJob}
                                onViewDetails={handleViewDetails}
                                index={index}
                            />
                        ))}
                    </div>
                ) : (
                    <NoJobsState />
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
                    Showing {jobs.length} of {total} jobs
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
                Sign in to see jobs from followed companies
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-6">
                Create an account or sign in to follow companies and see their job postings here.
            </p>
            <Link href="/signin">
                <Button className="rounded-xl">
                    Sign In
                </Button>
            </Link>
        </motion.div>
    )
}

function FollowingEmptyState() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 px-4"
        >
            <div className="w-20 h-20 bg-gradient-to-br from-neutral-100 to-neutral-100 dark:from-neutral-800/30 dark:to-neutral-800/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-10 h-10 text-neutral-800 dark:text-neutral-100" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Follow companies you love
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-6">
                Follow companies you&apos;d love to work for and never miss a new opening. We&apos;ll show you jobs matched to your skills.
            </p>
            <Link href="/companies">
                <Button className="rounded-xl">
                    <Building2 className="w-4 h-4 mr-2" />
                    Discover Companies
                </Button>
            </Link>
        </motion.div>
    )
}

function NoJobsState() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 px-4"
        >
            <div className="w-20 h-20 bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-10 h-10 text-neutral-600 dark:text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                No open positions right now
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-6">
                The companies you follow don&apos;t have any active job postings at the moment. Check back later or explore more companies.
            </p>
            <Link href="/companies">
                <Button variant="outline" className="rounded-xl">
                    <Building2 className="w-4 h-4 mr-2" />
                    Explore More Companies
                </Button>
            </Link>
        </motion.div>
    )
}
