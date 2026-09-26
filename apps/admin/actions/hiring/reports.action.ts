"use server"

import { and, count, desc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import {
    db, companies, hiringAttempts, hiringRuns, interviewRounds, jobs, messages, messageThreads, notifyUser, reports, users,
    type HiringAttemptIntegrity,
} from "@repo/db"
import { notifyCompany } from "@repo/db/notify"
import { reasonLabel, TARGET_LABEL, type ReportTargetKind } from "@repo/db/report-reasons"
import { checkModuleAccess } from "@/lib/module-access"
import { logAdminAudit } from "@/lib/audit-log"

/*
 * The report queue (plan/hiring-rounds HR-24, DoD 20). An admin reads each
 * report with its target, acts on it (hide a job, suspend a company, review a
 * student's attempts) and closes it, which sends the reporter one Inbox update.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

export interface ReportRow {
    id: string
    status: "OPEN" | "ACTIONED" | "DISMISSED"
    kind: ReportTargetKind
    kindLabel: string
    reason: string
    reasonLabel: string
    details: string | null
    excerpt: string | null
    reporter: { name: string | null; email: string | null; side: "student" | "company"; companyName: string | null }
    /** What the admin can open or act on. */
    target: {
        company: { id: string; name: string; slug: string; suspended: boolean } | null
        job: { id: string; title: string; slug: string; hidden: boolean } | null
        student: { id: string; name: string | null; email: string } | null
        thread: { id: string; studentName: string | null } | null
    }
    resolutionNote: string | null
    resolvedAt: string | null
    createdAt: string
}

export async function listReports(status: "OPEN" | "CLOSED"): Promise<Result<{ rows: ReportRow[]; open: number }>> {
    const access = await checkModuleAccess("hiring", "read")
    if (!access.authorized) return { success: false, error: access.error }
    try {
        const where = status === "OPEN" ? eq(reports.status, "OPEN") : inArray(reports.status, ["ACTIONED", "DISMISSED"])
        const [rows, [open]] = await Promise.all([
            db.select().from(reports).where(where).orderBy(status === "OPEN" ? reports.createdAt : desc(reports.resolvedAt)).limit(200),
            db.select({ n: count() }).from(reports).where(eq(reports.status, "OPEN")),
        ])
        const ids = <K extends keyof (typeof rows)[number]>(k: K) => [...new Set(rows.map((r) => r[k]).filter((v): v is NonNullable<typeof v> & string => typeof v === "string"))]
        const byKind = (k: ReportTargetKind) => rows.filter((r) => r.targetKind === k).map((r) => r.targetId)

        const companyIds = [...new Set([...ids("targetCompanyId"), ...ids("reporterCompanyId")])]
        const [companyRows, jobRows, studentRows, reporterRows, messageRows] = await Promise.all([
            companyIds.length ? db.select({ id: companies.id, name: companies.name, slug: companies.slug, suspendedAt: companies.suspendedAt }).from(companies).where(inArray(companies.id, companyIds)) : [],
            byKind("JOB").length ? db.select({ id: jobs.id, title: jobs.title, slug: jobs.slug, hiddenAt: jobs.adminHiddenAt }).from(jobs).where(inArray(jobs.id, byKind("JOB"))) : [],
            byKind("STUDENT").length ? db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, byKind("STUDENT"))) : [],
            ids("reporterUserId").length ? db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, ids("reporterUserId"))) : [],
            byKind("MESSAGE").length
                ? db.select({ id: messages.id, threadId: messages.threadId, authorKind: messages.authorKind, authorUserId: messages.authorUserId, studentId: messageThreads.userId })
                    .from(messages).innerJoin(messageThreads, eq(messageThreads.id, messages.threadId)).where(inArray(messages.id, byKind("MESSAGE")))
                : [],
        ])
        // A message's student: the reported author when a company reported it, the thread's student otherwise.
        const messageStudentIds = [...new Set(messageRows.map((m) => m.studentId).filter((v): v is string => Boolean(v)))]
        const messageStudents = messageStudentIds.length ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, messageStudentIds)) : []

        const out: ReportRow[] = rows.map((r) => {
            const co = companyRows.find((c) => c.id === r.targetCompanyId)
            const reporterCo = r.reporterCompanyId ? companyRows.find((c) => c.id === r.reporterCompanyId) : null
            const reporter = reporterRows.find((u) => u.id === r.reporterUserId)
            const job = r.targetKind === "JOB" ? jobRows.find((j) => j.id === r.targetId) : null
            const msg = r.targetKind === "MESSAGE" ? messageRows.find((m) => m.id === r.targetId) : null
            const student = r.targetKind === "STUDENT"
                ? studentRows.find((u) => u.id === r.targetId)
                : msg?.studentId ? messageStudents.find((u) => u.id === msg.studentId) : undefined
            const kind = r.targetKind as ReportTargetKind
            return {
                id: r.id,
                status: r.status,
                kind,
                kindLabel: TARGET_LABEL[kind],
                reason: r.reason,
                reasonLabel: reasonLabel(kind, r.reason),
                details: r.details,
                excerpt: r.targetExcerpt,
                reporter: { name: reporter?.name ?? null, email: reporter?.email ?? null, side: r.reporterCompanyId ? "company" : "student", companyName: reporterCo?.name ?? null },
                target: {
                    company: co ? { id: co.id, name: co.name, slug: co.slug, suspended: Boolean(co.suspendedAt) } : null,
                    job: job ? { id: job.id, title: job.title, slug: job.slug, hidden: Boolean(job.hiddenAt) } : null,
                    student: student ? { id: student.id, name: student.name, email: student.email } : null,
                    thread: msg ? { id: msg.threadId, studentName: student?.name ?? null } : null,
                },
                resolutionNote: r.resolutionNote,
                resolvedAt: r.resolvedAt?.toISOString() ?? null,
                createdAt: r.createdAt.toISOString(),
            }
        })
        return { success: true, data: { rows: out, open: open?.n ?? 0 } }
    } catch (error: unknown) {
        console.error("listReports:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load reports" }
    }
}

