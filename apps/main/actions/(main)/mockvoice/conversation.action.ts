'use server'

import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { db, mockVoiceSession } from "@repo/db"
import { and, eq, inArray, sql } from "drizzle-orm"
import { progressVoiceMock } from "@/lib/voice/score"

type MockOutcomeResult = Awaited<ReturnType<typeof progressVoiceMock>>

// ─────────────────────────────────────────────────────────────────────────────
// Mock interview post-processing (plan/voice VO-10): hand the interview in,
// then follow the scoring job until it lands.
// ─────────────────────────────────────────────────────────────────────────────

// ── Sarvam (plan/voice VO-10) ────────────────────────────────────────────────

/** Hand a Sarvam mock in; scoring follows (`followMockScoring`). */
export async function handInMockInterview(sessionId: string): Promise<{ success: boolean; error?: string }> {
    const session = await getSession(headers())
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }
    const [row] = await db.update(mockVoiceSession)
        .set({ status: 'SUBMITTED', metadata: sql`coalesce(${mockVoiceSession.metadata}, '{}'::jsonb) || jsonb_build_object('submittedAt', now())` })
        .where(and(
            eq(mockVoiceSession.id, sessionId),
            eq(mockVoiceSession.userId, session.user.id),
            eq(mockVoiceSession.provider, 'SARVAM'),
            inArray(mockVoiceSession.status, ['SCHEDULED', 'IN_PROGRESS']),
        ))
        .returning({ id: mockVoiceSession.id })
    if (!row) {
        const existing = await db.query.mockVoiceSession.findFirst({ where: and(eq(mockVoiceSession.id, sessionId), eq(mockVoiceSession.userId, session.user.id)), columns: { status: true } })
        // Already handed in (a second tab, the timer and End at once): fine.
        if (existing && ['SUBMITTED', 'COMPLETED', 'FAILED'].includes(existing.status)) return { success: true }
        return { success: false, error: 'That interview has already ended.' }
    }
    return { success: true }
}

/** One step of scoring a handed-in Sarvam mock: the results page calls it until it's scored or not. */
export async function followMockScoring(sessionId: string): Promise<MockOutcomeResult> {
    const session = await getSession(headers())
    if (!session?.user?.id) return { state: 'not_scored', reason: 'Unauthorized' }
    try {
        return await progressVoiceMock(session.user.id, sessionId)
    } catch (error: unknown) {
        console.error('followMockScoring:', error instanceof Error ? error.message : error)
        return { state: 'scoring' }
    }
}
