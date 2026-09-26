import "server-only"
import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm"
import { db, hiringSends, interviewRounds, jobs, messages, messageThreads } from "@repo/db"
import { notPurged } from "@repo/db/hiring-purge"
import { roundFunnels } from "@repo/db/hiring-stats"
import { pipelineReadiness } from "@/lib/pipelines"

/*
 * The company's Home (plan/hiring-app HA-15, DoD 10): the roles table, the
 * funnel per round for each role, and what needs attention, each with a link
 * to where it's resolved. Counts come from SQL (roundFunnels), never a list of
 * students.
 */

/** A result waiting this long without a decision is flagged. */
export const WAITING_DAYS = 3

export interface HomeRound { id: string; number: number; type: string; title: string; passMark: number; gateMode: "HARD" | "ADVISORY"; practising: number; scored: number; passed: number }
export interface HomeRole {
    id: string
    title: string
    slug: string
    status: string
    pipeline: { id: string; name: string } | null
    waiting: number
    rounds: HomeRound[]
}
export interface AttentionItem { key: string; text: string; href: string; count?: number }
export interface HomeData { roles: HomeRole[]; attention: AttentionItem[] }

export async function loadHome(companyId: string, company: { verificationStatus: string; claimStatus: string }, canSee: { candidates: boolean; jobs: boolean }): Promise<HomeData> {
    const roleRows = await db.query.jobs.findMany({
        where: and(eq(jobs.companyId, companyId), ne(jobs.status, "CLOSED")),
        columns: { id: true, title: true, slug: true, status: true, interviewProcessId: true, adminHiddenAt: true },
        with: { interviewProcess: { columns: { id: true, name: true } } },
        orderBy: [desc(jobs.createdAt)],
    })
    const processIds = roleRows.map((r) => r.interviewProcessId).filter((x): x is string => Boolean(x))
    const [rounds, waitingRows] = await Promise.all([
        processIds.length ? db.select().from(interviewRounds).where(inArray(interviewRounds.processId, processIds)).orderBy(asc(interviewRounds.roundNumber)) : [],
        canSee.candidates
            ? db.select({ jobId: hiringSends.jobId, n: count(), oldest: sql<string>`min(${hiringSends.createdAt})`.mapWith(hiringSends.createdAt) })
                .from(hiringSends)
                .where(and(eq(hiringSends.companyId, companyId), inArray(hiringSends.status, ["SENT", "VIEWED"]), notPurged))
                .groupBy(hiringSends.jobId)
            : [],
    ])
    const funnels = await roundFunnels(rounds.map((r) => r.id))

    const roles: HomeRole[] = roleRows.map((j) => ({
        id: j.id,
        title: j.title,
        slug: j.slug,
        status: j.adminHiddenAt ? "HIDDEN" : j.status,
        pipeline: j.interviewProcess ? { id: j.interviewProcess.id, name: j.interviewProcess.name } : null,
        waiting: Number(waitingRows.find((w) => w.jobId === j.id)?.n ?? 0),
        rounds: rounds.filter((r) => r.processId === j.interviewProcessId).map((r) => {
            const f = funnels.get(r.id)
            return { id: r.id, number: r.roundNumber, type: r.roundType, title: r.title, passMark: r.passMark, gateMode: r.gateMode, practising: f?.practising ?? 0, scored: f?.scored ?? 0, passed: f?.passed ?? 0 }
        }),
    }))

    // ── Needs attention ──
    const attention: AttentionItem[] = []
    if (company.claimStatus !== "CLAIMED" || company.verificationStatus !== "VERIFIED") {
        attention.push({ key: "verify", text: "Your company isn't verified yet, so candidates can practise your rounds but can't send you results.", href: "/company" })
    }
    if (canSee.candidates) {
        const cutoff = Date.now() - WAITING_DAYS * 86_400_000
        for (const w of waitingRows) {
            const role = roleRows.find((r) => r.id === w.jobId)
            if (!role) continue
            const old = w.oldest && new Date(w.oldest).getTime() < cutoff
            attention.push({
                key: `waiting-${role.id}`,
                text: old ? `${Number(w.n)} ${Number(w.n) === 1 ? "result has" : "results have"} waited over ${WAITING_DAYS} days for a decision on ${role.title}` : `${Number(w.n)} new ${Number(w.n) === 1 ? "result" : "results"} to review for ${role.title}`,
                href: `/applications/${role.slug}`,
                count: Number(w.n),
            })
        }
        // Threads where the candidate wrote last: they're waiting on the team.
        const replied = await db.select({ n: count() }).from(messageThreads)
            .where(and(
                eq(messageThreads.companyId, companyId),
                sql`${messageThreads.closedAt} is null`,
                sql`(select ${messages.authorKind} from ${messages} where ${messages.threadId} = ${messageThreads.id} order by ${messages.createdAt} desc limit 1) = 'STUDENT'`,
            ))
        const n = Number(replied[0]?.n ?? 0)
        if (n) attention.push({ key: "replies", text: `${n} ${n === 1 ? "candidate is" : "candidates are"} waiting for a reply`, href: "/inbox", count: n })
    }
    if (canSee.jobs) {
        for (const j of roleRows) {
            if (j.adminHiddenAt) { attention.push({ key: `hidden-${j.id}`, text: `ShipItHQ hid ${j.title} after a report. Write to support@shipithq.com.`, href: `/jobs` }); continue }
            if (j.status === "DRAFT") { attention.push({ key: `draft-${j.id}`, text: `${j.title} is a draft, so candidates can't see it yet`, href: `/jobs/${j.slug}/edit` }); continue }
            if (j.status !== "ACTIVE") continue
            if (!j.interviewProcessId) { attention.push({ key: `nopipe-${j.id}`, text: `${j.title} has no rounds, so candidates can't take it`, href: `/jobs/${j.slug}/edit` }); continue }
            const problems = await pipelineReadiness(j.interviewProcessId)
            if (problems.length) attention.push({ key: `ready-${j.id}`, text: `${j.title}: ${problems[0]}`, href: `/jobs/${j.slug}/edit` })
        }
    }
    return { roles, attention }
}
