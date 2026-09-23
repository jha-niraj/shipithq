"use client"

import { motion } from "framer-motion"
import {
    Users, Briefcase, ArrowRight, Building2, Plus,
    AlertCircle, TrendingUp, UserCheck
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import Link from "next/link"

interface PlacementOfficerDashboardProps {
    userName: string
    stats?: {
        totalStudents: number
        placedStudents: number
        activeJobPostings: number
        pendingApplications: number
        partnerCompanies: number
    }
}

export function PlacementOfficerDashboard({ userName, stats }: PlacementOfficerDashboardProps) {
    const placementRate = stats?.totalStudents ? 
        Math.round((stats.placedStudents || 0) / stats.totalStudents * 100) : 0

    const dashboardStats: StatBandItem[] = [
        { 
            label: "Total Students", 
            value: stats?.totalStudents || 0, 
            hint: `${placementRate}% placement rate`,
            icon: Users, 
            href: "/students" 
        },
        { 
            label: "Placed Students", 
            value: stats?.placedStudents || 0, 
            hint: "Successfully placed",
            icon: UserCheck, 
            href: "/placements/placed" 
        },
        { 
            label: "Active Jobs", 
            value: stats?.activeJobPostings || 0, 
            hint: "Open positions",
            icon: Briefcase, 
            href: "/placements/jobs" 
        },
        { 
            label: "Partner Companies", 
            value: stats?.partnerCompanies || 0, 
            hint: "View partnerships",
            icon: Building2, 
            href: "/placements/companies" 
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
                            <Briefcase className="w-5 h-5 text-neutral-900" />
                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
                                Placement Officer
                            </span>
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white">
                            Welcome back, {userName}! 👋
                        </h1>
                        <p className="text-neutral-500 mt-1">
                            Manage student placements and company partnerships.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/placements/companies/new">
                            <Button variant="outline" className="rounded-xl">
                                <Building2 className="w-4 h-4 mr-2" />
                                Add Company
                            </Button>
                        </Link>
                        <Link href="/placements/jobs/new">
                            <Button className="rounded-xl bg-gradient-to-r from-neutral-800 to-neutral-800 hover:from-neutral-700 hover:to-neutral-700 text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                Post Job
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
                {/* Pending Applications */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Recent Applications</h2>
                        <Link href="/placements/applications">
                            <Button variant="ghost" size="sm" className="text-xs">
                                View All <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                        </Link>
                    </div>
                    
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-neutral-900" />
                        </div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">No pending applications</h3>
                        <p className="text-sm text-neutral-500 mb-4 max-w-sm mx-auto">
                            Post jobs to receive student applications.
                        </p>
                        <Link href="/placements/jobs/new">
                            <Button variant="outline" size="sm" className="rounded-xl">
                                <Plus className="w-4 h-4 mr-2" />
                                Post First Job
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
                    {/* Placement Stats */}
                    <div className="bg-gradient-to-br from-neutral-800 to-neutral-700 rounded-2xl p-6 text-white">
                        <h3 className="font-bold text-lg mb-2">Placement Overview</h3>
                        <p className="text-neutral-200 text-sm mb-4">
                            Current semester statistics.
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-neutral-200">Placement Rate</span>
                                <span className="font-bold">{placementRate}%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-neutral-200">Avg. Package</span>
                                <span className="font-bold">-</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-neutral-200">Top Recruiter</span>
                                <span className="font-bold">-</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                                <TrendingUp className="w-4 h-4 text-neutral-800" />
                            </div>
                            <h3 className="font-bold text-neutral-900 dark:text-white">Reports</h3>
                        </div>
                        <p className="text-sm text-neutral-500 mb-4">
                            Generate placement reports and analytics.
                        </p>
                        <Link href="/placements/reports">
                            <Button variant="outline" size="sm" className="w-full rounded-xl">
                                View Reports
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
