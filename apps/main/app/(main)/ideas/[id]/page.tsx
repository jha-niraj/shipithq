import { notFound } from "next/navigation"
import { getIdea } from "@/actions/(main)/ideas/ideas.action"
import { IdeaDetailClient } from "./idea-detail-client"

// Votes and status change; never cache.
export const dynamic = "force-dynamic"

/** One idea (plan/ideas IDEA-5): full text, status timeline, team update, vote. */
export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const r = await getIdea(id)
    if (!r.success) notFound()
    return <IdeaDetailClient idea={r.idea} />
}