/** Close a report; the reporter hears back once, with nothing about the other party. */
export async function resolveReport(id: string, outcome: "ACTIONED" | "DISMISSED", note: string): Promise<Result<null>> {
    const access = await checkModuleAccess("hiring", "write")
    if (!access.authorized) return { success: false, error: access.error }
    try {
        const [r] = await db.update(reports).set({ status: outcome, resolutionNote: note.trim().slice(0, 1000) || null, resolvedAt: new Date(), resolvedByAdminId: access.adminAccess.id })
            .where(and(eq(reports.id, id), eq(reports.status, "OPEN")))
            .returning({ reporterUserId: reports.reporterUserId, reporterCompanyId: reports.reporterCompanyId, targetKind: reports.targetKind })
        if (!r) return { success: false, error: "That report is already closed." }
        if (r.reporterUserId) {
            const what = TARGET_LABEL[r.targetKind as ReportTargetKind].toLowerCase()
            await notifyUser(r.reporterUserId, {
                platform: r.reporterCompanyId ? "HIRING" : "MAIN",
                kind: "REPORT_REVIEWED",
                title: "We reviewed your report",
                body: outcome === "ACTIONED"
                    ? `Thanks for reporting this ${what}. We looked into it and took action.`
                    : `Thanks for reporting this ${what}. We looked into it and didn't find a problem this time. If something else happens, report it again.`,
                actor: { name: "ShipItHQ" },
            }).catch((e: unknown) => console.error("notify REPORT_REVIEWED:", e))
        }
        await logAdminAudit({ adminId: access.adminAccess.id, action: "UPDATE", module: "hiring", resourceType: "Report", resourceId: id, description: `Closed report as ${outcome}` })
        revalidatePath("/hiring/reports")
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("resolveReport:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not close the report" }
    }
}

