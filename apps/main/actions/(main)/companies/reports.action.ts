"use server"

import { and, count, desc, eq, gte, ilike, inArray, isNull, notInArray, or } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import {
    db, aptitudeQuestions, companies, companyRequests, importedJobs, interviewReportQuestions, interviewReportRounds,
    interviewReports, practiceProblem, withTransaction,
} from "@repo/db"
import {
    REPORT_LEVELS, REPORT_OUTCOMES as OUTCOMES, REPORT_ROLE_FAMILIES, REPORT_ROUND_TYPES,
    type ReportLevel, type ReportOutcome, type ReportRoleFamily, type ReportRoundType,
} from "@/lib/interview-reports/types"

/*
 * Interview reports (plan/competition/skillmeet CMP-1): a student records the
 * rounds and questions of a real interview, for an admin to review. Decisions
 * (round 3): 10 credits per approved report, 5 a month, paid on approval (admin
 * side); the public sees only aggregates, never a report.
 */

/** Reports one student may file in a rolling 30 days (a spam guard; CMP-1b). */
const FILED_PER_30_DAYS = 10
const DAY_MS = 86_400_000
const MAX_ROUNDS = 8
const MAX_QUESTIONS = 10

type Result<T> = { success: true; data: T } | { success: false; error: string; code?: string }

export interface ReportInput {
    /** One of the two: a company on ShipItHQ, or one still under review. */
    companyId?: string
    companyRequestId?: string
    importedJobId?: string
    role: string
    /** The group it's counted in (CMP-2). */
    roleFamily: ReportRoleFamily
    level: ReportLevel
    /** "YYYY-MM". */
    month: string
    outcome: ReportOutcome
    rounds: {
        type: ReportRoundType
        title?: string
        minutes?: number | null
        questions: { text: string; practiceProblemId?: string | null; aptitudeQuestionId?: string | null }[]
    }[]
}

export interface MyReport {
    id: string
    companyName: string
    role: string
    month: string
    outcome: string
    status: "PENDING" | "APPROVED" | "REJECTED"
    rejectReason: string | null
    creditsRewarded: number
    rounds: number
    createdAt: string
}

async function currentUserId(): Promise<string | null> {
    const session = await getSession(await headers())
    return session?.user?.id ?? null
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "")
/** "SDE-1 (Backend)" and "sde 1 backend" group together. */
const keyOf = (v: string) => v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()

/** Personal data a report must not carry: an email address or a phone number. */
function personalData(text: string): string | null {
    if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(text)) return "an email address"
    if (/(?:\+?\d[\s-]?){10,}/.test(text)) return "a phone number"
    return null
}

