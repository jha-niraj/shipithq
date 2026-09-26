import { listInterviewReports, type ReportTab } from "@/actions/hiring/interview-reports.action"
import { InterviewReportsClient } from "./_components/interview-reports-client"

export const dynamic = "force-dynamic"

/** Interview reports students filed (plan/competition/skillmeet CMP-1d): pending first. */
export default async function InterviewReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const { tab } = await searchParams
    const status: ReportTab = tab === "approved" ? "APPROVED" : tab === "rejected" ? "REJECTED" : "PENDING"
    const r = await listInterviewReports(status)
    return <InterviewReportsClient tab={status} rows={r.success ? r.data.rows : []} pending={r.success ? r.data.pending : 0} error={r.success ? null : r.error} />
}
