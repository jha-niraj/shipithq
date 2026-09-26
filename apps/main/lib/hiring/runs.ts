import "server-only"
import crypto from "crypto"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import {
    db, aptitudeQuestions, designPrompts, hiringAttempts, hiringRoundPoolItems, hiringRuns, interviewRounds, jobs, notifyUser,
    type HiringAttemptIntegrity,
} from "@repo/db"
import { scoreDesign, type RubricCriterion } from "@/lib/hiring/design"
import { scoreDsa, JudgeUnavailable } from "@/lib/hiring/dsa"
import { settleCredits, releaseCredits } from "@/lib/credits/hold"
import type { PricedOperation } from "@/lib/credits/pricing"
import { roundStates, runComplete } from "@/lib/hiring/round-state"

/*
 * The run engine (plan/hiring-rounds HR-13). Server-only: these take ids the
 * caller has already checked, and a "use server" export would be callable from
 * the browser with any arguments.
 */

export type DrawnItem = { kind: "APTITUDE_QUESTION" | "PRACTICE_PROBLEM" | "DESIGN_PROMPT"; refId: string; section?: string }

/** What an attempt at each round type costs (lib/credits/pricing.ts, from the overview). */
export const PRICE_FOR: Record<string, PricedOperation> = {
    APTITUDE: "hiring_round_aptitude",
    DSA: "hiring_round_dsa",
    SYSTEM_DESIGN: "hiring_round_system_design",
    VOICE_BEHAVIOURAL: "hiring_round_voice",
    VOICE_CULTURE: "hiring_round_voice",
}

/** Round types whose runner is built: all of them, since the voice rounds (plan/voice VO-11). */
export const RUNNABLE_TYPES = new Set<string>(["APTITUDE", "DSA", "SYSTEM_DESIGN", "VOICE_BEHAVIOURAL", "VOICE_CULTURE"])

/** Grace after `endsAt` for a submission in flight; answers saved after `endsAt` still don't count. */
const SUBMIT_GRACE_MS = 30_000

function shuffle<T>(xs: T[]): T[] {
    const a = [...xs]
    for (let i = a.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1)
        ;[a[i], a[j]] = [a[j]!, a[i]!]
    }
    return a
}

/**
 * Draw `drawCount` items for a new attempt. Items this student was drawn on
 * their last attempt at the same round are left out when the pool allows.
 * Aptitude spreads the draw evenly across the sections in the pool (Niraj,
 * HR-11): 20 from three sections is 7/7/6.
 */
export async function drawItems(roundId: string, roundType: string, userId: string, drawCount: number): Promise<DrawnItem[]> {
    const pool = await db.select({ kind: hiringRoundPoolItems.kind, refId: hiringRoundPoolItems.refId }).from(hiringRoundPoolItems)
        .where(eq(hiringRoundPoolItems.roundId, roundId))
    if (pool.length < drawCount) throw new Error("POOL_TOO_SMALL")

    const [last] = await db.select({ drawn: hiringAttempts.drawnItems }).from(hiringAttempts)
        .innerJoin(hiringRuns, eq(hiringRuns.id, hiringAttempts.runId))
        .where(and(eq(hiringRuns.userId, userId), eq(hiringAttempts.roundId, roundId)))
        .orderBy(desc(hiringAttempts.startedAt)).limit(1)
    const seen = new Set(((last?.drawn as DrawnItem[] | undefined) ?? []).map((d) => d.refId))
    const fresh = pool.filter((p) => !seen.has(p.refId))
    const candidates = fresh.length >= drawCount ? fresh : pool

    if (roundType !== "APTITUDE") return shuffle(candidates).slice(0, drawCount)

    const sections = await db.select({ id: aptitudeQuestions.id, section: aptitudeQuestions.section }).from(aptitudeQuestions)
        .where(inArray(aptitudeQuestions.id, candidates.map((c) => c.refId)))
    const bySection = new Map<string, string[]>()
    for (const q of sections) bySection.set(q.section, [...(bySection.get(q.section) ?? []), q.id])
    const queues = shuffle([...bySection.entries()]).map(([section, ids]) => ({ section, ids: shuffle(ids) }))
    // Round-robin across sections, so the mix is as even as the pool allows.
    const drawn: DrawnItem[] = []
    while (drawn.length < drawCount && queues.some((q) => q.ids.length)) {
        for (const q of queues) {
            const id = q.ids.pop()
            if (id && drawn.length < drawCount) drawn.push({ kind: "APTITUDE_QUESTION", refId: id, section: q.section })
        }
    }
    // Shuffle the order so sections don't arrive in a fixed rotation.
    return shuffle(drawn)
}

export interface AptitudeBreakdownItem {
    questionId: string
    chosen: number | null
    correctIndex: number
    right: boolean
}

