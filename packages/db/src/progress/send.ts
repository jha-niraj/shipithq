import { and, asc, eq, gt, gte, isNull, lte, or } from "drizzle-orm"
import type { NeonHttpDatabase } from "drizzle-orm/neon-http"
import { dailyActivities } from "../schema/activities"
import { progressReports, reportPreferences } from "../schema/progress"
import { users } from "../schema/schema"
import type { ModuleKey } from "./modules"
import { FREQUENCY_LABEL, buildReport, periodEndingBefore, periodLabel, storeReport, type ReportFrequency, type ReportSnapshot } from "./report"

/*
 * Sending progress reports (plan/progress PRG-10). One batch: the users due a report of
 * `frequency` for the period that ended before `day`, after `afterUserId`, at most
 * `limit`. Each is built, stored (once per period, so a retry is safe) and emailed; a
 * report whose email failed keeps `emailed_at` null and the retry pass sends it. Shared
 * by the worker's Durable Object (which passes the email sender, @repo/email/progress)
 * and `pnpm script progress-reports-run` (which stores without sending).
 */

/** What the email needs; the shape of @repo/email's `ProgressEmailInput`. */
export interface ProgressEmailInput {
    to: string
    name: string | null
    periodWord: string
    kindLabel: string
    periodLabel: string
    stats: { label: string; value: string; change: string | null }[]
    wins: { title: string; detail: string }[]
    modules: { title: string; line: string }[]
    /** Badges earned in the period (plan/badges BDG-7). */
    badges?: { title: string; detail: string }[]
    reportUrl: string
    settingsUrl: string
    unsubscribeUrl: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = NeonHttpDatabase<any>

export const FREQUENCIES: ReportFrequency[] = ["WEEKLY", "HALF_MONTHLY", "MONTHLY"]

const PERIOD_WORD: Record<ReportFrequency, string> = { WEEKLY: "week", HALF_MONTHLY: "two weeks", MONTHLY: "month" }
const MODULE_TITLE: Record<ModuleKey, string> = {
    projects: "Projects", practice: "Practice", mock: "Mock interviews", pathfinder: "Pathfinder", incidents: "Incidents",
    jobs: "Jobs and rounds", aiTools: "AI tools", knowme: "KnowMe", ideas: "Ideas",
}

export type SendFn = (input: ProgressEmailInput) => Promise<boolean>

export interface BatchResult {
    considered: number; stored: number; emailed: number; empty: number; failed: number
    lastUserId: string | null; done: boolean
    /** Dry runs only: one line per user, what their report would say. */
    preview?: string[]
}

/**
 * Users due a report: their saved frequency is this one (no row counts as WEEKLY, the
 * default), and they recorded something in the period. Ordered by id for the cursor.
 */
async function dueUsers(ex: AnyDb, frequency: ReportFrequency, period: { from: string; to: string }, afterUserId: string | null, limit: number, onlyEmail?: string) {
    const prefersIt = frequency === "WEEKLY"
        ? or(isNull(reportPreferences.userId), eq(reportPreferences.frequency, "WEEKLY"))
        : eq(reportPreferences.frequency, frequency)
    return ex.selectDistinct({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .innerJoin(dailyActivities, and(eq(dailyActivities.userId, users.id), gte(dailyActivities.date, period.from), lte(dailyActivities.date, period.to), gt(dailyActivities.activitiesCount, 0)))
        .leftJoin(reportPreferences, eq(reportPreferences.userId, users.id))
        .where(and(prefersIt, afterUserId ? gt(users.id, afterUserId) : undefined, onlyEmail ? eq(users.email, onlyEmail) : undefined))
        .orderBy(asc(users.id))
        .limit(limit)
}

/** The user's unsubscribe token, making their preference row (WEEKLY) if they have none. */
async function unsubscribeToken(ex: AnyDb, userId: string): Promise<string> {
    await ex.insert(reportPreferences).values({ userId }).onConflictDoNothing({ target: reportPreferences.userId })
    const [row] = await ex.select({ token: reportPreferences.unsubscribeToken }).from(reportPreferences).where(eq(reportPreferences.userId, userId))
    return row!.token
}

function change(v: number | null): string | null {
    if (v === null) return null
    if (v === 0) return "same as before"
    return `${v > 0 ? "+" : ""}${v}% vs before`
}

export function emailInput(s: ReportSnapshot, to: string, urls: { report: string; settings: string; unsubscribe: string }): ProgressEmailInput {
    return {
        to,
        name: s.name,
        periodWord: PERIOD_WORD[s.frequency],
        kindLabel: `${FREQUENCY_LABEL[s.frequency]} report`,
        periodLabel: periodLabel(s.period),
        stats: [
            { label: "XP earned", value: s.totals.xp.toLocaleString("en"), change: change(s.change.xp) },
            { label: "Active days", value: String(s.totals.activeDays), change: change(s.change.activeDays) },
            { label: "Things done", value: String(s.totals.activities), change: change(s.change.activities) },
            { label: "Streak", value: `${s.streak.current}d`, change: `longest ${s.streak.longest}d` },
        ],
        wins: s.wins.map((w) => ({ title: w.title, detail: [w.description, w.xp > 0 ? `+${w.xp} XP` : null].filter(Boolean).join(" · ") })),
        modules: s.modules.map((m) => ({
            title: MODULE_TITLE[m.key],
            line: m.lines.filter((l) => l.kind === "count").map((l) => `${m.periodTotals[l.key] ?? 0} ${l.label.toLowerCase()}`).join(" · ") || `${m.items.length} updated`,
        })),
        badges: (s.badges ?? []).map((b) => ({ title: b.title, detail: b.description })),
        reportUrl: urls.report,
        settingsUrl: urls.settings,
        unsubscribeUrl: urls.unsubscribe,
    }
}

export async function runReportBatch(ex: AnyDb, opts: {
    frequency: ReportFrequency
    /** The send day; the period is the one that ended the day before. */
    day: Date
    appUrl: string
    send: SendFn | null
    afterUserId?: string | null
    limit?: number
    onlyEmail?: string
    /** Build each report but store and send nothing (the preview). */
    dryRun?: boolean
}): Promise<BatchResult> {
    const period = periodEndingBefore(opts.frequency, opts.day)
    const out: BatchResult = { considered: 0, stored: 0, emailed: 0, empty: 0, failed: 0, lastUserId: opts.afterUserId ?? null, done: true }
    if (!period) return out
    const limit = opts.limit ?? 20
    const due = await dueUsers(ex, opts.frequency, period, opts.afterUserId ?? null, limit, opts.onlyEmail)
    out.done = due.length < limit
    const app = opts.appUrl.replace(/\/+$/, "")

    for (const u of due) {
        out.considered++
        out.lastUserId = u.id
        try {
            const snapshot = await buildReport(ex, u.id, opts.frequency, period)
            if (!snapshot) { out.empty++; continue }
            if (opts.dryRun) {
                (out.preview ??= []).push(`${u.email}: ${snapshot.totals.xp} XP, ${snapshot.totals.activities} done on ${snapshot.totals.activeDays} day${snapshot.totals.activeDays === 1 ? "" : "s"}, modules ${snapshot.modules.map((m) => m.key).join(", ") || "-"}`)
                continue
            }
            const stored = await storeReport(ex, u.id, snapshot)
            if (stored.created) out.stored++
            if (stored.emailedAt || !opts.send) continue
            const token = await unsubscribeToken(ex, u.id)
            const ok = await opts.send(emailInput(snapshot, u.email, {
                report: `${app}/reports/${stored.id}`,
                settings: `${app}/settings/reports`,
                unsubscribe: `${app}/unsubscribe/reports?token=${encodeURIComponent(token)}`,
            }))
            if (ok) {
                await ex.update(progressReports).set({ emailedAt: new Date() }).where(eq(progressReports.id, stored.id))
                out.emailed++
            } else {
                out.failed++
            }
        } catch (error: unknown) {
            out.failed++
            console.error(`[progress-reports] ${u.id} failed:`, error instanceof Error ? error.message : error)
        }
    }
    return out
}

/** Which frequencies send on `day` (Monday: weekly; the 1st: two-weekly and monthly; the 16th: two-weekly). */
export function frequenciesDue(day: Date): ReportFrequency[] {
    return FREQUENCIES.filter((f) => periodEndingBefore(f, day) !== null)
}
