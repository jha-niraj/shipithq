"use client"

import { useCallback, useState } from "react"
import { BarChart3, Users, TrendingUp, Activity, RefreshCw, CreditCard, MessageSquare, Receipt } from "lucide-react"
import {
    getOverviewStats, getUserGrowthStats, getEngagementStats, getModuleUsageStats, getRevenueStats,
} from "@/actions/main/analytics.action"
import { toast } from "@repo/ui/components/ui/sonner"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { TrendChart } from "../../_components/trend-chart"

type SuccessData<T> = T extends { success: true; data: infer D } ? D : never
type OverviewStats = SuccessData<Awaited<ReturnType<typeof getOverviewStats>>>
type UserGrowthData = SuccessData<Awaited<ReturnType<typeof getUserGrowthStats>>>
type EngagementData = SuccessData<Awaited<ReturnType<typeof getEngagementStats>>>
type ModuleUsageData = SuccessData<Awaited<ReturnType<typeof getModuleUsageStats>>>
type RevenueData = SuccessData<Awaited<ReturnType<typeof getRevenueStats>>>

/** A labelled figure in a list. Used by Engagement. */
function MetricRow({ label, value }: { label: string; value: number | undefined }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-neutral-600 dark:text-neutral-400">{label}</span>
            <span className="shrink-0 text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">
                {value?.toLocaleString() ?? "0"}
            </span>
        </div>
    )
}

