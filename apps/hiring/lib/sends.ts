import "server-only"
import { and, asc, desc, eq, ne, sql } from "drizzle-orm"
import { db, hiringSends, interviewRounds, jobs, users } from "@repo/db"
import type { SendSnapshot, SentProfile, SnapshotRound } from "@repo/db/hiring-send-types"
// A send whose data was removed (retention, or a deleted account) never shows (plan/hiring-rounds HR-21).
import { notPurged } from "@repo/db/hiring-purge"
import { lockedSendIds } from "@/lib/plan"

/*
 * Reading sends in the hiring app (plan/hiring-rounds HR-18). The thresholds
 * below are decisions recorded in plan/hiring-rounds/overview.md ("Integrity
 * flag"): a round with this many pastes or tab leaves gets a flag in the list.
 * The detail always shows the exact counts; the flag only draws the eye.
 */


export const FLAG_PASTES = 3
export const FLAG_TAB_LEAVES = 5

export function integrityFlag(rounds: SnapshotRound[]): { flagged: boolean; pastes: number; tabLeaves: number } {
    const pastes = rounds.reduce((n, r) => n + r.attempt.integrity.pastes, 0)
    const tabLeaves = rounds.reduce((n, r) => n + r.attempt.integrity.tabLeaves, 0)
    const flagged = rounds.some((r) => r.attempt.integrity.pastes >= FLAG_PASTES || r.attempt.integrity.tabLeaves >= FLAG_TAB_LEAVES)
    return { flagged, pastes, tabLeaves }
}

// ── Queries, scoped to a company (the actions check the permission) ─────────


export interface SendColumn { number: number; title: string; type: string; gateMode: "HARD" | "ADVISORY"; passMark: number }

export interface SendRow {
    id: string
    status: "SENT" | "VIEWED" | "INVITED" | "DECLINED"
    sentAt: string
    name: string
    headline: string
    /** By round number: the sent attempt's score, and its attempt number of how many. */
    scores: Record<number, { score: number; attempt: number; of: number } | undefined>
    average: number | null
    integrity: { flagged: boolean; pastes: number; tabLeaves: number }
    /** Past this month's "applicants a month" (plan/hiring-app HA-20): shown, but not opened until an upgrade or the month turns. */
    locked: boolean
}

export interface JobSends {
    job: { id: string; slug: string; title: string }
    columns: SendColumn[]
    rows: SendRow[]
}

export async function jobSendsFor(companyId: string, jobSlug: string): Promise<JobSends | null> {
    const job = await db.query.jobs.findFirst({ where: and(eq(jobs.slug, jobSlug), eq(jobs.companyId, companyId)), columns: { id: true, slug: true, title: true, interviewProcessId: true } })
    if (!job) return null
    const columns = job.interviewProcessId
        ? await db.select({ number: interviewRounds.roundNumber, title: interviewRounds.title, type: interviewRounds.roundType, gateMode: interviewRounds.gateMode, passMark: interviewRounds.passMark })
            .from(interviewRounds).where(eq(interviewRounds.processId, job.interviewProcessId)).orderBy(asc(interviewRounds.roundNumber))
        : []
    const sends = await db.select({ id: hiringSends.id, status: hiringSends.status, createdAt: hiringSends.createdAt, snapshot: hiringSends.snapshot, profile: hiringSends.profile })
        .from(hiringSends)
        .where(and(eq(hiringSends.jobId, job.id), eq(hiringSends.companyId, companyId), ne(hiringSends.status, "WITHDRAWN"), notPurged))
        .orderBy(desc(hiringSends.createdAt))
    const locked = await lockedSendIds(companyId)
    const rows: SendRow[] = sends.map((s) => {
        if (locked.has(s.id)) {
            return {
                id: s.id, status: s.status as SendRow["status"], sentAt: s.createdAt.toISOString(),
                name: "Locked result", headline: "Past this month's plan limit. Upgrade to open it.",
                scores: {}, average: null, integrity: { flagged: false, pastes: 0, tabLeaves: 0 }, locked: true,
            }
        }
        const snap = s.snapshot as SendSnapshot
        const profile = s.profile as SentProfile
        const scores: SendRow["scores"] = {}
        for (const r of snap.rounds) scores[r.number] = { score: r.attempt.score, attempt: r.attempt.number, of: r.attempt.of }
        const values = snap.rounds.map((r) => r.attempt.score)
        return {
            id: s.id,
            status: s.status as SendRow["status"],
            sentAt: s.createdAt.toISOString(),
            name: profile.name,
            headline: profile.headline,
            scores,
            average: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null,
            integrity: integrityFlag(snap.rounds),
            locked: false,
        }
    })
    return { job: { id: job.id, slug: job.slug, title: job.title }, columns, rows }
}

export interface SendDetail {
    id: string
    status: SendRow["status"]
    sentAt: string
    snapshot: SendSnapshot
    profile: SentProfile
    /** Only after an invite (DoD 10). */
    email: string | null
    companyName: string
    decision: {
        decidedAt: string | null
        feedback: string | null
        /** The team's private note. */
        note: string | null
        companyOutcome: string | null
        studentOutcome: string | null
    }
}

