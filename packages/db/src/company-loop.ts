import { and, eq, inArray } from "drizzle-orm"
import type { NeonHttpDatabase } from "drizzle-orm/neon-http"
import { interviewReportQuestions, interviewReportRounds, interviewReports } from "./schema/interview-reports"

/*
 * A company's interview loop from what students reported (plan/competition/
 * skillmeet CMP-2). No client import, so the worker can call it (prep goals).
 *
 * Decisions (Niraj, 2026-09-26, rounds 3 and 4): reports group by role family
 * and level; a group shows once it has 3 approved reports from the last 12
 * months; older reports still count toward questions, at half weight in the
 * ranking, while "reported N times" is the plain count. Only aggregates leave
 * here: no report, date, outcome or author.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = NeonHttpDatabase<any>

export const LOOP_MIN_REPORTS = 3
export const LOOP_RECENT_MONTHS = 12
const OLD_WEIGHT = 0.5
const TOP_QUESTIONS = 5

export interface LoopQuestion {
    text: string
    /** Reports that asked it (each report counts once). */
    reported: number
    practiceProblemId: string | null
    aptitudeQuestionId: string | null
}

export interface LoopGroup {
    roleFamily: string
    level: string
    /** Approved reports from the last 12 months, and all of them. */
    recent: number
    total: number
    /** The most reported round order, and how many of the recent reports took exactly it. */
    order: { rounds: string[]; count: number; of: number }
    /** Per round type in `order`, its questions ranked (weighted), top five. */
    rounds: { type: string; questions: LoopQuestion[] }[]
}

export interface CompanyLoops {
    ready: LoopGroup[]
    /** Groups with reports, still short of the minimum. */
    gathering: { roleFamily: string; level: string; recent: number }[]
}

export async function companyLoops(ex: AnyDb, companyId: string, now: Date = new Date()): Promise<CompanyLoops> {
    const reports = await ex.select({ id: interviewReports.id, roleFamily: interviewReports.roleFamily, level: interviewReports.level, on: interviewReports.interviewedOn })
        .from(interviewReports).where(and(eq(interviewReports.companyId, companyId), eq(interviewReports.status, "APPROVED")))
    if (!reports.length) return { ready: [], gathering: [] }

    const cutoff = new Date(now)
    cutoff.setUTCMonth(cutoff.getUTCMonth() - LOOP_RECENT_MONTHS)
    const isRecent = (on: unknown) => new Date(String(on)) >= cutoff

    const groups = new Map<string, typeof reports>()
    for (const r of reports) {
        const k = `${r.roleFamily}|${r.level}`
        groups.set(k, [...(groups.get(k) ?? []), r])
    }
    const readyIds = [...groups.values()].filter((g) => g.filter((r) => isRecent(r.on)).length >= LOOP_MIN_REPORTS).flat().map((r) => r.id)
    const [rounds, questions] = readyIds.length
        ? await Promise.all([
            ex.select().from(interviewReportRounds).where(inArray(interviewReportRounds.reportId, readyIds)),
            ex.select().from(interviewReportQuestions).where(inArray(interviewReportQuestions.reportId, readyIds)),
        ])
        : [[], []]
    // A merged question counts toward its root: read the roots' keys (they may sit in any report).
    const rootIds = [...new Set(questions.map((q) => q.sameAsId).filter((x): x is string => Boolean(x)))]
    const roots = rootIds.length ? await ex.select().from(interviewReportQuestions).where(inArray(interviewReportQuestions.id, rootIds)) : []

    const out: CompanyLoops = { ready: [], gathering: [] }
    for (const g of groups.values()) {
        const { roleFamily, level } = g[0]!
        const recentReports = g.filter((r) => isRecent(r.on))
        if (recentReports.length < LOOP_MIN_REPORTS) {
            out.gathering.push({ roleFamily, level, recent: recentReports.length })
            continue
        }
        // The usual order, over the recent reports.
        const sequences = new Map<string, number>()
        for (const r of recentReports) {
            const seq = rounds.filter((x) => x.reportId === r.id).sort((a, b) => a.position - b.position).map((x) => x.roundType).join(">")
            if (seq) sequences.set(seq, (sequences.get(seq) ?? 0) + 1)
        }
        const [bestSeq, bestCount] = [...sequences.entries()].sort((a, b) => b[1] - a[1] || b[0].split(">").length - a[0].split(">").length)[0] ?? ["", 0]
        const order = bestSeq ? bestSeq.split(">") : []

        // Questions, per round type: one count per report, weighted by age for the ranking.
        const weightOf = new Map(g.map((r) => [r.id, isRecent(r.on) ? 1 : OLD_WEIGHT]))
        const roundType = new Map(rounds.map((x) => [x.id, x.roundType]))
        const tally = new Map<string, { type: string; text: string; reports: Set<string>; weight: number; practiceProblemId: string | null; aptitudeQuestionId: string | null }>()
        for (const q of questions) {
            if (!weightOf.has(q.reportId)) continue
            const type = roundType.get(q.roundId)
            if (!type) continue
            const root = q.sameAsId ? roots.find((x) => x.id === q.sameAsId) : undefined
            const key = q.practiceProblemId ? `p:${q.practiceProblemId}` : q.aptitudeQuestionId ? `a:${q.aptitudeQuestionId}` : `q:${(root ?? q).questionKey}`
            const k = `${type}|${key}`
            const t = tally.get(k) ?? { type, text: (root ?? q).text, reports: new Set<string>(), weight: 0, practiceProblemId: q.practiceProblemId, aptitudeQuestionId: q.aptitudeQuestionId }
            if (!t.reports.has(q.reportId)) {
                t.reports.add(q.reportId)
                t.weight += weightOf.get(q.reportId)!
            }
            tally.set(k, t)
        }
        const byType = (type: string): LoopQuestion[] => [...tally.values()].filter((t) => t.type === type)
            .sort((a, b) => b.weight - a.weight || b.reports.size - a.reports.size)
            .slice(0, TOP_QUESTIONS)
            .map((t) => ({ text: t.text, reported: t.reports.size, practiceProblemId: t.practiceProblemId, aptitudeQuestionId: t.aptitudeQuestionId }))
        out.ready.push({
            roleFamily, level,
            recent: recentReports.length, total: g.length,
            order: { rounds: order, count: bestCount, of: recentReports.length },
            rounds: [...new Set(order)].map((type) => ({ type, questions: byType(type) })),
        })
    }
    out.ready.sort((a, b) => b.recent - a.recent)
    out.gathering.sort((a, b) => b.recent - a.recent)
    return out
}

