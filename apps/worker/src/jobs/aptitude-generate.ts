import { eq } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { JobDurableObject, RetryableError, type ProgressFn, type StoredJob } from "./base"

const { aptitudeQuestions } = schema

/**
 * A company's own aptitude questions, written by AI on its topics
 * (plan/hiring-rounds HR-11). They land as DRAFT rows with `companyId` set:
 * private to that company, and drawable only once it approves each one.
 *
 * Every question is checked here before it is stored: four distinct options,
 * exactly one of them the stated answer, confirmed by a second blind solve,
 * an explanation, and no em or en dashes. A
 * question that fails is dropped and counted, never stored for the company to
 * trip over.
 */

interface AptitudeGenerateInput {
	companyId: string
	/** What the company wants questions about, in its words. */
	topics: string
	count: number
	difficulty: "EASY" | "MEDIUM" | "HARD"
	/** Null: the model spreads them across the three sections. */
	section: "QUANT" | "LOGICAL" | "VERBAL" | null
}

const SECTIONS = ["QUANT", "LOGICAL", "VERBAL"] as const

/*
 * Two passes, because one is not trustworthy. Asked to mark its own answer,
 * gpt-4o-mini marked the wrong option on 6 of 10 quant questions, often
 * contradicting its own explanation (measured 2026-09-25). So:
 * 1. WRITE: the model works the solution and states the answer FIRST, then
 *    writes options containing that answer verbatim. The correct option is
 *    found by matching the answer text; a model-chosen index is never used.
 * 2. SOLVE: a second call solves each question blind (no answer given) at
 *    temperature 0. Only questions where both agree are kept.
 * On the same topics this kept 8 of 10, all 8 correct by hand.
 */
const WRITE = `You write multiple-choice aptitude questions for a hiring platform. Each question must have exactly ONE correct answer a careful person reaches in about a minute.

For EACH question, in this order:
1. "prompt": the question. Every number needed is stated; nothing is ambiguous (say "calendar days", "inclusive", and so on where it matters).
2. "solution": the full working, step by step, with every calculation done.
3. "answer": the final answer exactly as it will appear among the options (for example "Rs 30").
4. "options": four different options. One is the "answer" text, copied exactly. The other three come from likely mistakes.
5. "explanation": one or two sentences for the candidate, consistent with the solution.
Also "section" (QUANT: arithmetic, percentages, ratios, time and work, probability, data; LOGICAL: series, coding, arrangements, syllogisms, puzzles; VERBAL: grammar, vocabulary, reading, sentence order) and "topic" (1-3 lowercase hyphenated words).

Plain English, Indian context where natural (rupees, Indian names). No trick questions, nothing that depends on current events, no dashes as punctuation. Base the questions on the company's topics where they can be tested this way; otherwise write general aptitude questions at the requested difficulty.

Reply with one JSON object: { "questions": [{ "section": string, "topic": string, "prompt": string, "solution": string, "answer": string, "options": [string, string, string, string], "explanation": string }] }`

const SOLVE = `You are checking aptitude questions. Solve each one yourself, carefully and step by step, then choose the ONE correct option by its index (0-3). If no option or more than one option is correct, answer -1.
Reply with one JSON object: { "answers": [{ "working": string, "index": number }] }, one entry per question, in the order given.`

const DASH = /[\u2013\u2014]/

export class AptitudeGenerate extends JobDurableObject<AptitudeGenerateInput> {
	protected readonly jobType: RunnableJobType = "aptitude_generate"
	protected override get initialPhaseLabel() {
		return "Writing questions"
	}

	/** One JSON completion; a transport failure retries, anything else fails the job with its reason. */
	private async json(system: string, user: string, temperature: number, maxTokens: number): Promise<unknown> {
		let raw: string
		try {
			raw = await chatJSON({ apiKey: this.env.OPENAI_API_KEY, model: modelFor("aptitudeGenerate"), temperature, maxTokens, system, user })
		} catch (error: unknown) {
			if (error instanceof RetryableError) throw error
			throw new Error(error instanceof Error ? error.message : "The questions could not be written")
		}
		try {
			return JSON.parse(raw)
		} catch {
			throw new Error("The AI's answer could not be read")
		}
	}

