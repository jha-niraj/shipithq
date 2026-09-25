"use client"

import { motion } from "framer-motion"
import {
    Users, FileText, Plus, ArrowRight, TrendingUp, Clock,
    CheckCircle2, AlertCircle, Eye, GitBranch, Zap
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import Link from "next/link"

interface CandidateStats {
    total: number
    new: number
    screening: number
    interviewing: number
    offered: number
    hired: number
    rejected: number
    thisWeek: number
}

interface HomeContentProps {
    userName: string
    candidateStats: CandidateStats | null
    interviewProcessCount: number
}

interface _ActivityItemProps {
    type: "application" | "review" | "interview" | "offer"
    title: string
    subtitle: string
    time: string
}

 
const _ActivityItem = ({ type, title, subtitle, time }: _ActivityItemProps) => {
    const icons = {
        application: <FileText className="w-4 h-4" />,
        review: <Eye className="w-4 h-4" />,
        interview: <Users className="w-4 h-4" />,
        offer: <CheckCircle2 className="w-4 h-4" />,
    }

    const colors = {
        application: "bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100",
        review: "bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100",
        interview: "bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100",
        offer: "bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100",
    }

    return (
        <div className="flex items-start gap-4 py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
            <div className={`p-2 rounded-lg ${colors[type]}`}>
                {icons[type]}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{title}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
            </div>
            <span className="text-xs text-neutral-400 whitespace-nowrap">{time}</span>
        </div>
    )
}

export default function HomeContent({ userName, candidateStats, interviewProcessCount }: HomeContentProps) {
    const stats: StatBandItem[] = [
        {
            label: "Total Candidates",
            value: candidateStats?.total || 0,
            hint: candidateStats?.thisWeek ? `+${candidateStats.thisWeek} this week` : "No candidates yet",
            icon: Users,
            href: "/candidates"
        },
        {
            label: "In Screening",
            value: candidateStats?.screening || 0,
            hint: "Candidates under review",
            icon: Eye,
            href: "/candidates?status=UNDER_REVIEW,SHORTLISTED"
        },
        {
            label: "Interviewing",
            value: candidateStats?.interviewing || 0,
            hint: "Active interviews",
            icon: Clock,
            href: "/candidates?status=INTERVIEW_SCHEDULED,INTERVIEWED"
        },
        {
            label: "Interview Processes",
            value: interviewProcessCount,
            hint: interviewProcessCount > 0 ? "Configured pipelines" : "Set up your first process",
            icon: GitBranch,
            href: "/interview-config"
        },
    ]

    const pipelineStats = [
        { label: "New Applications", value: candidateStats?.new || 0, color: "bg-neutral-900" },
        { label: "Screening", value: candidateStats?.screening || 0, color: "bg-neutral-900" },
        { label: "Interviewing", value: candidateStats?.interviewing || 0, color: "bg-neutral-900" },
        { label: "Offer Extended", value: candidateStats?.offered || 0, color: "bg-neutral-900" },
        { label: "Hired", value: candidateStats?.hired || 0, color: "bg-neutral-800" },
    ]

    const totalInPipeline = pipelineStats.reduce((acc, curr) => acc + curr.value, 0)

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <PageHeader
                    title={<>Welcome back, {userName}! 👋</>}
                    subtitle="Here's what's happening with your hiring pipeline today."
                    actions={
                        <>
                            <Link href="/interview-config/new">
                                <Button variant="outline" className="rounded-xl">
                                    <GitBranch className="w-4 h-4 mr-2" />
                                    Create Process
                                </Button>
                            </Link>
                            <Link href="/jobs/new">
                                <Button className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Post New Job
                                </Button>
                            </Link>
                        </>
                    }
                />
            </motion.div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <StatBand cols={4} items={stats} />
            </motion.div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Hiring Pipeline</h2>
                        <Link href="/analytics">
                            <Button variant="ghost" size="sm" className="text-xs">
                                View Analytics <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                        </Link>
                    </div>

                    {
                        totalInPipeline > 0 ? (
                            <div className="space-y-4">
                                <div className="h-4 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex">
                                    {
                                        pipelineStats.map((stage, i) => {
                                            const width = totalInPipeline > 0 ? (stage.value / totalInPipeline) * 100 : 0
                                            return width > 0 ? (
                                                <div
                                                    key={i}
                                                    className={`${stage.color} h-full transition-all`}
                                                    style={{ width: `${width}%` }}
                                                />
                                            ) : null
                                        })
                                    }
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    {
                                        pipelineStats.map((stage, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                                                <div>
                                                    <p className="text-xs text-neutral-500">{stage.label}</p>
                                                    <p className="text-lg font-bold text-neutral-900 dark:text-white">{stage.value}</p>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="w-8 h-8 text-neutral-400" />
                                </div>
                                <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">No candidates in pipeline</h3>
                                <p className="text-sm text-neutral-500 mb-4 max-w-sm mx-auto">
                                    Post your first job to start receiving applications and track them here.
                                </p>
                                <Link href="/jobs/new">
                                    <Button variant="outline" size="sm" className="rounded-xl">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Post Your First Job
                                    </Button>
                                </Link>
                            </div>
                        )
                    }
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                >
                    <div className="bg-gradient-to-br from-neutral-800 to-neutral-800 rounded-2xl p-6 text-white">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-5 h-5" />
                            <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">New Feature</span>
                        </div>
                        <h3 className="font-bold text-lg mb-2">Interview Processes</h3>
                        <p className="text-neutral-100 text-sm mb-4">
                            Define transparent interview pipelines. Students can prepare for each round before applying!
                        </p>
                        <Link href="/interview-config">
                            <Button className="w-full bg-white text-neutral-800 hover:bg-neutral-50 rounded-xl">
                                Configure Processes
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                        <h3 className="font-bold text-lg mb-4 text-neutral-900 dark:text-white">Getting Started</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-neutral-900" />
                                <span className="text-neutral-700 dark:text-neutral-300">Create your company profile</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                {
                                    interviewProcessCount > 0 ? (
                                        <CheckCircle2 className="w-4 h-4 text-neutral-900" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border-2 border-neutral-300 dark:border-neutral-600" />
                                    )
                                }
                                <span className={interviewProcessCount > 0 ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-500"}>
                                    Set up interview process
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-400">
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-300 dark:border-neutral-600" />
                                <span>Post your first job</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-400">
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-300 dark:border-neutral-600" />
                                <span>Invite team members</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                                <TrendingUp className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                            </div>
                            <h3 className="font-bold text-neutral-900 dark:text-white">Pipeline Health</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Rejection Rate</span>
                                <span className="font-medium text-neutral-900 dark:text-white">
                                    {candidateStats?.total ? Math.round((candidateStats.rejected / candidateStats.total) * 100) : 0}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Hire Rate</span>
                                <span className="font-medium text-neutral-900 dark:text-white">
                                    {candidateStats?.total ? Math.round((candidateStats.hired / candidateStats.total) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                        <Link href="/analytics">
                            <Button variant="outline" size="sm" className="w-full rounded-xl mt-4">
                                View Full Analytics
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}