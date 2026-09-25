"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
    Users, Briefcase, Clock, CheckCircle, XCircle, TrendingUp,
    FileText, ChevronRight, Search
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Badge } from "@repo/ui/components/ui/badge"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import type {
    ApplicationStats, JobApplicationStats
} from "@/actions/applications"

interface ApplicationsContentProps {
    stats: ApplicationStats | null
    jobStats: JobApplicationStats[]
}

const statCards = [
    { key: "total", label: "Total Applications", icon: Users },
    { key: "new", label: "New", icon: Clock },
    { key: "shortlisted", label: "Shortlisted", icon: CheckCircle },
    { key: "rejected", label: "Rejected", icon: XCircle }
] as const

export function ApplicationsContent({ stats, jobStats }: ApplicationsContentProps) {
    const [searchQuery, setSearchQuery] = useState("")

    const filteredJobs = jobStats.filter(job =>
        job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader
                title="Applications"
                subtitle="Review and manage job applications across all positions"
            />

            {
                stats && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <StatBand
                            cols={4}
                            items={statCards.map((stat) => ({
                                key: stat.key,
                                icon: stat.icon,
                                label: stat.label,
                                value: stats[stat.key as keyof ApplicationStats],
                                hint: stat.key === "new" && stats.thisWeek > 0 ? (
                                    <span className="inline-flex items-center gap-0.5">
                                        <TrendingUp className="w-3 h-3" />
                                        +{stats.thisWeek} this week
                                    </span>
                                ) : undefined,
                            }))}
                        />
                    </motion.div>
                )
            }

            <div>
                <div className="relative max-w-md">
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
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                            Applications by Job
                        </h2>
                        {
                            filteredJobs.map((job, index) => (
                                <motion.div
                                    key={job.jobId}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Link href={`/applications/${job.jobSlug}`}>
                                        <div className="bg-white dark:bg-neutral-950 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors cursor-pointer">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center">
                                                        <Briefcase className="w-6 h-6 text-neutral-800 dark:text-neutral-100" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-neutral-900 dark:text-white">
                                                            {job.jobTitle}
                                                        </h3>
                                                        <p className="text-sm text-neutral-500">
                                                            {job.total} total application{job.total !== 1 ? "s" : ""}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="hidden sm:flex items-center gap-2">
                                                        {
                                                            job.new > 0 && (
                                                                <Badge className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100">
                                                                    {job.new} new
                                                                </Badge>
                                                            )
                                                        }
                                                        {
                                                            job.shortlisted > 0 && (
                                                                <Badge className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100">
                                                                    {job.shortlisted} shortlisted
                                                                </Badge>
                                                            )
                                                        }
                                                        {
                                                            job.interviewing > 0 && (
                                                                <Badge className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100">
                                                                    {job.interviewing} interviewing
                                                                </Badge>
                                                            )
                                                        }
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-neutral-400" />
                                                </div>
                                            </div>

                                            {
                                                job.total > 0 && (
                                                    <div className="mt-4 flex h-2 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                                                        {
                                                            job.new > 0 && (
                                                                <div
                                                                    className="bg-neutral-900"
                                                                    style={{ width: `${(job.new / job.total) * 100}%` }}
                                                                />
                                                            )
                                                        }
                                                        {
                                                            job.underReview > 0 && (
                                                                <div
                                                                    className="bg-neutral-900"
                                                                    style={{ width: `${(job.underReview / job.total) * 100}%` }}
                                                                />
                                                            )
                                                        }
                                                        {
                                                            job.shortlisted > 0 && (
                                                                <div
                                                                    className="bg-neutral-900"
                                                                    style={{ width: `${(job.shortlisted / job.total) * 100}%` }}
                                                                />
                                                            )
                                                        }
                                                        {
                                                            job.interviewing > 0 && (
                                                                <div
                                                                    className="bg-neutral-900"
                                                                    style={{ width: `${(job.interviewing / job.total) * 100}%` }}
                                                                />
                                                            )
                                                        }
                                                        {
                                                            job.hired > 0 && (
                                                                <div
                                                                    className="bg-neutral-900"
                                                                    style={{ width: `${(job.hired / job.total) * 100}%` }}
                                                                />
                                                            )
                                                        }
                                                        {
                                                            job.rejected > 0 && (
                                                                <div
                                                                    className="bg-red-500"
                                                                    style={{ width: `${(job.rejected / job.total) * 100}%` }}
                                                                />
                                                            )
                                                        }
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </Link>
                                </motion.div>
                            ))
                        }
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16 bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-6">
                            <FileText className="w-10 h-10 text-neutral-400" />
                        </div>
                        <h3 className="font-bold text-xl text-neutral-900 dark:text-white mb-2">
                            {searchQuery ? "No matching jobs found" : "No applications yet"}
                        </h3>
                        <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                            {
                                searchQuery
                                    ? "Try adjusting your search query"
                                    : "Applications from candidates will appear here once you start receiving them."
                            }
                        </p>
                        {
                            !searchQuery && (
                                <Link href="/jobs">
                                    <Button className="rounded-xl">
                                        <Briefcase className="w-4 h-4 mr-2" />
                                        View Job Postings
                                    </Button>
                                </Link>
                            )
                        }
                    </motion.div>
                )
            }

            {
                filteredJobs.some(j => j.total > 0) && (
                    <div className="flex flex-wrap gap-4 text-sm text-neutral-500">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-neutral-900" />
                            <span>New</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-neutral-900" />
                            <span>Under Review</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-neutral-900" />
                            <span>Shortlisted</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-neutral-900" />
                            <span>Interviewing</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-neutral-900" />
                            <span>Hired</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span>Rejected</span>
                        </div>
                    </div>
                )
            }
        </div>
    )
}