"use client"

import { motion } from "framer-motion"
import {
    Users, BookOpen, School, Plus, ArrowRight, GraduationCap,
    CheckCircle2, AlertCircle, Building, UserPlus
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import Link from "next/link"

interface DepartmentHeadDashboardProps {
    userName: string
    departmentName?: string
    stats?: {
        totalStudents: number
        totalFaculty: number
        totalClasses: number
        totalAssignments: number
        pendingSubmissions: number
    }
}

export function DepartmentHeadDashboard({ userName, departmentName, stats }: DepartmentHeadDashboardProps) {
    const dashboardStats: StatBandItem[] = [
        { 
            label: "Department Students", 
            value: stats?.totalStudents || 0, 
            hint: "View all students",
            icon: Users, 
            href: "/students" 
        },
        { 
            label: "Faculty Members", 
            value: stats?.totalFaculty || 0, 
            hint: "Manage faculty",
            icon: GraduationCap, 
            href: "/faculty" 
        },
        { 
            label: "Active Classes", 
            value: stats?.totalClasses || 0, 
            hint: "View classes",
            icon: School, 
            href: "/classes" 
        },
        { 
            label: "Assignments", 
            value: stats?.totalAssignments || 0, 
            hint: stats?.pendingSubmissions ? `${stats.pendingSubmissions} pending review` : "No pending",
            icon: BookOpen, 
            href: "/assignments" 
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
                            <Building className="w-5 h-5 text-neutral-900" />
                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
                                Department Head {departmentName ? `• ${departmentName}` : ""}
                            </span>
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white">
                            Welcome back, {userName}! 👋
                        </h1>
                        <p className="text-neutral-500 mt-1">
                            Manage your department&apos;s classes, faculty, and students.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/classes/new">
                            <Button variant="outline" className="rounded-xl">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Class
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
                {/* Recent Activity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Department Activity</h2>
                        <Link href="/analytics">
                            <Button variant="ghost" size="sm" className="text-xs">
                                View All <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                        </Link>
                    </div>
                    
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-neutral-900" />
                        </div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">No recent activity</h3>
                        <p className="text-sm text-neutral-500 mb-4 max-w-sm mx-auto">
                            Create classes and assignments to see activity here.
                        </p>
                        <Link href="/classes/new">
                            <Button variant="outline" size="sm" className="rounded-xl">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Your First Class
                            </Button>
                        </Link>
                    </div>
                </motion.div>

                {/* Right Sidebar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                >
                    {/* Getting Started */}
                    <div className="bg-gradient-to-br from-neutral-800 to-neutral-700 rounded-2xl p-6 text-white">
                        <h3 className="font-bold text-lg mb-2">Department Setup</h3>
                        <p className="text-neutral-200 text-sm mb-4">
                            Complete these steps to get started.
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-neutral-300" />
                                <span>Department assigned</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-200">
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />
                                <span>Create classes</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-200">
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />
                                <span>Assign faculty to classes</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-200">
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />
                                <span>Create first assignment</span>
                            </div>
                        </div>
                    </div>

                    {/* Faculty Management */}
                    <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                                <UserPlus className="w-4 h-4 text-neutral-800" />
                            </div>
                            <h3 className="font-bold text-neutral-900 dark:text-white">Faculty</h3>
                        </div>
                        <p className="text-sm text-neutral-500 mb-4">
                            View and manage faculty in your department.
                        </p>
                        <Link href="/faculty">
                            <Button variant="outline" size="sm" className="w-full rounded-xl">
                                View Faculty
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
