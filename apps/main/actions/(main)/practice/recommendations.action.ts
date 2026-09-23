"use server"

import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import { db, practiceRecommendation, type RecommendedProblem } from "@repo/db"
import type { PracticeModule } from "@/types/practice"

// The cached Recommended list (plan/practice-dsa, PD-15). Reading only: the model
// call lives in `app/api/practice/recommendations/route.ts`.

export interface RecommendationsView {
    items: RecommendedProblem[]
    generatedAt: string | null
}

export async function getRecommendations(module: PracticeModule): Promise<RecommendationsView> {
    const session = await getSession(await headers())
    if (!session?.user?.id) return { items: [], generatedAt: null }
    const [row] = await db
        .select({ items: practiceRecommendation.items, generatedAt: practiceRecommendation.generatedAt })
        .from(practiceRecommendation)
        .where(and(eq(practiceRecommendation.userId, session.user.id), eq(practiceRecommendation.module, module)))
        .limit(1)
    return { items: row?.items ?? [], generatedAt: row?.generatedAt.toISOString() ?? null }
}