/** Hide or show a job. Hidden: out of every student list, and the company can't republish it. */
export async function setJobHidden(jobId: string, hidden: boolean, reason: string): Promise<Result<null>> {
    const access = await checkModuleAccess("hiring", "write")
    if (!access.authorized) return { success: false, error: access.error }
    const [j] = await db.update(jobs).set(hidden ? { adminHiddenAt: new Date(), adminHiddenReason: reason.trim() || null } : { adminHiddenAt: null, adminHiddenReason: null })
        .where(eq(jobs.id, jobId)).returning({ title: jobs.title, companyId: jobs.companyId })
    if (!j) return { success: false, error: "That job is gone." }
    await logAdminAudit({ adminId: access.adminAccess.id, action: "UPDATE", module: "hiring", resourceType: "Job", resourceId: jobId, description: `${hidden ? "Hid" : "Unhid"} job "${j.title}"${reason ? `: ${reason}` : ""}` })
    revalidatePath("/hiring/reports")
    return { success: true, data: null }
}

/** Suspend or lift a company. Suspended: frozen everywhere; its members are told in their Inbox. */
export async function setCompanySuspended(companyId: string, suspended: boolean, reason: string): Promise<Result<null>> {
    const access = await checkModuleAccess("hiring", "write")
    if (!access.authorized) return { success: false, error: access.error }
    const [c] = await db.update(companies).set(suspended ? { suspendedAt: new Date(), suspendedReason: reason.trim() || null } : { suspendedAt: null, suspendedReason: null })
        .where(eq(companies.id, companyId)).returning({ name: companies.name })
    if (!c) return { success: false, error: "That company is gone." }
    await notifyCompany(companyId, "view_candidates", {
        kind: "COMPANY_SUSPENDED",
        title: suspended ? "Your company has been suspended" : "Your company's suspension has been lifted",
        body: suspended
            ? "ShipItHQ is reviewing a report. Your roles are hidden from students, and publishing, messaging and decisions are paused. Write to support@shipithq.com with any questions."
            : "Everything works again. Your roles are listed as before.",
        actor: { name: "ShipItHQ" },
    }).catch((e: unknown) => console.error("notify COMPANY_SUSPENDED:", e))
    await logAdminAudit({ adminId: access.adminAccess.id, action: "UPDATE", module: "hiring", resourceType: "Company", resourceId: companyId, description: `${suspended ? "Suspended" : "Lifted suspension of"} ${c.name}${reason ? `: ${reason}` : ""}` })
    revalidatePath("/hiring/reports")
    return { success: true, data: null }
}

export interface StudentAttemptRow {
    id: string
    company: string
    job: string | null
    round: string
    roundType: string
    status: string
    score: number | null
    integrity: HiringAttemptIntegrity | null
    startedAt: string
    submittedAt: string | null
}

/** Every hiring attempt a student made, with its integrity signals, for reviewing a report. */
export async function getStudentAttempts(userId: string): Promise<Result<{ student: { name: string | null; email: string }; attempts: StudentAttemptRow[] }>> {
    const access = await checkModuleAccess("hiring", "read")
    if (!access.authorized) return { success: false, error: access.error }
    const [u] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId))
    if (!u) return { success: false, error: "That student is gone." }
    const rows = await db.select({ a: hiringAttempts, company: companies.name, job: jobs.title, round: interviewRounds.title, roundType: interviewRounds.roundType })
        .from(hiringAttempts)
        .innerJoin(hiringRuns, eq(hiringRuns.id, hiringAttempts.runId))
        .leftJoin(companies, eq(companies.id, hiringRuns.companyId))
        .leftJoin(jobs, eq(jobs.id, hiringRuns.jobId))
        .leftJoin(interviewRounds, eq(interviewRounds.id, hiringAttempts.roundId))
        .where(eq(hiringRuns.userId, userId))
        .orderBy(desc(hiringAttempts.startedAt))
        .limit(300)
    await logAdminAudit({ adminId: access.adminAccess.id, action: "VIEW", module: "hiring", resourceType: "User", resourceId: userId, description: `Reviewed ${u.email}'s hiring attempts` })
    return {
        success: true,
        data: {
            student: u,
            attempts: rows.map((r) => ({
                id: r.a.id, company: r.company ?? "-", job: r.job, round: r.round ?? "-", roundType: r.roundType ?? "-",
                status: r.a.status, score: r.a.score, integrity: (r.a.integrity as HiringAttemptIntegrity | null) ?? null,
                startedAt: r.a.startedAt.toISOString(), submittedAt: r.a.submittedAt?.toISOString() ?? null,
            })),
        },
    }
}

