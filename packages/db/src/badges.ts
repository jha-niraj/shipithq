import { and, eq, inArray, sql, type SQL } from "drizzle-orm"
import type { NeonHttpDatabase } from "drizzle-orm/neon-http"
import { userBadges } from "./schema/progress"
import { notifications } from "./schema/schema"
import type { ActivityType } from "./activity"

/*
 * The platform's badges (plan/badges BDG-2). Each is earned once and kept. A badge's
 * `measure` reads the module's own tables (so work done before the ledger counts) and
 * says how far the user is; it is earned at `max`. `triggers` are the activity types that
 * can move it, so recording an event only measures the badges it could change; a badge
 * with no triggers is measured on every event (streaks, range), and a `lazy` one only when
 * a badges view loads (its inputs are not events, e.g. an idea shipped by the team).
 *
 * Incidents' badges live in the same table as `incidents:<key>`, with rules in its content.
 * No app imports here: the worker awards badges too, through `recordActivity`.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = NeonHttpDatabase<any>

export type BadgeModule = "practice" | "projects" | "mock" | "pathfinder" | "jobs" | "streaks" | "aiTools" | "knowme" | "ideas" | "incidents"

export const BADGE_MODULES: { key: BadgeModule; label: string }[] = [
    { key: "practice", label: "Practice" },
    { key: "projects", label: "Projects" },
    { key: "mock", label: "Mock interviews" },
    { key: "pathfinder", label: "Pathfinder" },
    { key: "incidents", label: "Incidents" },
    { key: "jobs", label: "Jobs and rounds" },
    { key: "streaks", label: "Streaks and range" },
    { key: "aiTools", label: "AI tools" },
    { key: "knowme", label: "KnowMe" },
    { key: "ideas", label: "Ideas" },
]

export interface BadgeDef {
    key: string
    module: BadgeModule
    title: string
    /** How it is earned, one sentence. */
    description: string
    /** A glyph name the app draws (apps/main components/badges/glyphs). */
    glyph: string
    /** Events that can move it; empty: every event. */
    triggers: ActivityType[]
    /** Only measured when a badges view loads. */
    lazy?: boolean
    measure: (ex: AnyDb, userId: string) => Promise<number>
    /** Earned when `measure` reaches this. */
    max: number
    /** "7 of 10 solved"; defaults to "value of max". */
    unit?: string
}

async function one(ex: AnyDb, q: SQL): Promise<number> {
    const r = await ex.execute(q)
    const rows = ((r as unknown as { rows?: { n: number | string | null }[] }).rows ?? (r as unknown as { n: number | string | null }[]))
    return Number(rows[0]?.n ?? 0)
}

const solved = (userId: string, extra = sql``) => sql`
    select count(*)::int as n from practice_user_session s join practice_problem p on p.id = s.problem_id
    where s.user_id = ${userId} and s.status = 'COMPLETED' ${extra}`

/** Which module each activity type belongs to, for All-rounder. */
const TYPE_MODULE: Partial<Record<ActivityType, string>> = {
    COMPLETED_PRACTICE_SESSION: "practice", COMPLETED_DAILY_CHALLENGE: "practice",
    PROJECT_TASK_COMPLETED: "projects", PROJECT_COMPLETED: "projects", PROJECT_SUBMISSION: "projects", PROJECT_QUIZ_COMPLETED: "projects", PROJECT_MOCK_COMPLETED: "projects",
    COMPLETED_MOCK_INTERVIEW: "mock",
    PATHFINDER_GOAL_STARTED: "pathfinder", PATHFINDER_STEP_COMPLETED: "pathfinder", PATHFINDER_QUIZ_COMPLETED: "pathfinder", PATHFINDER_CODING_PASSED: "pathfinder", PATHFINDER_GOAL_COMPLETED: "pathfinder",
    INCIDENT_CHECK_ANSWERED: "incidents", INCIDENT_ROUND_COMPLETED: "incidents", INCIDENT_CASE_COMPLETED: "incidents", INCIDENT_REPORT_READY: "incidents", INCIDENT_MOCK_COMPLETED: "incidents",
    HIRING_ROUND_SCORED: "jobs", HIRING_RESULTS_SENT: "jobs", REFERRAL_REQUESTED: "jobs", JOB_IMPORTED: "jobs",
    RESUME_CREATED: "aiTools", COVER_LETTER_CREATED: "aiTools",
    KNOWME_ACTIVATED: "knowme",
    FEEDBACK_SUBMITTED: "ideas", IDEA_VOTED: "ideas",
}

