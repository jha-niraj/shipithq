import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { getSession } from "@repo/auth"
import { getIncidentCase } from "@/content/incidents/cases"
import { awardReportXp, loadOwnReport } from "@/lib/incidents/report"
import { ReportView } from "@/components/incidents/report/report-view"

/** A reader's own run report (plan/incidents INC-38). Owner only: anyone else gets a 404. */

export const metadata: Metadata = { title: "Your incident report", robots: { index: false } }

export default async function RunReportPage({ params }: { params: Promise<{ slug: string; runId: string }> }) {
    const { slug, runId } = await params
    const session = await getSession(await headers())
    const userId = session?.user?.id
    if (!userId) notFound()
    const data = await loadOwnReport(userId, slug, runId)
    if (!data) notFound()
    // The first report on a case earns XP, once (INC-42).
    await awardReportXp(userId, slug)
    return <ReportView data={data} owner chapterSteps={chapterSteps(slug)} />
}

/** Chapter title -> its check step, so a missed check links straight back to it. */
function chapterSteps(slug: string): Record<string, string> {
    const c = getIncidentCase(slug)
    return Object.fromEntries((c?.chapters ?? []).filter((ch) => ch.check?.length).map((ch) => [ch.title, `check-${ch.id}`]))
}
