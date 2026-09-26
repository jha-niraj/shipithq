import "server-only"
import { and, asc, count, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm"
import {
    db, withTransaction, companies, companyCreditTransactions, companyMembers, companyRoles, companySubscriptions, hiringSends, interviewProcesses, jobs, memberInvitations,
} from "@repo/db"
import { HIRING_PLANS, UNLIMITED, type HiringPlanKey } from "@repo/pricing"

/*
 * Plan limits and company credits (plan/hiring-app HA-20; the decisions are in
 * overview.md, "Plan limits and company credits"; the numbers in
 * @repo/pricing's HIRING_PLANS). Server-only: callers have checked who is
 * asking; everything here is scoped to one company.
 */

/** What an AI extra costs past its free daily allowance (overview.md, HA-20). */
export const EXTRA_CREDIT_COST = { pipelineDraft: 10, aptitudeGeneration: 20 } as const

export type Limits = (typeof HIRING_PLANS)[HiringPlanKey]
export const unlimited = (n: number) => n >= UNLIMITED

/** The plan in force: a paid plan while its period runs (a cancelled one keeps it to the end), otherwise Free. */
export async function effectivePlan(companyId: string): Promise<{ key: HiringPlanKey; limits: Limits }> {
    const sub = await db.query.companySubscriptions.findFirst({ where: eq(companySubscriptions.companyId, companyId), columns: { plan: true, status: true, currentPeriodEnd: true } })
    const paid = sub && sub.plan !== "FREE" && (sub.status === "ACTIVE" || sub.status === "CANCELLED") && (!sub.currentPeriodEnd || sub.currentPeriodEnd.getTime() > Date.now())
    const key = (paid ? sub.plan : "FREE") as HiringPlanKey
    return { key, limits: HIRING_PLANS[key] ?? HIRING_PLANS.FREE }
}

// ── Credits ──────────────────────────────────────────────────────────────────

/** Add credits once per key (a grant or a refund). False when the key was used already. */
async function credit(companyId: string, amount: number, kind: string, reason: string, key: string): Promise<boolean> {
    return withTransaction(async (tx) => {
        const [row] = await tx.insert(companyCreditTransactions).values({ companyId, amount, kind, reason, key })
            .onConflictDoNothing().returning({ id: companyCreditTransactions.id })
        if (!row) return false
        await tx.update(companies).set({ credits: sql`${companies.credits} + ${amount}` }).where(eq(companies.id, companyId))
        return true
    })
}

/**
 * The grants a company is owed, each exactly once: Free's credits on signup, and
 * Pro's monthly credits for the current calendar month while the plan is in
 * force. Safe to call on every read; renewals need no hook of their own.
 */
export async function ensureGrants(companyId: string): Promise<void> {
    const { limits } = await effectivePlan(companyId)
    if (HIRING_PLANS.FREE.creditsOnSignup > 0) await credit(companyId, HIRING_PLANS.FREE.creditsOnSignup, "GRANT_SIGNUP", "Credits to start", "signup")
    if (limits.creditsPerMonth > 0) {
        const month = new Date().toISOString().slice(0, 7)
        await credit(companyId, limits.creditsPerMonth, "GRANT_MONTHLY", `${limits.name} credits for ${month}`, `month:${month}`)
    }
}

export async function creditBalance(companyId: string): Promise<number> {
    const [c] = await db.select({ credits: companies.credits }).from(companies).where(eq(companies.id, companyId))
    return c?.credits ?? 0
}

/** Spend credits, or refuse when the balance is short. `key` makes the charge happen once. */
export async function spendCredits(companyId: string, amount: number, reason: string, key: string, userId?: string): Promise<{ ok: true } | { ok: false; error: string }> {
    await ensureGrants(companyId)
    const done = await withTransaction(async (tx) => {
        const [c] = await tx.update(companies).set({ credits: sql`${companies.credits} - ${amount}` })
            .where(and(eq(companies.id, companyId), sql`${companies.credits} >= ${amount}`)).returning({ credits: companies.credits })
        if (!c) return false
        await tx.insert(companyCreditTransactions).values({ companyId, amount: -amount, kind: "SPEND", reason, key, userId: userId ?? null })
        return true
    })
    if (!done) return { ok: false, error: `This needs ${amount} company credits, and the balance is ${await creditBalance(companyId)}. Top up in Billing.` }
    return { ok: true }
}

/** Give a charge back when the work it paid for failed. Once per charge. */
export async function refundCredits(companyId: string, amount: number, reason: string, chargeKey: string): Promise<void> {
    await credit(companyId, amount, "REFUND", reason, `refund:${chargeKey}`).catch((e: unknown) => console.error("[plan] refund failed:", e))
}

// ── Limits ───────────────────────────────────────────────────────────────────

export type LimitCheck = { ok: true } | { ok: false; error: string }
const over = (limit: number, one: string, many: string, plan: string, note = "") => ({ ok: false as const, error: `Your ${plan} plan allows ${limit} ${limit === 1 ? one : many}${note}. Upgrade in Billing to add more.` })

export async function canPublishJob(companyId: string, jobId?: string): Promise<LimitCheck> {
    const { limits } = await effectivePlan(companyId)
    if (unlimited(limits.maxJobPosts)) return { ok: true }
    const [r] = await db.select({ n: count() }).from(jobs).where(and(eq(jobs.companyId, companyId), eq(jobs.status, "ACTIVE"), jobId ? sql`${jobs.id} <> ${jobId}` : undefined))
    return (r?.n ?? 0) < limits.maxJobPosts ? { ok: true } : over(limits.maxJobPosts, "live job", "live jobs", limits.name)
}

export async function canAddPipeline(companyId: string): Promise<LimitCheck> {
    const { limits } = await effectivePlan(companyId)
    if (unlimited(limits.maxPipelines)) return { ok: true }
    const [r] = await db.select({ n: count() }).from(interviewProcesses)
        .where(and(eq(interviewProcesses.companyId, companyId), eq(interviewProcesses.isTemplate, true), eq(interviewProcesses.isActive, true)))
    return (r?.n ?? 0) < limits.maxPipelines ? { ok: true } : over(limits.maxPipelines, "pipeline", "pipelines", limits.name)
}

/** Members plus pending invitations (they count, overview.md). */
export async function canAddMember(companyId: string): Promise<LimitCheck> {
    const { limits } = await effectivePlan(companyId)
    if (unlimited(limits.maxTeamMembers)) return { ok: true }
    const [[m], [i]] = await Promise.all([
        db.select({ n: count() }).from(companyMembers).where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.isActive, true))),
        db.select({ n: count() }).from(memberInvitations).where(and(eq(memberInvitations.companyId, companyId), eq(memberInvitations.status, "PENDING"), or(isNull(memberInvitations.expiresAt), gt(memberInvitations.expiresAt, sql`now()`)))),
    ])
    const used = (m?.n ?? 0) + (i?.n ?? 0)
    return used < limits.maxTeamMembers ? { ok: true } : over(limits.maxTeamMembers, "team member", "team members", limits.name, " (pending invitations count)")
}