// ── Matching a role to a group (prep goals, CMP-2e) ──────────────────────────

const FAMILY_WORDS: [string, RegExp][] = [
    ["FULL_STACK", /full[\s-]?stack/i],
    ["FRONTEND", /front[\s-]?end|react|angular|\bui\b/i],
    ["BACKEND", /back[\s-]?end|\bapi\b|platform engineer|server/i],
    ["MOBILE", /mobile|android|\bios\b|flutter|react native/i],
    ["DATA_ML", /\bdata\b|machine learning|\bml\b|\bai\b|analyst|scientist/i],
    ["DEVOPS_SRE", /devops|\bsre\b|site reliability|infrastructure|cloud engineer/i],
    ["QA", /\bqa\b|quality|\btest|sdet/i],
    ["PRODUCT", /product manager|\bpm\b|product owner/i],
    ["DESIGN", /designer|\bux\b|\bui\/ux\b/i],
    ["SOFTWARE", /software|developer|engineer|\bsde\b|programmer/i],
]

/** A role's group from its title ("Senior Backend Engineer" -> BACKEND, SENIOR). */
export function roleGroupOf(role: string): { roleFamily: string; level: string } {
    const roleFamily = FAMILY_WORDS.find(([, re]) => re.test(role))?.[0] ?? "OTHER"
    const level = /intern/i.test(role) ? "INTERN"
        : /senior|\bsr\b|lead|staff|principal|\bIII\b|\b3\b/i.test(role) ? "SENIOR"
            : /\bmid\b|\bII\b|\b2\b|associate/i.test(role) ? "MID"
                : "ENTRY"
    return { roleFamily, level }
}

/** The loop a role should use: its exact group, else the same family's best-reported group. */
export function pickLoop(loops: CompanyLoops, role: { roleFamily: string; level: string }): LoopGroup | null {
    return loops.ready.find((g) => g.roleFamily === role.roleFamily && g.level === role.level)
        ?? loops.ready.filter((g) => g.roleFamily === role.roleFamily).sort((a, b) => b.recent - a.recent)[0]
        ?? null
}
