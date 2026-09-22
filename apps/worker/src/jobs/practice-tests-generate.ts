import { eq } from "drizzle-orm"
import {
	HARNESS_PLACEHOLDER, mapCompilerOutput, outputsMatch, spliceHarness, type JudgeTest,
} from "@repo/db/practice"
import type { Env, RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { modelFor, type ModelId } from "@repo/ai"
import { runJudge, type JudgeOutcome } from "../executor"
import { JobDurableObject, type ProgressFn, type StoredJob } from "./base"

const { practiceProblem } = schema

// ─────────────────────────────────────────────────────────────────────────────
// practice_tests_generate: give a DSA problem its judge assets.
//
// A first model call writes the signature, the `class Solution` starter, a C++
// harness with the `// {{USER_CODE}}` placeholder, an optimal solution, a
// brute-force solution and the sample tests. A second call writes hidden test
// INPUTS only: their expected outputs are computed by running the reference
// solution, and an input is kept only when the brute-force solution agrees.
// Nothing is stored that the reference solution has not passed in the real
// container. A test set that fails correct code is worse than none: the mentor
// would then argue with the user about it. Plan: plan/practice-dsa PD-3.
//
// Idempotent: a `ready` problem is left alone. Regeneration is an explicit
// admin action, not a second dispatch.
// ─────────────────────────────────────────────────────────────────────────────

interface Input {
	problemId: string
}


const SAMPLE_MIN = 3, SAMPLE_MAX = 5, HIDDEN_MIN = 8, HIDDEN_MAX = 12, HIDDEN_ASK = 14

const CONVENTIONS = `Input and output conventions:
- Integers and one-word tokens: whitespace separated, read with cin.
- Arrays: first the length, then the elements, space separated. Nested arrays: the outer length, then each inner array as length plus elements. Output arrays space separated on ONE line; an empty array prints an empty line.
- Strings that may contain spaces: one per line, read with getline (after consuming a pending newline).
- Booleans print exactly \`true\` or \`false\`.
- If the problem accepts answers in any order, the harness sorts the result before printing so there is exactly one correct output.
- Linked lists: given as an array (length then values); the harness builds the list from a ListNode struct it defines, and prints a result list as space separated values. Cycle problems pass the cycle position as an extra integer (-1 for none).
- Binary trees: level order with the token \`null\` for a missing child, on one line, e.g. \`3 9 20 null null 15 7\`; the harness builds the tree from a TreeNode struct it defines and prints results in the same format.
- Matrices: rows and columns on the first line, then one row per line.
- Design problems (a class with several methods): first line the number of operations, then one operation per line (\`push 3\`, \`pop\`, \`top\`, \`insert apple\`, \`search app\`); print one line per operation with its result, \`null\` for void operations.
- Floating point: print with fixed precision of 5 decimals.`

export const ASSETS_SYSTEM = `You write judge assets for a C++ coding-practice platform for ONE problem: a function signature, a starter, a hidden harness and the sample tests. Solutions are written separately, later, against your harness. Everything is compiled with g++ -std=c++17 and run once per test with the case's input on stdin.

First decide whether the statement defines a problem precisely enough to know the inputs, the output and the constraints. Reply with exactly {"error": "<one sentence on what is missing>"} ONLY when you cannot tell what the input is or what the correct output is (a bare topic, a title with no statement, contradictory examples). Details that do not change the correct output (how ties are broken internally, which of several equivalent methods is used) are NOT a reason to refuse. Never invent a problem to fill a vague statement.

Otherwise reply with a single JSON object:
{
  "functionSignature": string,          // e.g. "vector<int> twoSum(vector<int>& nums, int target)"
  "starterCode": string,                // the class skeleton the user edits: the class, its method signatures, empty bodies with a TODO comment, nothing else
  "harness": string,                    // full program as one string; see rules
  "samples": [ { "id": string, "label": string, "input": string, "expectedOutput": string, "explanation": string } ]
}

Harness rules (violating any one makes the whole reply unusable):
- Explicit standard headers only (<iostream>, <vector>, <string>, <algorithm>, <unordered_map>, <map>, <set>, <unordered_set>, <queue>, <stack>, <climits>, <cmath>, <sstream>, <functional>, <numeric>). NEVER <bits/stdc++.h>: it does not exist on every compiler we use.
- \`using namespace std;\` after the includes.
- The literal line \`${HARNESS_PLACEHOLDER}\` exactly once, at file scope, after the includes and before main(). The user's class is pasted there. Do NOT define that class in the harness. If the problem needs a helper type (ListNode, TreeNode, Node), define it BEFORE the placeholder so the pasted code can use it.
- The user's class: \`class Solution\` with one method for an ordinary problem. For a DESIGN problem (the statement asks you to implement a class such as MinStack, Trie, WordDictionary, KthLargest), the user writes THAT class with the statement's name and methods instead, and "functionSignature" is the class outline, e.g. "class MinStack { MinStack(); void push(int val); void pop(); int top(); int getMin(); }".
- Collections whose order the statement does not fix (subsets, groups, triplets, points, permutations): the harness puts the result in canonical order before printing, so there is exactly one correct output. Copy this pattern exactly: store the result in a NON-const variable, sort each inner list through a NON-const reference, THEN sort the outer list:
      vector<vector<int>> result = sol.method(args);
      for (auto& inner : result) sort(inner.begin(), inner.end());
      sort(result.begin(), result.end());
  (Never "for (const auto& x : result) sort(...)": sorting through a const reference does not compile.) Write the samples' expected outputs in that same canonical order.
- Printing: elements separated by single spaces with NO trailing space, one line per inner list for a list of lists.
- main() reads stdin in the conventions below, calls the method on a Solution instance, prints the result in canonical form, and returns 0. No prompts, no extra text.
- No static or global mutable state.

${CONVENTIONS}

Sample rules:
- ${SAMPLE_MIN} to ${SAMPLE_MAX} samples, ids s1, s2, ...: the examples from the statement first, then small ones of your own until there are at least ${SAMPLE_MIN}. Each has a one-sentence explanation.
- "input" is the exact stdin including a trailing newline, written out literally. "expectedOutput" is the exact stdout without a trailing newline, exactly as YOUR harness would print the correct answer.`

/**
 * Writing ONE class against a fixed harness. Asked separately from the
 * harness (and the optimal and brute-force versions separately from each
 * other) because a small model writing four long programs in one JSON reply
 * got one of them wrong most of the time; one focused program at a time, with
 * its own compiler errors fed back, it does not.
 */
export function solveSystem(kind: "optimal" | "brute", className: string): string {
	return `You write ONE C++ class for a coding judge: \`${className}\`. It will be pasted into a fixed harness (shown to you) at the placeholder line, compiled with g++ -std=c++17, and run against the samples.

Reply with JSON only: {"code": string}

Rules for "code":
- Only the class: \`class ${className} { public: ... };\`. No #include lines, no \`using namespace std;\`, no main(), no helper structs the harness already defines (ListNode, TreeNode, Node): use them as the harness defines them.
- The method names, parameter types and return type must match the harness's calls EXACTLY.
- ${kind === "optimal"
		? "OPTIMAL: the best achievable time complexity for this problem."
		: "BRUTE FORCE: the most obvious correct approach, plain loops, no clever data structures or tricks. It exists to cross-check the optimal one, so correctness is all that matters."}
- It must produce the exact expected output for every sample through this harness.
- Format: real line breaks (\\n in the JSON string), one statement per line. NO // comments anywhere: if the code ends up on one line, a // comment silently comments out everything after it.`
}

const INPUTS_SYSTEM = `You write HIDDEN TEST INPUTS for a C++ judge. You are given a problem, its function signature and the exact stdin format its harness reads. You write inputs only; the expected outputs are computed by running a verified solution, so never write them.

Reply with a single JSON object: {"inputs": [ {"id": string, "label": string, "input": string} ]}, ids h1, h2, ... in order.

Rules:
- Exactly ${HIDDEN_ASK} inputs. Cover: the smallest input the constraints allow, a single element where allowed, duplicates, negatives and zero where allowed, the answer at the first and at the last position, a no-solution case if the statement allows one, already-sorted and reverse-sorted data where it matters, and two or three larger inputs.
- Every input must satisfy every constraint AND every guarantee in the statement. If the statement promises exactly one valid answer, do not build an input with several; if it promises distinct values, keep them distinct.
- Write every token out literally. Never describe an input. HARD SIZE LIMIT: each input at most 1000 characters (for arrays, at most 200 elements; for strings, at most 300 characters). For "larger" cases stay within that limit; the constraints' maximum is NOT required. Keep the whole reply compact.
- "input" is the exact stdin including a trailing newline, in the harness's format.`

interface Assets {
	/** The class the user writes: Solution, or a design problem's own class. */
	className: string
	functionSignature: string
	starterCode: string
	harness: { cpp: string }
	referenceSolution: { cpp: string }
	bruteForceSolution: { cpp: string }
	samples: JudgeTest[]
}

/** The model judged the statement too vague to write tests for. Final: a retry would get the same answer. */
class UnusableProblemError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "UnusableProblemError"
	}
}

