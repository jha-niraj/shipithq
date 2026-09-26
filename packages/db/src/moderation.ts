import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "./client"
import { companies } from "./schema/hiring"
import { jobs } from "./schema/jobs"
import { messages, messageThreads } from "./schema/messages"
import { companyBlocks, reports } from "./schema/moderation"
import { users } from "./schema/schema"
import { REPORT_DETAILS_MAX, REPORT_REASONS, type ReportTargetKind } from "./report-reasons"

/*
 * Reporting, blocking, suspending and hiding (plan/hiring-rounds HR-24). The
 * checks every app shares live here, so a suspended company or a hidden job is
 * out of every list and every conversation at once.
 */

/**
 * A job students can see and take: ACTIVE, not hidden by an admin, and its
 * company not suspended. Every student-facing job list uses this, never a bare
 * `status = 'ACTIVE'`.
 */
// The company is named by a raw alias: relational queries (db.query.jobs) re-alias
// every column object in a fragment to the job table, company columns included.
export const jobListed = sql`(${jobs.status} = 'ACTIVE' and ${jobs.adminHiddenAt} is null and not exists (select 1 from "company" "listed_co" where "listed_co"."id" = ${jobs.companyId} and "listed_co"."suspended_at" is not null))`

/** A job whose page can be opened (any status): not hidden, company not suspended. Same raw alias as above. */
export const jobVisible = sql`(${jobs.adminHiddenAt} is null and not exists (select 1 from "company" "visible_co" where "visible_co"."id" = ${jobs.companyId} and "visible_co"."suspended_at" is not null))`

/**
 * A job whose rounds can be taken: visible and published. A closed, paused or
 * filled job stays open for practice (plan/hiring-rounds DoD 18); sending is
 * refused elsewhere.
 */
export const jobPractisable = sql`(${jobs.status} <> 'DRAFT' and ${jobVisible})`

/** A company whose pages and rounds are frozen. */
export async function companySuspended(companyId: string): Promise<boolean> {
    const [c] = await db.select({ at: companies.suspendedAt }).from(companies).where(eq(companies.id, companyId))
    return Boolean(c?.at)
}

export async function isBlocked(userId: string, companyId: string): Promise<boolean> {
    const [b] = await db.select({ id: companyBlocks.id }).from(companyBlocks).where(and(eq(companyBlocks.userId, userId), eq(companyBlocks.companyId, companyId)))
    return Boolean(b)
}

/** Why a company and a student can't talk right now, or null. */
export async function conversationPaused(companyId: string, userId: string): Promise<"SUSPENDED" | "BLOCKED" | null> {
    const [row] = await db.select({
        suspended: companies.suspendedAt,
        blocked: sql<string | null>`(select ${companyBlocks.id} from ${companyBlocks} where ${companyBlocks.userId} = ${userId} and ${companyBlocks.companyId} = ${companyId} limit 1)`,
    }).from(companies).where(eq(companies.id, companyId))
    if (!row) return null
    if (row.suspended) return "SUSPENDED"
    return row.blocked ? "BLOCKED" : null
}

// ── Blocking ─────────────────────────────────────────────────────────────────

export async function blockCompany(userId: string, companyId: string): Promise<void> {
    await db.insert(companyBlocks).values({ userId, companyId }).onConflictDoNothing()
}

export async function unblockCompany(userId: string, companyId: string): Promise<void> {
    await db.delete(companyBlocks).where(and(eq(companyBlocks.userId, userId), eq(companyBlocks.companyId, companyId)))
}

export async function listBlocks(userId: string) {
    return db.select({ companyId: companies.id, name: companies.name, slug: companies.slug, at: companyBlocks.createdAt })
        .from(companyBlocks).innerJoin(companies, eq(companies.id, companyBlocks.companyId))
        .where(eq(companyBlocks.userId, userId))
        .orderBy(desc(companyBlocks.createdAt))
}

// ── Reporting ────────────────────────────────────────────────────────────────

export type ReportResult = { ok: true; id: string; already: boolean } | { ok: false; error: string }

/**
 * File a report. The caller has checked the reporter may see the target (a
 * message in their own thread, a student who sent to their company); this
 * resolves the target's company and a short excerpt for the admin queue.
 */
export async function createReport(input: {
    reporterUserId: string
    reporterCompanyId?: string | null
    targetKind: ReportTargetKind
    targetId: string
    reason: string
    details?: string
}): Promise<ReportResult> {
    if (!REPORT_REASONS[input.targetKind]?.some((r) => r.value === input.reason)) return { ok: false, error: "Pick a reason." }
    const details = (input.details ?? "").trim().slice(0, REPORT_DETAILS_MAX) || null

    let targetCompanyId: string | null = null
    let excerpt: string | null = null
    if (input.targetKind === "COMPANY") {
        const [c] = await db.select({ id: companies.id, name: companies.name }).from(companies).where(eq(companies.id, input.targetId))
        if (!c) return { ok: false, error: "That company is gone." }
        targetCompanyId = c.id
        excerpt = c.name
    } else if (input.targetKind === "JOB") {
        const [j] = await db.select({ companyId: jobs.companyId, title: jobs.title }).from(jobs).where(eq(jobs.id, input.targetId))
        if (!j) return { ok: false, error: "That job is gone." }
        targetCompanyId = j.companyId
        excerpt = j.title
    } else if (input.targetKind === "MESSAGE") {
        const [m] = await db.select({ body: messages.body, companyId: messageThreads.companyId }).from(messages)
            .innerJoin(messageThreads, eq(messageThreads.id, messages.threadId)).where(eq(messages.id, input.targetId))
        if (!m) return { ok: false, error: "That message is gone." }
        targetCompanyId = m.companyId
        excerpt = m.body.slice(0, 500)
    } else {
        const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, input.targetId))
        if (!u) return { ok: false, error: "That candidate is gone." }
        targetCompanyId = input.reporterCompanyId ?? null
        excerpt = u.name
    }

    // One open report per reporter and target: reporting twice keeps the first.
    const [open] = await db.select({ id: reports.id }).from(reports)
        .where(and(eq(reports.reporterUserId, input.reporterUserId), eq(reports.targetKind, input.targetKind), eq(reports.targetId, input.targetId), eq(reports.status, "OPEN")))
    if (open) return { ok: true, id: open.id, already: true }
    const [r] = await db.insert(reports).values({
        reporterUserId: input.reporterUserId,
        reporterCompanyId: input.reporterCompanyId ?? null,
        targetKind: input.targetKind,
        targetId: input.targetId,
        targetCompanyId,
        targetExcerpt: excerpt,
        reason: input.reason,
        details,
    }).onConflictDoNothing().returning({ id: reports.id })
    if (!r) return { ok: true, id: "", already: true }
    return { ok: true, id: r.id, already: false }
}