	protected async run(job: StoredJob<AptitudeGenerateInput>, progress: ProgressFn): Promise<unknown> {
		const { companyId, topics, difficulty, section } = job.input
		const count = Math.min(30, Math.max(1, Math.round(job.input.count)))
		const db = this.db()

		// Ask for more than needed: the blind check drops the ones it can't confirm.
		const ask = Math.min(40, Math.ceil(count * 1.4))
		await progress(15, `Writing ${ask} questions`)
		const parsed = await this.json(WRITE, `Write ${ask} ${difficulty.toLowerCase()} questions${section ? ` in the ${section} section` : ", spread across QUANT, LOGICAL and VERBAL"}.\n\nThe company's topics:\n${topics.slice(0, 1500) || "(none given: general aptitude)"}`, 0.4, Math.min(12000, 450 * ask + 500)) as { questions?: unknown }
		const written = (Array.isArray(parsed.questions) ? parsed.questions : []).map((q) => check(q as Record<string, unknown>, section, difficulty, companyId))

		await progress(60, "Solving each question independently")
		const candidates = written.filter((r): r is NonNullable<typeof r> => r !== null)
		let answers: { index?: unknown }[] = []
		if (candidates.length) {
			const solved = await this.json(SOLVE, JSON.stringify(candidates.map((r, n) => ({ n: n + 1, prompt: r.prompt, options: r.options }))), 0, Math.min(12000, 350 * candidates.length + 500)) as { answers?: unknown }
			answers = Array.isArray(solved.answers) ? (solved.answers as { index?: unknown }[]) : []
		}

		await progress(85, "Keeping the ones both passes agree on")
		const existing = new Set(
			(await db.select({ prompt: aptitudeQuestions.prompt }).from(aptitudeQuestions).where(eq(aptitudeQuestions.companyId, companyId)))
				.map((r) => norm(r.prompt)),
		)
		const rows: (typeof aptitudeQuestions.$inferInsert)[] = []
		let rejected = written.length - candidates.length
		for (const [n, row] of candidates.entries()) {
			if (Number(answers[n]?.index) !== row.correctIndex || existing.has(norm(row.prompt))) { rejected++; continue }
			existing.add(norm(row.prompt))
			rows.push(row)
			if (rows.length === count) break
		}
		if (rows.length === 0) throw new Error("None of the AI's questions passed the checks. Try again, or make the topics more specific.")
		// Fewer than asked is fine and says so; a question we couldn't confirm is worse than none.

		await db.insert(aptitudeQuestions).values(rows)
		await progress(95, "Saving")
		// The app lists the company's drafts itself; the result says what happened.
		return { created: rows.length, rejected, companyId }
	}
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()

/** Fisher-Yates with the platform's crypto random. */
function shuffle<T>(xs: T[]): T[] {
	const a = [...xs]
	const r = new Uint32Array(a.length)
	crypto.getRandomValues(r)
	for (let i = a.length - 1; i > 0; i--) {
		const j = r[i]! % (i + 1)
		;[a[i], a[j]] = [a[j]!, a[i]!]
	}
	return a
}

/** One generated question as a row, or null when it fails a check. */
function check(q: Record<string, unknown>, section: AptitudeGenerateInput["section"], difficulty: AptitudeGenerateInput["difficulty"], companyId: string) {
	const prompt = typeof q.prompt === "string" ? q.prompt.trim() : ""
	const explanation = typeof q.explanation === "string" ? q.explanation.trim() : ""
	const options = Array.isArray(q.options) ? q.options.map((o) => (typeof o === "string" ? o.trim() : "")) : []
	const answer = typeof q.answer === "string" ? norm(q.answer) : ""
	// The correct option is the one matching the stated answer, and there must be exactly one.
	const matches = options.map((o, i) => (norm(o) === answer ? i : -1)).filter((i) => i >= 0)
	const correctIndex = matches.length === 1 ? matches[0]! : -1
	const sec = (SECTIONS as readonly string[]).includes(String(q.section)) ? (q.section as (typeof SECTIONS)[number]) : section
	if (prompt.length < 15 || explanation.length < 10) return null
	if (options.length !== 4 || options.some((o) => !o)) return null
	if (new Set(options.map((o) => o.toLowerCase().replace(/\s+/g, " "))).size !== 4) return null
	if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return null
	if (!sec || (section && sec !== section)) return null
	if (DASH.test(prompt) || DASH.test(explanation) || options.some((o) => DASH.test(o))) return null
	const topic = typeof q.topic === "string" && q.topic.trim() ? q.topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) : "general"
	// Shuffle: the model puts its own answer first, so unshuffled every correct
	// option was "A" (10 of 10, measured 2026-09-25).
	const order = shuffle([0, 1, 2, 3])
	return {
		companyId,
		key: null,
		section: sec,
		topic,
		difficulty,
		prompt: prompt.slice(0, 2000),
		options: order.map((i) => options[i]!.slice(0, 300)),
		correctIndex: order.indexOf(correctIndex),
		explanation: explanation.slice(0, 1000),
		status: "DRAFT" as const,
		updatedAt: new Date(),
	}
}