/** Score an aptitude attempt from its saved answers: the share answered correctly, 0-100. */
export async function scoreAptitude(drawn: DrawnItem[], responses: Record<string, unknown>): Promise<{ score: number; breakdown: AptitudeBreakdownItem[] }> {
    const ids = drawn.map((d) => d.refId)
    const rows = ids.length ? await db.select({ id: aptitudeQuestions.id, correctIndex: aptitudeQuestions.correctIndex }).from(aptitudeQuestions).where(inArray(aptitudeQuestions.id, ids)) : []
    const answers = (responses.answers ?? {}) as Record<string, unknown>
    const breakdown = drawn.map((d) => {
        const correct = rows.find((r) => r.id === d.refId)?.correctIndex ?? -1
        const raw = answers[d.refId]
        const chosen = typeof raw === "number" && Number.isInteger(raw) ? raw : null
        return { questionId: d.refId, chosen, correctIndex: correct, right: chosen !== null && chosen === correct }
    })
    const right = breakdown.filter((b) => b.right).length
    return { score: drawn.length ? Math.round((right / drawn.length) * 100) : 0, breakdown }
}

/**
 * Close an attempt: scored (settle the held credits) or not scored (refund).
 * Then mark the run COMPLETE when every round is cleared. Idempotent: only an
 * attempt still open is closed.
 */
export async function closeAttempt(
    attemptId: string,
    result: { score: number; breakdown: unknown; aiRubricResult?: unknown } | { notScored: string },
): Promise<boolean> {
    const scored = "score" in result
    const [closed] = await db.update(hiringAttempts).set({
        status: scored ? "SCORED" : "NOT_SCORED",
        submittedAt: sql`coalesce(${hiringAttempts.submittedAt}, now())`,
        ...(scored ? { score: result.score, breakdown: result.breakdown, aiRubricResult: result.aiRubricResult ?? null } : { breakdown: { notScored: result.notScored } }),
    }).where(and(eq(hiringAttempts.id, attemptId), inArray(hiringAttempts.status, ["IN_PROGRESS", "SUBMITTED"])))
        .returning({ runId: hiringAttempts.runId, creditsHeld: hiringAttempts.creditsHeld })
    if (!closed) return false

    if (closed.creditsHeld > 0) {
        if (scored) await settleCredits(attemptId)
        else await releaseCredits(attemptId, result.notScored)
    }
    if (scored) await refreshRunStatus(closed.runId)
    await tellStudent(attemptId, result).catch((e: unknown) => console.error("notify ROUND_SCORED:", e))
    return true
}

/**
 * The student hears when a round that took a while is decided (plan/inbox IN-8):
 * AI-assessed and judged rounds, scored or refunded. Aptitude scores on the spot,
 * so it isn't announced.
 */
async function tellStudent(attemptId: string, result: { score: number } | { notScored: string }): Promise<void> {
    const [row] = await db.select({ userId: hiringRuns.userId, roundType: interviewRounds.roundType, roundTitle: interviewRounds.title, jobId: hiringRuns.jobId })
        .from(hiringAttempts)
        .innerJoin(hiringRuns, eq(hiringRuns.id, hiringAttempts.runId))
        .innerJoin(interviewRounds, eq(interviewRounds.id, hiringAttempts.roundId))
        .where(eq(hiringAttempts.id, attemptId))
    if (!row || row.roundType === "APTITUDE") return
    const job = row.jobId ? await db.query.jobs.findFirst({ where: eq(jobs.id, row.jobId), columns: { title: true, slug: true } }) : null
    await notifyUser(row.userId, {
        platform: "MAIN",
        kind: "ROUND_SCORED",
        title: "score" in result ? `Your ${row.roundTitle} round scored ${result.score}` : `Your ${row.roundTitle} round couldn't be scored`,
        body: "score" in result ? "Open it to see the breakdown." : `Your credits were refunded, and you can take it again now. (${result.notScored})`,
        severity: "score" in result ? "SUCCESS" : "WARNING",
        context: job ? { label: job.title, href: `/jobs/${job.slug}/rounds` } : { label: "Practice" },
        href: `/round/${attemptId}`,
    })
}

/** COMPLETE once every round of the run's pipeline is cleared. */
export async function refreshRunStatus(runId: string): Promise<void> {
    const run = await db.query.hiringRuns.findFirst({ where: eq(hiringRuns.id, runId) })
    if (!run?.processId || run.status !== "IN_PROGRESS") return
    const [rounds, attempts] = await Promise.all([
        db.select({ id: interviewRounds.id, gateMode: interviewRounds.gateMode, passMark: interviewRounds.passMark, cooldownHours: interviewRounds.cooldownHours })
            .from(interviewRounds).where(eq(interviewRounds.processId, run.processId)).orderBy(interviewRounds.roundNumber),
        db.select().from(hiringAttempts).where(eq(hiringAttempts.runId, runId)),
    ])
    if (runComplete(roundStates(rounds, attempts))) {
        await db.update(hiringRuns).set({ status: "COMPLETE" }).where(and(eq(hiringRuns.id, runId), eq(hiringRuns.status, "IN_PROGRESS")))
    }
}

/**
 * An attempt read after its end is closed with what it had. Aptitude is scored
 * from the answers saved before `endsAt`; other types are scored by their own
 * runners, so here they wait (HR-15, HR-16).
 */
