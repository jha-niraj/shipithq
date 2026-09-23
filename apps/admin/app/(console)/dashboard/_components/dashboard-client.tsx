"use client"

import { useSession } from "@repo/auth/client"
import {
    Users, CreditCard, TrendingUp, ArrowRight, AlertCircle, CheckCircle, Bell,
    Code, Building2, GraduationCap, Shield, MessageCircle,
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { TrendChart } from "../../_components/trend-chart"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { cn } from "@/lib/utils"
import type { StatsData } from "@/types/admin"

interface PlatformCardProps {
    title: string
    description: string
    icon: React.ElementType
    color: string
    bgColor: string
    href: string
    stats: Array<{ label: string; value: string }>
    pendingActions?: number
}

function PlatformCard({ title, description, icon: Icon, color, bgColor, href, stats, pendingActions }: PlatformCardProps) {
    return (
        <Link href={href}>
            <motion.div
                whileHover={{ y: -4 }}
                className={cn(
                    "relative rounded-2xl border p-6 transition-all cursor-pointer group overflow-hidden",
                    "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800",
                    "hover:shadow-xl hover:border-neutral-300 dark:hover:border-neutral-700",
                )}
            >
                <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2", bgColor)} />
                {/* `(pendingActions ?? 0) > 0`, not `pendingActions && pendingActions > 0`.
                    The second form short-circuits on a falsy `0` and RETURNS it, and React
                    renders `0` as a text node - a bare digit above the card, which is what
                    hiring and university both showed. The `> 0` guard never got to run.
                    Main passes `undefined`, which renders nothing, so only two of the three
                    cards were affected and it read as a data bug rather than a render one. */}
                {(pendingActions ?? 0) > 0 && (
                    <div className="absolute top-4 right-4">
                        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-50 dark:bg-neutral-800/20 text-neutral-800 dark:text-neutral-100 text-xs font-medium">
                            <AlertCircle className="w-3 h-3" />
                            {pendingActions} pending
                        </span>
                    </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", bgColor)}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">{title}</h3>
                        <p className="text-sm text-neutral-500">{description}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3">
                            <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{stat.value}</p>
                            <p className="text-xs text-neutral-500">{stat.label}</p>
                        </div>
                    ))}
                </div>
                <div className={cn("mt-6 flex items-center text-sm font-medium transition-colors", color)}>
                    <span>Manage Platform</span>
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
            </motion.div>
        </Link>
    )
}

/**
 * The growth delta the old KPI tiles carried as a pill, now a StatBand `hint`.
 * Rose only when negative, as before; `undefined` renders no hint at all.
 */
function changeHint(change: number | undefined) {
    if (change === undefined) return undefined
    return (
        <span className={change < 0 ? "text-rose-700 dark:text-rose-400" : undefined}>
            {change >= 0 ? "+" : ""}{change}%
        </span>
    )
}

interface PendingActionProps {
    title: string
    count: number
    type: "warning" | "info" | "success"
    href: string
    platform: "main" | "hiring" | "uni"
}

function PendingAction({ title, count, type, href, platform }: PendingActionProps) {
    if (count === 0) return null

    const colors = {
        warning: "bg-neutral-50 dark:bg-neutral-200/10 border-neutral-200 dark:border-neutral-200/20 text-neutral-700 dark:text-neutral-100",
        info: "bg-neutral-50 dark:bg-neutral-200/10 border-neutral-200 dark:border-neutral-200/20 text-neutral-700 dark:text-neutral-100",
        success: "bg-neutral-50 dark:bg-neutral-200/10 border-neutral-200 dark:border-neutral-200/20 text-neutral-700 dark:text-neutral-100",
    }
    const icons = { warning: AlertCircle, info: Bell, success: CheckCircle }
    const platformColors = { main: "border-l-neutral-900 dark:border-l-white", hiring: "border-l-emerald-500", uni: "border-l-neutral-400" }
    const Icon = icons[type]

    return (
        <Link href={href}>
            <div className={cn(
                "flex items-center justify-between gap-3 p-4 rounded-lg border border-l-4 transition-all hover:scale-[1.01]",
                colors[type],
                platformColors[platform],
            )}>
                <div className="flex min-w-0 items-center gap-3">
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="truncate font-medium">{count} {title}</span>
                </div>
                <span className="shrink-0 text-sm font-medium underline underline-offset-2">Review</span>
            </div>
        </Link>
    )
}

