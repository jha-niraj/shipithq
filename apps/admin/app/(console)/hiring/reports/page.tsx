import { listReports } from "@/actions/hiring/reports.action"
import { ReportsClient } from "./_components/reports-client"

export const dynamic = "force-dynamic"

/** The report queue (plan/hiring-rounds HR-24): open reports first, closed on a tab. */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const { tab } = await searchParams
    const status = tab === "closed" ? "CLOSED" : "OPEN"
    const r = await listReports(status)
    return <ReportsClient tab={status} rows={r.success ? r.data.rows : []} open={r.success ? r.data.open : 0} error={r.success ? null : r.error} />
}
