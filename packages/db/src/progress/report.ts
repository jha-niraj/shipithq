import { and, desc, eq, gte, lte, sql } from "drizzle-orm"
import type { NeonHttpDatabase } from "drizzle-orm/neon-http"
import { activityEntries, dailyActivities, userStats } from "../schema/activities"
import { users } from "../schema/schema"
import { progressReports, userBadges } from "../schema/progress"
import { BADGE_BY_KEY } from "../badges"
import {
    MODULE_ORDER, SUMMARIZE, previousRange, summarizeXp,
    type DayRange, type ModuleItem, type ModuleSummary, type XpSummary,
} from "./modules"

/*
 * A progress report's snapshot (plan/progress PRG-7). Everything here is computed from
 * stored rows by fixed rules; no model writes any of it (Niraj, 2026-09-28: "no ai into
 * this just the predictable data"). The snapshot is stored once and never recomputed,
 * so a report reads the same next year as the day it was sent.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = NeonHttpDatabase<any>

export { FREQUENCY_LABEL, lastFullPeriod, nextSendDay, periodEndingBefore, periodLabel, type ReportFrequency } from "./calendar"
import type { ReportFrequency } from "./calendar"

// ─── The snapshot ────────────────────────────────────────────────────────────

export interface ReportTotals { xp: number; activeDays: number; activities: number; minutes: number }

export interface ReportEntry { type: string; title: string; description: string | null; xp: number; at: string }

export interface ReportSnapshot {
    v: 1
    frequency: ReportFrequency
    period: DayRange
    generatedAt: string
    name: string | null
    totals: ReportTotals
    previous: ReportTotals
    /** Percent change per total; null where the previous period was zero. */
    change: Record<keyof ReportTotals, number | null>
    xp: XpSummary
    streak: { current: number; longest: number }
    /** Modules with something done in the period, in Home's order. */
    modules: ModuleSummary[]
    /** Up to three, by the fixed rule in `WIN_WEIGHT`. */
    wins: ReportEntry[]
    /** What is in progress, to pick up next. */
    nextUp: (ModuleItem & { module: string })[]
    /** Every event in the period, newest first (capped at 300). */
    entries: ReportEntry[]
    /**
     * Badges earned in the period (plan/badges BDG-7). Absent on reports stored before
     * badges existed. `title` is the catalogue's; an Incidents badge's title lives in the
     * app, so it carries a readable fallback the app replaces.
     */
    badges?: { key: string; title: string; description: string; glyph: string; earnedAt: string }[]
}

/** Bigger outcomes first; ties go to more XP, then the later one. */
const WIN_WEIGHT: Record<string, number> = {
    PATHFINDER_GOAL_COMPLETED: 100,
    PROJECT_COMPLETED: 95,
    HIRING_RESULTS_SENT: 90,
    INCIDENT_CASE_COMPLETED: 85,
    COMPLETED_MOCK_INTERVIEW: 80,
    PROJECT_SUBMISSION: 75,
    HIRING_ROUND_SCORED: 70,
    INCIDENT_REPORT_READY: 65,
    COMPLETED_PRACTICE_SESSION: 60,
    PROJECT_MOCK_COMPLETED: 55,
    INCIDENT_MOCK_COMPLETED: 55,
    PATHFINDER_STEP_COMPLETED: 50,
    KNOWME_ACTIVATED: 45,
    REFERRAL_REQUESTED: 40,
    PROJECT_QUIZ_COMPLETED: 35,
    PATHFINDER_QUIZ_COMPLETED: 35,
    INCIDENT_ROUND_COMPLETED: 30,
    PROJECT_TASK_COMPLETED: 25,
    COVER_LETTER_CREATED: 20,
    RESUME_CREATED: 20,
    JOB_IMPORTED: 15,
}

function pct(now: number, before: number): number | null {
    return before === 0 ? null : Math.round(((now - before) / before) * 100)
}

async function totalsFor(ex: AnyDb, userId: string, r: DayRange): Promise<ReportTotals> {
    const [t] = await ex.select({
        xp: sql<number>`coalesce(sum(${dailyActivities.totalXpEarned}), 0)::int`,
        activeDays: sql<number>`count(*) filter (where ${dailyActivities.activitiesCount} > 0)::int`,
        activities: sql<number>`coalesce(sum(${dailyActivities.activitiesCount}), 0)::int`,
        minutes: sql<number>`coalesce(sum(${dailyActivities.totalTimeSpent}), 0)::int`,
    }).from(dailyActivities)
        .where(and(eq(dailyActivities.userId, userId), gte(dailyActivities.date, r.from), lte(dailyActivities.date, r.to)))
    return { xp: Number(t?.xp ?? 0), activeDays: Number(t?.activeDays ?? 0), activities: Number(t?.activities ?? 0), minutes: Number(t?.minutes ?? 0) }
}

function hadActivity(m: ModuleSummary, r: DayRange) {
    const counted = Object.values(m.periodTotals).some((v) => v > 0)
    const scored = m.lines.some((l) => l.kind === "score" && m.series.some((p) => p[l.key] != null))
    const touched = m.items.some((i) => i.when.slice(0, 10) >= r.from && i.when.slice(0, 10) <= r.to)
    return counted || scored || touched
}