/** File a report. It waits for an admin; the public never sees it on its own. */
export async function submitReport(input: ReportInput): Promise<Result<{ id: string }>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to report an interview.", code: "UNAUTHORIZED" }

    const role = clean(input.role, 120)
    if (role.length < 2) return { success: false, error: "Which role was it for?" }
    if (!REPORT_ROLE_FAMILIES.includes(input.roleFamily)) return { success: false, error: "Pick the kind of role." }
    if (!REPORT_LEVELS.includes(input.level)) return { success: false, error: "Pick the level." }
    const m = /^(\d{4})-(\d{2})$/.exec(input.month ?? "")
    if (!m) return { success: false, error: "Pick the month of the interview." }
    const when = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1))
    const now = new Date()
    if (when.getTime() > Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) return { success: false, error: "That month hasn't happened yet." }
    if (now.getTime() - when.getTime() > 3 * 366 * DAY_MS) return { success: false, error: "Reports cover the last three years." }
    if (!OUTCOMES.includes(input.outcome)) return { success: false, error: "How did it end?" }

    const rounds = (input.rounds ?? []).slice(0, MAX_ROUNDS + 1)
    if (rounds.length === 0) return { success: false, error: "Add the rounds you took, in order." }
    if (rounds.length > MAX_ROUNDS) return { success: false, error: `At most ${MAX_ROUNDS} rounds.` }
    type CleanRound = { type: ReportRoundType; title: string | null; minutes: number | null; questions: ReportInput["rounds"][number]["questions"] }
    const cleaned: CleanRound[] = []
    for (const [i, r] of rounds.entries()) {
        if (!REPORT_ROUND_TYPES.includes(r.type)) return { success: false, error: `Round ${i + 1}: pick what kind of round it was.` }
        const questions = (r.questions ?? []).map((q) => ({ ...q, text: clean(q.text, 600) })).filter((q) => q.text)
        if (questions.length > MAX_QUESTIONS) return { success: false, error: `Round ${i + 1}: at most ${MAX_QUESTIONS} questions.` }
        for (const q of questions) {
            const found = personalData(q.text)
            if (found) return { success: false, error: `Round ${i + 1}: a question includes ${found}. Remove it; reports never carry personal details.`, code: "PERSONAL_DATA" }
        }
        const title = clean(r.title, 80)
        if (personalData(title)) return { success: false, error: `Round ${i + 1}: the title includes personal details. Remove them.`, code: "PERSONAL_DATA" }
        const minutes = typeof r.minutes === "number" && Number.isFinite(r.minutes) ? Math.min(600, Math.max(1, Math.round(r.minutes))) : null
        cleaned.push({ type: r.type, title: title || null, minutes, questions })
    }
    if (personalData(role)) return { success: false, error: "The role includes personal details. Remove them.", code: "PERSONAL_DATA" }

    try {
        // Where it's filed: a company, or a request still under review (which may have just been published).
        let companyId: string | null = null
        let companyRequestId: string | null = null
        if (input.companyId) {
            const c = await db.query.companies.findFirst({ where: eq(companies.id, input.companyId), columns: { id: true, suspendedAt: true } })
            if (!c) return { success: false, error: "That company isn't on ShipItHQ." }
            if (c.suspendedAt) return { success: false, error: "That company is suspended while ShipItHQ reviews a report." }
            companyId = c.id
        } else if (input.companyRequestId) {
            const r = await db.query.companyRequests.findFirst({ where: eq(companyRequests.id, input.companyRequestId), columns: { id: true, status: true, companyId: true } })
            if (!r || r.status === "REJECTED") return { success: false, error: "That company isn't on ShipItHQ. Ask for it to be added first." }
            if (r.companyId) companyId = r.companyId
            else companyRequestId = r.id
        } else {
            return { success: false, error: "Which company was it? If it isn't on ShipItHQ, ask for it to be added first." }
        }

        let importedJobId: string | null = null
        if (input.importedJobId) {
            const j = await db.query.importedJobs.findFirst({ where: eq(importedJobs.id, input.importedJobId), columns: { id: true, visibility: true, ownerId: true } })
            if (j && (j.visibility === "PUBLIC" || j.ownerId === userId)) importedJobId = j.id
        }

        const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(interviewReports)
            .where(and(eq(interviewReports.userId, userId), gte(interviewReports.createdAt, new Date(Date.now() - 30 * DAY_MS))))
        if (Number(n) >= FILED_PER_30_DAYS) return { success: false, error: `You've filed ${FILED_PER_30_DAYS} reports in the last 30 days. Thanks; try again later.`, code: "LIMIT" }

        // Links must be real: a judged problem, or a reviewed aptitude question from ShipItHQ's bank.
        const problemIds = [...new Set(cleaned.flatMap((r) => r.questions.map((q) => q.practiceProblemId).filter((x): x is string => Boolean(x))))]
        const aptitudeIds = [...new Set(cleaned.flatMap((r) => r.questions.map((q) => q.aptitudeQuestionId).filter((x): x is string => Boolean(x))))]
        const [okProblems, okAptitude] = await Promise.all([
            problemIds.length ? db.select({ id: practiceProblem.id }).from(practiceProblem).where(and(inArray(practiceProblem.id, problemIds), eq(practiceProblem.module, "DSA"))) : [],
            aptitudeIds.length ? db.select({ id: aptitudeQuestions.id }).from(aptitudeQuestions).where(and(inArray(aptitudeQuestions.id, aptitudeIds), isNull(aptitudeQuestions.companyId), eq(aptitudeQuestions.status, "LIVE"))) : [],
        ])
        const problemOk = new Set(okProblems.map((p) => p.id)), aptitudeOk = new Set(okAptitude.map((a) => a.id))

        const id = await withTransaction(async (tx) => {
            const [report] = await tx.insert(interviewReports).values({
                userId, companyId, companyRequestId, importedJobId,
                role, roleKey: keyOf(role), roleFamily: input.roleFamily, level: input.level,
                interviewedOn: when.toISOString().slice(0, 10),
                outcome: input.outcome,
            }).onConflictDoNothing().returning({ id: interviewReports.id })
            if (!report) return null
            for (const [i, r] of cleaned.entries()) {
                const [round] = await tx.insert(interviewReportRounds).values({ reportId: report.id, position: i + 1, roundType: r.type, title: r.title, minutes: r.minutes }).returning({ id: interviewReportRounds.id })
                if (r.questions.length) {
                    await tx.insert(interviewReportQuestions).values(r.questions.map((q, k) => ({
                        roundId: round!.id,
                        reportId: report.id,
                        position: k + 1,
                        text: q.text,
                        questionKey: keyOf(q.text),
                        practiceProblemId: q.practiceProblemId && problemOk.has(q.practiceProblemId) ? q.practiceProblemId : null,
                        aptitudeQuestionId: q.aptitudeQuestionId && aptitudeOk.has(q.aptitudeQuestionId) ? q.aptitudeQuestionId : null,
                    })))
                }
            }
            return report.id
        })
        if (!id) return { success: false, error: "You've already reported this interview (same company, role and month).", code: "DUPLICATE" }
        return { success: true, data: { id } }
    } catch (error: unknown) {
        console.error("submitReport:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not save the report. Try again." }
    }
}

