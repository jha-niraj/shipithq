"use server"

import { and, asc, count, desc, eq, gt, gte, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import {
    db, aptitudeQuestions, companies, companyRequests, creditTransactions, interviewReportQuestions, interviewReportRounds,
    interviewReports, notifyUser, practiceProblem, users, withTransaction,
} from "@repo/db"
import { checkModuleAccess } from "@/lib/module-access"
import { logAdminAudit } from "@/lib/audit-log"

/*
 * The interview report queue (plan/competition/skillmeet CMP-1d). An admin
 * reads each report with who filed it, can edit or remove a question (personal
 * data, a leaked confidential test), then approves or rejects it. The student
 * hears either way. Decisions, round 3 (Niraj, 2026-09-26): 10 credits per
 * approved report, at most 5 paid to one student in a rolling 30 days.
 */

const REWARD = 10
const PAID_PER_30_DAYS = 5
const DAY_MS = 86_400_000

type Result<T> = { success: true; data: T } | { success: false; error: string }
export type ReportTab = "PENDING" | "APPROVED" | "REJECTED"

export interface InterviewReportRow {
    id: string
    status: ReportTab
    company: { name: string; slug: string | null; pending: boolean }
    role: string
    /** The group it counts in (CMP-2); the reviewer may correct it. */
    roleFamily: string
    level: string
    month: string
    outcome: string
    reporter: { id: string; name: string | null; email: string } | null
    /** Approved reports already paid to this student in the last 30 days. */
    paidRecently: number
    rounds: { position: number; type: string; title: string | null; minutes: number | null; questions: { id: string; text: string; link: string | null; sameAs: string | null }[] }[]
    rejectReason: string | null
    creditsRewarded: number
    createdAt: string
    reviewedAt: string | null
}

export async function listInterviewReports(tab: ReportTab): Promise<Result<{ rows: InterviewReportRow[]; pending: number }>> {
    const access = await checkModuleAccess("hiring", "read")
    if (!access.authorized) return { success: false, error: access.error }
    try {
        const [rows, [pending]] = await Promise.all([
            db.select().from(interviewReports).where(eq(interviewReports.status, tab))
                .orderBy(tab === "PENDING" ? asc(interviewReports.createdAt) : desc(interviewReports.reviewedAt)).limit(100),
            db.select({ n: count() }).from(interviewReports).where(eq(interviewReports.status, "PENDING")),
        ])
        const ids = rows.map((r) => r.id)
        const companyIds = [...new Set(rows.map((r) => r.companyId).filter((x): x is string => Boolean(x)))]
        const requestIds = [...new Set(rows.map((r) => r.companyRequestId).filter((x): x is string => Boolean(x)))]
        const userIds = [...new Set(rows.map((r) => r.userId).filter((x): x is string => Boolean(x)))]
        const since = new Date(Date.now() - 30 * DAY_MS)
        const [cos, reqs, people, paid, rounds, questions] = await Promise.all([
            companyIds.length ? db.select({ id: companies.id, name: companies.name, slug: companies.slug }).from(companies).where(inArray(companies.id, companyIds)) : [],
            requestIds.length ? db.select({ id: companyRequests.id, name: companyRequests.name }).from(companyRequests).where(inArray(companyRequests.id, requestIds)) : [],
            userIds.length ? db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, userIds)) : [],
            userIds.length
                ? db.select({ userId: interviewReports.userId, n: count() }).from(interviewReports)
                    .where(and(inArray(interviewReports.userId, userIds), gt(interviewReports.creditsRewarded, 0), gte(interviewReports.reviewedAt, since))).groupBy(interviewReports.userId)
                : [],
            ids.length ? db.select().from(interviewReportRounds).where(inArray(interviewReportRounds.reportId, ids)).orderBy(asc(interviewReportRounds.position)) : [],
            ids.length
                ? db.select({ q: interviewReportQuestions, problem: practiceProblem.title, aptitude: aptitudeQuestions.prompt }).from(interviewReportQuestions)
                    .leftJoin(practiceProblem, eq(practiceProblem.id, interviewReportQuestions.practiceProblemId))
                    .leftJoin(aptitudeQuestions, eq(aptitudeQuestions.id, interviewReportQuestions.aptitudeQuestionId))
                    .where(inArray(interviewReportQuestions.reportId, ids)).orderBy(asc(interviewReportQuestions.position))
                : [],
        ])
        const sameAsIds = [...new Set(questions.map((q) => q.q.sameAsId).filter((x): x is string => Boolean(x)))]
        const sameAsText = sameAsIds.length ? await db.select({ id: interviewReportQuestions.id, text: interviewReportQuestions.text }).from(interviewReportQuestions).where(inArray(interviewReportQuestions.id, sameAsIds)) : []
        const out: InterviewReportRow[] = rows.map((r) => {
            const co = cos.find((c) => c.id === r.companyId)
            const req = reqs.find((q) => q.id === r.companyRequestId)
            const who = people.find((p) => p.id === r.userId)
            return {
                id: r.id,
                status: r.status,
                company: co ? { name: co.name, slug: co.slug, pending: false } : { name: req?.name ?? "A company", slug: null, pending: true },
                role: r.role,
                roleFamily: r.roleFamily,
                level: r.level,
                month: String(r.interviewedOn).slice(0, 7),
                outcome: r.outcome,
                reporter: who ? { id: who.id, name: who.name, email: who.email } : null,
                paidRecently: Number(paid.find((p) => p.userId === r.userId)?.n ?? 0),
                rounds: rounds.filter((x) => x.reportId === r.id).map((x) => ({
                    position: x.position, type: x.roundType, title: x.title, minutes: x.minutes,
                    questions: questions.filter((q) => q.q.roundId === x.id).map((q) => ({
                        id: q.q.id, text: q.q.text,
                        link: q.problem ? `Problem: ${q.problem}` : q.aptitude ? `Aptitude: ${q.aptitude.slice(0, 80)}` : null,
                        sameAs: q.q.sameAsId ? (sameAsText.find((x) => x.id === q.q.sameAsId)?.text ?? "an earlier question") : null,
                    })),
                })),
                rejectReason: r.rejectReason,
                creditsRewarded: r.creditsRewarded,
                createdAt: r.createdAt.toISOString(),
                reviewedAt: r.reviewedAt?.toISOString() ?? null,
            }
        })
        return { success: true, data: { rows: out, pending: pending?.n ?? 0 } }
    } catch (error: unknown) {
        console.error("listInterviewReports:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load interview reports" }
    }
}