/**
 * The snapshot for `period`, or null when nothing was recorded in it (an empty period
 * sends nothing and stores nothing).
 */
export async function buildReport(ex: AnyDb, userId: string, frequency: ReportFrequency, period: DayRange): Promise<ReportSnapshot | null> {
    const totals = await totalsFor(ex, userId, period)
    if (totals.activities === 0) return null

    const from = new Date(`${period.from}T00:00:00Z`)
    const until = new Date(`${period.to}T00:00:00Z`); until.setUTCDate(until.getUTCDate() + 1)

    const [previous, xp, userRow, streakRow, entryRows, summaries, badgeRows] = await Promise.all([
        totalsFor(ex, userId, previousRange(period)),
        summarizeXp(ex, userId, period),
        ex.select({ name: users.name }).from(users).where(eq(users.id, userId)),
        ex.select({ current: userStats.currentStreak, longest: userStats.longestStreak }).from(userStats).where(eq(userStats.userId, userId)),
        ex.select({ type: activityEntries.activityType, title: activityEntries.title, description: activityEntries.description, xp: activityEntries.xpEarned, at: activityEntries.createdAt })
            .from(activityEntries)
            .where(and(eq(activityEntries.userId, userId), gte(activityEntries.createdAt, from), sql`${activityEntries.createdAt} < ${until}`))
            .orderBy(desc(activityEntries.createdAt)).limit(300),
        Promise.all(MODULE_ORDER.map((k) => SUMMARIZE[k](ex, userId, period))),
        ex.select({ key: userBadges.badgeKey, at: userBadges.earnedAt }).from(userBadges)
            .where(and(eq(userBadges.userId, userId), gte(userBadges.earnedAt, from), sql`${userBadges.earnedAt} < ${until}`)),
    ])
    const badges = badgeRows.map((r) => {
        const b = BADGE_BY_KEY.get(r.key)
        const fallback = r.key.replace(/^incidents:/, "").replace(/-/g, " ")
        return {
            key: r.key,
            title: b?.title ?? fallback.charAt(0).toUpperCase() + fallback.slice(1),
            description: b?.description ?? "An Incidents badge.",
            glyph: b?.glyph ?? r.key,
            earnedAt: r.at.toISOString(),
        }
    })

    const entries: ReportEntry[] = entryRows.map((e) => ({ type: e.type, title: e.title, description: e.description, xp: e.xp, at: e.at.toISOString() }))
    const wins = [...entries]
        .sort((a, b) => (WIN_WEIGHT[b.type] ?? 0) - (WIN_WEIGHT[a.type] ?? 0) || b.xp - a.xp || b.at.localeCompare(a.at))
        .filter((e) => (WIN_WEIGHT[e.type] ?? 0) > 0)
        .slice(0, 3)
    // A report lists what changed in its period; the all-time latest belong on Home.
    const inPeriod = (i: ModuleItem) => i.when.slice(0, 10) >= period.from && i.when.slice(0, 10) <= period.to
    const modules = summaries
        .filter((m) => !m.empty && hadActivity(m, period))
        .map((m) => ({ ...m, items: m.items.filter(inPeriod), total: m.items.filter(inPeriod).length }))
    const nextUp = summaries
        .flatMap((m) => m.items.filter((i) => i.status === "progress" || i.status === "In progress").map((i) => ({ ...i, module: m.key })))
        .slice(0, 4)

    return {
        v: 1,
        frequency,
        period,
        generatedAt: new Date().toISOString(),
        name: userRow[0]?.name ?? null,
        totals,
        previous,
        change: {
            xp: pct(totals.xp, previous.xp),
            activeDays: pct(totals.activeDays, previous.activeDays),
            activities: pct(totals.activities, previous.activities),
            minutes: pct(totals.minutes, previous.minutes),
        },
        xp,
        streak: { current: streakRow[0]?.current ?? 0, longest: streakRow[0]?.longest ?? 0 },
        modules,
        wins,
        nextUp,
        entries,
        badges,
    }
}


/**
 * Store a snapshot once per (user, frequency, period start). A re-run finds it and
 * returns the existing id with `created: false`, so a retried job never makes two.
 */
export async function storeReport(ex: AnyDb, userId: string, snapshot: ReportSnapshot): Promise<{ id: string; created: boolean; emailedAt: Date | null }> {
    const inserted = await ex.insert(progressReports)
        .values({ userId, frequency: snapshot.frequency, periodStart: snapshot.period.from, periodEnd: snapshot.period.to, data: snapshot })
        .onConflictDoNothing({ target: [progressReports.userId, progressReports.frequency, progressReports.periodStart] })
        .returning({ id: progressReports.id })
    if (inserted[0]) return { id: inserted[0].id, created: true, emailedAt: null }
    const [row] = await ex.select({ id: progressReports.id, emailedAt: progressReports.emailedAt }).from(progressReports)
        .where(and(eq(progressReports.userId, userId), eq(progressReports.frequency, snapshot.frequency), eq(progressReports.periodStart, snapshot.period.from)))
    return { id: row!.id, created: false, emailedAt: row!.emailedAt }
}