function readAssets(raw: string): Assets {
	let data: Record<string, unknown>
	try {
		data = JSON.parse(raw) as Record<string, unknown>
	} catch {
		throw new Error("The generator returned output we could not read")
	}
	if (typeof data.error === "string" && data.error.trim()) {
		throw new UnusableProblemError(`The statement is not precise enough to test: ${data.error.trim().slice(0, 300)}`)
	}
	// `{ "cpp": "..." }` as asked, or the bare string gpt-4o-mini tends to send.
	// Both are unambiguous for a C++-only harness, so both are accepted.
	const cppOf = (x: unknown): unknown => (typeof x === "string" ? x : (x as Record<string, unknown> | undefined)?.cpp)
	const harness = cppOf(data.harness)
	if (typeof data.functionSignature !== "string" || !data.functionSignature.trim()) throw new Error("No function signature")
	const starterClass = typeof data.starterCode === "string" ? /\bclass\s+([A-Za-z_]\w*)/.exec(data.starterCode)?.[1] : undefined
	if (!starterClass) throw new Error("The starter does not declare the class the user writes")
	if (typeof harness !== "string" || !harness.includes("main")) throw new Error("The harness is missing")
	if (harness.includes("bits/stdc++")) throw new Error("Harness uses bits/stdc++.h")
	const cleaned = stripHarnessClass(harness, starterClass)
	if (new RegExp(`\\bclass\\s+${starterClass}\\b`).test(cleaned.replace(HARNESS_PLACEHOLDER, ""))) throw new Error(`Harness defines class ${starterClass} itself`)
	const splice = spliceHarness(cleaned, "")
	if (!splice.ok) throw new Error(`Harness placeholder problem: ${splice.reason}`)

	const samples: JudgeTest[] = []
	const ids = new Set<string>()
	for (const t of Array.isArray(data.samples) ? (data.samples as unknown[]) : []) {
		if (!t || typeof t !== "object") continue
		const o = t as Record<string, unknown>
		if (typeof o.input !== "string" || typeof o.expectedOutput !== "string" || typeof o.id !== "string") continue
		if (ids.has(o.id) || o.input.length > 4000) continue
		ids.add(o.id)
		samples.push({
			id: o.id,
			label: typeof o.label === "string" && o.label.trim() ? o.label.trim().slice(0, 80) : o.id,
			input: o.input.endsWith("\n") ? o.input : `${o.input}\n`,
			expectedOutput: o.expectedOutput.replace(/\s+$/g, ""),
			hidden: false,
			explanation: typeof o.explanation === "string" ? o.explanation.trim().slice(0, 240) : undefined,
		})
	}
	if (samples.length < SAMPLE_MIN || samples.length > SAMPLE_MAX) throw new Error(`Expected ${SAMPLE_MIN} to ${SAMPLE_MAX} sample tests, got ${samples.length}`)

	return {
		functionSignature: data.functionSignature.trim(),
		starterCode: data.starterCode as string,
		harness: { cpp: cleaned },
		referenceSolution: { cpp: "" },
		bruteForceSolution: { cpp: "" },
		samples,
		className: starterClass,
	}
}