/** The student's own reports, newest first, with where each stands. */
export async function getMyReports(): Promise<Result<MyReport[]>> {
    const userId = await currentUserId()
    if (!userId) return { success: true, data: [] }
    try {
        const rows = await db.query.interviewReports.findMany({
            where: eq(interviewReports.userId, userId),
            with: { company: { columns: { name: true } }, companyRequest: { columns: { name: true } }, rounds: { columns: { id: true } } },
            orderBy: [desc(interviewReports.createdAt)],
            limit: 50,
        })
        return {
            success: true,
            data: rows.map((r) => ({
                id: r.id,
                companyName: r.company?.name ?? r.companyRequest?.name ?? "A company",
                role: r.role,
                month: String(r.interviewedOn).slice(0, 7),
                outcome: r.outcome,
                status: r.status,
                rejectReason: r.rejectReason,
                creditsRewarded: r.creditsRewarded,
                rounds: r.rounds.length,
                createdAt: r.createdAt.toISOString(),
            })),
        }
    } catch (error: unknown) {
        console.error("getMyReports:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load your reports" }
    }
}

export interface ReportCompanyHit { companyId: string | null; companyRequestId: string | null; name: string; pending: boolean }

/** Companies (and ones under review) by name, for filing a report from My rounds. */
export async function searchReportCompanies(query: string): Promise<Result<ReportCompanyHit[]>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to report an interview.", code: "UNAUTHORIZED" }
    const q = clean(query, 80)
    if (q.length < 2) return { success: true, data: [] }
    const like = `%${q.replace(/[%_]/g, "")}%`
    try {
        const [cos, reqs] = await Promise.all([
            db.select({ id: companies.id, name: companies.name }).from(companies).where(and(ilike(companies.name, like), isNull(companies.suspendedAt))).orderBy(companies.name).limit(8),
            db.select({ id: companyRequests.id, name: companyRequests.name }).from(companyRequests)
                .where(and(ilike(companyRequests.name, like), notInArray(companyRequests.status, ["REJECTED", "PUBLISHED"]))).limit(4),
        ])
        return {
            success: true,
            data: [
                ...cos.map((c) => ({ companyId: c.id, companyRequestId: null, name: c.name, pending: false })),
                ...reqs.map((r) => ({ companyId: null, companyRequestId: r.id, name: r.name, pending: true })),
            ],
        }
    } catch (error: unknown) {
        console.error("searchReportCompanies:", error instanceof Error ? error.message : error)
        return { success: false, error: "The search isn't working right now." }
    }
}

export interface ReportLinkHit { kind: "PROBLEM" | "APTITUDE"; id: string; label: string }

/** A DSA problem or an aptitude question to link a reported question to (optional). */
export async function searchReportLinks(kind: "PROBLEM" | "APTITUDE", query: string): Promise<Result<ReportLinkHit[]>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to continue.", code: "UNAUTHORIZED" }
    const q = clean(query, 80)
    if (q.length < 2) return { success: true, data: [] }
    const like = `%${q.replace(/[%_]/g, "")}%`
    try {
        if (kind === "PROBLEM") {
            const rows = await db.select({ id: practiceProblem.id, title: practiceProblem.title, difficulty: practiceProblem.difficulty }).from(practiceProblem)
                .where(and(eq(practiceProblem.module, "DSA"), eq(practiceProblem.isActive, true), or(ilike(practiceProblem.title, like), ilike(practiceProblem.slug, like)))).limit(8)
            return { success: true, data: rows.map((r) => ({ kind: "PROBLEM" as const, id: r.id, label: `${r.title} (${String(r.difficulty).toLowerCase()})` })) }
        }
        const rows = await db.select({ id: aptitudeQuestions.id, prompt: aptitudeQuestions.prompt, topic: aptitudeQuestions.topic }).from(aptitudeQuestions)
            .where(and(isNull(aptitudeQuestions.companyId), eq(aptitudeQuestions.status, "LIVE"), or(ilike(aptitudeQuestions.prompt, like), ilike(aptitudeQuestions.topic, like)))).limit(8)
        return { success: true, data: rows.map((r) => ({ kind: "APTITUDE" as const, id: r.id, label: `${r.topic}: ${r.prompt.slice(0, 80)}` })) }
    } catch (error: unknown) {
        console.error("searchReportLinks:", error instanceof Error ? error.message : error)
        return { success: false, error: "The search isn't working right now." }
    }
}
