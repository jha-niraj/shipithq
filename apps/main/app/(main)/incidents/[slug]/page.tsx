import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { getSession } from "@repo/auth"
import { getIncidentCase } from "@/content/incidents/cases"
import { CasePlayer } from "@/components/incidents/player/case-player"
import { loadCaseForPlayer } from "@/lib/incidents/catalog"
import { loadIncidentProgress } from "@/lib/incidents/progress"
import { incidentUrl } from "@/lib/urls"

/**
 * One case, as the full-page player (plan/incidents INC-14). The case and its steps
 * come from the database (INC-11); the simulator and diagram behaviour from the case
 * file; a signed-in reader's saved progress is loaded so answered steps arrive
 * answered. `?step=` opens a given step.
 */

interface PageProps {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ step?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const data = await loadCaseForPlayer((await params).slug)
    if (!data) return { title: "Incident not found", robots: { index: false } }
    const url = incidentUrl(data.slug)
    return {
        title: `${data.title} - Incidents`,
        description: data.summary,
        alternates: { canonical: url },
        openGraph: { title: data.title, description: data.summary, type: "article", url },
        twitter: { card: "summary_large_image", title: data.title, description: data.summary },
    }
}

export default async function IncidentPage({ params, searchParams }: PageProps) {
    const { slug } = await params
    const { step } = await searchParams
    const [data, session] = await Promise.all([loadCaseForPlayer(slug), getSession(await headers())])
    const incident = getIncidentCase(slug)
    if (!data || !incident) notFound()
    const userId = session?.user?.id
    const initial = userId ? await loadIncidentProgress(userId, slug) : undefined
    return <CasePlayer data={data} initial={initial} signedIn={!!userId} initialStep={step} />
}
