"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { format } from "date-fns"
import Link from "next/link"
import {
    ArrowLeft, Search, Filter, MoreHorizontal, Calendar, FileText,
    ExternalLink, ChevronLeft, ChevronRight
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Badge } from "@repo/ui/components/ui/badge"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger
} from "@repo/ui/components/ui/dropdown-menu"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select"
import type {
    PaginatedApplications, ApplicationListItem, ApplicationFilters
} from "@/actions/applications"
import { 
    getApplications, getApplicationDetail 
} from "@/actions/applications"
import type { ApplicationDetail } from "@/actions/applications"
import type { ApplicationStatus } from "@/types"
import { ApplicationDetailSheet } from "./application-detail-sheet"
import Image from "next/image"

interface JobApplicationsContentProps {
    job: {
        id: string
        title: string
        slug: string
    }
    initialApplications: PaginatedApplications
    initialFilters: ApplicationFilters
}

const statusConfig: Record<string, { label: string; color: string }> = {
    INTERESTED: { label: "Interested", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
    PREPARING: { label: "Preparing", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    APPLIED: { label: "Applied", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    UNDER_REVIEW: { label: "Under Review", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    SHORTLISTED: { label: "Shortlisted", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    ASSIGNMENT_SENT: { label: "Assignment Sent", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    ASSIGNMENT_SUBMITTED: { label: "Assignment Done", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    INTERVIEW_SCHEDULED: { label: "Interview Set", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    INTERVIEWED: { label: "Interviewed", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    OFFER_EXTENDED: { label: "Offer Extended", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    HIRED: { label: "Hired", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    WITHDRAWN: { label: "Withdrawn", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400" },
}

export function JobApplicationsContent({
    job,
    initialApplications,
    initialFilters
}: JobApplicationsContentProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [applications, setApplications] = useState(initialApplications)
    const [filters, setFilters] = useState(initialFilters)
    const [searchQuery, setSearchQuery] = useState(initialFilters.search || "")
    const [selectedStatus, setSelectedStatus] = useState<string>(initialFilters.status?.[0] || "all")

    // Detail sheet state
    const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)
    const [applicationDetail, setApplicationDetail] = useState<ApplicationDetail | null>(null)
    const [isLoadingDetail, setIsLoadingDetail] = useState(false)

    const updateURL = (newFilters: ApplicationFilters, page: number = 1) => {
        const params = new URLSearchParams()
        if (page > 1) params.set("page", String(page))
        if (newFilters.status?.length) params.set("status", newFilters.status.join(","))
        if (newFilters.search) params.set("search", newFilters.search)

        const queryString = params.toString()
        router.push(`/applications/${job.slug}${queryString ? `?${queryString}` : ""}`)
    }

    const handleSearch = () => {
        const newFilters = { ...filters, search: searchQuery || undefined }
        setFilters(newFilters)
        startTransition(async () => {
            const result = await getApplications(job.slug, 1, 25, newFilters)
            if (result.success && result.data) {
                setApplications(result.data)
            }
        })
        updateURL(newFilters)
    }

    const handleStatusFilter = (status: string) => {
        setSelectedStatus(status)
        const newFilters = {
            ...filters,
            status: status === "all" ? undefined : [status as ApplicationStatus]
        }
        setFilters(newFilters)
        startTransition(async () => {
            const result = await getApplications(job.slug, 1, 25, newFilters)
            if (result.success && result.data) {
                setApplications(result.data)
            }
        })
        updateURL(newFilters)
    }

    const handlePageChange = (page: number) => {
        startTransition(async () => {
            const result = await getApplications(job.slug, page, 25, filters)
            if (result.success && result.data) {
                setApplications(result.data)
            }
        })
        updateURL(filters, page)
    }

    const openApplicationDetail = async (applicationId: string) => {
        setSelectedApplicationId(applicationId)
        setIsLoadingDetail(true)

        const result = await getApplicationDetail(applicationId)
        if (result.success && result.data) {
            setApplicationDetail(result.data)
        }
        setIsLoadingDetail(false)
    }

    const closeDetail = () => {
        setSelectedApplicationId(null)
        setApplicationDetail(null)
    }

    const handleApplicationUpdated = () => {
        // Refresh the list after an action
        startTransition(async () => {
            const result = await getApplications(job.slug, applications.page, 25, filters)
            if (result.success && result.data) {
                setApplications(result.data)
            }
        })
    }

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <Link href="/applications" className="inline-block">
                <Button variant="ghost" size="sm" className="-ml-2">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Applications
                </Button>
            </Link>
            <PageHeader
                title={job.title}
                subtitle={`${applications.total} application${applications.total !== 1 ? "s" : ""} total`}
            />
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-10 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                    />
                </div>
                <Select value={selectedStatus} onValueChange={handleStatusFilter}>
                    <SelectTrigger className="w-[180px] rounded-xl">
                        <Filter className="w-4 h-4 mr-2 text-neutral-400" />
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="APPLIED">Applied</SelectItem>
                        <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                        <SelectItem value="SHORTLISTED">Shortlisted</SelectItem>
                        <SelectItem value="INTERVIEW_SCHEDULED">Interview Scheduled</SelectItem>
                        <SelectItem value="INTERVIEWED">Interviewed</SelectItem>
                        <SelectItem value="OFFER_EXTENDED">Offer Extended</SelectItem>
                        <SelectItem value="HIRED">Hired</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-sm font-medium text-neutral-500">
                    <div className="col-span-4">Candidate</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Applied</div>
                    <div className="col-span-2">Match Score</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                {
                    isPending ? (
                        <div className="divide-y divide-neutral-200 dark:divide-neutral-800" aria-busy="true">
                            <ShimmerStyles />
                            {
                                Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4">
                                        <div className="md:col-span-4 flex items-center gap-3">
                                            <Shimmer className="h-10 w-10 shrink-0 rounded-full" delay={i * 0.04} />
                                            <div className="flex-1 space-y-1.5">
                                                <Shimmer className="h-4 w-32" delay={i * 0.04} />
                                                <Shimmer className="h-4 w-44" delay={i * 0.04} />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 flex items-center"><Shimmer className="h-5 w-20 rounded-full" delay={i * 0.04} /></div>
                                        <div className="md:col-span-2 flex items-center"><Shimmer className="h-4 w-24" delay={i * 0.04} /></div>
                                        <div className="md:col-span-2 flex items-center"><Shimmer className="h-2 w-20 rounded-full" delay={i * 0.04} /></div>
                                        <div className="md:col-span-2 flex items-center justify-end"><Shimmer className="h-8 w-8 rounded-md" delay={i * 0.04} /></div>
                                    </div>
                                ))
                            }
                        </div>
                    ) : applications.applications.length > 0 ? (
                        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {
                                applications.applications.map((application) => (
                                    <ApplicationRow
                                        key={application.id}
                                        application={application}
                                        onSelect={() => openApplicationDetail(application.id)}
                                    />
                                ))
                            }
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-neutral-400" />
                            </div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                                No applications found
                            </h3>
                            <p className="text-sm text-neutral-500">
                                {
                                    filters.search || filters.status
                                        ? "Try adjusting your filters"
                                        : "No one has applied to this position yet"
                                }
                            </p>
                        </div>
                    )
                }
            </div>

            {
                applications.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-neutral-500">
                            Showing {((applications.page - 1) * applications.pageSize) + 1} to{" "}
                            {Math.min(applications.page * applications.pageSize, applications.total)} of{" "}
                            {applications.total} results
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(applications.page - 1)}
                                disabled={applications.page === 1 || isPending}
                                className="rounded-lg"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                Page {applications.page} of {applications.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(applications.page + 1)}
                                disabled={applications.page === applications.totalPages || isPending}
                                className="rounded-lg"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )
            }

            <ApplicationDetailSheet
                isOpen={!!selectedApplicationId}
                onClose={closeDetail}
                application={applicationDetail}
                isLoading={isLoadingDetail}
                onUpdated={handleApplicationUpdated}
            />
        </div>
    )
}

// Individual row component
function ApplicationRow({
    application,
    onSelect
}: {
    application: ApplicationListItem
    onSelect: () => void
}) {
    const status = statusConfig[application.status] ?? { label: application.status, color: "bg-gray-100 text-gray-700" }
    const initials = application.candidateName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer transition-colors"
            onClick={onSelect}
        >
            <div className="md:col-span-4 flex items-center gap-3">
                {
                    application.candidateImage ? (
                        <Image
                            src={application.candidateImage}
                            alt={application.candidateName}
                            className="w-10 h-10 rounded-full object-cover"
                            fill
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center">
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                                {initials}
                            </span>
                        </div>
                    )
                }
                <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                        {application.candidateName}
                    </p>
                    <p className="text-sm text-neutral-500">{application.candidateEmail}</p>
                </div>
            </div>
            <div className="md:col-span-2 flex items-center">
                <Badge className={status.color}>
                    {status.label}
                </Badge>
            </div>
            <div className="md:col-span-2 flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                <Calendar className="w-4 h-4 mr-2 text-neutral-400" />
                {
                    application.appliedAt
                        ? format(application.appliedAt, "MMM d, yyyy")
                        : "N/A"
                }
            </div>
            <div className="md:col-span-2 flex items-center">
                {
                    application.matchScore ? (
                        <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${application.matchScore >= 80 ? "bg-neutral-900" :
                                            application.matchScore >= 60 ? "bg-neutral-900" : "bg-red-500"
                                        }`}
                                    style={{ width: `${application.matchScore}%` }}
                                />
                            </div>
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                {application.matchScore}%
                            </span>
                        </div>
                    ) : (
                        <span className="text-sm text-neutral-400">Not scored</span>
                    )
                }
            </div>
            <div className="md:col-span-2 flex items-center justify-end">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(); }}>
                            View Details
                        </DropdownMenuItem>
                        {
                            application.resumeUrl && (
                                <DropdownMenuItem asChild>
                                    <Link href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
                                        View Resume
                                        <ExternalLink className="w-3 h-3 ml-2" />
                                    </Link>
                                </DropdownMenuItem>
                            )
                        }
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </motion.div>
    )
}