/** Only a pending report's questions can be changed. */
async function pendingQuestion(id: string) {
    const [q] = await db.select({ id: interviewReportQuestions.id, reportId: interviewReportQuestions.reportId, status: interviewReports.status })
        .from(interviewReportQuestions).innerJoin(interviewReports, eq(interviewReports.id, interviewReportQuestions.reportId))
        .where(eq(interviewReportQuestions.id, id))
    return q && q.status === "PENDING" ? q : null
}

/** Reword a question: strip a name or a detail that identifies someone. */
export async function editReportQuestion(id: string, text: string): Promise<Result<null>> {
    const access = await checkModuleAccess("hiring", "write")
    if (!access.authorized) return { success: false, error: access.error }
    const clean = text.replace(/\s+/g, " ").trim().slice(0, 600)
    if (!clean) return { success: false, error: "A question needs its text. Remove it instead." }
    try {
        const q = await pendingQuestion(id)
        if (!q) return { success: false, error: "Only a report in review can be edited." }
        const key = clean.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()
        await db.update(interviewReportQuestions).set({ text: clean, questionKey: key }).where(eq(interviewReportQuestions.id, id))
        revalidatePath("/hiring/interview-reports")
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("editReportQuestion:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not save the question" }
    }
}

/** Remove a question: personal data, or a test the company asked candidates to keep confidential. */
export async function removeReportQuestion(id: string): Promise<Result<null>> {
    const access = await checkModuleAccess("hiring", "write")
    if (!access.authorized) return { success: false, error: access.error }
    try {
        const q = await pendingQuestion(id)
        if (!q) return { success: false, error: "Only a report in review can be edited." }
        await db.delete(interviewReportQuestions).where(eq(interviewReportQuestions.id, id))
        revalidatePath("/hiring/interview-reports")
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("removeReportQuestion:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not remove the question" }
    }
}

/**
 * Publish a report into the aggregates, and pay its author 10 credits unless
 * they've been paid for 5 in the last 30 days. One transaction: the status, the
 * balance and the ledger line move together.
 */
