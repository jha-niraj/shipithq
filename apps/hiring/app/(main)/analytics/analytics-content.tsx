"use client"

import { motion } from "framer-motion"
import {
    BarChart3, Users, Briefcase, Clock, Target, Eye, TrendingUp,
    TrendingDown, CheckCircle, ArrowRight, Award
} from "lucide-react"
import { Badge } from "@repo/ui/components/ui/badge"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import Link from "next/link"
import Image from "next/image"

interface AnalyticsData {
    overview: {
        totalJobs: number
        activeJobs: number
        totalApplications: number
        recentApplications: number
        applicationChange: number
        totalViews: number
        hiredCount: number
        interviewsScheduled: number
        avgTimeToHire: string
        conversionRate: number
    }
    pipeline: {
        applied: number
        reviewing: number
        shortlisted: number
        interviewing: number
        offered: number
        hired: number
        rejected: number
    }
    topJobs: Array<{
        id: string
        title: string
        slug: string
        viewsCount: number
        applicationsCount: number
        status: string
        createdAt: Date
    }>
}

interface RecruiterPerformance {
    id: string
    name: string
    image: string | null
    role: string
    jobsPosted: number
    applicationsReviewed: number
}

interface AnalyticsContentProps {
    analytics: AnalyticsData | null
    recruiterPerformance: RecruiterPerformance[]
}