export function AnalyticsClient({
    initialOverview,
    initialGrowth,
    initialEngagement,
    initialModuleUsage,
    initialRevenue,
}: {
    initialOverview: OverviewStats | null
    initialGrowth: UserGrowthData | null
    initialEngagement: EngagementData | null
    initialModuleUsage: ModuleUsageData | null
    initialRevenue: RevenueData | null
}) {
    const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(initialOverview)
    const [userGrowth, setUserGrowth] = useState<UserGrowthData | null>(initialGrowth)
    const [engagement, setEngagement] = useState<EngagementData | null>(initialEngagement)
    const [moduleUsage, setModuleUsage] = useState<ModuleUsageData | null>(initialModuleUsage)
    const [revenue, setRevenue] = useState<RevenueData | null>(initialRevenue)
    const [isLoading, setIsLoading] = useState(false)

    const fetchAnalytics = useCallback(async () => {
        setIsLoading(true)
        try {
            const [overviewRes, growthRes, engagementRes, moduleRes, revenueRes] = await Promise.all([
                getOverviewStats(),
                getUserGrowthStats(),
                getEngagementStats(),
                getModuleUsageStats(),
                getRevenueStats(),
            ])
            if (overviewRes.success) setOverviewStats(overviewRes.data)
            if (growthRes.success) setUserGrowth(growthRes.data)
            if (engagementRes.success) setEngagement(engagementRes.data)
            if (moduleRes.success) setModuleUsage(moduleRes.data)
            if (revenueRes.success) setRevenue(revenueRes.data)
        } catch (error) {
            console.error("Failed to fetch analytics:", error)
            toast.error("Failed to load analytics")
        } finally {
            setIsLoading(false)
        }
    }, [])

    const periodLabel = userGrowth?.period
        ? `${new Date(userGrowth.period.from).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${new Date(userGrowth.period.to).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
        : "Last 30 days"

    // `getModuleUsageStats` hard-codes four of its five modules to `0` - only
    // Mock Interviews is a real query. Showing all five as bars would be four
    // claims of a measured zero, so the unmeasured ones are listed separately
    // and labelled as not yet instrumented. See ADM-30.
    const MEASURED_MODULES = new Set(["Mock Interviews"])
    const measured = moduleUsage?.modules?.filter((m) => MEASURED_MODULES.has(m.name)) ?? []
    const notInstrumented = moduleUsage?.modules?.filter((m) => !MEASURED_MODULES.has(m.name)) ?? []
    const measuredMax = Math.max(...measured.map((m) => m.count), 1)

    return (
        <div className="w-full p-6 lg:p-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                        <BarChart3 className="h-7 w-7 shrink-0" />
                        Platform Analytics
                    </h1>
                    <p className="mt-1 text-neutral-500 dark:text-neutral-400">
                        Insights and metrics for your platform &middot; {periodLabel}
                    </p>
                </div>
                {/* A refresh icon, not a download one. The button has always said
                    "Refresh" and shown `Download`; one of the two was wrong and it
                    was the icon. */}
                <button
                    onClick={fetchAnalytics}
                    disabled={isLoading}
                    className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                    {isLoading ? <InlineLoader size="sm" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh
                </button>
            </div>

            {/* Headline figures. Every one of these traces to a real query.
                `totalProjects` and `activeCommunities` are deliberately NOT here:
                `getOverviewStats` returns them hard-coded to `0` with its own
                comment saying the tables are not wired up, so a tile for them
                would report a measured zero for something never measured. */}
            {overviewStats && (
                <StatBand
                    className="mb-8"
                    cols={4}
                    items={[
                        {
                            icon: Users,
                            label: "Total Users",
                            value: overviewStats.totalUsers?.toLocaleString() ?? "0",
                            hint: `${overviewStats.newUsers?.toLocaleString() ?? 0} new this period`,
                        },
                        { icon: TrendingUp, label: "New Users", value: overviewStats.newUsers?.toLocaleString() ?? "0", hint: periodLabel },
                        { icon: CreditCard, label: "Credits Held", value: overviewStats.totalCredits?.toLocaleString() ?? "0", hint: "Across every account" },
                        { icon: MessageSquare, label: "Feedback", value: overviewStats.totalFeedback?.toLocaleString() ?? "0", hint: periodLabel },
                    ]}
                />
            )}

            {/* The two time series. Both replaced hand-rolled `<div>` bars that had
                a `Math.max(…, 5)` height floor - which drew a visible bar on a day
                when nothing happened, making "nothing" and "a little" identical. */}
            <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <TrendChart
                    title="User Growth"
                    subtitle="New sign-ups per day"
                    data={userGrowth?.chartData ?? []}
                    dataKey="count"
                    emptyLabel="No sign-up data for this period"
                    footer={`${userGrowth?.total?.toLocaleString() ?? 0} new users over the period`}
                />
                <TrendChart
                    title="Revenue"
                    subtitle="Credits purchased per day"
                    data={revenue?.chartData ?? []}
                    dataKey="amount"
                    emptyLabel="No completed payments in this period"
                    footer={
                        revenue
                            ? `${revenue.totalRevenue.toLocaleString()} total across ${revenue.transactionCount.toLocaleString()} ${revenue.transactionCount === 1 ? "transaction" : "transactions"}`
                            : undefined
                    }
                />
            </div>

            {revenue && revenue.transactionCount > 0 && (
                <StatBand
                    className="mb-8"
                    cols={3}
                    items={[
                        { icon: Receipt, label: "Total Revenue", value: revenue.totalRevenue.toLocaleString(), hint: periodLabel },
                        { icon: Activity, label: "Transactions", value: revenue.transactionCount.toLocaleString(), hint: periodLabel },
                        { icon: TrendingUp, label: "Average Value", value: Math.round(revenue.averageValue).toLocaleString(), hint: "Per completed payment" },
                    ]}
                />
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {engagement && (
                    <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                        <h2 className="mb-1 text-lg font-semibold text-neutral-900 dark:text-white">Engagement</h2>
                        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">Activity recorded in this period</p>
                        <div className="space-y-4">
                            <MetricRow label="Feedback submitted" value={engagement.feedbackSubmitted} />
                            <MetricRow label="Mocks completed" value={engagement.mocksCompleted} />
                            <MetricRow label="Projects started" value={engagement.projectsStarted} />
                            <MetricRow label="Communities joined" value={engagement.communitiesJoined} />
                        </div>
                    </div>
                )}

                {moduleUsage && (
                    <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                        <h2 className="mb-1 text-lg font-semibold text-neutral-900 dark:text-white">Module Usage</h2>
                        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">Sessions recorded per module</p>

                        <div className="space-y-3">
                            {measured.map((module) => (
                                <div key={module.name} className="space-y-2">
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <span className="min-w-0 truncate text-neutral-600 dark:text-neutral-400">{module.name}</span>
                                        <span className="shrink-0 font-semibold tabular-nums text-neutral-900 dark:text-white">
                                            {module.count?.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
                                        {/* No `Math.max(…, 5)` floor. A module with no
                                            sessions renders an EMPTY track, because a
                                            5%-filled bar for zero is the chart telling
                                            a small lie in the product's own voice. */}
                                        <div
                                            className="h-2 rounded-full bg-neutral-900 dark:bg-neutral-100"
                                            style={{ width: `${(module.count / measuredMax) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {notInstrumented.length > 0 && (
                            <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                    Not yet instrumented
                                </p>
                                <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
                                    These modules have no usage query behind them yet, so they are listed rather than
                                    charted - a bar here would report a measured zero for something never measured.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {notInstrumented.map((module) => (
                                        <span
                                            key={module.name}
                                            className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400"
                                        >
                                            {module.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
