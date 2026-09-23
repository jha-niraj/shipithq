"use client"

import { motion } from "framer-motion"
import {
    Users, School, ArrowRight, GraduationCap,
    CheckCircle2, AlertCircle, FileText, Clock
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import Link from "next/link"

interface TeachingAssistantDashboardProps {
    userName: string
    stats?: {
        assignedClasses: number
        totalStudents: number
        pendingGrading: number
    }
}

export function TeachingAssistantDashboard({ userName, stats }: TeachingAssistantDashboardProps) {
    const dashboardStats: StatBandItem[] = [
        { 
            label: "Assigned Classes", 
            value: stats?.assignedClasses || 0, 
            hint: "View classes",
            icon: School, 
            href: "/classes" 
        },
        { 
            label: "Students", 
            value: stats?.totalStudents || 0, 
            hint: "Across all classes",
            icon: Users, 
            href: "/students" 
        },
        { 
            label: "Pending Grading", 
            value: stats?.pendingGrading || 0, 
            hint: stats?.pendingGrading ? <span className="text-rose-600 dark:text-rose-400">Needs attention</span> : "All caught up!",
            icon: FileText, 
            href: "/assignments?filter=pending" 
        },
    ]

    return (
        <div className="min-h-full p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <GraduationCap className="w-5 h-5 text-neutral-500" />
                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                                Teaching Assistant
                            </span>
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white">
                            Welcome back, {userName}! 👋
                        </h1>
                        <p className="text-neutral-500 mt-1">
                            Assist with classes and grade assignments.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/assignments">
                            <Button className="rounded-xl bg-neutral-900 dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white">
                                <FileText className="w-4 h-4 mr-2" />
                                Grade Submissions
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>

            {/* Stats Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8"
            >
                <StatBand items={dashboardStats} cols={3} />
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Assigned Classes */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Assigned Classes</h2>
                        <Link href="/classes">
                            <Button variant="ghost" size="sm" className="text-xs">
                                View All <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                        </Link>
                    </div>
                    
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-neutral-500" />
                        </div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">No classes assigned yet</h3>
                        <p className="text-sm text-neutral-500 mb-4 max-w-sm mx-auto">
                            Faculty will assign you to classes to assist with.
                        </p>
                    </div>
                </motion.div>

                {/* Right Sidebar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                >
                    {/* Tasks */}
                    <div className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-6">
                        <h3 className="font-bold text-lg mb-2 text-neutral-900 dark:text-white">Your Tasks</h3>
                        <p className="text-neutral-500 text-sm mb-4">
                            Things you can help with.
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-neutral-900" />
                                <span className="text-neutral-700 dark:text-neutral-300">Profile completed</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-500">
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-400" />
                                <span>Get assigned to classes</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-500">
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-400" />
                                <span>Help grade submissions</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-500">
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-400" />
                                <span>Assist students</span>
                            </div>
                        </div>
                    </div>

                    {/* Grading Queue */}
                    <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                                <Clock className="w-4 h-4 text-neutral-600" />
                            </div>
                            <h3 className="font-bold text-neutral-900 dark:text-white">Grading Queue</h3>
                        </div>
                        <p className="text-sm text-neutral-500 mb-4">
                            No submissions awaiting review.
                        </p>
                        <Link href="/assignments">
                            <Button variant="outline" size="sm" className="w-full rounded-xl">
                                View Assignments
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
