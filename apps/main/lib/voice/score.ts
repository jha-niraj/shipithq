import "server-only"
import { and, eq } from "drizzle-orm"
import { db, backgroundJobs, hiringAttempts, interviewRounds, isTerminalJobStatus, mockVoiceSession, type VoiceTurn } from "@repo/db"
import { startBackgroundJob } from "@/actions/(main)/workers/jobs.action"
import { closeAttempt } from "@/lib/hiring/runs"
import { releaseCredits, settleCredits } from "@/lib/credits/hold"
import { MOCK_RUBRIC } from "@/lib/voice/rubrics"
import { interviewBrief, loadVoiceSession, type VoiceSession } from "@/lib/voice/session"
import type { RubricCriterion } from "@/lib/hiring/design"

/*
 * Scoring a voice or typed interview (plan/voice VO-9), app side. The worker
 * job `voice_interview_score` fetches the transcript and scores it; this
 * dispatches it on hand-in, and applies its result when it's done. Credits are
 * the app's: a hiring attempt's hold is settled or refunded by `closeAttempt`.
 */

export interface VoiceScoreResult {
    score: number
    criteria: { criterion: string; weight: number; score: number; evidence: string }[]
    summary: string
    strengths: string[]
    improvements: string[]
    transcript: VoiceTurn[]
    source: "sarvam" | "typed"
}

type Outcome = { state: "scoring" } | { state: "scored" } | { state: "not_scored"; reason: string }

/** Start scoring a handed-in interview, once. Returns the job id. */
async function dispatchScore(s: VoiceSession, rubric: RubricCriterion[]): Promise<string | null> {
    const brief = await interviewBrief(s)
    const job = await startBackgroundJob("voice_interview_score", {
        ref: s.ref,
        mode: s.mode ?? "VOICE",
        ...(s.mode === "TYPED" ? { turns: s.turns } : { interactionId: s.interactionId ?? undefined }),
        about: brief ? `${brief.title} for the role ${brief.variables.role}.\n${brief.variables.interview_brief}` : "An interview.",
        rubric,
        singleFlightKey: `${s.ref.kind}:${s.ref.id}`,
    }, { cost: 0, singleFlight: true, singleFlightKey: `${s.ref.kind}:${s.ref.id}` })
    return job.success ? (job.jobId ?? null) : null
}

/**
 * Move a handed-in voice round attempt along: dispatch its scoring job, or, when
 * the job has finished, close the attempt with its result (or as not scored).
 * Idempotent: safe to call on every poll from every tab.
 */
export async function progressVoiceRound(userId: string, attemptId: string): Promise<Outcome> {
    const attempt = await db.query.hiringAttempts.findFirst({ where: eq(hiringAttempts.id, attemptId) })
    if (!attempt || !attempt.roundId) return { state: "not_scored", reason: "The attempt is gone." }
    if (attempt.status === "SCORED") return { state: "scored" }
    if (attempt.status === "NOT_SCORED") return { state: "not_scored", reason: "" }
    if (attempt.status !== "SUBMITTED") return { state: "scoring" }

    const s = await loadVoiceSession(userId, { kind: "round", id: attemptId })
    if (!s) return { state: "not_scored", reason: "This isn't your attempt." }
    // A voice round handed in with no call, or a typed one with no consent: nothing to score, and our failure to start it.
    if (!s.consentedAt || (s.mode === "VOICE" && !s.interactionId)) {
        await closeAttempt(attemptId, { notScored: "The interview never started" })
        return { state: "not_scored", reason: "The interview never started." }
    }

    if (!attempt.workerJobId) {
        const round = await db.query.interviewRounds.findFirst({ where: eq(interviewRounds.id, attempt.roundId), columns: { rubric: true } })
        const rubric = (round?.rubric as RubricCriterion[] | null) ?? []
        if (!rubric.length) {
            await closeAttempt(attemptId, { notScored: "This round has no rubric" })
            return { state: "not_scored", reason: "This round has no rubric." }
        }
        const jobId = await dispatchScore(s, rubric)
        if (!jobId) return { state: "scoring" }
        await db.update(hiringAttempts).set({ workerJobId: jobId }).where(and(eq(hiringAttempts.id, attemptId), eq(hiringAttempts.status, "SUBMITTED")))
        return { state: "scoring" }
    }

    const [job] = await db.select({ status: backgroundJobs.status, result: backgroundJobs.result, error: backgroundJobs.error })
        .from(backgroundJobs).where(and(eq(backgroundJobs.jobId, attempt.workerJobId), eq(backgroundJobs.userId, userId)))
    if (!job || !isTerminalJobStatus(job.status)) return { state: "scoring" }

    if (job.status === "failed") {
        await closeAttempt(attemptId, { notScored: job.error ?? "Scoring failed" })
        return { state: "not_scored", reason: job.error ?? "Scoring failed." }
    }
    const r = job.result as VoiceScoreResult
    // Sarvam's transcript replaces what the browser reported: that copy is what was scored.
    await db.update(hiringAttempts).set({
        responses: { ...(attempt.responses ?? {}), turns: r.transcript },
        transcriptRef: `${r.source}:${s.interactionId ?? attemptId}`,
    }).where(eq(hiringAttempts.id, attemptId))
    await closeAttempt(attemptId, {
        score: r.score,
        breakdown: r.criteria,
        aiRubricResult: { criteria: r.criteria, summary: r.summary, strengths: r.strengths, improvements: r.improvements },
    })
    return { state: "scored" }
}