/**
 * The complete `{...}` objects inside the `inputs` array of a reply that was
 * cut off mid-array. A long reply that runs out of tokens is still mostly
 * good; salvaging it beats throwing every finished input away.
 */
function salvageInputObjects(raw: string): unknown[] {
	const start = raw.indexOf("[", raw.indexOf('"inputs"'))
	if (start === -1) return []
	const out: unknown[] = []
	let depth = 0, inString = false, escaped = false, objStart = -1
	for (let i = start + 1; i < raw.length; i++) {
		const ch = raw[i]!
		if (inString) {
			if (escaped) escaped = false
			else if (ch === "\\") escaped = true
			else if (ch === '"') inString = false
			continue
		}
		if (ch === '"') inString = true
		else if (ch === "{") { if (depth === 0) objStart = i; depth++ }
		else if (ch === "}") {
			depth--
			if (depth === 0 && objStart !== -1) {
				try { out.push(JSON.parse(raw.slice(objStart, i + 1))) } catch { /* skip a malformed one */ }
				objStart = -1
			}
		} else if (ch === "]" && depth === 0) break
	}
	return out
}

function readInputs(raw: string): Array<{ id: string; label: string; input: string }> {
	let data: Record<string, unknown>
	try {
		data = JSON.parse(raw) as Record<string, unknown>
	} catch {
		data = { inputs: salvageInputObjects(raw) }
	}
	const out: Array<{ id: string; label: string; input: string }> = []
	const ids = new Set<string>()
	for (const t of Array.isArray(data.inputs) ? (data.inputs as unknown[]) : []) {
		if (!t || typeof t !== "object") continue
		const o = t as Record<string, unknown>
		if (typeof o.input !== "string" || typeof o.id !== "string" || !o.input.trim()) continue
		if (ids.has(o.id) || o.input.length > 4000) continue
		ids.add(o.id)
		out.push({ id: o.id, label: typeof o.label === "string" && o.label.trim() ? o.label.trim().slice(0, 80) : o.id, input: o.input.endsWith("\n") ? o.input : `${o.input}\n` })
	}
	return out
}