export interface AllStats {
    main: StatsData | null
    hiring: {
        totalCompanies: number
        verifiedCompanies: number
        pendingVerifications: number
        totalMembers: number
        totalJobs: number
        activeJobs: number
        totalApplications: number
        [key: string]: number
    } | null
    uni: {
        totalUniversities: number
        verifiedUniversities: number
        pendingVerifications: number
        totalDepartments: number
        totalFaculty: number
        totalStudents: number
        totalClasses: number
        [key: string]: number
    } | null
    overview: {
        totalUsers?: number
        newUsers?: number
        totalProjects?: number
        activeCommunities?: number
        totalFeedback?: number
    } | null
    /** Real, DB-derived series for the two charts (ADM-27). `[]` means "no data
     *  yet", which the chart renders as an empty state rather than a flat line. */
    userGrowth: Array<{ date: string; count: number }>
    revenue: Array<{ date: string; amount: number }>
}

/**
 * The console's most-used controls, moved to the top of the page (ADM-27).
 *
 * They used to sit in the bottom-right cell of a two-column row, below the stat
 * tiles and all three platform cards - which on a laptop put the thing people
 * click most below the fold, under everything they were only glancing at.
 */
const QUICK_LINKS = [
    { href: "/users", label: "Manage Users", icon: Users },
    { href: "/hiring/companies", label: "Companies", icon: Building2 },
    { href: "/uni/universities", label: "Universities", icon: GraduationCap },
    { href: "/credits", label: "Credits", icon: CreditCard },
    { href: "/feedback", label: "Feedback", icon: MessageCircle },
    { href: "/admins", label: "Admin Users", icon: Shield },
] as const