export function AnalyticsContent({ analytics, recruiterPerformance }: AnalyticsContentProps) {
    if (!analytics) {
        return (
            <div className="min-h-full p-6 lg:p-8">
                <div className="mb-8">
                    <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white">
                        Analytics
                    </h1>
                    <p className="text-neutral-500 mt-1">
                        Track your hiring pipeline performance
                    </p>
                </div>
                <div className="text-center py-16 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                    <div className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-6">
                        <BarChart3 className="w-10 h-10 text-neutral-400" />
                    </div>
                    <h3 className="font-bold text-xl text-neutral-900 dark:text-white mb-2">
                        No data yet
                    </h3>
                    <p className="text-neutral-500 max-w-md mx-auto">
                        Analytics will appear once you start posting jobs and receiving applications.
                    </p>
                </div>
            </div>
        )
    }

    const { overview, pipeline, topJobs } = analytics
    const totalPipeline = Object.values(pipeline).reduce((a, b) => a + b, 0)

    const statsCards: StatBandItem[] = [
        {
            label: "Total Views",
            value: overview.totalViews.toLocaleString(),
            icon: Eye,
        },
        {
            label: "Applications",
            value: overview.totalApplications.toLocaleString(),
            hint: (
                <span className={`inline-flex items-center gap-0.5 ${overview.applicationChange >= 0 ? "" : "text-rose-700 dark:text-rose-400"}`}>
                    {overview.applicationChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(overview.applicationChange)}%
                </span>
            ),
            icon: Users,
        },
        {
            label: "Active Jobs",
            value: overview.activeJobs.toString(),
            icon: Briefcase,
        },
        {
            label: "Avg. Time to Hire",
            value: overview.avgTimeToHire,
            icon: Clock,
        },
        {
            label: "Total Hired",
            value: overview.hiredCount.toString(),
            icon: CheckCircle,
        },
        {
            label: "Conversion Rate",
            value: `${overview.conversionRate}%`,
            icon: Target,
        },
    ]

    const pipelineStages = [
        { label: "Applied", count: pipeline.applied, color: "bg-neutral-900" },
        { label: "Reviewing", count: pipeline.reviewing, color: "bg-neutral-900" },
        { label: "Shortlisted", count: pipeline.shortlisted, color: "bg-neutral-900" },
        { label: "Interviewing", count: pipeline.interviewing, color: "bg-neutral-900" },
        { label: "Offered", count: pipeline.offered, color: "bg-neutral-900" },
        { label: "Hired", count: pipeline.hired, color: "bg-neutral-900" },
        { label: "Rejected", count: pipeline.rejected, color: "bg-red-500" },
    ]

    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white">
                    Analytics
                </h1>
                <p className="text-neutral-500 mt-1">
                    Track your hiring pipeline performance
                </p>
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <StatBand cols={6} items={statsCards} />
            </motion.div>
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                >
                    <h2 className="font-semibold text-lg text-neutral-900 dark:text-white mb-6">
                        Hiring Pipeline
                    </h2>
                    <div className="space-y-4">
                        {
                            pipelineStages.map((stage, i) => {
                                const percentage = totalPipeline > 0 ? (stage.count / totalPipeline) * 100 : 0
                                return (
                                    <motion.div
                                        key={stage.label}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 + i * 0.05 }}
                                        className="flex items-center gap-4"
                                    >
                                        <div className="w-24 text-sm text-neutral-600 dark:text-neutral-400">
                                            {stage.label}
                                        </div>
                                        <div className="flex-1 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden relative">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                                                className={`h-full ${stage.color} rounded-lg`}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-900 dark:text-white">
                                                {stage.count}
                                            </span>
                                        </div>
                                        <div className="w-12 text-right text-sm text-neutral-500">
                                            {percentage.toFixed(0)}%
                                        </div>
                                    </motion.div>
                                )
                            })
                        }
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-semibold text-lg text-neutral-900 dark:text-white">
                            Top Jobs
                        </h2>
                        <Link href="/jobs" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1">
                            View all <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    {
                        topJobs.length > 0 ? (
                            <div className="space-y-4">
                                {
                                    topJobs.map((job, i) => (
                                        <motion.div
                                            key={job.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 + i * 0.05 }}
                                            className="flex items-center gap-3"
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800" :
                                                i === 1 ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300" :
                                                    i === 2 ? "bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800" :
                                                        "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                                                }`}>
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <Link href={`/jobs/${job.slug}`}>
                                                    <p className="font-medium text-neutral-900 dark:text-white truncate hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
                                                        {job.title}
                                                    </p>
                                                </Link>
                                                <p className="text-xs text-neutral-500">
                                                    {job.viewsCount} views • {job.applicationsCount} apps
                                                </p>
                                            </div>
                                            <Badge variant={job.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                                                {job.status.toLowerCase()}
                                            </Badge>
                                        </motion.div>
                                    ))
                                }
                            </div>
                        ) : (
                            <p className="text-neutral-500 text-sm text-center py-8">
                                No jobs posted yet
                            </p>
                        )
                    }
                </motion.div>
            </div>

            {
                recruiterPerformance.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                    >
                        <h2 className="font-semibold text-lg text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                            <Award className="w-5 h-5 text-neutral-900" />
                            Team Performance
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {
                                recruiterPerformance.map((recruiter, i) => (
                                    <motion.div
                                        key={recruiter.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 + i * 0.05 }}
                                        className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center overflow-hidden relative">
                                                {
                                                    recruiter.image ? (
                                                        <Image src={recruiter.image} alt={recruiter.name} fill className="object-cover" />
                                                    ) : (
                                                        <span className="font-bold text-neutral-600 dark:text-neutral-400">
                                                            {recruiter.name.charAt(0)}
                                                        </span>
                                                    )
                                                }
                                            </div>
                                            <div>
                                                <p className="font-medium text-neutral-900 dark:text-white text-sm">{recruiter.name}</p>
                                                <p className="text-xs text-neutral-500">{recruiter.role}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="text-center p-2 bg-white dark:bg-neutral-800 rounded-lg">
                                                <p className="text-lg font-bold text-neutral-900 dark:text-white">{recruiter.jobsPosted}</p>
                                                <p className="text-xs text-neutral-500">Jobs</p>
                                            </div>
                                            <div className="text-center p-2 bg-white dark:bg-neutral-800 rounded-lg">
                                                <p className="text-lg font-bold text-neutral-900 dark:text-white">{recruiter.applicationsReviewed}</p>
                                                <p className="text-xs text-neutral-500">Reviewed</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            }
                        </div>
                    </motion.div>
                )
            }
        </div>
    )
}