export const BADGES: BadgeDef[] = [
    // Practice
    { key: "practice-first", module: "practice", title: "First solve", description: "Solve your first practice problem.", glyph: "code", triggers: ["COMPLETED_PRACTICE_SESSION"], max: 1, unit: "solved",
        measure: (ex, u) => one(ex, solved(u)) },
    { key: "practice-ten", module: "practice", title: "Ten down", description: "Solve 10 practice problems.", glyph: "stack", triggers: ["COMPLETED_PRACTICE_SESSION"], max: 10, unit: "solved",
        measure: (ex, u) => one(ex, solved(u)) },
    { key: "practice-fifty", module: "practice", title: "Fifty down", description: "Solve 50 practice problems.", glyph: "mountain", triggers: ["COMPLETED_PRACTICE_SESSION"], max: 50, unit: "solved",
        measure: (ex, u) => one(ex, solved(u)) },
    { key: "practice-hard", module: "practice", title: "Went hard", description: "Solve a Hard problem.", glyph: "bolt", triggers: ["COMPLETED_PRACTICE_SESSION"], max: 1, unit: "Hard solved",
        measure: (ex, u) => one(ex, solved(u, sql`and p.difficulty = 'HARD'`)) },
    // Projects
    { key: "projects-first-task", module: "projects", title: "First task", description: "Finish your first project task.", glyph: "check", triggers: ["PROJECT_TASK_COMPLETED"], max: 1, unit: "tasks",
        measure: (ex, u) => one(ex, sql`select count(*)::int as n from user_task_v2_status where user_id = ${u} and status = 'COMPLETED'`) },
    { key: "projects-finisher", module: "projects", title: "Finisher", description: "Finish every task in a project.", glyph: "flag", triggers: ["PROJECT_COMPLETED", "PROJECT_TASK_COMPLETED"], max: 1, unit: "projects",
        measure: (ex, u) => one(ex, sql`select count(*)::int as n from user_project_v2_progress where user_id = ${u} and completed_at is not null`) },
    { key: "projects-shipped", module: "projects", title: "Shipped", description: "Submit a finished project.", glyph: "rocket", triggers: ["PROJECT_SUBMISSION"], max: 1, unit: "submitted",
        measure: (ex, u) => one(ex, sql`select count(*)::int as n from user_project_v2_progress where user_id = ${u} and submitted_at is not null`) },
    // Mock interviews
    { key: "mock-first", module: "mock", title: "On the record", description: "Finish a mock interview and get it scored.", glyph: "mic", triggers: ["COMPLETED_MOCK_INTERVIEW"], max: 1, unit: "scored",
        measure: (ex, u) => one(ex, sql`select count(*)::int as n from mock_voice_session where user_id = ${u} and status = 'COMPLETED' and ai_analysis ? 'overallScore'`) },
    { key: "mock-strong", module: "mock", title: "Strong answer", description: "Score 80 or more in a mock interview.", glyph: "star", triggers: ["COMPLETED_MOCK_INTERVIEW"], max: 80, unit: "best score",
        measure: (ex, u) => one(ex, sql`select coalesce(max(round(nullif(ai_analysis->>'overallScore', '')::numeric)), 0)::int as n from mock_voice_session where user_id = ${u} and status = 'COMPLETED'`) },
    // Pathfinder
    { key: "pathfinder-goal", module: "pathfinder", title: "Goal set", description: "Start a career goal in Pathfinder.", glyph: "target", triggers: ["PATHFINDER_GOAL_STARTED"], max: 1, unit: "goals",
        measure: (ex, u) => one(ex, sql`select count(*)::int as n from pathfinder_goal where user_id = ${u}`) },
    { key: "pathfinder-verified", module: "pathfinder", title: "Verified", description: "Pass a goal's verification.", glyph: "shield", triggers: ["PATHFINDER_GOAL_COMPLETED"], max: 1, unit: "verified",
        measure: (ex, u) => one(ex, sql`select count(*)::int as n from pathfinder_goal where user_id = ${u} and status = 'COMPLETED'`) },
    // Jobs
    { key: "jobs-first-round", module: "jobs", title: "First round", description: "Get a company round scored.", glyph: "briefcase", triggers: ["HIRING_ROUND_SCORED"], max: 1, unit: "scored",
        measure: (ex, u) => one(ex, sql`select count(*)::int as n from hiring_attempt a join hiring_run h on h.id = a.run_id where h.user_id = ${u} and a.status = 'SCORED'`) },
    { key: "jobs-sent", module: "jobs", title: "In their inbox", description: "Send your results to a company.", glyph: "send", triggers: ["HIRING_RESULTS_SENT"], max: 1, unit: "sent",
        measure: (ex, u) => one(ex, sql`select count(*)::int as n from hiring_send where user_id = ${u}`) },
    // Streaks and range
    { key: "streak-7", module: "streaks", title: "Week straight", description: "Do something 7 days in a row.", glyph: "flame", triggers: [], max: 7, unit: "days in a row",
        measure: (ex, u) => one(ex, sql`select coalesce(max(longest_streak), 0)::int as n from user_stats where user_id = ${u}`) },
    { key: "streak-30", module: "streaks", title: "Month straight", description: "Do something 30 days in a row.", glyph: "calendar", triggers: [], max: 30, unit: "days in a row",
        measure: (ex, u) => one(ex, sql`select coalesce(max(longest_streak), 0)::int as n from user_stats where user_id = ${u}`) },
    { key: "active-50", module: "streaks", title: "Fifty days", description: "Be active on 50 different days.", glyph: "grid", triggers: [], max: 50, unit: "active days",
        measure: (ex, u) => one(ex, sql`select count(*)::int as n from daily_activity where user_id = ${u} and activities_count > 0`) },
    { key: "all-rounder", module: "streaks", title: "All-rounder", description: "Do something in 5 different modules.", glyph: "compass", triggers: [], max: 5, unit: "modules",
        measure: async (ex, u) => {
            const r = await ex.execute(sql`select distinct activity_type as t from activity_entry where user_id = ${u}`)
            const rows = ((r as unknown as { rows?: { t: string }[] }).rows ?? (r as unknown as { t: string }[]))
            return new Set(rows.map((x) => TYPE_MODULE[x.t as ActivityType]).filter(Boolean)).size
        } },
    // AI tools, KnowMe
    { key: "ai-resume", module: "aiTools", title: "Resume ready", description: "Make a resume.", glyph: "file", triggers: ["RESUME_CREATED"], max: 1, unit: "resumes",
        measure: (ex, u) => one(ex, sql`select count(*)::int as n from resume_draft where user_id = ${u}`) },
    { key: "ai-letter", module: "aiTools", title: "Dear hiring manager", description: "Write a cover letter.", glyph: "letter", triggers: ["COVER_LETTER_CREATED"], max: 1, unit: "letters",
        measure: (ex, u) => one(ex, sql`select count(*)::int as n from cover_letter where user_id = ${u} and generated_content is not null`) },
    { key: "knowme-live", module: "knowme", title: "Out there", description: "Put your KnowMe profile live.", glyph: "user", triggers: ["KNOWME_ACTIVATED"], max: 1,
        measure: (ex, u) => one(ex, sql`select count(*)::int as n from know_me_profile where user_id = ${u} and onboarding_completed`) },
    // Ideas
    { key: "ideas-posted", module: "ideas", title: "Idea person", description: "Post an idea for ShipItHQ.", glyph: "bulb", triggers: ["FEEDBACK_SUBMITTED"], max: 1, unit: "ideas",
        measure: (ex, u) => one(ex, sql`select count(*)::int as n from feedback where user_id = ${u}`) },
    { key: "ideas-shipped", module: "ideas", title: "It shipped", description: "Have an idea of yours shipped by the team.", glyph: "gift", triggers: [], lazy: true, max: 1, unit: "shipped",
        measure: (ex, u) => one(ex, sql`select count(*)::int as n from feedback where user_id = ${u} and status = 'COMPLETED'`) },
]