export async function closeIfExpired(attempt: typeof hiringAttempts.$inferSelect, roundType: string): Promise<boolean> {
    if (attempt.status !== "IN_PROGRESS" || !attempt.endsAt) return false
    if (Date.now() < attempt.endsAt.getTime() + SUBMIT_GRACE_MS) return false
    if (roundType === "APTITUDE") {
        const { score, breakdown } = await scoreAptitude(attempt.drawnItems as DrawnItem[], attempt.responses)
        return closeAttempt(attempt.id, { score, breakdown })
    }
    // AI-assessed: handed in as it was at the end, and scored when the student
    // next opens it (`scoreSubmitted`), so a page load never waits on a model.
    const [handed] = await db.update(hiringAttempts).set({ status: "SUBMITTED", submittedAt: attempt.endsAt })
        .where(and(eq(hiringAttempts.id, attempt.id), eq(hiringAttempts.status, "IN_PROGRESS"))).returning({ id: hiringAttempts.id })
    return Boolean(handed)
}

/**
 * Score a handed-in attempt that needs more than arithmetic: DSA by the judge
 * (HR-15), system design by AI (HR-16). A judge or model failure or timeout
 * marks it NOT_SCORED and refunds it; it never scores 0 for our failure.
 */
export async function scoreSubmitted(attemptId: string): Promise<void> {
    const attempt = await db.query.hiringAttempts.findFirst({ where: eq(hiringAttempts.id, attemptId) })
    if (!attempt || attempt.status !== "SUBMITTED" || !attempt.roundId) return
    const round = await db.query.interviewRounds.findFirst({ where: eq(interviewRounds.id, attempt.roundId), columns: { roundType: true } })
    if (round?.roundType === "DSA") {
        try {
            const { score, breakdown } = await scoreDsa((attempt.drawnItems as DrawnItem[]).map((d) => d.refId), attempt.responses)
            await closeAttempt(attemptId, { score, breakdown })
        } catch (error: unknown) {
            if (!(error instanceof JudgeUnavailable)) console.error("scoreDsa:", error instanceof Error ? error.message : error)
            await closeAttempt(attemptId, { notScored: error instanceof JudgeUnavailable ? `The code judge was unavailable: ${error.message}` : "The code judge failed" })
        }
        return
    }
    if (round?.roundType !== "SYSTEM_DESIGN") return
    const drawn = (attempt.drawnItems as DrawnItem[])[0]
    const prompt = drawn ? await db.query.designPrompts.findFirst({ where: eq(designPrompts.id, drawn.refId) }) : null
    if (!prompt) { await closeAttempt(attemptId, { notScored: "The design prompt is no longer available" }); return }
    try {
        const r = attempt.responses as { answer?: unknown; diagram?: { elements?: unknown } }
        const { score, result } = await scoreDesign({
            brief: prompt.prompt,
            rubric: prompt.rubric as RubricCriterion[],
            answer: typeof r.answer === "string" ? r.answer : "",
            diagram: r.diagram?.elements ?? [],
        })
        await closeAttempt(attemptId, { score, breakdown: result.criteria, aiRubricResult: result })
    } catch (error: unknown) {
        await closeAttempt(attemptId, { notScored: error instanceof Error ? error.message : "AI scoring failed" })
    }
}

/** The student's running attempt, if any: AI is off while one runs (HR-13, DoD 27). */
export async function liveAttemptFor(userId: string): Promise<{ id: string } | null> {
    const [live] = await db.select({ id: hiringAttempts.id }).from(hiringAttempts)
        .innerJoin(hiringRuns, eq(hiringRuns.id, hiringAttempts.runId))
        .where(and(eq(hiringRuns.userId, userId), eq(hiringAttempts.status, "IN_PROGRESS"), sql`${hiringAttempts.endsAt} > now()`))
        .limit(1)
    return live ?? null
}

/** Count a refused AI request against the live attempt's integrity signals. */
export async function recordAiBlocked(attemptId: string): Promise<void> {
    await db.update(hiringAttempts)
        .set({ integrity: sql`jsonb_set(${hiringAttempts.integrity}, '{aiBlocked}', to_jsonb(coalesce((${hiringAttempts.integrity}->>'aiBlocked')::int, 0) + 1))` })
        .where(eq(hiringAttempts.id, attemptId))
}

/** Add integrity events the runner reports (never decreasing a counter). */
export function mergeIntegrity(prev: HiringAttemptIntegrity, delta: Partial<HiringAttemptIntegrity>): HiringAttemptIntegrity {
    const inc = (a?: number, b?: unknown) => (a ?? 0) + (typeof b === "number" && b > 0 && b < 1000 ? Math.floor(b) : 0)
    return {
        ...prev,
        pastes: inc(prev.pastes, delta.pastes),
        tabLeaves: inc(prev.tabLeaves, delta.tabLeaves),
        secondsPerItem: Array.isArray(delta.secondsPerItem)
            ? delta.secondsPerItem.slice(0, 100).map((n) => (typeof n === "number" && n >= 0 ? Math.min(Math.round(n), 36_000) : 0))
            : prev.secondsPerItem,
    }
}