/**
 * The part of a compiler's output worth sending back: the lines with
 * "error:" and the two after each (clang prints a long "In file included
 * from" chain first, and the first 1500 characters were often only that).
 */
function compilerErrors(output: string): string {
	const lines = output.split("\n")
	const picked: string[] = []
	lines.forEach((line, i) => {
		if (/\berror:/.test(line)) picked.push(...lines.slice(i, i + 3))
	})
	return (picked.length ? picked.join("\n") : output).slice(0, 1500)
}

function describeFailure(outcome: JudgeOutcome, harness?: string, code?: string): string {
	if (!outcome.ok) {
		if (!outcome.compileError) return outcome.error
		const mapped = harness && code ? mapCompilerOutput(outcome.compileError, harness, code) : outcome.compileError
		return `Compilation failed (line numbers are in YOUR class):\n${compilerErrors(mapped)}`
	}
	const failing = outcome.results.filter((r) => !r.passed)
	return failing
		.slice(0, 5)
		.map((r) => `Sample ${r.id} (${r.label}) failed.\nInput:\n${r.input}\nExpected:\n${r.expectedOutput}\nActual:\n${r.actualOutput.slice(0, 400)}`)
		.join("\n\n")
}

/**
 * Close what a model left open. A class written on one long line regularly
 * comes back one `}` short, identically on every retry, which no amount of
 * feedback fixed. Braces inside string or char literals are ignored when
 * counting. Adds the class's closing `};` when it is missing.
 */
export function repairClassCode(code: string): string {
	let depth = 0
	let quote: string | null = null
	for (let i = 0; i < code.length; i++) {
		const ch = code[i]!
		if (quote) {
			if (ch === "\\") i++
			else if (ch === quote) quote = null
			continue
		}
		if (ch === '"' || ch === "'") quote = ch
		else if (ch === "{") depth++
		else if (ch === "}") depth--
	}
	let out = code.trimEnd()
	if (depth > 0) out += "\n" + "}".repeat(depth)
	if (!/}\s*;\s*$/.test(out)) out += ";"
	return out
}

/**
 * Remove a definition of the user's class from a harness (gpt-4o-mini often
 * includes a stub), putting the placeholder where it was if the harness has
 * none. Brace-matched, so the class body can span lines.
 */
export function stripHarnessClass(harness: string, className: string): string {
	const re = new RegExp(`\\bclass\\s+${className}\\b[^{;]*\\{`)
	let out = harness
	for (let guard = 0; guard < 3; guard++) {
		const m = re.exec(out)
		if (!m) break
		let depth = 0, end = -1
		for (let i = m.index + m[0].length - 1; i < out.length; i++) {
			if (out[i] === "{") depth++
			else if (out[i] === "}") { depth--; if (depth === 0) { end = i; break } }
		}
		if (end === -1) break
		let stop = end + 1
		while (stop < out.length && /[\s;]/.test(out[stop]!) && out[stop] !== "\n") stop++
		const replacement = out.includes(HARNESS_PLACEHOLDER) ? "" : HARNESS_PLACEHOLDER
		out = out.slice(0, m.index) + replacement + out.slice(stop)
	}
	return out
}

