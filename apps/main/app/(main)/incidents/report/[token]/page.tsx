import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { loadSharedReport } from "@/lib/incidents/report"
import { ReportView } from "@/components/incidents/report/report-view"

/**
 * A run report the reader chose to share (plan/incidents INC-39). Public and read-only;
 * turning sharing off clears the token, so this becomes a 404. Not indexed.
 */

export const metadata: Metadata = { title: "Incident review", robots: { index: false, follow: false } }

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    const data = await loadSharedReport(token)
    if (!data) notFound()
    return <ReportView data={data} owner={false} chapterSteps={{}} />
}