export function DashboardClient({ initialStats }: { initialStats: AllStats }) {
    const { data: session } = useSession()
    const { main, hiring, uni, overview, userGrowth, revenue } = initialStats

    const pendingActions: PendingActionProps[] = ([
        { title: "company verifications pending", count: hiring?.pendingVerifications ?? 0, type: "warning" as const, href: "/hiring/companies/verification", platform: "hiring" as const },
        { title: "university verifications pending", count: uni?.pendingVerifications ?? 0, type: "warning" as const, href: "/uni/universities/verification", platform: "uni" as const },
        { title: "feedback items submitted", count: overview?.totalFeedback ?? 0, type: "info" as const, href: "/feedback", platform: "main" as const },
    ] satisfies PendingActionProps[]).filter((a) => a.count > 0)

    return (
        <div className="p-6 lg:p-8 w-full mx-auto">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                            Welcome back, {session?.user?.name?.split(" ")[0] || "Admin"}
                        </h1>
                        <p className="text-neutral-500 dark:text-neutral-400">Multi-platform control center &middot; Managing 3 platforms</p>
                    </div>
                </div>
            </div>

            {/* Quick Links FIRST (ADM-27). A horizontal strip rather than the old
                2-up grid in a side panel: six short labels fit one row from `md`,
                and below that they scroll sideways in their own container instead
                of costing three stacked rows at the top of a bounded page.
                `min-w-0` + `shrink-0` per docs/responsiveness.md - a tile in a
                flex row has no column to fill and collapses to its text. */}
            <div className="mb-8">
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Quick Links</h2>
                <div className="-mx-1 min-w-0 overflow-x-auto px-1 pb-1">
                    <div className="flex w-max gap-3 md:grid md:w-full md:grid-cols-3 lg:grid-cols-6">
                        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className="flex w-44 shrink-0 items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 transition-colors hover:bg-neutral-100 md:w-auto dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                            >
                                <Icon className="h-5 w-5 shrink-0 text-neutral-900 dark:text-white" />
                                <span className="min-w-0 truncate text-sm font-medium text-neutral-900 dark:text-white">{label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <StatBand
                className="mb-8"
                cols={4}
                items={[
                    { icon: Users, label: "Total Users", value: main?.totalUsers?.toLocaleString() ?? "0", hint: changeHint(main?.growthRate as number) },
                    { icon: Shield, label: "Active Admins", value: main?.totalAdmins?.toString() ?? "0" },
                    { icon: CreditCard, label: "Total Credits", value: main?.totalCredits?.toLocaleString() ?? "0" },
                    { icon: TrendingUp, label: "New This Month", value: main?.newUsersThisMonth?.toLocaleString() ?? "0", hint: changeHint(main?.growthRate as number) },
                ]}
            />

            {/* Trends. Two series, both real - see page.tsx for why hiring and
                university get no chart. */}
            <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <TrendChart
                    title="User Growth"
                    subtitle="New sign-ups per day"
                    data={userGrowth}
                    dataKey="count"
                    emptyLabel="No sign-ups recorded yet"
                    footer={`${userGrowth.reduce((a, r) => a + r.count, 0).toLocaleString()} new users over the period`}
                />
                <TrendChart
                    title="Credit Revenue"
                    subtitle="Credits purchased per day"
                    data={revenue}
                    dataKey="amount"
                    emptyLabel="No purchases recorded yet"
                    footer={`${revenue.reduce((a, r) => a + r.amount, 0).toLocaleString()} credits over the period`}
                />
            </div>

            <div className="mb-8">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Platform Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <PlatformCard
                        title="Main Platform"
                        description="ShipItHQ learning platform"
                        icon={Code}
                        color="text-neutral-800 dark:text-neutral-100"
                        bgColor="bg-neutral-900"
                        href="/dashboard"
                        stats={[
                            { label: "Total Users", value: main?.totalUsers?.toLocaleString() ?? "0" },
                            { label: "New This Month", value: main?.newUsersThisMonth?.toLocaleString() ?? "0" },
                            { label: "Projects", value: overview?.totalProjects?.toLocaleString() ?? "-" },
                            { label: "Communities", value: overview?.activeCommunities?.toLocaleString() ?? "-" },
                        ]}
                        pendingActions={undefined}
                    />
                    <PlatformCard
                        title="Hiring Platform"
                        description="ShipItHQ Hiring platform"
                        icon={Building2}
                        color="text-neutral-800 dark:text-neutral-100"
                        bgColor="bg-neutral-900"
                        href="/hiring"
                        stats={[
                            { label: "Companies", value: hiring?.totalCompanies?.toLocaleString() ?? "0" },
                            { label: "Active Jobs", value: hiring?.activeJobs?.toLocaleString() ?? "0" },
                            { label: "Members", value: hiring?.totalMembers?.toLocaleString() ?? "0" },
                            { label: "Applications", value: hiring?.totalApplications?.toLocaleString() ?? "0" },
                        ]}
                        pendingActions={hiring?.pendingVerifications}
                    />
                    <PlatformCard
                        title="University Platform"
                        description="ShipItHQ University platform"
                        icon={GraduationCap}
                        color="text-neutral-800 dark:text-neutral-100"
                        bgColor="bg-neutral-900"
                        href="/uni"
                        stats={[
                            { label: "Universities", value: uni?.totalUniversities?.toLocaleString() ?? "0" },
                            { label: "Students", value: uni?.totalStudents?.toLocaleString() ?? "0" },
                            { label: "Faculty", value: uni?.totalFaculty?.toLocaleString() ?? "0" },
                            { label: "Classes", value: uni?.totalClasses?.toLocaleString() ?? "0" },
                        ]}
                        pendingActions={uni?.pendingVerifications}
                    />
                </div>
            </div>

            {/* Pending Actions is now the full width of the page: Quick Links used
                to occupy the other half of this row and has moved to the top. */}
            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Pending Actions</h2>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">{pendingActions.reduce((acc, a) => acc + a.count, 0)} total</span>
                </div>
                <div className="space-y-3">
                    {pendingActions.length === 0 ? (
                        <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-4 text-neutral-800 dark:bg-neutral-800/10 dark:text-neutral-100">
                            <CheckCircle className="h-5 w-5 shrink-0" />
                            <span className="font-medium">All caught up - no pending actions</span>
                        </div>
                    ) : (
                        pendingActions.map((action, index) => <PendingAction key={index} {...action} />)
                    )}
                </div>
            </div>
        </div>
    )
}