/** One send in full; the first open marks it VIEWED. Withdrawn sends are gone. */
/** The message for a result that's locked by the plan's monthly limit. */
export const LOCKED_SEND = "This result arrived past your plan's applicants for this month. Upgrade in Billing to open it, or it opens when the month turns."

/** Throws LOCKED_SEND when a send is locked by the plan (open, decide, message, draft). */
export async function assertUnlocked(companyId: string, sendId: string): Promise<void> {
    if ((await lockedSendIds(companyId)).has(sendId)) throw new Error(LOCKED_SEND)
}

export async function sendFor(companyId: string, companyName: string, sendId: string): Promise<SendDetail | null> {
    await assertUnlocked(companyId, sendId)
    const [row] = await db.select({ send: hiringSends, email: users.email })
        .from(hiringSends).innerJoin(users, eq(users.id, hiringSends.userId))
        .where(and(eq(hiringSends.id, sendId), eq(hiringSends.companyId, companyId), ne(hiringSends.status, "WITHDRAWN"), notPurged))
    if (!row) return null
    let status = row.send.status
    if (status === "SENT") {
        await db.update(hiringSends).set({ status: "VIEWED" }).where(and(eq(hiringSends.id, sendId), eq(hiringSends.status, "SENT")))
        status = "VIEWED"
    }
    return {
        id: row.send.id,
        status: status as SendRow["status"],
        sentAt: row.send.createdAt.toISOString(),
        snapshot: row.send.snapshot as SendSnapshot,
        profile: row.send.profile as SentProfile,
        email: row.send.emailRevealedAt ? row.email : null,
        companyName,
        decision: {
            decidedAt: row.send.decidedAt?.toISOString() ?? null,
            feedback: row.send.feedback,
            note: row.send.decisionNote,
            companyOutcome: row.send.companyOutcome,
            studentOutcome: row.send.studentOutcome,
        },
    }
}

export interface RoleSends {
    slug: string
    title: string
    status: string
    total: number
    unread: number
    invited: number
    lastAt: string | null
}

/** Every non-draft role with how many results it received (withdrawn ones never counted). */
export async function rolesFor(companyId: string): Promise<RoleSends[]> {
    const rows = await db.select({
        slug: jobs.slug,
        title: jobs.title,
        status: jobs.status,
        total: sql<number>`count(${hiringSends.id}) filter (where ${hiringSends.status} <> 'WITHDRAWN' and ${notPurged})`.mapWith(Number),
        unread: sql<number>`count(${hiringSends.id}) filter (where ${hiringSends.status} = 'SENT')`.mapWith(Number),
        invited: sql<number>`count(${hiringSends.id}) filter (where ${hiringSends.status} = 'INVITED')`.mapWith(Number),
        lastAt: sql<Date | null>`max(${hiringSends.createdAt}) filter (where ${hiringSends.status} <> 'WITHDRAWN' and ${notPurged})`.mapWith(hiringSends.createdAt),
    })
        .from(jobs)
        .leftJoin(hiringSends, eq(hiringSends.jobId, jobs.id))
        .where(and(eq(jobs.companyId, companyId), ne(jobs.status, "DRAFT")))
        .groupBy(jobs.id)
        .orderBy(sql`max(${hiringSends.createdAt}) filter (where ${hiringSends.status} <> 'WITHDRAWN') desc nulls last`, asc(jobs.title))
    return rows.map((r) => ({ ...r, lastAt: r.lastAt ? r.lastAt.toISOString() : null }))
}

export interface CandidateRow {
    userId: string
    name: string
    headline: string
    latestAt: string
    /** Every role they sent to, newest first. */
    roles: { jobSlug: string; jobTitle: string; sendId: string; status: SendRow["status"]; average: number | null; sentAt: string }[]
}

/** Everyone who sent this company results, across roles (plan/hiring-app HA-16). Withdrawn sends are left out. */
export async function candidatesFor(companyId: string): Promise<CandidateRow[]> {
    const rows = await db.select({
        id: hiringSends.id, userId: hiringSends.userId, status: hiringSends.status, createdAt: hiringSends.createdAt,
        snapshot: hiringSends.snapshot, profile: hiringSends.profile, jobSlug: jobs.slug, jobTitle: jobs.title,
    })
        .from(hiringSends).innerJoin(jobs, eq(jobs.id, hiringSends.jobId))
        .where(and(eq(hiringSends.companyId, companyId), ne(hiringSends.status, "WITHDRAWN"), notPurged))
        .orderBy(desc(hiringSends.createdAt))
    const locked = await lockedSendIds(companyId)
    const byUser = new Map<string, CandidateRow>()
    for (const r of rows) {
        if (locked.has(r.id)) continue
        const snap = r.snapshot as SendSnapshot
        const profile = r.profile as SentProfile
        const scores = snap.rounds.map((x) => x.attempt.score)
        const role = {
            jobSlug: r.jobSlug, jobTitle: r.jobTitle, sendId: r.id, status: r.status as SendRow["status"],
            average: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
            sentAt: r.createdAt.toISOString(),
        }
        const existing = byUser.get(r.userId)
        // Rows come newest first, so the first one seen carries the latest name and headline.
        if (existing) existing.roles.push(role)
        else byUser.set(r.userId, { userId: r.userId, name: profile.name, headline: profile.headline, latestAt: role.sentAt, roles: [role] })
    }
    return [...byUser.values()]
}
