"use server"

import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import { db, projectRecommendation, type RecommendedIdea } from "@repo/db"

// The cached "Picked for you" list (plan/projects, PJ-1). Reading only: the model
// call is `app/api/projects/recommendations/route.ts`.

export type RecommendedIdeaView = RecommendedIdea

export async function getProjectPicks(): Promise<{ picks: RecommendedIdeaView[]; generatedAt: string | null }> {
    const session = await getSession(await headers())
    if (!session?.user?.id) return { picks: [], generatedAt: null }
    const [row] = await db
        .select({ items: projectRecommendation.items, generatedAt: projectRecommendation.generatedAt })
        .from(projectRecommendation)
        .where(eq(projectRecommendation.userId, session.user.id))
        .limit(1)
    return { picks: row?.items ?? [], generatedAt: row?.generatedAt.toISOString() ?? null }
}