export const BADGE_BY_KEY = new Map(BADGES.map((b) => [b.key, b]))

export interface AwardOptions {
    /** Only the badges this event can move (every non-lazy badge when absent). */
    type?: ActivityType
    /** Also measure the lazy ones (a badges view loading). */
    includeLazy?: boolean
    /** Write an Inbox note per new badge (off for the backfill: old news). */
    notify?: boolean
    /** Mark new badges seen, so no toast (the backfill). */
    seen?: boolean
    earnedAt?: Date
}

/** Measure, insert the ones reached, note each new one in the Inbox. The new badges. */
export async function awardBadges(ex: AnyDb, userId: string, opts: AwardOptions = {}): Promise<BadgeDef[]> {
    try {
        const have = new Set((await ex.select({ key: userBadges.badgeKey }).from(userBadges).where(eq(userBadges.userId, userId))).map((r) => r.key))
        const candidates = BADGES.filter((b) =>
            !have.has(b.key)
            && (!b.lazy || opts.includeLazy)
            && (!opts.type || b.triggers.length === 0 || b.triggers.includes(opts.type)))
        if (!candidates.length) return []
        const values = await Promise.all(candidates.map((b) => b.measure(ex, userId)))
        const reached = candidates.filter((_, i) => values[i]! >= candidates[i]!.max)
        if (!reached.length) return []
        const now = opts.earnedAt ?? new Date()
        const inserted = await ex.insert(userBadges)
            .values(reached.map((b) => ({ userId, badgeKey: b.key, earnedAt: now, seenAt: opts.seen ? now : null })))
            .onConflictDoNothing({ target: [userBadges.userId, userBadges.badgeKey] })
            .returning({ key: userBadges.badgeKey })
        const fresh = inserted.map((r) => BADGE_BY_KEY.get(r.key)!).filter(Boolean)
        if (fresh.length && opts.notify !== false) {
            await ex.insert(notifications).values(fresh.map((b) => ({
                userId,
                platform: "MAIN" as const,
                kind: "GENERAL",
                title: `Badge earned: ${b.title}`,
                message: b.description,
                type: "SUCCESS" as const,
                actionUrl: "/badges",
                context: { label: "Badges", href: "/badges" },
                updatedAt: new Date(),
            })))
        }
        return fresh
    } catch (error: unknown) {
        console.error("[badges] award failed:", error instanceof Error ? error.message : error)
        return []
    }
}

