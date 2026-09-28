import { and, eq, sql } from "drizzle-orm"
import type { NeonHttpDatabase } from "drizzle-orm/neon-http"
import { activityEntries, dailyActivities, userStats } from "./schema/activities"
import type { activityTypeEnum } from "./schema/schema"
import { awardBadges } from "./badges"

/*
 * The activity ledger's one writer (plan/progress PRG-2). Server-only: called by server
 * actions, route handlers, worker jobs and scripts, never exposed to a browser.
 *
 * - One entry per event: the `key` is unique per user, so a retry, a re-submit or a
 *   double click records nothing the second time.
 * - It never moves XP. XP is paid where it always was; `xp` here is a copy for display,
 *   so wiring a new event can never pay anyone twice.
 * - It never throws into the caller: recording must not break the thing being recorded.
 * - Days are UTC days, as the ledger has always stored them.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = NeonHttpDatabase<any>

export type ActivityType = (typeof activityTypeEnum.enumValues)[number]

export interface ActivityEvent {
    type: ActivityType
    /** What was done, as the day sheet and reports show it: "Solved Two Sum". */
    title: string
    /** A second line: the module, the difficulty, the score. */
    description?: string | null
    /** XP the event was paid elsewhere, copied for display. */
    xp?: number
    minutes?: number
    /** Unique per user for this event, from `activityKey` below. */
    key: string
    /** When it happened; defaults to now. Backfills pass the original time. */
    at?: Date
    meta?: Record<string, unknown>
}

/** Stable keys, one shape per event, so live recording and the backfill agree. */
export const activityKey = {
    practiceSolved: (sessionId: string) => `practice:solved:${sessionId}`,
    projectTask: (taskStatusId: string) => `project:task:${taskStatusId}`,
    projectSubmitted: (progressId: string) => `project:submitted:${progressId}`,
    projectCompleted: (progressId: string) => `project:completed:${progressId}`,
    projectQuiz: (attemptId: string) => `project:quiz:${attemptId}`,
    projectMock: (sessionId: string) => `project:mock:${sessionId}`,
    mockScored: (sessionId: string) => `mock:scored:${sessionId}`,
    goalStarted: (goalId: string) => `pathfinder:goal-started:${goalId}`,
    goalCompleted: (goalId: string) => `pathfinder:goal-completed:${goalId}`,
    goalVerified: (verificationId: string) => `pathfinder:verified:${verificationId}`,
    stepCompleted: (subGoalId: string) => `pathfinder:step:${subGoalId}`,
    pathfinderQuiz: (attemptId: string) => `pathfinder:quiz:${attemptId}`,
    pathfinderCoding: (subGoalId: string) => `pathfinder:coding:${subGoalId}`,
    incidentCheck: (slug: string, itemId: string) => `incident:check:${slug}:${itemId}`,
    incidentRound: (slug: string, itemId: string) => `incident:round:${slug}:${itemId}`,
    incidentCase: (slug: string) => `incident:case:${slug}`,
    incidentReport: (runId: string) => `incident:report:${runId}`,
    incidentMock: (sessionId: string) => `incident:mock:${sessionId}`,
    roundSubmitted: (attemptId: string) => `hiring:submitted:${attemptId}`,
    roundScored: (attemptId: string) => `hiring:scored:${attemptId}`,
    resultsSent: (sendId: string) => `hiring:sent:${sendId}`,
    referralRequested: (requestId: string) => `referral:requested:${requestId}`,
    jobSaved: (jobId: string) => `job:saved:${jobId}`,
    jobImported: (importId: string) => `job:imported:${importId}`,
    resumeCreated: (draftId: string) => `resume:created:${draftId}`,
    coverLetter: (letterId: string) => `cover-letter:created:${letterId}`,
    knowmeActivated: (profileId: string) => `knowme:activated:${profileId}`,
    ideaPosted: (ideaId: string) => `idea:posted:${ideaId}`,
    ideaVoted: (ideaId: string) => `idea:voted:${ideaId}`,
} as const

/** yyyy-mm-dd of a UTC day. */
export function utcDay(d: Date): string {
    return d.toISOString().slice(0, 10)
}

