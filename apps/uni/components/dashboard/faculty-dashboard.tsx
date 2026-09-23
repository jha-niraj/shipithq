"use client"

import { motion } from "framer-motion"
import {
    Users, BookOpen, School, Plus, ArrowRight, GraduationCap,
    CheckCircle2, AlertCircle, FileText, Clock
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import Link from "next/link"

interface FacultyDashboardProps {
    userName: string
    stats?: {
        myClasses: number
        totalStudents: number
        activeAssignments: number
        pendingGrading: number
    }
}

export function FacultyDashboard({ userName, stats }: FacultyDashboardProps) {
    const dashboardStats: StatBandItem[] = [
        { 
            label: "My Classes", 
            value: stats?.myClasses || 0, 
            hint: "View assigned classes",
            icon: School, 
            href: "/classes" 
        },
        { 
            label: "My Students", 
            value: stats?.totalStudents || 0, 
            hint: "Across all classes",
            icon: Users, 
            href: "/students" 
        },
        { 
            label: "Active Assignments", 
            value: stats?.activeAssignments || 0, 
            hint: "View assignments",
            icon: BookOpen, 
            href: "/assignments" 
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
                            <GraduationCap className="w-5 h-5 text-neutral-900" />
                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
                                Faculty Member
                            </span>
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white">
                            Welcome back, {userName}! 👋
                        </h1>
                        <p className="text-neutral-500 mt-1">
                            Manage your classes and assignments.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/assignments">
                            <Button variant="outline" className="rounded-xl">
                                <FileText className="w-4 h-4 mr-2" />
                                Grade Submissions
                            </Button>
                        </Link>
                        <Link href="/assignments/new">
                            <Button className="rounded-xl bg-gradient-to-r from-neutral-800 to-neutral-800 hover:from-neutral-700 hover:to-neutral-700 text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Assignment
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
                <StatBand items={dashboardStats} cols={4} />
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* My Classes */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">My Classes</h2>
                        <Link href="/classes">
                            <Button variant="ghost" size="sm" className="text-xs">
                                View All <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                        </Link>
                    </div>
                    
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-neutral-900" />
                        </div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">No classes assigned yet</h3>
                        <p className="text-sm text-neutral-500 mb-4 max-w-sm mx-auto">
                            Your department head will assign you to classes.
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
                    {/* Quick Tips */}
                    <div className="bg-gradient-to-br from-neutral-800 to-neutral-700 rounded-2xl p-6 text-white">
                        <h3 className="font-bold text-lg mb-2">Getting Started</h3>
                        <p className="text-neutral-200 text-sm mb-4">
                            Tips for using the platform effectively.
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-neutral-300" />
                                <span>Profile completed</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-200">
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />
                                <span>Get assigned to classes</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-200">
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />
                                <span>Create your first assignment</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-200">
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />
                                <span>Grade student submissions</span>
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Deadlines */}
                    <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                                <Clock className="w-4 h-4 text-neutral-800" />
                            </div>
                            <h3 className="font-bold text-neutral-900 dark:text-white">Upcoming Deadlines</h3>
                        </div>
                        <p className="text-sm text-neutral-500 mb-4">
                            No upcoming assignment deadlines.
                        </p>
                        <Link href="/assignments">
                            <Button variant="outline" size="sm" className="w-full rounded-xl">
                                View All Assignments
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
