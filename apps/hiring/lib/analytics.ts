import "server-only"
import { and, asc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm"
import { db, hiringAttempts, hiringRuns, hiringSends, interviewRounds, jobs, users } from "@repo/db"
import { notPurged } from "@repo/db/hiring-purge"
import { roundFunnels } from "@repo/db/hiring-stats"

/*
 * The company's analytics (plan/hiring-app HA-21), from its results, never the
 * old applications. Every number is a count in SQL; no student id leaves this
 * file. Weeks start on Monday (Postgres `date_trunc('week', ...)`), and every
 * week in the range is present, zero or not, so a line is drawn to scale.
 */

export const RANGES = [4, 12, 26] as const
export type RangeWeeks = (typeof RANGES)[number]

export interface WeekPoint { week: string; received: number; invited: number; declined: number; practising: number }
export interface RoleStat {
    id: string
    title: string
    slug: string
    status: string
    received: number
    invited: number
    declined: number
    rounds: { number: number; title: string; type: string; passMark: number; practising: number; scored: number; passed: number }[]
}
export interface AnalyticsData {
    weeks: RangeWeeks
    totals: { received: number; invited: number; declined: number; waiting: number; hired: number; medianDaysToDecide: number | null }
    series: WeekPoint[]
    roles: RoleStat[]
    outcomes: { outcome: string; company: number; candidate: number }[]
    members: { name: string; invited: number; declined: number }[]
}

const OUTCOMES = ["INTERVIEWING", "OFFER", "HIRED", "NOT_SELECTED"] as const

/** The Monday of each week in the range, oldest first, as YYYY-MM-DD. */
function weekStarts(weeks: number): string[] {
    const now = new Date()
    const day = (now.getUTCDay() + 6) % 7
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day))
    return Array.from({ length: weeks }, (_, i) => new Date(monday.getTime() - (weeks - 1 - i) * 7 * 86_400_000).toISOString().slice(0, 10))
}

