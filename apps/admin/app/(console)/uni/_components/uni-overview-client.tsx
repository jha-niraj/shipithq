"use client"

import { GraduationCap, Users, UserCheck, BookMarked, CheckCircle, Clock } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { StatBand } from "@repo/ui/components/ui/stat-band"

interface ModuleCardProps {
    title: string
    description: string
    icon: React.ElementType
    href: string
    stats: { label: string; value: string }[]
    badge?: string
}

function ModuleCard({ title, description, icon: Icon, href, stats, badge }: ModuleCardProps) {
    return (
        <Link href={href}>
            <motion.div
                whileHover={{ y: -2 }}
                className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer group h-full"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-neutral-50 dark:bg-neutral-800/20 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white">{title}</h3>
                            <p className="text-xs text-neutral-500">{description}</p>
                        </div>
                    </div>
                    {badge && (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-neutral-50 dark:bg-neutral-800/20 text-neutral-800 dark:text-neutral-100">
                            {badge}
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-2">
                            <p className="text-lg font-semibold text-neutral-900 dark:text-white">{stat.value}</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{stat.label}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-4 flex items-center text-sm text-neutral-800 dark:text-neutral-100">
                    <span>Manage</span>
                </div>
            </motion.div>
        </Link>
    )
}

export interface DashboardStats {
    totalUniversities: number
    verifiedUniversities: number
    pendingVerifications: number
    rejectedVerifications: number
    totalDepartments: number
    totalFaculty: number
    totalStudents: number
    verifiedStudents: number
    totalClasses: number
    totalCreditsAllocated: number
}

export function UniOverviewClient({ stats }: { stats: DashboardStats }) {
    return (
        <div className="p-6 lg:p-8 w-full mx-auto">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-8 rounded-full bg-neutral-900" />
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">University Platform</h1>
                        <p className="text-neutral-500 dark:text-neutral-400">Coder&apos;z University platform administration</p>
                    </div>
                </div>
                {stats.pendingVerifications > 0 && (
                    <Link href="/uni/universities/verification">
                        <div className="mt-4 flex items-center justify-between gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-800">
                            <div className="flex min-w-0 items-center gap-3">
                                <Clock className="w-5 h-5 shrink-0 text-neutral-800 dark:text-neutral-100" />
                                <span className="truncate font-medium text-neutral-700 dark:text-neutral-100">{stats.pendingVerifications} university verifications pending</span>
                            </div>
                            <span className="shrink-0 text-sm font-medium text-neutral-800 dark:text-neutral-100 underline">Review now &rarr;</span>
                        </div>
                    </Link>
                )}
            </div>
            {/* Students / Faculty / Classes have real counts (the action genuinely
                    queries them) but no admin page exists for any of them yet - see
                    plan/admin/tasks.md, the hiring/uni decision to keep only the
                    Universities + Verification screens. Informational, not broken
                links. */}
            <StatBand
                className="mb-8"
                cols={4}
                items={[
                    { icon: GraduationCap, label: "Universities", value: stats.totalUniversities.toLocaleString(), href: "/uni/universities" },
                    { icon: Users, label: "Students", value: stats.totalStudents.toLocaleString() },
                    { icon: UserCheck, label: "Faculty", value: stats.totalFaculty.toLocaleString() },
                    { icon: BookMarked, label: "Classes", value: stats.totalClasses.toLocaleString() },
                ]}
            />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Platform Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ModuleCard
                    title="Universities"
                    description="University management & verification"
                    icon={GraduationCap}
                    href="/uni/universities"
                    stats={[
                        { label: "Total", value: stats.totalUniversities.toLocaleString() },
                        { label: "Verified", value: stats.verifiedUniversities.toLocaleString() },
                    ]}
                    badge={stats.pendingVerifications > 0 ? `${stats.pendingVerifications} pending` : undefined}
                />
                <ModuleCard
                    title="Verification Queue"
                    description="Review pending verifications"
                    icon={CheckCircle}
                    href="/uni/universities/verification"
                    stats={[
                        { label: "Pending", value: stats.pendingVerifications.toLocaleString() },
                        { label: "Rejected", value: stats.rejectedVerifications.toLocaleString() },
                    ]}
                />
            </div>
        </div>
    )
}
