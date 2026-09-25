"use client"

import { motion } from "framer-motion"
import {
    Search, ClipboardList, FileText, Clock, CheckCircle2,
    ArrowRight, Briefcase, Send, Star
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Badge } from "@repo/ui/components/ui/badge"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import Link from "next/link"
import { useState } from "react"
import type { AssignmentStats, JobWithAssignment } from "@/types"

// ============================================
// TYPES
// ============================================

interface AssignmentsContentProps {
    stats: AssignmentStats | null
    jobs: JobWithAssignment[]
}

// ============================================
// JOB CARD COMPONENT
// ============================================

function JobAssignmentCard({ job }: { job: JobWithAssignment }) {
    const statusColor = {
        ACTIVE: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
        DRAFT: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
        PAUSED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
        CLOSED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    }[job.status] || "bg-neutral-100 text-neutral-600"

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">
                            {job.title}
                        </h3>
                        <Badge variant="secondary" className={`text-xs mt-1 ${statusColor}`}>
                            {job.status}
                        </Badge>
                    </div>
                </div>
                <Link href={`/assignments/${job.slug}`}>
                    <Button variant="ghost" size="sm" className="rounded-xl">
                        View <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-neutral-800 dark:text-neutral-100">
                        <Send className="w-4 h-4" />
                        <span className="font-semibold">{job.assignmentsSent}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Sent</p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-neutral-800 dark:text-neutral-100">
                        <Clock className="w-4 h-4" />
                        <span className="font-semibold">{job.pendingSubmissions}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Pending</p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-neutral-800 dark:text-neutral-100">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-semibold">{job.submissionsReceived}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Submitted</p>
                </div>
            </div>

            {
                job.assignmentDeadlineDays && (
                    <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <p className="text-sm text-neutral-500">
                            <Clock className="w-4 h-4 inline-block mr-1" />
                            {job.assignmentDeadlineDays} days deadline
                        </p>
                    </div>
                )
            }
        </motion.div>
    )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AssignmentsContent({ stats, jobs }: AssignmentsContentProps) {
    const [searchQuery, setSearchQuery] = useState("")

    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader
                title="Assignments"
                subtitle="Manage take-home assignments and track submissions"
                actions={
                    <Link href="/jobs/new">
                        <Button className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200">
                            <FileText className="w-4 h-4 mr-2" />
                            Create Job with Assignment
                        </Button>
                    </Link>
                }
            />

            {
                stats && (
                    <StatBand
                        cols={5}
                        items={[
                            { icon: Briefcase, label: "Jobs with Assignments", value: stats.totalJobsWithAssignments.toLocaleString() },
                            { icon: Send, label: "Assignments Sent", value: stats.totalAssignmentsSent.toLocaleString() },
                            { icon: CheckCircle2, label: "Submissions", value: stats.totalSubmissions.toLocaleString() },
                            { icon: Clock, label: "Pending Review", value: stats.pendingReview.toLocaleString() },
                            { icon: Star, label: "Avg. Score", value: `${Math.round(stats.averageScore)}%` },
                        ]}
                    />
                )
            }

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                        placeholder="Search jobs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                    />
                </div>
            </div>

            {
                filteredJobs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {
                            filteredJobs.map((job) => (
                                <JobAssignmentCard key={job.id} job={job} />
                            ))
                        }
                    </div>
                ) : jobs.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-6">
                            <ClipboardList className="w-10 h-10 text-neutral-400" />
                        </div>
                        <h3 className="font-bold text-xl text-neutral-900 dark:text-white mb-2">
                            No jobs with assignments
                        </h3>
                        <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                            Create a job posting with an assignment to start evaluating candidates&apos; technical skills.
                        </p>
                        <Link href="/jobs/new">
                            <Button className="rounded-xl">
                                Create Job with Assignment
                            </Button>
                        </Link>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-6">
                            <Search className="w-10 h-10 text-neutral-400" />
                        </div>
                        <h3 className="font-bold text-xl text-neutral-900 dark:text-white mb-2">
                            No results found
                        </h3>
                        <p className="text-neutral-500 max-w-md mx-auto">
                            No jobs match your search query. Try a different search term.
                        </p>
                    </motion.div>
                )
            }

            <div className="p-6 bg-neutral-50 dark:bg-neutral-900 rounded-2xl">
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-3">
                    How Assessments Work
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center shrink-0 text-neutral-800 dark:text-neutral-100">
                            1
                        </div>
                        <div>
                            <p className="font-medium text-neutral-900 dark:text-white">Create Job with Assignment</p>
                            <p className="text-sm text-neutral-500 mt-1">
                                Add assignment details when creating a job posting.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center shrink-0 text-neutral-800 dark:text-neutral-100">
                            2
                        </div>
                        <div>
                            <p className="font-medium text-neutral-900 dark:text-white">Send to Shortlisted Candidates</p>
                            <p className="text-sm text-neutral-500 mt-1">
                                After reviewing applications, send assignments to promising candidates.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center shrink-0 text-neutral-800 dark:text-neutral-100">
                            3
                        </div>
                        <div>
                            <p className="font-medium text-neutral-900 dark:text-white">Review & Score Submissions</p>
                            <p className="text-sm text-neutral-500 mt-1">
                                Evaluate submissions and provide feedback to candidates.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}