"use client"

import { useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Search, MoreVertical, Briefcase, MapPin, Clock, Users,
    Eye, Pause, Play, Copy, Trash2, Edit, ExternalLink,
    CheckCircle, LayoutGrid, List
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmDialog } from "@repo/ui/components/ui/confirm-dialog"
import { Input } from "@repo/ui/components/ui/input"
import { Badge } from "@repo/ui/components/ui/badge"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from "@repo/ui/components/ui/dropdown-menu"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select"
import Link from "next/link"
import {
    publishJob, pauseJob, duplicateJob, deleteJob
} from "@/actions/jobs"
import { toast } from "@repo/ui/components/ui/sonner"
import type { JobStats, Job } from "@/types"
import { publicJobUrl } from "@/lib/urls"

// View-specific types for job list display
type InterviewRoundView = {
    id: string
    roundNumber: number
    roundType: string
    title: string
}

type InterviewProcessView = {
    id: string
    name: string
    rounds: InterviewRoundView[]
}

type JobWithProcess = Pick<
    Job,
    'id' | 'title' | 'slug' | 'status' | 'locationType' | 'employmentType' |
    'location' | 'viewsCount' | 'applicationsCount' | 'createdAt' | 'publishedAt'
> & {
    interviewProcess?: InterviewProcessView | null
    [key: string]: unknown
}