/** Executor problems are the executor's, not the assets'. They abort the run rather than burn a retry. */
function isExecutorProblem(outcome: JudgeOutcome): boolean {
	return !outcome.ok && !outcome.compileError && /not configured|unavailable|timed out|returned 5/i.test(outcome.error)
}

/** The problem fields generation reads. A subset of the row so a check script can pass a literal. */
export interface ProblemForJudge {
	title: string
	difficulty: string
	category: string
	description: string
	requirements: string[]
	starterCode: string | null
}

export interface Generated {
	functionSignature: string
	starterCode: string
	harness: { cpp: string }
	referenceSolution: { cpp: string }
	tests: JudgeTest[]
	/** Hidden inputs the two solutions disagreed on, or that produced no output. Dropped. */
	dropped: string[]
	/** False when no working brute force existed and hidden outputs rest on the reference alone. */
	crossChecked: boolean
}

export type GenerateOutcome =
	| { ok: true; generated: Generated }
	| { ok: false; error: string }

/**
 * The whole generation, minus the database.
 *
 * 1. One gpt-4o call writes the signature, starter, harness, an optimal and a
 *    brute-force solution, and the samples. Both solutions must pass the
 *    samples; one repair attempt with the failing cases otherwise.
 * 2. A second call writes hidden INPUTS only. Their expected outputs are what
 *    the reference solution prints, so they cannot be wrong relative to it.
 *    An input is kept only when the brute-force solution prints the same
 *    thing: disagreement means the input breaks a guarantee (several valid
 *    answers, say) and would fail a correct user solution.
 *
 * Exported so it can be exercised outside the Durable Object.
 */
