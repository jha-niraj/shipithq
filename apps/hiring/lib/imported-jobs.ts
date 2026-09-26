import "server-only"
import { and, asc, count, countDistinct, desc, eq, inArray } from "drizzle-orm"
import { db, hiringRoundPoolItems, hiringRuns, importedJobs, interviewProcesses, interviewRounds } from "@repo/db"

/*
 * Jobs students imported for this company (plan/job-import JI-9): shown to a
 * verified company under its pipelines, with the pipeline ShipItHQ built for
 * each. Private imports are listed like public ones and never say who made
 * them; nothing here names a student.
 */

/** Below this many students, a practising count is hidden (as on the public company page). */
export const MIN_PRACTISING = 10

export interface ImportedRound { number: number; type: string; title: string; passMark: number; gateMode: "HARD" | "ADVISORY"; minutes: number; aiWritten: boolean }

export interface CompanyImportedJob {
    id: string
    title: string
    level: string | null
    location: string | null
    private: boolean
    importedAt: string
    rounds: ImportedRound[]
    notPractisable: string[]
    /** Students practising it, or null below the minimum. */
    practising: number | null
    /** The company's own pipeline students practise instead, when it adopted or replaced this one. */
    companyPipeline: { id: string; name: string } | null
}

export interface ImportedJobsView {
    verified: boolean
    /** Always given, so an unverified company sees how many are waiting. */
    count: number
    jobs: CompanyImportedJob[]
}

export async function loadImportedJobs(companyId: string, verified: boolean): Promise<ImportedJobsView> {
    const where = and(eq(importedJobs.companyId, companyId), eq(importedJobs.status, "READY"))
    if (!verified) {
        const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(importedJobs).where(where)
        return { verified, count: Number(n), jobs: [] }
    }
    const rows = await db.select().from(importedJobs).where(where).orderBy(desc(importedJobs.createdAt)).limit(100)
    const builtIds = rows.map((r) => r.processId).filter((x): x is string => Boolean(x))
    const ownIds = rows.map((r) => r.companyProcessId).filter((x): x is string => Boolean(x))
    const allIds = [...new Set([...builtIds, ...ownIds])]
    const [rounds, own, practising] = await Promise.all([
        builtIds.length ? db.select().from(interviewRounds).where(inArray(interviewRounds.processId, builtIds)).orderBy(asc(interviewRounds.roundNumber)) : [],
        ownIds.length ? db.select({ id: interviewProcesses.id, name: interviewProcesses.name }).from(interviewProcesses).where(inArray(interviewProcesses.id, ownIds)) : [],
        allIds.length ? db.select({ processId: hiringRuns.processId, n: countDistinct(hiringRuns.userId) }).from(hiringRuns).where(inArray(hiringRuns.processId, allIds)).groupBy(hiringRuns.processId) : [],
    ])
    const drafts = rounds.length
        ? await db.selectDistinct({ roundId: hiringRoundPoolItems.roundId }).from(hiringRoundPoolItems)
            .where(and(inArray(hiringRoundPoolItems.roundId, rounds.map((r) => r.id)), eq(hiringRoundPoolItems.status, "DRAFT")))
        : []
    const jobs = rows.map((r) => {
        const n = practising.filter((p) => p.processId === r.processId || p.processId === r.companyProcessId).reduce((t, p) => t + Number(p.n), 0)
        const pipe = own.find((o) => o.id === r.companyProcessId)
        return {
            id: r.id,
            title: r.extracted?.title ?? "Imported job",
            level: r.extracted?.level ?? null,
            location: r.extracted?.location ?? null,
            private: r.visibility === "PRIVATE",
            importedAt: r.createdAt.toISOString(),
            rounds: rounds.filter((x) => x.processId === r.processId).map((x) => ({
                number: x.roundNumber, type: x.roundType, title: x.title, passMark: x.passMark, gateMode: x.gateMode,
                minutes: x.timeLimitMinutes ?? x.durationMinutes ?? 30, aiWritten: drafts.some((d) => d.roundId === x.id),
            })),
            notPractisable: (r.plan?.notPractisable ?? []).map((x) => x.name),
            practising: n >= MIN_PRACTISING ? n : null,
            companyPipeline: pipe ? { id: pipe.id, name: pipe.name } : null,
        }
    })
    return { verified, count: jobs.length, jobs }
}