export interface BadgeState {
    key: string
    module: BadgeModule
    title: string
    description: string
    glyph: string
    earned: boolean
    earnedAt: string | null
    value: number
    max: number
    unit?: string
}

/** Every platform badge's state for a user (the views). Awards any lazy ones reached first. */
export async function badgeStates(ex: AnyDb, userId: string): Promise<BadgeState[]> {
    await awardBadges(ex, userId, { includeLazy: true })
    const rows = await ex.select({ key: userBadges.badgeKey, at: userBadges.earnedAt }).from(userBadges)
        .where(and(eq(userBadges.userId, userId), inArray(userBadges.badgeKey, BADGES.map((b) => b.key))))
    const earned = new Map(rows.map((r) => [r.key, r.at]))
    const values = await Promise.all(BADGES.map((b) => (earned.has(b.key) ? Promise.resolve(b.max) : b.measure(ex, userId))))
    return BADGES.map((b, i) => ({
        key: b.key, module: b.module, title: b.title, description: b.description, glyph: b.glyph,
        earned: earned.has(b.key),
        earnedAt: earned.get(b.key)?.toISOString() ?? null,
        value: Math.min(values[i]!, b.max),
        max: b.max,
        unit: b.unit,
    }))
}

/** Badges earned but not yet toasted (BDG-8), and marking them seen. */
export async function unseenBadges(ex: AnyDb, userId: string) {
    return ex.select({ key: userBadges.badgeKey, earnedAt: userBadges.earnedAt }).from(userBadges)
        .where(and(eq(userBadges.userId, userId), sql`${userBadges.seenAt} is null`))
}

export async function markBadgesSeen(ex: AnyDb, userId: string, keys: string[]) {
    if (!keys.length) return
    await ex.update(userBadges).set({ seenAt: new Date() })
        .where(and(eq(userBadges.userId, userId), inArray(userBadges.badgeKey, keys)))
}
