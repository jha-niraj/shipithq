"use server"

import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import { recordProgressFor, type ProgressInput, type ProgressResult } from "@/lib/incidents/record"

/** Save one change to the signed-in reader's progress in a case (plan/incidents INC-4). */
export async function recordIncidentProgress(input: ProgressInput): Promise<ProgressResult> {
    const session = await getSession(await headers())
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Sign in to save your progress." }
    return recordProgressFor(userId, input)
}
