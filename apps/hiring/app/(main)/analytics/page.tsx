import { getAnalytics } from "@/actions/analytics"
import { AnalyticsContent } from "./analytics-content"

export const dynamic = "force-dynamic"
export const metadata = { title: "Analytics | ShipItHQ Hiring", description: "Results, decisions and round pass rates over time" }

/** The company's analytics (plan/hiring-app HA-21): results and round attempts, weekly. */
export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ weeks?: string }> }) {
    const { weeks } = await searchParams
    const r = await getAnalytics(Number(weeks) || 12)
    return r.success
        ? <AnalyticsContent data={r.data} />
        : <div className="page-frame px-page py-6 text-sm text-neutral-700 dark:text-neutral-300">{r.error}</div>
}