export async function approveInterviewReport(id: string): Promise<Result<{ credits: number }>> {
    const access = await checkModuleAccess("hiring", "write")
    if (!access.authorized) return { success: false, error: access.error }
    try {
        const credits = await withTransaction(async (tx) => {
            const [r] = await tx.update(interviewReports)
                .set({ status: "APPROVED", reviewedBy: access.adminAccess.id, reviewedAt: new Date(), rejectReason: null })
                .where(and(eq(interviewReports.id, id), eq(interviewReports.status, "PENDING")))
                .returning({ userId: interviewReports.userId })
            if (!r) return null
            if (!r.userId) return 0
            // One approval per student at a time: two admins approving at once would both count 4
            // and pay a sixth (a review finding). The lock ends with the transaction.
            await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"interview-report-pay:" + r.userId}))`)
            const [{ n } = { n: 0 }] = await tx.select({ n: count() }).from(interviewReports)
                .where(and(eq(interviewReports.userId, r.userId), gt(interviewReports.creditsRewarded, 0), gte(interviewReports.reviewedAt, new Date(Date.now() - 30 * DAY_MS))))
            if (Number(n) >= PAID_PER_30_DAYS) return 0
            await tx.update(users).set({ credits: sql`${users.credits} + ${REWARD}` }).where(eq(users.id, r.userId))
            await tx.insert(creditTransactions).values({ userId: r.userId, amount: REWARD, currency: "INR", type: "BONUS", description: "Interview report approved" })
            await tx.update(interviewReports).set({ creditsRewarded: REWARD }).where(eq(interviewReports.id, id))
            return REWARD
        })
        if (credits === null) return { success: false, error: "That report was already reviewed." }
        const [row] = await db.select({ userId: interviewReports.userId }).from(interviewReports).where(eq(interviewReports.id, id))
        if (row?.userId) {
            await notifyUser(row.userId, {
                platform: "MAIN",
                kind: "INTERVIEW_REPORT_REVIEWED",
                severity: "SUCCESS",
                title: "Your interview report is published",
                body: credits > 0
                    ? `Thanks. It now counts toward what students see, and ${credits} credits are in your account.`
                    : `Thanks. It now counts toward what students see. You've been paid for ${PAID_PER_30_DAYS} reports in the last 30 days, so this one earns no credits.`,
                actor: { name: "ShipItHQ" },
                href: "/jobs/rounds",
            }).catch((e: unknown) => console.error("notify INTERVIEW_REPORT_REVIEWED:", e))
        }
        await logAdminAudit({ adminId: access.adminAccess.id, action: "UPDATE", module: "hiring", resourceType: "InterviewReport", resourceId: id, description: `Approved an interview report (${credits} credits)` })
        revalidatePath("/hiring/interview-reports")
        return { success: true, data: { credits } }
    } catch (error: unknown) {
        console.error("approveInterviewReport:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not approve the report" }
    }
}

/** Keep a report out of the aggregates; its author is told why. */
export async function rejectInterviewReport(id: string, reason: string): Promise<Result<null>> {
    const access = await checkModuleAccess("hiring", "write")
    if (!access.authorized) return { success: false, error: access.error }
    const why = reason.replace(/\s+/g, " ").trim().slice(0, 500)
    if (why.length < 5) return { success: false, error: "Say why, in a sentence the student will read." }
    try {
        const [r] = await db.update(interviewReports)
            .set({ status: "REJECTED", rejectReason: why, reviewedBy: access.adminAccess.id, reviewedAt: new Date() })
            .where(and(eq(interviewReports.id, id), eq(interviewReports.status, "PENDING")))
            .returning({ userId: interviewReports.userId })
        if (!r) return { success: false, error: "That report was already reviewed." }
        if (r.userId) {
            await notifyUser(r.userId, {
                platform: "MAIN",
                kind: "INTERVIEW_REPORT_REVIEWED",
                title: "Your interview report wasn't published",
                body: why,
                actor: { name: "ShipItHQ" },
                href: "/jobs/rounds",
            }).catch((e: unknown) => console.error("notify INTERVIEW_REPORT_REVIEWED:", e))
        }
        await logAdminAudit({ adminId: access.adminAccess.id, action: "UPDATE", module: "hiring", resourceType: "InterviewReport", resourceId: id, description: "Rejected an interview report" })
        revalidatePath("/hiring/interview-reports")
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("rejectInterviewReport:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not reject the report" }
    }
}

// ── Groups and merging (CMP-2) ───────────────────────────────────────────────

const FAMILIES = ["SOFTWARE", "FRONTEND", "BACKEND", "FULL_STACK", "MOBILE", "DATA_ML", "DEVOPS_SRE", "QA", "PRODUCT", "DESIGN", "OTHER"] as const
const LEVELS = ["INTERN", "ENTRY", "MID", "SENIOR"] as const

