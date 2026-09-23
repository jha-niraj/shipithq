"use server"

import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import { db, practicePath, type PathStage } from "@repo/db"
import type { PracticeModule } from "@/types/practice"

// The stored path (plan/practice-path). Reading only: planning lives in
// `app/api/practice/path/route.ts`, where the model call belongs.

export interface PathView {
    stages: PathStage[]
    generatedAt: string | null
}

export async function getPath(module: PracticeModule): Promise<PathView> {
    const session = await getSession(await headers())
    if (!session?.user?.id) return { stages: [], generatedAt: null }
    const [row] = await db
        .select({ stages: practicePath.stages, generatedAt: practicePath.generatedAt })
        .from(practicePath)
        .where(and(eq(practicePath.userId, session.user.id), eq(practicePath.module, module)))
        .limit(1)
    return { stages: row?.stages ?? [], generatedAt: row?.generatedAt.toISOString() ?? null }
}
