import {
    mapCompilerOutput, outputsMatch, spliceHarness, type JudgeTest,
} from "@repo/db"
import { callExecutorWorker } from "@/lib/workers/client"
import { isAbortError, toErrorMessage } from "@/lib/errors"
import type { PracticeJudgeCase, PracticeJudgeResult } from "@/types/practice"

// ─────────────────────────────────────────────────────────────────────────────
// Running a user's `class Solution` against a problem's tests, app side.
//
// Splices into the harness with the same `spliceHarness` the worker uses to
// validate tests (PD-2), so a test that passed the reference solution there
// passes a correct solution here. Server only: the harness and hidden tests
// are read and used here and never returned.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Whole-submission ceiling. The container allows 10 s PER CASE and runs cases
 * one after another; a submit is up to 17 cases, so a user's infinite loop can
 * legitimately take minutes inside the container. The app stops waiting here
 * and reports a time limit instead.
 */
const JUDGE_TIMEOUT_MS = 60_000

const TIMEOUT_MARKER = "Execution timed out"

export async function runAgainstTests(input: {
    kind: "run" | "submit"
    language: string
    harness: string
    code: string
    tests: JudgeTest[]
}): Promise<PracticeJudgeResult> {
    const { kind, language } = input
    const spliced = spliceHarness(input.harness, input.code)
    if (!spliced.ok) {
        return { status: "unavailable", kind, language, message: "This problem's tests are misconfigured. Try again later." }
    }

    const secret = process.env.WORKER_SECRET
    if (!secret) return { status: "unavailable", kind, language, message: "Code execution is not configured." }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), JUDGE_TIMEOUT_MS)
    let data: Record<string, unknown>
    try {
        const res = await callExecutorWorker("/api/v1/execute", {
            token: secret,
            body: {
                code: spliced.code,
                language,
                testCases: input.tests.map((t) => ({ input: t.input, expectedOutput: t.expectedOutput, description: t.id })),
            },
            signal: controller.signal,
        })
        if (!res.ok) {
            return { status: "unavailable", kind, language, message: `The code runner returned ${res.status}. Try again in a moment.` }
        }
        data = (await res.json()) as Record<string, unknown>
    } catch (error: unknown) {
        if (isAbortError(error)) {
            return {
                status: "unavailable",
                kind,
                language,
                message: "Your code ran past the time limit. Look for an infinite loop or a much slower approach than the input size allows.",
            }
        }
        console.error("[judge] executor call failed:", toErrorMessage(error))
        return { status: "unavailable", kind, language, message: "The code runner is unavailable. Try again in a moment." }
    } finally {
        clearTimeout(timer)
    }

    const raw = (data.testResults ?? data.test_results) as Array<Record<string, unknown>> | undefined
    if (!raw) {
        const message = mapCompilerOutput(String(data.stderr || data.error || "Your program did not run."), input.harness, input.code)
        return { status: "compile_error", kind, language, message: message.slice(0, 4000) }
    }

    const byId = new Map(input.tests.map((t) => [t.id, t]))
    const cases: PracticeJudgeCase[] = raw.map((r, i) => {
        const id = typeof r.description === "string" ? r.description : input.tests[i]?.id ?? String(i)
        const test = byId.get(id) ?? input.tests[i]
        const actual = String(r.actualOutput ?? r.actual_output ?? "")
        const expected = test?.expectedOutput ?? ""
        const timedOut = actual.includes(TIMEOUT_MARKER)
        // Canonical comparison decides (trailing spaces at line ends are not a
        // wrong answer); a crash still fails because stderr is appended.
        const passed = !timedOut && outputsMatch(expected, actual)
        const hidden = test?.hidden ?? false
        // A passing hidden case reveals nothing: that is what keeps it hidden.
        const reveal = !hidden || !passed
        return {
            id,
            label: test?.label ?? id,
            hidden,
            passed,
            input: reveal ? (test?.input ?? "") : "",
            expectedOutput: reveal ? expected : "",
            actualOutput: reveal ? actual.slice(0, 4000) : "",
            explanation: hidden ? undefined : test?.explanation,
            timedOut,
        }
    })

    const sample = cases.filter((c) => !c.hidden)
    const hidden = cases.filter((c) => c.hidden)
    return {
        status: "ok",
        kind,
        language,
        passed: cases.length === input.tests.length && cases.every((c) => c.passed),
        cases,
        sampleTotal: sample.length,
        samplePassed: sample.filter((c) => c.passed).length,
        hiddenTotal: hidden.length,
        hiddenPassed: hidden.filter((c) => c.passed).length,
        executionTimeMs: Number(data.executionTimeMs ?? data.execution_time_ms ?? 0),
    }
}