export async function loadAnalytics(companyId: string, weeks: RangeWeeks): Promise<AnalyticsData> {
    const starts = weekStarts(weeks)
    const from = starts[0]!
    const inRange = sql`${hiringSends.createdAt} >= ${from}::date`
    const live = and(eq(hiringSends.companyId, companyId), ne(hiringSends.status, "WITHDRAWN"), notPurged)

    const wk = (col: unknown) => sql<string>`to_char(date_trunc('week', ${col}), 'YYYY-MM-DD')`
    const [received, decided, practising, totals, median, outcomeRows, memberRows] = await Promise.all([
        db.select({ week: wk(hiringSends.createdAt), n: sql<number>`count(*)`.mapWith(Number) })
            .from(hiringSends).where(and(live, inRange)).groupBy(sql`1`),
        db.select({
            week: wk(hiringSends.decidedAt),
            invited: sql<number>`count(*) filter (where ${hiringSends.status} = 'INVITED')`.mapWith(Number),
            declined: sql<number>`count(*) filter (where ${hiringSends.status} = 'DECLINED')`.mapWith(Number),
        }).from(hiringSends).where(and(eq(hiringSends.companyId, companyId), isNotNull(hiringSends.decidedAt), sql`${hiringSends.decidedAt} >= ${from}::date`)).groupBy(sql`1`),
        // Students practising the company's rounds each week: distinct people with an attempt that week.
        db.select({ week: wk(hiringAttempts.startedAt), n: sql<number>`count(distinct ${hiringRuns.userId})`.mapWith(Number) })
            .from(hiringAttempts).innerJoin(hiringRuns, eq(hiringRuns.id, hiringAttempts.runId))
            .where(and(eq(hiringRuns.companyId, companyId), sql`${hiringAttempts.startedAt} >= ${from}::date`)).groupBy(sql`1`),
        db.select({
            received: sql<number>`count(*)`.mapWith(Number),
            invited: sql<number>`count(*) filter (where ${hiringSends.status} = 'INVITED')`.mapWith(Number),
            declined: sql<number>`count(*) filter (where ${hiringSends.status} = 'DECLINED')`.mapWith(Number),
            waiting: sql<number>`count(*) filter (where ${hiringSends.status} in ('SENT', 'VIEWED'))`.mapWith(Number),
            hired: sql<number>`count(*) filter (where ${hiringSends.companyOutcome} = 'HIRED')`.mapWith(Number),
        }).from(hiringSends).where(and(live, inRange)),
        db.select({ days: sql<number | null>`percentile_cont(0.5) within group (order by extract(epoch from (${hiringSends.decidedAt} - ${hiringSends.createdAt})) / 86400)`.mapWith((v) => (v === null ? null : Number(v))) })
            .from(hiringSends).where(and(eq(hiringSends.companyId, companyId), isNotNull(hiringSends.decidedAt), inRange)),
        db.select({
            company: hiringSends.companyOutcome, candidate: hiringSends.studentOutcome,
        }).from(hiringSends).where(and(eq(hiringSends.companyId, companyId), eq(hiringSends.status, "INVITED"))),
        db.select({
            name: users.name,
            invited: sql<number>`count(*) filter (where ${hiringSends.status} = 'INVITED')`.mapWith(Number),
            declined: sql<number>`count(*) filter (where ${hiringSends.status} = 'DECLINED')`.mapWith(Number),
        }).from(hiringSends).innerJoin(users, eq(users.id, hiringSends.decidedByUserId))
            .where(and(eq(hiringSends.companyId, companyId), isNotNull(hiringSends.decidedAt), inRange))
            .groupBy(users.id, users.name),
    ])

    const series: WeekPoint[] = starts.map((w) => ({
        week: w,
        received: received.find((r) => r.week === w)?.n ?? 0,
        invited: decided.find((r) => r.week === w)?.invited ?? 0,
        declined: decided.find((r) => r.week === w)?.declined ?? 0,
        practising: practising.find((r) => r.week === w)?.n ?? 0,
    }))

    // Per role, in the range; the funnel is all time (a round's pass rate needs its whole history).
    const roleRows = await db.select({ id: jobs.id, title: jobs.title, slug: jobs.slug, status: jobs.status, processId: jobs.interviewProcessId })
        .from(jobs).where(and(eq(jobs.companyId, companyId), ne(jobs.status, "DRAFT"))).orderBy(asc(jobs.title))
    const processIds = roleRows.map((r) => r.processId).filter((x): x is string => Boolean(x))
    const [rounds, perRole] = await Promise.all([
        processIds.length ? db.select().from(interviewRounds).where(inArray(interviewRounds.processId, processIds)).orderBy(asc(interviewRounds.roundNumber)) : [],
        db.select({
            jobId: hiringSends.jobId,
            received: sql<number>`count(*)`.mapWith(Number),
            invited: sql<number>`count(*) filter (where ${hiringSends.status} = 'INVITED')`.mapWith(Number),
            declined: sql<number>`count(*) filter (where ${hiringSends.status} = 'DECLINED')`.mapWith(Number),
        }).from(hiringSends).where(and(live, inRange)).groupBy(hiringSends.jobId),
    ])
    const funnels = await roundFunnels(rounds.map((r) => r.id))
    const roles: RoleStat[] = roleRows.map((j) => {
        const r = perRole.find((x) => x.jobId === j.id)
        return {
            id: j.id, title: j.title, slug: j.slug, status: j.status,
            received: r?.received ?? 0, invited: r?.invited ?? 0, declined: r?.declined ?? 0,
            rounds: rounds.filter((x) => x.processId === j.processId).map((x) => {
                const f = funnels.get(x.id)
                return { number: x.roundNumber, title: x.title, type: x.roundType, passMark: x.passMark, practising: f?.practising ?? 0, scored: f?.scored ?? 0, passed: f?.passed ?? 0 }
            }),
        }
    })

    const t = totals[0]
    return {
        weeks,
        totals: {
            received: t?.received ?? 0, invited: t?.invited ?? 0, declined: t?.declined ?? 0, waiting: t?.waiting ?? 0, hired: t?.hired ?? 0,
            medianDaysToDecide: median[0]?.days ?? null,
        },
        series,
        roles,
        outcomes: OUTCOMES.map((o) => ({ outcome: o, company: outcomeRows.filter((r) => r.company === o).length, candidate: outcomeRows.filter((r) => r.candidate === o).length })),
        members: memberRows.map((m) => ({ name: m.name ?? "A teammate", invited: m.invited, declined: m.declined })).sort((a, b) => b.invited + b.declined - (a.invited + a.declined)),
    }
}