// ── Mock interviews (plan/voice VO-10) ───────────────────────────────────────

/** The credit hold for a mock session. Created with the session, settled when scored, released on our failure. */
export const mockHoldId = (sessionId: string) => `mock-voice-${sessionId}`

/** The results page's shape, filled from the rubric result. */
export interface MockAnalysis {
    overallScore: number
    communication: { score: number; feedback: string }
    technical: { score: number; feedback: string }
    problemSolving: { score: number; feedback: string }
    strengths: string[]
    improvements: string[]
    detailedFeedback: string
}

export function mockAnalysis(r: VoiceScoreResult): MockAnalysis {
    const pick = (name: string) => {
        const c = r.criteria.find((x) => x.criterion === name)
        return { score: (c?.score ?? 0) * 10, feedback: c?.evidence ?? "" }
    }
    return {
        overallScore: r.score,
        communication: pick("Communication"),
        technical: pick("Technical depth"),
        problemSolving: pick("Problem solving"),
        strengths: r.strengths,
        improvements: r.improvements,
        detailedFeedback: r.summary,
    }
}

type MockOutcome = { state: "scoring" } | { state: "scored"; analysis: MockAnalysis } | { state: "not_scored"; reason: string }

const transcriptText = (turns: VoiceTurn[]) => turns.map((t) => `[${t.role === "interviewer" ? "INTERVIEWER" : "YOU"}]: ${t.text}`).join("\n")

/**
 * Move a handed-in mock session along, like `progressVoiceRound`: dispatch the
 * scoring job once, then apply its result. Idempotent, called on every poll.
 */
export async function progressVoiceMock(userId: string, sessionId: string): Promise<MockOutcome> {
    const row = await db.query.mockVoiceSession.findFirst({ where: and(eq(mockVoiceSession.id, sessionId), eq(mockVoiceSession.userId, userId)) })
    if (!row || row.provider !== "SARVAM") return { state: "not_scored", reason: "That interview doesn't exist." }
    if (row.status === "COMPLETED" && row.aiAnalysis) return { state: "scored", analysis: row.aiAnalysis as MockAnalysis }
    if (row.status === "FAILED") return { state: "not_scored", reason: String((row.metadata as { notScored?: string } | null)?.notScored ?? "It couldn't be scored.") }
    if (row.status !== "SUBMITTED") return { state: "scoring" }

    const fail = async (reason: string): Promise<MockOutcome> => {
        const [closed] = await db.update(mockVoiceSession).set({ status: "FAILED", completedAt: new Date(), metadata: { ...((row.metadata as object) ?? {}), notScored: reason } })
            .where(and(eq(mockVoiceSession.id, sessionId), eq(mockVoiceSession.status, "SUBMITTED"))).returning({ id: mockVoiceSession.id })
        if (closed) await releaseCredits(mockHoldId(sessionId), reason)
        return { state: "not_scored", reason }
    }

    const s = await loadVoiceSession(userId, { kind: "mock", id: sessionId })
    if (!s) return { state: "not_scored", reason: "That interview doesn't exist." }
    if (!s.consentedAt || (s.mode === "VOICE" && !s.interactionId)) return fail("The interview never started")

    const jobId = (row.metadata as { scoreJobId?: string } | null)?.scoreJobId
    if (!jobId) {
        const id = await dispatchScore(s, MOCK_RUBRIC)
        if (id) await db.update(mockVoiceSession).set({ metadata: { ...((row.metadata as object) ?? {}), scoreJobId: id } }).where(eq(mockVoiceSession.id, sessionId))
        return { state: "scoring" }
    }
    const [job] = await db.select({ status: backgroundJobs.status, result: backgroundJobs.result, error: backgroundJobs.error })
        .from(backgroundJobs).where(and(eq(backgroundJobs.jobId, jobId), eq(backgroundJobs.userId, userId)))
    if (!job || !isTerminalJobStatus(job.status)) return { state: "scoring" }
    if (job.status === "failed") return fail(job.error ?? "Scoring failed")

    const r = job.result as VoiceScoreResult
    const analysis = mockAnalysis(r)
    const startedAt = row.consentedAt ?? row.startedAt ?? row.createdAt
    const submittedAt = new Date(String((row.metadata as { submittedAt?: string } | null)?.submittedAt ?? Date.now()))
    const [closed] = await db.update(mockVoiceSession).set({
        status: "COMPLETED",
        completedAt: new Date(),
        duration: Math.max(0, Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000)),
        turns: r.transcript,
        transcript: transcriptText(r.transcript),
        aiAnalysis: analysis,
    }).where(and(eq(mockVoiceSession.id, sessionId), eq(mockVoiceSession.status, "SUBMITTED"))).returning({ id: mockVoiceSession.id })
    if (closed) await settleCredits(mockHoldId(sessionId))
    return { state: "scored", analysis }
}