export async function canAddCustomRole(companyId: string): Promise<LimitCheck> {
    const { limits } = await effectivePlan(companyId)
    if (unlimited(limits.maxCustomRoles)) return { ok: true }
    const [r] = await db.select({ n: count() }).from(companyRoles).where(and(eq(companyRoles.companyId, companyId), isNull(companyRoles.presetKey)))
    return (r?.n ?? 0) < limits.maxCustomRoles ? { ok: true } : over(limits.maxCustomRoles, "custom role", "custom roles", limits.name)
}

/**
 * Results locked this month (overview.md): the sends received this calendar
 * month past the plan's "applicants a month", oldest first counted. They open
 * on an upgrade, or when the month turns.
 */
export async function lockedSendIds(companyId: string): Promise<Set<string>> {
    const { limits } = await effectivePlan(companyId)
    if (unlimited(limits.maxApplications)) return new Set()
    const rows = await db.select({ id: hiringSends.id }).from(hiringSends)
        .where(and(eq(hiringSends.companyId, companyId), sql`${hiringSends.createdAt} >= date_trunc('month', now())`))
        .orderBy(asc(hiringSends.createdAt), asc(hiringSends.id))
    return new Set(rows.slice(limits.maxApplications).map((r) => r.id))
}

/**
 * Over a limit after a downgrade (overview.md): live jobs past the plan's
 * number are paused, newest first, never deleted. Returns the ones paused.
 */
export async function enforcePlan(companyId: string): Promise<string[]> {
    const { limits } = await effectivePlan(companyId)
    if (unlimited(limits.maxJobPosts)) return []
    const live = await db.select({ id: jobs.id, title: jobs.title }).from(jobs)
        .where(and(eq(jobs.companyId, companyId), eq(jobs.status, "ACTIVE")))
        .orderBy(desc(jobs.publishedAt), desc(jobs.createdAt))
    const extra = live.slice(0, Math.max(0, live.length - limits.maxJobPosts))
    if (!extra.length) return []
    await db.update(jobs).set({ status: "PAUSED" }).where(and(inArray(jobs.id, extra.map((j) => j.id)), eq(jobs.status, "ACTIVE")))
    return extra.map((j) => j.title)
}

