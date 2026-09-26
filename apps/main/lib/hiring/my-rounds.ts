import "server-only"
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm"
import { db, companies, hiringAttempts, hiringRuns, hiringSends, interviewProcesses, interviewRounds, jobs, messageThreads, notifications, users } from "@repo/db"
import { companyTrust } from "@/lib/company-trust"
import { roundStates, type RoundState } from "@/lib/hiring/round-state"
import { RUNNABLE_TYPES, closeIfExpired } from "@/lib/hiring/runs"
import { sendState } from "@/lib/hiring/send"

/*
 * My rounds (plan/hiring-rounds HR-22): every run a student has going and every
 * send they've made, in the sections the page shows. Read-only; the actions
 * (continue, withdraw, record an outcome) are the ones the rounds page uses.
 */

/** What the student can do next on a run. */
export type NextStep =
    | { kind: "start" | "continue" | "coming_soon"; round: { number: number; title: string } }
    | { kind: "cooling"; round: { number: number; title: string }; availableAt: string }
    /** Every round cleared, and the results can go. */
    | { kind: "send" }
    /** Every round cleared, but the results can't go now: the reason. */
    | { kind: "done"; message: string }

export interface MyRun {
    runId: string
    kind: "job" | "practice"
    title: string
    companyName: string
    companySlug: string
    href: string
    roundsTotal: number
    roundsCleared: number
    next: NextStep
    /** Set when nothing from this run can be sent: an unverified or unclaimed company, or a closed job. */
    practiceOnly: string | null
    updatedAt: string
}

export interface MySend {
    sendId: string
    status: "SENT" | "VIEWED" | "INVITED" | "DECLINED" | "WITHDRAWN"
    jobTitle: string
    jobSlug: string
    companyName: string
    companySlug: string
    sentAt: string
    decidedAt: string | null
    withdrawnAt: string | null
    feedback: string | null
    companyMessage: string | null
    companyOutcome: string | null
    studentOutcome: string | null
    /** Invited: the member who invited, as the student's contact. */
    contact: { name: string; email: string } | null
    /** The Inbox entry that opens the company's thread, when there is one. */
    inboxId: string | null
}

export interface MyRounds {
    inProgress: MyRun[]
    sent: MySend[]
    invited: MySend[]
    closed: MySend[]
    practice: MyRun[]
}

const ACTIVE_SEND = ["SENT", "VIEWED", "INVITED"] as const

function nextStep(rounds: { id: string; roundNumber: number; title: string; roundType: string }[], states: RoundState[]): NextStep | null {
    for (const r of rounds) {
        const s = states.find((x) => x.roundId === r.id)
        if (!s || s.isCleared) continue
        const round = { number: r.roundNumber, title: r.title }
        if (s.status === "in_progress") return { kind: "continue", round }
        if (s.status === "cooling_down" && s.availableAt) return { kind: "cooling", round, availableAt: s.availableAt.toISOString() }
        if (!RUNNABLE_TYPES.has(r.roundType)) return { kind: "coming_soon", round }
        return { kind: "start", round }
    }
    return null
}

