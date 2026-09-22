// ─────────────────────────────────────────────────────────────────────────────
// Generate judge assets for DSA problems locally, without a deployed worker.
//
// Runs the exact generation code the `practice_tests_generate` job runs
// (`generateJudgeAssets`) and writes the same columns, so a problem made
// `ready` here is indistinguishable from one the job made ready. Use it to fill
// a development database, or to regenerate problems in bulk.
//
//   # the code executor, in another terminal:
//   cd apps/shipitworker/container && PORT=8080 node server.mjs
//
//   cd apps/worker
//   node --env-file=../main/.env --import ./scripts/node-shims.mjs \
//     --import ../../packages/db/node_modules/tsx/dist/loader.mjs scripts/generate-judge-assets.ts [--slug=two-sum] [--retry-failed] [--concurrency=4] [--model=gpt-4o]
//
// By default it takes every DSA problem whose judge_status is `none`.
// `--retry-failed` also takes `failed` ones. It never touches `ready` rows
// unless `--slug` names one and `--force` is given.
// ─────────────────────────────────────────────────────────────────────────────

import { and, eq, inArray } from "drizzle-orm"
import { createDb, schema } from "../src/db"
import { generateJudgeAssets } from "../src/jobs/practice-tests-generate"
import { MODELS, type ModelId } from "@repo/ai"

const { practiceProblem } = schema
const args = process.argv.slice(2)
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1]
const slug = flag("slug")
const force = args.includes("--force")
const concurrency = Number(flag("concurrency") ?? 4)
// One-off: generate this run with another model from the registry (e.g. a
// problem the default model keeps failing). The product default lives in
// packages/ai/src/tasks.ts and is not changed by this flag.
const model = flag("model") as ModelId | undefined
if (model && !(model in MODELS)) throw new Error(`Unknown model ${model}; see packages/ai/src/models.ts`)
const statuses = args.includes("--retry-failed") ? ["none", "failed", "generating"] : ["none"]

const env = {
	OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
	WORKER_SECRET: process.env.WORKER_SECRET ?? "dev",
	EXECUTOR_URL: process.env.EXECUTOR_URL ?? "http://localhost:8080",
	CODE_EXECUTOR: undefined,
}
if (!env.OPENAI_API_KEY || !process.env.DATABASE_URL) throw new Error("OPENAI_API_KEY and DATABASE_URL must be set")
const db = createDb(process.env.DATABASE_URL)

const rows = await db.query.practiceProblem.findMany({
	where: slug
		? and(eq(practiceProblem.module, "DSA"), eq(practiceProblem.slug, slug))
		: and(eq(practiceProblem.module, "DSA"), inArray(practiceProblem.judgeStatus, statuses)),
	orderBy: (p, { asc }) => [asc(p.sortOrder)],
})
const todo = rows.filter((r) => r.judgeStatus !== "ready" || force)
console.log(`${todo.length} problem(s) to generate, ${concurrency} at a time`)

/** Database writes retry: a dropped connection must not lose a problem that generated fine. */
async function retry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
	for (let i = 1; ; i++) {
		try {
			return await fn()
		} catch (error: unknown) {
			if (i >= tries) throw error
			await new Promise((r) => setTimeout(r, 1500 * i))
		}
	}
}

let done = 0
const results: Array<{ slug: string; ok: boolean; detail: string; ms: number }> = []
async function worker(queue: typeof todo) {
	for (let p = queue.shift(); p; p = queue.shift()) {
		const t0 = Date.now()
		await retry(() => db.update(practiceProblem).set({ judgeStatus: "generating", judgeError: null }).where(eq(practiceProblem.id, p.id))).catch(() => {})
		let ok = false
		let detail = ""
		try {
			const out = await generateJudgeAssets(env, p, async () => {}, { model })
			if (out.ok) {
				const g = out.generated
				await retry(() => db.update(practiceProblem).set({
					functionSignature: g.functionSignature, starterCode: g.starterCode, harness: g.harness,
					referenceSolution: g.referenceSolution, judgeTests: g.tests, judgeStatus: "ready", judgeError: null,
				}).where(eq(practiceProblem.id, p.id)))
				ok = true
				detail = `${g.tests.filter((t) => !t.hidden).length} samples, ${g.tests.filter((t) => t.hidden).length} hidden${g.dropped.length ? `, dropped ${g.dropped.length}` : ""}${g.crossChecked ? "" : ", NOT cross-checked"}`
			} else {
				detail = out.error
			}
		} catch (error: unknown) {
			detail = error instanceof Error ? error.message : String(error)
		}
		if (!ok) {
			await retry(() => db.update(practiceProblem).set({ judgeStatus: "failed", judgeError: detail.slice(0, 500) }).where(eq(practiceProblem.id, p.id)))
				.catch((e: unknown) => console.error(`could not record failure for ${p.slug}:`, e instanceof Error ? e.message : e))
		}
		done++
		results.push({ slug: p.slug, ok, detail, ms: Date.now() - t0 })
		console.log(`[${done}/${todo.length}] ${ok ? "ready " : "FAILED"} ${p.slug} (${Math.round((Date.now() - t0) / 1000)}s): ${detail.slice(0, 160)}`)
	}
}
const queue = [...todo]
await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker(queue)))
const failed = results.filter((r) => !r.ok)
console.log(`\nready ${results.length - failed.length}, failed ${failed.length}${failed.length ? `: ${failed.map((f) => f.slug).join(", ")}` : ""}`)
process.exit(0)