/** Correct the role group a report counts in. */
export async function setReportGroup(id: string, roleFamily: string, level: string): Promise<Result<null>> {
    const access = await checkModuleAccess("hiring", "write")
    if (!access.authorized) return { success: false, error: access.error }
    const f = FAMILIES.find((x) => x === roleFamily), l = LEVELS.find((x) => x === level)
    if (!f || !l) return { success: false, error: "Pick a role family and a level." }
    try {
        await db.update(interviewReports).set({ roleFamily: f, level: l, updatedAt: new Date() }).where(eq(interviewReports.id, id))
        revalidatePath("/hiring/interview-reports")
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("setReportGroup:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not save the group" }
    }
}

export interface SameAsSuggestion { id: string; text: string; roundType: string; reports: number }

const words = (key: string) => new Set(key.split(" ").filter((w) => w.length > 1))

/**
 * The company's approved questions closest to this one (CMP-2): word overlap on
 * the normalised text, the same round type first. Only root questions (not
 * themselves merged into another) are offered.
 */
export async function suggestSameAs(questionId: string): Promise<Result<SameAsSuggestion[]>> {
    const access = await checkModuleAccess("hiring", "read")
    if (!access.authorized) return { success: false, error: access.error }
    try {
        const [q] = await db.select({ key: interviewReportQuestions.questionKey, reportId: interviewReportQuestions.reportId, companyId: interviewReports.companyId, roundType: interviewReportRounds.roundType })
            .from(interviewReportQuestions)
            .innerJoin(interviewReports, eq(interviewReports.id, interviewReportQuestions.reportId))
            .innerJoin(interviewReportRounds, eq(interviewReportRounds.id, interviewReportQuestions.roundId))
            .where(eq(interviewReportQuestions.id, questionId))
        if (!q?.companyId) return { success: true, data: [] }
        const pool = await db.select({ id: interviewReportQuestions.id, text: interviewReportQuestions.text, key: interviewReportQuestions.questionKey, roundType: interviewReportRounds.roundType, sameAsId: interviewReportQuestions.sameAsId })
            .from(interviewReportQuestions)
            .innerJoin(interviewReports, eq(interviewReports.id, interviewReportQuestions.reportId))
            .innerJoin(interviewReportRounds, eq(interviewReportRounds.id, interviewReportQuestions.roundId))
            .where(and(eq(interviewReports.companyId, q.companyId), eq(interviewReports.status, "APPROVED")))
        const mine = words(q.key)
        // One entry per root question; its merged children add to its report count.
        const roots = new Map<string, { id: string; text: string; key: string; roundType: string; reports: number }>()
        for (const p of pool.filter((x) => !x.sameAsId)) roots.set(p.id, { ...p, reports: 1 })
        for (const p of pool.filter((x) => x.sameAsId)) { const r = roots.get(p.sameAsId!); if (r) r.reports += 1 }
        const scored = [...roots.values()].map((r) => {
            const theirs = words(r.key)
            const shared = [...mine].filter((w) => theirs.has(w)).length
            const score = shared / Math.max(1, new Set([...mine, ...theirs]).size) + (r.roundType === q.roundType ? 0.1 : 0)
            return { r, score }
        }).filter((x) => x.score > 0.15).sort((a, b) => b.score - a.score).slice(0, 3)
        return { success: true, data: scored.map(({ r }) => ({ id: r.id, text: r.text, roundType: r.roundType, reports: r.reports })) }
    } catch (error: unknown) {
        console.error("suggestSameAs:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not find similar questions" }
    }
}

/** Count this question toward an earlier one of the same company (or undo with null). */
export async function setSameAs(questionId: string, targetId: string | null): Promise<Result<null>> {
    const access = await checkModuleAccess("hiring", "write")
    if (!access.authorized) return { success: false, error: access.error }
    try {
        if (targetId) {
            const rows = await db.select({ id: interviewReportQuestions.id, sameAsId: interviewReportQuestions.sameAsId, companyId: interviewReports.companyId, status: interviewReports.status })
                .from(interviewReportQuestions).innerJoin(interviewReports, eq(interviewReports.id, interviewReportQuestions.reportId))
                .where(inArray(interviewReportQuestions.id, [questionId, targetId]))
            const self = rows.find((r) => r.id === questionId), target = rows.find((r) => r.id === targetId)
            if (!self || !target || questionId === targetId) return { success: false, error: "That question can't be merged there." }
            if (!self.companyId || self.companyId !== target.companyId || target.status !== "APPROVED") return { success: false, error: "Merge only into an approved question of the same company." }
            // Always point at the root, so counts never chain.
            targetId = target.sameAsId ?? target.id
        }
        await db.update(interviewReportQuestions).set({ sameAsId: targetId }).where(eq(interviewReportQuestions.id, questionId))
        revalidatePath("/hiring/interview-reports")
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("setSameAs:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not merge the question" }
    }
}