function dayBefore(day: string): string {
    const d = new Date(`${day}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 1)
    return utcDay(d)
}

/**
 * Record one event. Returns true when it was new, false when the key was already taken
 * or the write failed (logged, never thrown).
 */
export async function recordActivity(ex: AnyDb, userId: string, event: ActivityEvent): Promise<boolean> {
    try {
        const at = event.at ?? new Date()
        const day = utcDay(at)
        const xp = Math.max(0, Math.round(event.xp ?? 0))
        const minutes = Math.max(0, Math.round(event.minutes ?? 0))

        // The day's row first (the entry points at it), totals untouched until we know
        // the entry is new.
        const [dayRow] = await ex.insert(dailyActivities)
            .values({ userId, date: day, hasActivity: true, isStreakDay: true, updatedAt: new Date() })
            .onConflictDoUpdate({ target: [dailyActivities.userId, dailyActivities.date], set: { hasActivity: true, isStreakDay: true } })
            .returning({ id: dailyActivities.id })
        if (!dayRow) return false

        const inserted = await ex.insert(activityEntries)
            .values({
                userId,
                dailyActivityId: dayRow.id,
                activityType: event.type,
                title: event.title.slice(0, 200),
                description: event.description?.slice(0, 300) ?? null,
                xpEarned: xp,
                timeSpent: minutes,
                metadata: event.meta ?? null,
                dedupeKey: event.key,
                createdAt: at,
            })
            .onConflictDoNothing({ target: [activityEntries.userId, activityEntries.dedupeKey] })
            .returning({ id: activityEntries.id })
        if (inserted.length === 0) return false

        await ex.update(dailyActivities)
            .set({
                totalXpEarned: sql`${dailyActivities.totalXpEarned} + ${xp}`,
                totalTimeSpent: sql`${dailyActivities.totalTimeSpent} + ${minutes}`,
                activitiesCount: sql`${dailyActivities.activitiesCount} + 1`,
                updatedAt: new Date(),
            })
            .where(eq(dailyActivities.id, dayRow.id))

        await bumpStreak(ex, userId, day)
        // Badges this event can move (plan/badges BDG-2). A backfilled event (dated in the
        // past) is left to the badges backfill, which dates and quiets them properly.
        if (!event.at || Date.now() - event.at.getTime() < 60_000) await awardBadges(ex, userId, { type: event.type })
        return true
    } catch (error: unknown) {
        console.error("[activity] record failed:", event.key, error instanceof Error ? error.message : error)
        return false
    }
}

/**
 * The streak after an active `day`: the same day changes nothing, the day after the last
 * one adds one, a gap starts again at 1. A day before the last (a backfill) is ignored
 * here; `recomputeStreak` rebuilds from the days instead.
 */
async function bumpStreak(ex: AnyDb, userId: string, day: string) {
    const [row] = await ex.select({ current: userStats.currentStreak, longest: userStats.longestStreak, last: userStats.lastActivityDate })
        .from(userStats).where(eq(userStats.userId, userId))
    if (!row) {
        await ex.insert(userStats)
            .values({ userId, currentStreak: 1, longestStreak: 1, lastActivityDate: new Date(`${day}T00:00:00Z`), updatedAt: new Date() })
            .onConflictDoNothing({ target: userStats.userId })
        return
    }
    const last = row.last ? utcDay(row.last) : null
    if (last && day <= last) return
    const current = last === dayBefore(day) ? row.current + 1 : 1
    await ex.update(userStats)
        .set({ currentStreak: current, longestStreak: Math.max(row.longest, current), lastActivityDate: new Date(`${day}T00:00:00Z`), updatedAt: new Date() })
        .where(eq(userStats.userId, userId))
}

/**
 * The streak rebuilt from every active day (after a backfill). `current` counts back
 * from the last active day only if that day is today or yesterday.
 */
export async function recomputeStreak(ex: AnyDb, userId: string, today = new Date()) {
    const rows = await ex.select({ date: dailyActivities.date }).from(dailyActivities)
        .where(and(eq(dailyActivities.userId, userId), eq(dailyActivities.hasActivity, true)))
    const days = [...new Set(rows.map((r) => String(r.date).slice(0, 10)))].sort()
    if (days.length === 0) return { current: 0, longest: 0 }
    let longest = 1
    let run = 1
    for (let i = 1; i < days.length; i++) {
        run = dayBefore(days[i]!) === days[i - 1] ? run + 1 : 1
        longest = Math.max(longest, run)
    }
    const last = days[days.length - 1]!
    const t = utcDay(today)
    const current = last === t || last === dayBefore(t) ? run : 0
    const values = { currentStreak: current, longestStreak: longest, lastActivityDate: new Date(`${last}T00:00:00Z`), updatedAt: new Date() }
    await ex.insert(userStats).values({ userId, ...values })
        .onConflictDoUpdate({ target: userStats.userId, set: values })
    return { current, longest }
}

/**
 * Set the XP shown on an entry that is already recorded, when the XP is paid after the
 * event (an incident report is recorded by the worker when it is ready, and its XP is
 * paid when the owner first opens it). Moves the day's total by the difference only.
 */
export async function setActivityXp(ex: AnyDb, userId: string, key: string, xp: number): Promise<void> {
    try {
        const [entry] = await ex.select({ id: activityEntries.id, xp: activityEntries.xpEarned, dayId: activityEntries.dailyActivityId })
            .from(activityEntries).where(and(eq(activityEntries.userId, userId), eq(activityEntries.dedupeKey, key)))
        const delta = Math.round(xp) - (entry?.xp ?? 0)
        if (!entry || delta <= 0) return
        await ex.update(activityEntries).set({ xpEarned: Math.round(xp) }).where(eq(activityEntries.id, entry.id))
        await ex.update(dailyActivities).set({ totalXpEarned: sql`${dailyActivities.totalXpEarned} + ${delta}`, updatedAt: new Date() })
            .where(eq(dailyActivities.id, entry.dayId))
    } catch (error: unknown) {
        console.error("[activity] set xp failed:", key, error instanceof Error ? error.message : error)
    }
}
