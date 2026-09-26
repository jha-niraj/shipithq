import { inArray, sql } from "drizzle-orm"
import { db } from "./client"
import { hiringAttempts, hiringRuns } from "./schema/hiring-rounds"
import { interviewRounds } from "./schema/jobmock"

/*
 * Anonymous practice numbers (plan/hiring-rounds HR-26, DoD 21): per round,
 * how many students are practising it and how many pass. Counted in SQL, so no
 * student id ever leaves the query; the company's Home and the public company
 * page read only these counts.
 */

export interface RoundFunnel {
    roundId: string
    /** Students with any attempt at the round. */
    practising: number
    /** Students with a scored attempt. */
    scored: number
    /** Students whose best score reached the round's own pass mark. */
    passed: number
}

export async function roundFunnels(roundIds: string[]): Promise<Map<string, RoundFunnel>> {
    const out = new Map<string, RoundFunnel>()
    if (!roundIds.length) return out
    // One row per (round, student): their best score, if any was scored. Then counted per round.
    const best = db.select({
        roundId: hiringAttempts.roundId,
        userId: hiringRuns.userId,
        best: sql<number | null>`max(${hiringAttempts.score}) filter (where ${hiringAttempts.status} = 'SCORED')`.as("best"),
    }).from(hiringAttempts)
        .innerJoin(hiringRuns, sql`${hiringRuns.id} = ${hiringAttempts.runId}`)
        .where(inArray(hiringAttempts.roundId, roundIds))
        .groupBy(hiringAttempts.roundId, hiringRuns.userId)
        .as("best")
    const rows = await db.select({
        roundId: best.roundId,
        practising: sql<number>`count(*)`.mapWith(Number),
        scored: sql<number>`count(${best.best})`.mapWith(Number),
        passed: sql<number>`count(*) filter (where ${best.best} >= ${interviewRounds.passMark})`.mapWith(Number),
    }).from(best)
        .innerJoin(interviewRounds, sql`${interviewRounds.id} = ${best.roundId}`)
        .groupBy(best.roundId)
    for (const r of rows) if (r.roundId) out.set(r.roundId, { roundId: r.roundId, practising: r.practising, scored: r.scored, passed: r.passed })
    return out
}
