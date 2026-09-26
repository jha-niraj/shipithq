import type { Metadata } from "next"
import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import { notFound } from "next/navigation"
import { INCIDENTS, getIncidentMeta } from "@/content/incidents"
import { CaseView } from "@/components/incidents/case-view"
import { loadIncidentProgress } from "@/lib/incidents/progress"
import { incidentUrl } from "@/lib/urls"

/**
 * One case (plan/incidents INC-1). The content is static; a signed-in reader's
 * saved progress is loaded here (INC-4), so answered questions arrive answered
 * rather than flashing open first. The six parts render in `CaseView` (INC-3).
 */

interface PageProps {
    params: Promise<{ slug: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
    return INCIDENTS.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const meta = getIncidentMeta((await params).slug)
    if (!meta) return { title: "Incident not found", robots: { index: false } }
    const url = incidentUrl(meta.slug)
    return {
        title: `${meta.title} - Incidents`,
        description: meta.summary,
        alternates: { canonical: url },
        openGraph: { title: meta.title, description: meta.summary, type: "article", url },
        twitter: { card: "summary_large_image", title: meta.title, description: meta.summary },
    }
}

export default async function IncidentPage({ params }: PageProps) {
    const meta = getIncidentMeta((await params).slug)
    if (!meta) notFound()
    const session = await getSession(await headers())
    const userId = session?.user?.id
    const initial = userId ? await loadIncidentProgress(userId, meta.slug) : undefined
    return <CaseView slug={meta.slug} initial={initial} signedIn={!!userId} />
}