interface JobsContentProps {
    initialJobs: JobWithProcess[]
    stats: JobStats | null
    interviewProcesses: InterviewProcessView[]
}

 
export function JobsContent({ initialJobs, stats, interviewProcesses: _interviewProcesses }: JobsContentProps) {
    const [jobs, setJobs] = useState(initialJobs)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [viewMode, setViewMode] = useState<"list" | "grid">("list")
    const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null)
    const [isPending, startTransition] = useTransition()

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === "all" || job.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const handlePublish = async (jobId: string) => {
        startTransition(async () => {
            const result = await publishJob(jobId)
            if (result.success) {
                setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "ACTIVE" } : j))
                toast.success("Job published successfully")
            } else {
                toast.error(result.error || "Failed to publish job")
            }
        })
    }

    const handlePause = async (jobId: string) => {
        startTransition(async () => {
            const result = await pauseJob(jobId)
            if (result.success) {
                setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "PAUSED" } : j))
                toast.success("Job paused")
            } else {
                toast.error(result.error || "Failed to pause job")
            }
        })
    }

    const handleDuplicate = async (jobId: string) => {
        startTransition(async () => {
            const result = await duplicateJob(jobId)
            if (result.success && result.data) {
                setJobs(prev => [result.data as unknown as JobWithProcess, ...prev])
                toast.success("Job duplicated successfully")
            } else {
                toast.error(result.error || "Failed to duplicate job")
            }
        })
    }

    const handleDelete = async (jobId: string) => {
        startTransition(async () => {
            const result = await deleteJob(jobId)
            if (result.success) {
                setJobs(prev => prev.filter(j => j.id !== jobId))
                toast.success("Job deleted")
            } else {
                toast.error(result.error || "Failed to delete job")
            }
        })
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            ACTIVE: "bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100",
            PAUSED: "bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100",
            DRAFT: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400",
            CLOSED: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
            FILLED: "bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100"
        }
        return styles[status] || styles.DRAFT
    }

    const getEmploymentTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            FULL_TIME: "Full-time",
            PART_TIME: "Part-time",
            CONTRACT: "Contract",
            INTERNSHIP: "Internship",
            FREELANCE: "Freelance"
        }
        return labels[type] || type
    }

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader
                title="Jobs"
                subtitle="Every job you've posted, with its pipeline and results."
                actions={
                    <Button asChild size="sm" className="gap-1.5">
                        <Link href="/jobs/new"><Plus className="h-4 w-4" /> New job</Link>
                    </Button>
                }
            />

            {
                stats && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <StatBand
                            cols={6}
                            items={[
                                { icon: Briefcase, label: "Jobs", value: stats.total },
                                { icon: CheckCircle, label: "Active", value: stats.active },
                                { icon: Pause, label: "Paused", value: stats.paused },
                                { icon: Edit, label: "Drafts", value: stats.draft },
                                { icon: Eye, label: "Views", value: stats.totalViews },
                                { icon: Users, label: "Results received", value: stats.totalApplications },
                            ]}
                        />
                    </motion.div>
                )
            }

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                        placeholder="Search jobs"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px] rounded-xl">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="PAUSED">Paused</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`rounded-lg ${viewMode === "list" ? "bg-white dark:bg-neutral-800 shadow-sm" : ""}`}
                        onClick={() => setViewMode("list")}
                    >
                        <List className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`rounded-lg ${viewMode === "grid" ? "bg-white dark:bg-neutral-800 shadow-sm" : ""}`}
                        onClick={() => setViewMode("grid")}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {
                filteredJobs.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}
                    >
                        <AnimatePresence>
                            {
                                filteredJobs.map((job, index) => (
                                    <motion.div
                                        key={job.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                    <Link href={`/jobs/${job.slug}/edit`} className="min-w-0">
                                                        <h3 className="font-bold text-lg text-neutral-900 dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors truncate">
                                                            {job.title}
                                                        </h3>
                                                    </Link>
                                                    <Badge className={`${getStatusBadge(job.status)} shrink-0`}>
                                                        {job.status.charAt(0) + job.status.slice(1).toLowerCase()}
                                                    </Badge>
                                                    {/* Hidden by an admin after a report (HR-24): students can't see it, and it can't be republished. */}
                                                    {Boolean(job.adminHiddenAt) && (
                                                        <Badge variant="outline" className="shrink-0" title="ShipItHQ hid this job after a report. Write to support@shipithq.com.">Hidden by ShipItHQ</Badge>
                                                    )}
                                                    {
                                                        job.interviewProcess && (
                                                            <Badge variant="outline" className="shrink-0">
                                                                {job.interviewProcess.rounds?.length || 0} rounds
                                                            </Badge>
                                                        )
                                                    }
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-sm text-neutral-500">
                                                    {
                                                        job.location && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="w-4 h-4" />
                                                                {job.location}
                                                            </span>
                                                        )
                                                    }
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {getEmploymentTypeLabel(job.employmentType)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Eye className="w-4 h-4" />
                                                        {job.viewsCount} views
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-4 h-4" />
                                                        {job.applicationsCount} {job.applicationsCount === 1 ? "result" : "results"}
                                                    </span>
                                                </div>
                                                {
                                                    job.publishedAt && (
                                                        <p className="text-xs text-neutral-400 mt-2">
                                                            Published {new Date(job.publishedAt).toLocaleDateString()}
                                                        </p>
                                                    )
                                                }
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/jobs/${job.slug}/edit`} className="flex items-center">
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            Edit job
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <a href={publicJobUrl(job.slug)} target="_blank" rel="noopener noreferrer" className="flex items-center">
                                                            <ExternalLink className="w-4 h-4 mr-2" />
                                                            View as candidates see it
                                                        </a>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {
                                                        job.status === "DRAFT" && (
                                                            <DropdownMenuItem onClick={() => handlePublish(job.id)} disabled={isPending}>
                                                                <Play className="w-4 h-4 mr-2" />
                                                                Publish job
                                                            </DropdownMenuItem>
                                                        )
                                                    }
                                                    {
                                                        job.status === "ACTIVE" && (
                                                            <DropdownMenuItem onClick={() => handlePause(job.id)} disabled={isPending}>
                                                                <Pause className="w-4 h-4 mr-2" />
                                                                Pause job
                                                            </DropdownMenuItem>
                                                        )
                                                    }
                                                    {
                                                        job.status === "PAUSED" && (
                                                            <DropdownMenuItem onClick={() => handlePublish(job.id)} disabled={isPending}>
                                                                <Play className="w-4 h-4 mr-2" />
                                                                Resume job
                                                            </DropdownMenuItem>
                                                        )
                                                    }
                                                    <DropdownMenuItem onClick={() => handleDuplicate(job.id)} disabled={isPending}>
                                                        <Copy className="w-4 h-4 mr-2" />
                                                        Duplicate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => setPendingDelete(job)}
                                                        disabled={isPending}
                                                        className="text-rose-600 focus:text-rose-600"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete job
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </motion.div>
                                ))
                            }
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-6">
                            <Briefcase className="w-10 h-10 text-neutral-400" />
                        </div>
                        <h3 className="font-bold text-xl text-neutral-900 dark:text-white mb-2">
                            {search || statusFilter !== "all" ? "No jobs match your filters" : "No jobs posted yet"}
                        </h3>
                        <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                            {
                                search || statusFilter !== "all"
                                    ? "Try adjusting your search or filter criteria"
                                    : "Post your first job. Candidates take its rounds on ShipItHQ, and the ones who clear them send you their results."
                            }
                        </p>
                        {
                            !search && statusFilter === "all" && (
                                <Button asChild size="sm" className="gap-1.5">
                                    <Link href="/jobs/new"><Plus className="h-4 w-4" /> Post your first job</Link>
                                </Button>
                            )
                        }
                    </motion.div>
                )
            }
            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => { if (!open) setPendingDelete(null) }}
                title="Delete this job?"
                description={`${pendingDelete?.title ? `"${pendingDelete.title}"` : "The job"} and its posting are deleted, and candidates can no longer see it. This cannot be undone.`}
                confirmLabel="Delete job"
                tone="danger"
                onConfirm={() => { if (pendingDelete) void handleDelete(pendingDelete.id) }}
            />
        </div>
    )
}