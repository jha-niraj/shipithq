"use server"

import { randomBytes } from "node:crypto"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { db, progressReports, reportPreferences } from "@repo/db"

type Result<T> = { success: true; data: T } | { success: false; error: string; code?: string }

const FREQUENCIES = ["WEEKLY", "HALF_MONTHLY", "MONTHLY", "OFF"] as const
type Frequency = (typeof FREQUENCIES)[number]

async function me(): Promise<string | null> {
    const session = await getSession(await headers())
    return session?.user?.id ?? null
}

/** Turn a report's public link on (a fresh token) or off (the old link 404s). PRG-8. */
export async function setReportShared(id: string, on: boolean): Promise<Result<{ token: string | null }>> {
    const uid = await me()
    if (!uid) return { success: false, error: "Sign in first.", code: "AUTH" }
    const token = on ? randomBytes(18).toString("base64url") : null
    const [row] = await db.update(progressReports).set({ shareToken: token })
        .where(and(eq(progressReports.id, id), eq(progressReports.userId, uid)))
        .returning({ id: progressReports.id })
    if (!row) return { success: false, error: "That report doesn't exist." }
    return { success: true, data: { token } }
}

/** How often reports come (Settings > Reports, PRG-9). */
export async function setReportFrequency(frequency: Frequency): Promise<Result<{ frequency: Frequency }>> {
    const uid = await me()
    if (!uid) return { success: false, error: "Sign in first.", code: "AUTH" }
    if (!FREQUENCIES.includes(frequency)) return { success: false, error: "Pick one of the options." }
    await db.insert(reportPreferences).values({ userId: uid, frequency })
        .onConflictDoUpdate({ target: reportPreferences.userId, set: { frequency, updatedAt: new Date() } })
    revalidatePath("/settings/reports")
    return { success: true, data: { frequency } }
}
