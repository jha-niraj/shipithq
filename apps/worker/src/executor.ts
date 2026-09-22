import { type JudgeLanguage, type JudgeTest, spliceHarness, outputsMatch } from "@repo/db/practice"
import type { Env } from "./env"

// ─────────────────────────────────────────────────────────────────────────────
// Running code in the executor from a job.
//
// The executor (apps/shipitworker) runs user code in a Cloudflare Container and
// answers on the same request. In production it is reached over the
// CODE_EXECUTOR service binding; under `wrangler dev` there is no binding and
// EXECUTOR_URL is used. Auth is the shared WORKER_SECRET, exactly as
// apps/main/lib/workers/client.ts:callExecutorWorker does it.
//
// Only `practice_tests_generate` calls this today, to prove a generated test
// set against the reference solution before a problem is marked ready (PD-3).
// ─────────────────────────────────────────────────────────────────────────────

/** What the container enforces per run; the caller's wall clock budget on top of it. */
const EXECUTE_TIMEOUT_MS = 30_000

export interface JudgeCaseResult {
	id: string
	label: string
	hidden: boolean
	passed: boolean
	input: string
	expectedOutput: string
	actualOutput: string
}

export type JudgeOutcome =
	| { ok: true; passed: boolean; results: JudgeCaseResult[]; executionTimeMs: number }
	| { ok: false; error: string; compileError?: string }

interface ExecutorResponse {
	success?: boolean
	stdout?: string
	stderr?: string
	exitCode?: number
	executionTimeMs?: number
	execution_time_ms?: number
	error?: string
	testResults?: Array<Record<string, unknown>>
	test_results?: Array<Record<string, unknown>>
}

async function callExecutor(env: Env, body: unknown, signal: AbortSignal): Promise<Response> {
	const init: RequestInit = {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${env.WORKER_SECRET}`,
		},
		body: JSON.stringify(body),
		signal,
	}
	// EXECUTOR_URL wins when set. Under `wrangler dev` the CODE_EXECUTOR binding
	// is still declared but points at a worker that is not running locally, so
	// preferring the binding answered 503 "Worker not found" on every job. In
	// production EXECUTOR_URL is empty and the binding is used.
	const base = (env.EXECUTOR_URL ?? "").replace(/\/$/, "")
	if (!base && env.CODE_EXECUTOR) {
		return env.CODE_EXECUTOR.fetch("https://shipithq-shipitworker/api/v1/execute", init)
	}
	if (!base) throw new Error("Code executor is not configured: no CODE_EXECUTOR binding and no EXECUTOR_URL")
	return fetch(`${base}/api/v1/execute`, init)
}

/**
 * Splice `code` into `harness`, run every test, and say which passed.
 *
 * Compilation errors come back as `ok: false` with the compiler output, not as
 * every case failing: a caller that sees twelve identical failures learns
 * nothing, and the generation job needs to feed the actual error back to the
 * model.
 */
export async function runJudge(
	env: Env,
	input: { language: JudgeLanguage; harness: string; code: string; tests: JudgeTest[] },
): Promise<JudgeOutcome> {
	const spliced = spliceHarness(input.harness, input.code)
	if (!spliced.ok) return { ok: false, error: `Harness is unusable: ${spliced.reason}` }
	if (input.tests.length === 0) return { ok: false, error: "No tests to run" }

	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), EXECUTE_TIMEOUT_MS)
	let res: Response
	try {
		res = await callExecutor(env, {
			code: spliced.code,
			language: input.language,
			testCases: input.tests.map((t) => ({ input: t.input, expectedOutput: t.expectedOutput, description: t.id })),
		}, controller.signal)
	} catch (error: unknown) {
		clearTimeout(timer)
		const aborted = error instanceof Error && error.name === "AbortError"
		return { ok: false, error: aborted ? "Code execution timed out" : (error instanceof Error ? error.message : "Code executor unavailable") }
	}
	clearTimeout(timer)

	if (!res.ok) {
		const text = await res.text().catch(() => "")
		return { ok: false, error: `Code executor returned ${res.status}${text ? `: ${text.slice(0, 300)}` : ""}` }
	}

	const data = (await res.json()) as ExecutorResponse
	const raw = data.testResults ?? data.test_results
	if (!raw) {
		// No per-case results means the run never reached the tests: a compile
		// failure, or the executor rejecting the program outright.
		const stderr = data.stderr || data.error || "Program did not produce test results"
		return { ok: false, error: "Program failed before running tests", compileError: stderr }
	}

	const byId = new Map(input.tests.map((t) => [t.id, t]))
	const results: JudgeCaseResult[] = raw.map((r, i) => {
		const id = typeof r.description === "string" ? r.description : input.tests[i]?.id ?? String(i)
		const test = byId.get(id) ?? input.tests[i]
		const actual = String(r.actualOutput ?? r.actual_output ?? "")
		const expected = test?.expectedOutput ?? String(r.expectedOutput ?? r.expected_output ?? "")
		// The canonical comparison decides, not the container's exact string
		// match: trailing spaces at line ends are not a wrong answer (a correct
		// Three Sum printed "-1 -1 2 " and was failed for it). A crash still
		// fails, because the container appends stderr to the actual output.
		const passed = outputsMatch(expected, actual)
		return {
			id,
			label: test?.label ?? id,
			hidden: test?.hidden ?? true,
			passed,
			input: test?.input ?? String(r.input ?? ""),
			expectedOutput: expected,
			actualOutput: actual,
		}
	})

	return {
		ok: true,
		passed: results.length === input.tests.length && results.every((r) => r.passed),
		results,
		executionTimeMs: Number(data.executionTimeMs ?? data.execution_time_ms ?? 0),
	}
}