export async function generateJudgeAssets(
	env: Pick<Env, "OPENAI_API_KEY" | "WORKER_SECRET" | "CODE_EXECUTOR" | "EXECUTOR_URL">,
	problem: ProblemForJudge,
	progress: ProgressFn,
	/** One-off override for a bulk local run (scripts/generate-judge-assets.ts --model). The job never passes it. */
	opts: { model?: ModelId } = {},
): Promise<GenerateOutcome> {
	const assetsModel = opts.model ?? modelFor("practiceJudgeAssets")
	const inputsModel = opts.model ?? modelFor("practiceJudgeInputs")
	const problemText = `Title: ${problem.title}\nDifficulty: ${problem.difficulty}\nCategory: ${problem.category}\n\nStatement (markdown):\n${problem.description}\n\nRequirements:\n${problem.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}${problem.starterCode ? `\n\nExisting starter (may be ignored if it is not C++):\n${problem.starterCode}` : ""}`

	// ── 1. Harness and samples, then each solution on its own ──────────────
	const writeSolution = async (kind: "optimal" | "brute", a: Assets, feedback: string): Promise<string> => {
		const raw = await chatJSON({
			apiKey: env.OPENAI_API_KEY,
			model: assetsModel,
			system: solveSystem(kind, a.className),
			user: `${problemText}\n\nThe harness (your class is pasted at the placeholder line):\n${a.harness.cpp}\n\nThe samples:\n${a.samples.map((t) => `--- ${t.id}\nstdin:\n${t.input}expected stdout:\n${t.expectedOutput}`).join("\n")}${feedback ? `\n\nYour previous version was compiled and run, and it failed:\n${feedback}\n\nFix exactly that.` : ""}`,
			temperature: 0.2,
			maxTokens: 3000,
		})
		let code = ""
		try {
			const v = JSON.parse(raw) as { code?: unknown }
			code = typeof v.code === "string" ? v.code : ""
		} catch {
			code = ""
		}
		// One line with a // comment: everything after the comment is gone.
		// Returning nothing forces a retry with that exact explanation.
		if (!code.includes("\n") && code.includes("//")) return ""
		return repairClassCode(code)
	}

	let assets = null as Assets | null
	let harnessFeedback = ""
	let lastError = "unknown"
	for (let h = 1; h <= 3 && !assets; h++) {
		await progress(h === 1 ? 10 : 40, h === 1 ? "Writing the harness and samples" : "Rewriting the harness")
		let cand: Assets
		try {
			const raw = await chatJSON({
				apiKey: env.OPENAI_API_KEY,
				model: assetsModel,
				system: ASSETS_SYSTEM,
				user: `${problemText}${harnessFeedback ? `\n\nA previous harness for this problem did not work:\n${harnessFeedback}\n\nWrite a corrected harness and samples.` : ""}`,
				temperature: 0.2,
				maxTokens: 4000,
			})
			cand = readAssets(raw)
		} catch (error: unknown) {
			lastError = error instanceof Error ? error.message : String(error)
			if (error instanceof Error && error.name === "RetryableError") throw error
			if (error instanceof UnusableProblemError) return { ok: false, error: lastError }
			console.warn(`[practice_tests_generate] harness ${h} structurally invalid: ${lastError}`)
			harnessFeedback = `The reply was structurally invalid: ${lastError}`
			continue
		}

		let ref = "", brute = "", refFb = "", bruteFb = ""
		let refOk = false, bruteOk = false
		for (let round = 1; round <= 3 && !assets; round++) {
			await progress(h === 1 ? 15 + round * 5 : 45 + round * 3, "Writing and checking the solutions")
			if (!refOk) ref = await writeSolution("optimal", cand, refFb)
			if (!bruteOk) brute = await writeSolution("brute", cand, bruteFb)
			if (!ref.includes(`class ${cand.className}`) || !brute.includes(`class ${cand.className}`)) {
				lastError = `a solution did not declare class ${cand.className}`
				const why = `The reply did not contain a usable \`class ${cand.className}\`. Write it over several lines with real line breaks and no // comments.`
				if (!ref.includes(`class ${cand.className}`)) refFb = why
				if (!brute.includes(`class ${cand.className}`)) bruteFb = why
				refOk = ref.includes(`class ${cand.className}`) && refOk
				bruteOk = brute.includes(`class ${cand.className}`) && bruteOk
				continue
			}
			const R = await runJudge(env as Env, { language: "cpp", harness: cand.harness.cpp, code: ref, tests: cand.samples })
			if (isExecutorProblem(R)) throw new Error(!R.ok ? R.error : "executor")
			const B = await runJudge(env as Env, { language: "cpp", harness: cand.harness.cpp, code: brute, tests: cand.samples })
			if (isExecutorProblem(B)) throw new Error(!B.ok ? B.error : "executor")

			const done = (samples: JudgeTest[]) => {
				assets = { ...cand, samples, referenceSolution: { cpp: ref }, bruteForceSolution: { cpp: brute } }
			}
			if (R.ok && R.passed && B.ok && B.passed) {
				done(cand.samples)
				break
			}
			// Two independent solutions that agree on every sample outrank a
			// written expected output (usually a sample not in canonical order).
			if (R.ok && B.ok) {
				const bById = new Map(B.results.map((r) => [r.id, r.actualOutput]))
				const agree = R.results.length === cand.samples.length && R.results.every((r) => r.actualOutput.trim() !== "" && outputsMatch(r.actualOutput, bById.get(r.id) ?? "\u0000"))
				if (agree) {
					const outById = new Map(R.results.map((r) => [r.id, r.actualOutput.replace(/\s+$/g, "")]))
					console.warn(`[practice_tests_generate] samples corrected to the output both solutions agree on`)
					done(cand.samples.map((t) => ({ ...t, expectedOutput: outById.get(t.id) ?? t.expectedOutput })))
					break
				}
			}
			// Harness faults: no solution can fix these, so stop spending solution
			// rounds and go straight to a new harness with the diagnosis.
			const silent = R.ok && B.ok && [...R.results, ...B.results].every((r) => r.actualOutput.trim() === "")
			const inHeaders = (o: JudgeOutcome, code: string) =>
				!o.ok && Boolean(o.compileError) && !mapCompilerOutput(o.compileError ?? "", cand.harness.cpp, code).includes("solution:")
			if (silent || (inHeaders(R, ref) && inHeaders(B, brute))) {
				lastError = silent ? "the harness printed nothing for any sample" : "the harness itself does not compile"
				refFb = silent
					? "Both solutions ran, and the harness printed NOTHING for every sample. main() must print the result."
					: `The compile error is inside a standard library header, not in the solution, for both solutions:\n${compilerErrors(!R.ok ? R.compileError ?? "" : "")}`
				bruteFb = ""
				console.warn(`[practice_tests_generate] harness ${h}: ${lastError}`)
				break
			}
			refOk = R.ok && R.passed
			bruteOk = B.ok && B.passed
			if (!refOk) refFb = describeFailure(R, cand.harness.cpp, ref)
			if (!bruteOk) bruteFb = describeFailure(B, cand.harness.cpp, brute)
			lastError = !refOk
				? (!R.ok ? (R.compileError ? "reference solution did not compile" : R.error) : `reference solution failed samples ${R.results.filter((r) => !r.passed).map((r) => r.id).join(", ")}`)
				: (!B.ok ? (B.compileError ? "brute force solution did not compile" : B.error) : `brute force solution failed samples ${B.results.filter((r) => !r.passed).map((r) => r.id).join(", ")}`)
			console.warn(`[practice_tests_generate] harness ${h} round ${round}: ${lastError}\n  ${(!refOk ? refFb : bruteFb).slice(0, 400).replace(/\n/g, "\n  ")}`)
		}
		// The reference passes every sample but no correct brute force could be
		// written (the obvious one is exponential for some problems). Keep the
		// reference alone; hidden outputs are then not cross-checked, which is
		// flagged so the problem can be reviewed.
		if (!assets && refOk && ref) {
			console.warn(`[practice_tests_generate] no working brute force; hidden outputs will not be cross-checked`)
			assets = { ...cand, referenceSolution: { cpp: ref }, bruteForceSolution: { cpp: "" } }
		}
		if (!assets) {
			harnessFeedback = `Solutions written against it kept failing. Last failure: ${lastError}.\n${(refFb || bruteFb).slice(0, 1500)}\nIf the error is inside a standard library header (sort, sift_down, "read-only variable"), the HARNESS is at fault: it sorts or modifies something const, or uses the wrong container type. Check that main() reads the input format of the samples exactly, stores results in non-const containers before sorting, calls the method with the right arguments, and prints the result in the documented canonical form.`
		}
	}
	if (!assets) return { ok: false, error: lastError }
	const a: Assets = assets as Assets

	// ── 2. Hidden inputs, outputs computed, cross-checked ──────────────────
	await progress(60, "Writing hidden test inputs")
	let inputs: Array<{ id: string; label: string; input: string }> = []
	for (let attempt = 1; attempt <= 2 && inputs.length < HIDDEN_MIN; attempt++) {
		try {
			const raw = await chatJSON({
				apiKey: env.OPENAI_API_KEY,
				model: inputsModel,
				system: INPUTS_SYSTEM,
				user: `${problemText}\n\nThe user's class: ${a.functionSignature}\n\nThe harness reads stdin like this (main function):\n${a.harness.cpp.slice(a.harness.cpp.indexOf("int main"))}\n\nThe samples, as examples of the exact input format:\n${a.samples.map((s) => `--- ${s.id}\n${s.input}`).join("")}${attempt > 1 ? "\n\nYour previous reply was cut off or unreadable. Keep inputs SHORT and the reply compact." : ""}`,
				temperature: 0.3,
				maxTokens: 9000,
			})
			inputs = readInputs(raw)
			if (inputs.length < HIDDEN_MIN) console.warn(`[practice_tests_generate] hidden inputs attempt ${attempt}: ${inputs.length} usable of a ${raw.length}-char reply: ${raw.slice(0, 300).replace(/\n/g, " ")}`)
		} catch (error: unknown) {
			if (error instanceof Error && error.name === "RetryableError") throw error
			console.warn(`[practice_tests_generate] hidden inputs attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`)
		}
	}
	if (inputs.length < HIDDEN_MIN) return { ok: false, error: `Only ${inputs.length} usable hidden inputs were generated` }

	await progress(75, "Computing and cross-checking hidden outputs")
	const probe: JudgeTest[] = inputs.map((i) => ({ id: i.id, label: i.label, input: i.input, expectedOutput: "", hidden: true }))
	const refOut = await runJudge(env as Env, { language: "cpp", harness: a.harness.cpp, code: a.referenceSolution.cpp, tests: probe })
	if (isExecutorProblem(refOut)) throw new Error(!refOut.ok ? refOut.error : "executor")
	if (!refOut.ok) return { ok: false, error: `Reference solution failed on hidden inputs: ${refOut.error}` }
	const crossChecked = a.bruteForceSolution.cpp.length > 0
	const bruteOut = crossChecked
		? await runJudge(env as Env, { language: "cpp", harness: a.harness.cpp, code: a.bruteForceSolution.cpp, tests: probe })
		: refOut
	if (isExecutorProblem(bruteOut)) throw new Error(!bruteOut.ok ? bruteOut.error : "executor")
	if (!bruteOut.ok) return { ok: false, error: `Brute force solution failed on hidden inputs: ${bruteOut.error}` }
	const bruteById = new Map(bruteOut.results.map((r) => [r.id, r.actualOutput]))
	const hidden: JudgeTest[] = []
	const dropped: string[] = []
	for (const r of refOut.results) {
		const out = r.actualOutput
		const agree = out.trim().length > 0 && outputsMatch(out, bruteById.get(r.id) ?? "\u0000")
		if (!agree) {
			dropped.push(r.id)
			continue
		}
		const src = inputs.find((i) => i.id === r.id)
		hidden.push({ id: r.id, label: src?.label ?? r.id, input: src?.input ?? r.input, expectedOutput: out.replace(/\s+$/g, ""), hidden: true })
		if (hidden.length >= HIDDEN_MAX) break
	}
	if (dropped.length) console.warn(`[practice_tests_generate] dropped hidden inputs ${dropped.join(", ")} (solutions disagreed or no output)`)
	if (hidden.length < HIDDEN_MIN) {
		return { ok: false, error: `Only ${hidden.length} hidden inputs survived the cross-check (dropped ${dropped.join(", ")})` }
	}

	return {
		ok: true,
		generated: {
			functionSignature: a.functionSignature,
			starterCode: a.starterCode,
			harness: a.harness,
			referenceSolution: a.referenceSolution,
			tests: [...a.samples, ...hidden],
			dropped,
			crossChecked,
		},
	}
}

