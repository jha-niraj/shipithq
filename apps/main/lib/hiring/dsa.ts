import "server-only"
import { inArray } from "drizzle-orm"
import { db, practiceProblem, harnessFor, sampleTests, type JudgeLanguage, type JudgeTest } from "@repo/db"
import { runAgainstTests } from "@/lib/practice/judge-run"
import type { PracticeJudgeCase } from "@/types/practice"

/*
 * The DSA round (plan/hiring-rounds HR-15): the drawn practice problems, run
 * against their sample tests while the round is live, and against every test
 * when it's handed in. Score = the share of tests passed, averaged over the
 * drawn problems, so solving one of two scores about 50. The judge being down
 * is our failure: the caller marks the attempt NOT_SCORED and refunds it.
 */

/** Sample-test runs allowed per attempt; the executor pool is shared. */
export const DSA_RUNS_PER_ATTEMPT = 60

export class JudgeUnavailable extends Error {}

/** What the runner may show: never the harness, the hidden tests or the reference solution. */
export interface DsaProblem {
    id: string
    title: string
    description: string
    difficulty: string
    requirements: string[]
    signature: string | null
    starterCode: string
    languages: JudgeLanguage[]
    samples: JudgeTest[]
}

export type DsaCode = Record<string, { language?: unknown; code?: unknown }>

export interface DsaBreakdownItem {
    problemId: string
    title: string
    language: string
    status: "ok" | "compile_error" | "empty"
    passed: number
    total: number
    samplePassed: number
    sampleTotal: number
    hiddenPassed: number
    hiddenTotal: number
    message?: string
    /** Sample cases in full; hidden cases as pass/fail only, so a retake can't be learnt. */
    cases: PracticeJudgeCase[]
}

export async function loadDsaProblems(ids: string[]): Promise<DsaProblem[]> {
    if (!ids.length) return []
    const rows = await db.select({
        id: practiceProblem.id, title: practiceProblem.title, description: practiceProblem.description, difficulty: practiceProblem.difficulty,
        requirements: practiceProblem.requirements, functionSignature: practiceProblem.functionSignature, starterCode: practiceProblem.starterCode,
        harness: practiceProblem.harness, judgeTests: practiceProblem.judgeTests,
    }).from(practiceProblem).where(inArray(practiceProblem.id, ids))
    return ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => Boolean(r)).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        difficulty: r.difficulty,
        requirements: r.requirements,
        signature: r.functionSignature,
        starterCode: r.starterCode ?? "",
        languages: Object.entries(r.harness ?? {}).filter(([, h]) => typeof h === "string" && h.length > 0).map(([l]) => l as JudgeLanguage),
        samples: sampleTests(r.judgeTests),
    }))
}

function codeFor(responses: Record<string, unknown>, problemId: string): { language: string; code: string } {
    const entry = ((responses.code ?? {}) as DsaCode)[problemId]
    return {
        language: typeof entry?.language === "string" ? entry.language : "cpp",
        code: typeof entry?.code === "string" ? entry.code.slice(0, 50_000) : "",
    }
}

/** The code differs from the starter in more than whitespace. */
function wroteSomething(code: string, starter: string): boolean {
    const squash = (s: string) => s.replace(/\s+/g, "")
    return squash(code).length > 0 && squash(code) !== squash(starter)
}

/** Run one problem's sample tests for the live runner. */
export async function runSamples(problemId: string, language: string, code: string) {
    const [row] = await db.select({ harness: practiceProblem.harness, judgeTests: practiceProblem.judgeTests, judgeStatus: practiceProblem.judgeStatus })
        .from(practiceProblem).where(inArray(practiceProblem.id, [problemId]))
    if (!row || row.judgeStatus !== "ready") return { status: "unavailable" as const, kind: "run" as const, language, message: "This problem's tests aren't available." }
    const harness = harnessFor(row.harness, language)
    if (!harness) return { status: "unavailable" as const, kind: "run" as const, language, message: `There are no tests for ${language} on this problem.` }
    return runAgainstTests({ kind: "run", language, harness, code, tests: sampleTests(row.judgeTests) })
}

/** Judge every drawn problem against all its tests. Throws JudgeUnavailable when the judge can't answer. */
export async function scoreDsa(problemIds: string[], responses: Record<string, unknown>): Promise<{ score: number; breakdown: DsaBreakdownItem[] }> {
    if (!problemIds.length) return { score: 0, breakdown: [] }
    const rows = await db.select({
        id: practiceProblem.id, title: practiceProblem.title, starterCode: practiceProblem.starterCode,
        harness: practiceProblem.harness, judgeTests: practiceProblem.judgeTests,
    }).from(practiceProblem).where(inArray(practiceProblem.id, problemIds))

    const breakdown = await Promise.all(problemIds.map(async (id): Promise<DsaBreakdownItem> => {
        const p = rows.find((r) => r.id === id)
        if (!p) throw new JudgeUnavailable("A drawn problem is no longer available")
        const tests = p.judgeTests ?? []
        const sample = sampleTests(tests).length
        const base = { problemId: id, title: p.title, total: tests.length, sampleTotal: sample, hiddenTotal: tests.length - sample }
        const { language, code } = codeFor(responses, id)
        const zero = { passed: 0, samplePassed: 0, hiddenPassed: 0, cases: [] }
        if (!wroteSomething(code, p.starterCode ?? "")) return { ...base, ...zero, language, status: "empty" }
        const harness = harnessFor(p.harness, language)
        if (!harness) throw new JudgeUnavailable(`No tests for ${language}`)

        const r = await runAgainstTests({ kind: "submit", language, harness, code, tests })
        if (r.status === "unavailable") throw new JudgeUnavailable(r.message)
        if (r.status === "compile_error") return { ...base, ...zero, language, status: "compile_error", message: r.message.slice(0, 2000) }
        return {
            ...base,
            language,
            status: "ok",
            passed: r.cases.filter((c) => c.passed).length,
            samplePassed: r.samplePassed,
            hiddenPassed: r.hiddenPassed,
            cases: r.cases.map((c) => (c.hidden ? { ...c, input: "", expectedOutput: "", actualOutput: "" } : c)),
        }
    }))
    const share = breakdown.map((b) => (b.total ? b.passed / b.total : 0))
    return { score: Math.round((share.reduce((a, b) => a + b, 0) / share.length) * 100), breakdown }
}
