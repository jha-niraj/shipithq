"use client"

import { motion } from "framer-motion"
import {
    Users, School, GraduationCap,
    CheckCircle2, Briefcase, Building, CreditCard,
    PieChart, Shield, Coins, UserPlus
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import Link from "next/link"

interface HeadDashboardProps {
    userName: string
    stats?: {
        totalStudents: number
        totalFaculty: number
        totalClasses: number
        totalAssignments: number
        creditsBalance: number
        pendingVerifications: number
    }
}

export function HeadDashboard({ userName, stats }: HeadDashboardProps) {
    const dashboardStats: StatBandItem[] = [
        {
            label: "Total Students",
            value: stats?.totalStudents || 0,
            hint: stats?.pendingVerifications ? `${stats.pendingVerifications} pending verification` : "No pending verifications",
            icon: Users,
            href: "/students"
        },
        {
            label: "Faculty Members",
            value: stats?.totalFaculty || 0,
            hint: "Manage team roles",
            icon: GraduationCap,
            href: "/team/roles"
        },
        {
            label: "Active Classes",
            value: stats?.totalClasses || 0,
            hint: "View all classes",
            icon: School,
            href: "/classes"
        },
        {
            label: "Credit Balance",
            value: stats?.creditsBalance || 0,
            hint: "Manage credits",
            icon: Coins,
            href: "/billing"
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
                            <Shield className="w-5 h-5 text-neutral-900" />
                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
                                University Administrator
                            </span>
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white">
                            Welcome back, {userName}! 👋
                        </h1>
                        <p className="text-neutral-500 mt-1">
                            Complete administrative overview of your university platform.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/team/roles">
                            <Button variant="outline" className="rounded-xl">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Invite Faculty
                            </Button>
                        </Link>
                        <Link href="/billing">
                            <Button className="rounded-xl bg-gradient-to-r from-neutral-800 to-neutral-800 hover:from-neutral-700 hover:to-neutral-700 text-white">
                                <CreditCard className="w-4 h-4 mr-2" />
                                Manage Billing
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
                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                >
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link href="/departments/new" className="block">
                            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800/30">
                                        <Building className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-neutral-900 dark:text-white">Create Department</p>
                                        <p className="text-xs text-neutral-500">Set up academic departments</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        <Link href="/classes/new" className="block">
                            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800/30">
                                        <School className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-neutral-900 dark:text-white">Create Class</p>
                                        <p className="text-xs text-neutral-500">Set up a new class</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        <Link href="/students/verify" className="block">
                            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800/30">
                                        <CheckCircle2 className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-neutral-900 dark:text-white">Verify Students</p>
                                        <p className="text-xs text-neutral-500">Review verification requests</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        <Link href="/analytics" className="block">
                            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800/30">
                                        <PieChart className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-neutral-900 dark:text-white">View Analytics</p>
                                        <p className="text-xs text-neutral-500">University-wide insights</p>
                                    </div>
                                </div>
                            </div>
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
                        <h3 className="font-bold text-lg mb-2">Admin Checklist</h3>
                        <p className="text-neutral-200 text-sm mb-4">
                            Complete these to fully set up your university.
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-neutral-300" />
                                <span>University profile complete</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-200">
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />
                                <span>Create departments</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-200">
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />
                                <span>Invite faculty members</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-200">
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />
                                <span>Set up student verification</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-200">
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />
                                <span>Purchase credits</span>
                            </div>
                        </div>
                    </div>

                    {/* Billing Quick View */}
                    <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                                <CreditCard className="w-4 h-4 text-neutral-800" />
                            </div>
                            <h3 className="font-bold text-neutral-900 dark:text-white">Billing</h3>
                        </div>
                        <p className="text-sm text-neutral-500 mb-4">
                            Manage subscription, credits, and invoices.
                        </p>
                        <Link href="/billing">
                            <Button variant="outline" size="sm" className="w-full rounded-xl">
                                Manage Billing
                            </Button>
                        </Link>
                    </div>

                    {/* Placements */}
                    <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                                <Briefcase className="w-4 h-4 text-neutral-800" />
                            </div>
                            <h3 className="font-bold text-neutral-900 dark:text-white">Placements</h3>
                        </div>
                        <p className="text-sm text-neutral-500 mb-4">
                            Partner with companies and manage job postings.
                        </p>
                        <Link href="/placements">
                            <Button variant="outline" size="sm" className="w-full rounded-xl">
                                View Placements
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