export class PracticeTestsGenerate extends JobDurableObject<Input> {
	protected readonly jobType: RunnableJobType = "practice_tests_generate"
	protected override get initialPhaseLabel() {
		return "Reading the problem"
	}

	protected async run(job: StoredJob<Input>, progress: ProgressFn): Promise<unknown> {
		const db = this.db()
		const problem = await db.query.practiceProblem.findFirst({ where: eq(practiceProblem.id, job.input.problemId) })
		if (!problem) throw new Error("That problem no longer exists")
		if (problem.judgeStatus === "ready") return { skipped: true, reason: "already ready" }

		await db.update(practiceProblem).set({ judgeStatus: "generating", judgeError: null }).where(eq(practiceProblem.id, problem.id))

		let outcome: GenerateOutcome
		try {
			outcome = await generateJudgeAssets(this.env, problem, progress)
		} catch (error: unknown) {
			// A thrown error (the executor down, OpenAI failing past its retries)
			// must not leave the row at "generating": the list would say
			// "Preparing tests" forever. Record it, then let the base class fail
			// or retry the job as usual (a retry sets "generating" again).
			const message = error instanceof Error ? error.message : String(error)
			await db.update(practiceProblem)
				.set({ judgeStatus: "failed", judgeError: `Could not finish: ${message}`.slice(0, 500) })
				.where(eq(practiceProblem.id, problem.id))
				.catch(() => {})
			throw error
		}

		if (!outcome.ok) {
			await db
				.update(practiceProblem)
				.set({ judgeStatus: "failed", judgeError: outcome.error.slice(0, 500) })
				.where(eq(practiceProblem.id, problem.id))
			// Completed, not failed: the job did its work and recorded a readable
			// outcome on the row. A thrown error would refund nothing (cost is 0)
			// and would tell the user less than judgeError does.
			return { ready: false, error: outcome.error }
		}

		const { generated } = outcome
		await progress(90, "Saving")
		await db
			.update(practiceProblem)
			.set({
				functionSignature: generated.functionSignature,
				starterCode: generated.starterCode,
				harness: generated.harness,
				referenceSolution: generated.referenceSolution,
				judgeTests: generated.tests,
				judgeStatus: "ready",
				judgeError: null,
			})
			.where(eq(practiceProblem.id, problem.id))

		return {
			ready: true,
			sampleTests: generated.tests.filter((t) => !t.hidden).length,
			hiddenTests: generated.tests.filter((t) => t.hidden).length,
			dropped: generated.dropped,
			crossChecked: generated.crossChecked,
		}
	}
}
