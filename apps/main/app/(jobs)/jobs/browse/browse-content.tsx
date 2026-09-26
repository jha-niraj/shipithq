"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    LayoutList, Search, Filter, ChevronDown,
    Briefcase, Sparkles
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@repo/ui/components/ui/sheet"
import Link from "next/link"
import { JobCard } from "../components/job-card"
import { SkillGapModal } from "../components/skill-gap-modal"
import { getForYouFeedJobs, toggleSaveJob, type FeedJobResult } from "@/actions/jobs"
import { toast } from "@repo/ui/components/ui/sonner"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

interface BrowseContentProps {
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
            isAuthenticated?: boolean
        }
        error?: string
    }
    isAuthenticated: boolean
}

export function BrowseContent({ initialData, isAuthenticated }: BrowseContentProps) {
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
    const [searchQuery, setSearchQuery] = useState("")
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    // Modal state
    const [selectedJob, setSelectedJob] = useState<FeedJobResult | null>(null)
    const [showSkillGapModal, setShowSkillGapModal] = useState(false)

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
        const result = await getForYouFeedJobs(page + 1, 20)

        if (result.success && result.data) {
            setJobs(prev => [...prev, ...result.data!.jobs])
            setPage(result.data.pagination.page)
            setHasMore(result.data.pagination.page < result.data.pagination.totalPages)
            setTotal(result.data.pagination.total)
        }
        setLoading(false)
    }, [loading, hasMore, page])

    return (
        // The control bar pins beneath the header, WITH space.
        //
        // Two earlier attempts got this wrong in opposite directions. First it was
        // `sticky top-[85px]` - a hand-written offset that parked it flush under
        // the header with no gap, so the two read as one tall stuck block. Then I
        // removed the sticky entirely, and it scrolled away with the list.
        //
        // What Niraj asked for both times is the same thing: stay put, and have
        // room around it. So it sticks, at the header's MEASURED height rather
        // than a guessed one (`--jobs-header-h`, published by `header-offset.tsx`),
        // and it is a floating toolbar - inset, rounded, its own border - rather
        // than a full-bleed strip welded to the bar above. The gap is what stops
        // it reading as stacked. See JB-17.
        <div>
            <div
                className="sticky z-10 px-page pt-4"
                style={{ top: "var(--jobs-header-h, 96px)" }}
            >
            <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                {/* Title, search, filters and the mode toggle on ONE row from `lg`.
                    They were three stacked rows before, which spent ~190px of a
                    scrolling page on chrome. */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
                    <div className="flex min-w-0 shrink-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                            <LayoutList className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-base font-semibold text-neutral-900 dark:text-white">
                                Browse all jobs
                            </h2>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {total} job{total !== 1 ? 's' : ''} available
                            </p>
                        </div>
                    </div>

                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
                        <Input
                            placeholder="Search jobs, companies, or skills..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 rounded-xl border-neutral-200 bg-neutral-50 pl-10 dark:border-neutral-800 dark:bg-neutral-900"
                        />
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9"
                            onClick={() => setIsFilterOpen(true)}
                        >
                            <Filter className="mr-2 h-4 w-4" />
                            Filters
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-9 gap-2">
                            <Link href="/jobs">
                                <Sparkles className="h-4 w-4" />
                                <span className="hidden sm:inline">Spark</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
            </div>

            <div className="px-page pt-5 pb-6">
            <AnimatePresence mode="popLayout">
                {jobs.length > 0 ? (
                    <div className="space-y-4">
                        {jobs.map((job, index) => (
                            <JobCard
                                key={job.id}
                                job={job}
                                onSave={handleSaveJob}
                                onViewDetails={handleViewDetails}
                                showMatchScore={isAuthenticated}
                                index={index}
                            />
                        ))}
                    </div>
                ) : (
                    <BrowseEmptyState />
                )}
            </AnimatePresence>

            </div>

            {/* PINNED to the bottom of the viewport, carrying both the count and
                Load More.
                They used to sit at the end of the list, so on a 12-job page you had
                to scroll past everything to find out how many there were or to ask
                for more. `sticky bottom-0` rather than `position: fixed`: fixed
                would anchor to the VIEWPORT and slide under the sidebar and past
                the page card's rounded edge, while sticky stays inside this column
                and respects its width. It is the last child of the scrolling
                content, so it pins while the list moves behind it. See JB-13. */}
            {jobs.length > 0 && (
                <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-neutral-200 bg-white px-page py-3 dark:border-neutral-800 dark:bg-neutral-950">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Showing <span className="font-medium text-neutral-900 tabular-nums dark:text-white">{jobs.length}</span> of {total} jobs
                    </p>
                    {hasMore && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={loadMore}
                            disabled={loading}
                        >
                            {loading ? (
                                <InlineLoader size="sm" className="mr-2" />
                            ) : (
                                <ChevronDown className="mr-2 h-4 w-4" />
                            )}
                            Load more
                        </Button>
                    )}
                </div>
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

            {/* Filter Sheet */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetContent className="w-full sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Filter Jobs</SheetTitle>
                        <SheetDescription>
                            Narrow down your job search
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-6">
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm">Filter controls coming soon...</p>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}

function BrowseEmptyState() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 px-4"
        >
            <div className="w-20 h-20 bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-10 h-10 text-neutral-600 dark:text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                No jobs available
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-6">
                There are no job postings at the moment. Explore companies to follow, or ask us to add one you&apos;d like to see.
            </p>
            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                <Button asChild variant="outline">
                    <Link href="/companies">Explore Companies</Link>
                </Button>
                {/* plan/hiring-rounds HR-7 */}
                <Button asChild variant="ghost">
                    <Link href="/companies/request">Request a company</Link>
                </Button>
            </div>
        </motion.div>
    )
}
