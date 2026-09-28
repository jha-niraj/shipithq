import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@repo/auth"
import { listReports, nextReportDate, reportFrequencyFor } from "@/lib/progress/reports"
import { ReportSettings } from "./_components/report-settings"

export const dynamic = "force-dynamic"
export const metadata = { title: "Reports | Settings | ShipItHQ", description: "How often your progress report comes, and every past report" }

/** Settings > Reports (plan/progress PRG-9): the frequency and every past report. */
export default async function ReportsSettingsPage() {
    const session = await getSession(await headers())
    if (!session?.user?.id) redirect("/signin?callbackUrl=/settings/reports")
    const [frequency, reports] = await Promise.all([reportFrequencyFor(session.user.id), listReports(session.user.id)])
    const next = nextReportDate(frequency)
    return (
        <ReportSettings
            initialFrequency={frequency}
            initialNext={next ? next.toISOString() : null}
            reports={reports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        />
    )
}