export async function loadMyRounds(userId: string): Promise<MyRounds> {
    const [runRows, sendRows] = await Promise.all([
        db.select({ run: hiringRuns, jobTitle: jobs.title, jobSlug: jobs.slug, jobStatus: jobs.status, company: { name: companies.name, slug: companies.slug, claimStatus: companies.claimStatus, verificationStatus: companies.verificationStatus }, processName: interviewProcesses.name })
            .from(hiringRuns)
            .leftJoin(jobs, eq(jobs.id, hiringRuns.jobId))
            .leftJoin(companies, eq(companies.id, hiringRuns.companyId))
            .leftJoin(interviewProcesses, eq(interviewProcesses.id, hiringRuns.processId))
            .where(and(eq(hiringRuns.userId, userId), inArray(hiringRuns.status, ["IN_PROGRESS", "COMPLETE"]), isNotNull(hiringRuns.processId)))
            .orderBy(desc(hiringRuns.updatedAt)),
        db.select({ send: hiringSends, jobTitle: jobs.title, jobSlug: jobs.slug, companyName: companies.name, companySlug: companies.slug })
            .from(hiringSends)
            .innerJoin(jobs, eq(jobs.id, hiringSends.jobId))
            .innerJoin(companies, eq(companies.id, hiringSends.companyId))
            .where(eq(hiringSends.userId, userId))
            .orderBy(desc(hiringSends.createdAt)),
    ])

    // Jobs whose results are out with the company: their run lives in the send's section.
    const sentJobs = new Set(sendRows.filter((r) => (ACTIVE_SEND as readonly string[]).includes(r.send.status)).map((r) => r.send.jobId))
    const runs = runRows.filter((r) => !(r.run.jobId && sentJobs.has(r.run.jobId)))

    const processIds = [...new Set(runs.map((r) => r.run.processId!))]
    const runIds = runs.map((r) => r.run.id)
    const [roundRows, attemptRows] = await Promise.all([
        processIds.length ? db.select().from(interviewRounds).where(inArray(interviewRounds.processId, processIds)).orderBy(asc(interviewRounds.roundNumber)) : [],
        runIds.length ? db.select().from(hiringAttempts).where(inArray(hiringAttempts.runId, runIds)) : [],
    ])

    const inProgress: MyRun[] = []
    const practice: MyRun[] = []
    for (const r of runs) {
        const rounds = roundRows.filter((x) => x.processId === r.run.processId)
        if (!rounds.length || !r.company) continue
        const attempts = attemptRows.filter((a) => a.runId === r.run.id)
        // An attempt past its end is closed on read, so the step shown is current.
        for (const a of attempts) {
            const type = rounds.find((x) => x.id === a.roundId)?.roundType
            if (type && (await closeIfExpired(a, type))) {
                const [fresh] = await db.select().from(hiringAttempts).where(eq(hiringAttempts.id, a.id))
                if (fresh) Object.assign(a, fresh)
            }
        }
        const states = roundStates(rounds.map((x) => ({ id: x.id, gateMode: x.gateMode, passMark: x.passMark, cooldownHours: x.cooldownHours })), attempts)
        const trust = companyTrust(r.company.claimStatus, r.company.verificationStatus)
        const isJob = Boolean(r.run.jobId && r.jobSlug)

        let next = nextStep(rounds, states)
        if (!next) {
            // Every round cleared: can the results go, and if not, why not.
            if (!isJob) next = { kind: "done", message: "Every round cleared. Practice results stay with you." }
            else {
                const st = await sendState(userId, r.jobSlug!)
                const block = st?.blocks.find((b) => b.code !== "INCOMPLETE")
                next = !st ? { kind: "done", message: "This role is no longer listed." } : block ? { kind: "done", message: block.message } : { kind: "send" }
            }
        }

        const practiceOnly = !isJob
            ? "Practice only: ShipItHQ's rounds, not the company's process."
            : !trust.canReceiveResults
                ? (trust.kind === "unclaimed" ? `Practice only until ${r.company.name} joins ShipItHQ.` : `Practice only until ${r.company.name} is verified.`)
                : r.jobStatus !== "ACTIVE" ? "Practice only: this role is closed." : null

        const item: MyRun = {
            runId: r.run.id,
            kind: isJob ? "job" : "practice",
            title: isJob ? r.jobTitle! : (r.processName ?? "Practice rounds"),
            companyName: r.company.name,
            companySlug: r.company.slug,
            href: isJob ? `/jobs/${r.jobSlug}/rounds` : `/companies/${r.company.slug}/rounds/${r.run.processId}`,
            roundsTotal: rounds.length,
            roundsCleared: states.filter((s) => s.isCleared).length,
            next,
            practiceOnly,
            updatedAt: r.run.updatedAt.toISOString(),
        }
        ;(isJob ? inProgress : practice).push(item)
    }

    // The Inbox entry for each company's thread: the newest notice on it.
    const companyIds = [...new Set(sendRows.filter((r) => r.send.status === "INVITED").map((r) => r.send.companyId))]
    const threads = companyIds.length
        ? await db.select({ id: messageThreads.id, companyId: messageThreads.companyId }).from(messageThreads)
            .where(and(eq(messageThreads.userId, userId), inArray(messageThreads.companyId, companyIds)))
        : []
    const notices = threads.length
        ? await db.select({ id: notifications.id, threadId: notifications.threadId }).from(notifications)
            .where(and(eq(notifications.userId, userId), inArray(notifications.threadId, threads.map((t) => t.id))))
            .orderBy(desc(notifications.createdAt))
        : []
    const inboxFor = (companyId: string) => {
        const t = threads.find((x) => x.companyId === companyId)
        return t ? (notices.find((n) => n.threadId === t.id)?.id ?? null) : null
    }

    const inviterIds = [...new Set(sendRows.filter((r) => r.send.status === "INVITED" && r.send.decidedByUserId).map((r) => r.send.decidedByUserId!))]
    const inviters = inviterIds.length
        ? (await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, inviterIds)))
            .map((u) => ({ id: u.id, contact: { name: u.name ?? "The hiring team", email: u.email } }))
        : []

    const sends: MySend[] = sendRows.map((r) => ({
        sendId: r.send.id,
        status: r.send.status,
        jobTitle: r.jobTitle,
        jobSlug: r.jobSlug,
        companyName: r.companyName,
        companySlug: r.companySlug,
        sentAt: r.send.createdAt.toISOString(),
        decidedAt: r.send.decidedAt?.toISOString() ?? null,
        withdrawnAt: r.send.status === "WITHDRAWN" ? r.send.updatedAt.toISOString() : null,
        feedback: r.send.status === "DECLINED" ? r.send.feedback : null,
        companyMessage: r.send.status === "INVITED" ? r.send.companyMessage : null,
        companyOutcome: r.send.companyOutcome,
        studentOutcome: r.send.studentOutcome,
        contact: r.send.status === "INVITED" ? (inviters.find((u) => u.id === r.send.decidedByUserId)?.contact ?? null) : null,
        inboxId: r.send.status === "INVITED" ? inboxFor(r.send.companyId) : null,
    }))

    return {
        inProgress,
        sent: sends.filter((s) => s.status === "SENT" || s.status === "VIEWED"),
        invited: sends.filter((s) => s.status === "INVITED"),
        closed: sends.filter((s) => s.status === "DECLINED" || s.status === "WITHDRAWN"),
        practice,
    }
}
