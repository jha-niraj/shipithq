import { and, eq } from "drizzle-orm"
import { type ConceptStatus, type PracticeMentorState } from "@repo/db/practice"
import type { RunnableJobType } from "../env"
import { schema, withTransaction } from "../db"
import { chatJSON } from "../openai"
import { modelFor } from "@repo/ai"
import { JobDurableObject, type ProgressFn, type StoredJob } from "./base"
import { mergeMentorState, mergeProfile, type ExtractedMemory } from "./practice-memory-merge"

const { practiceUserSession, practiceLearnerProfile } = schema

// ─────────────────────────────────────────────────────────────────────────────
// practice_memory_update: consolidate new mentor conversation into memory.
//
// Reads the transcript from the session's watermark onward, extracts what the
// user showed and what the mentor explained, and writes it into the session's
// mentor state and the user's learner profile. Dispatched by the app after a
// stage advance and after a passing submit, once the transcript is saved.
// The chat turn itself never waits for this (plan/practice-dsa PD-8).
// ─────────────────────────────────────────────────────────────────────────────

interface Input {
	sessionId: string
}

type ChatMessage = { role?: string; content?: string; timestamp?: string; ephemeral?: boolean }

/**
 * Asked as narrow facts per concept, with the status derived in code
 * (`statusFromFacts`). "Is this concept understood or shaky" is a judgement a
 * small model gets wrong; "did the student need a correction" is a fact it
 * gets right. That split is what makes gpt-4o-mini enough here.
 */
export const MEMORY_SYSTEM = `You maintain a tutor's memory of one student. You read the NEW part of a conversation between the student and a DSA mentor about one problem, and record facts. Reply with JSON only:
{
  "approach": string|null,
  "claimedComplexity": string|null,
  "conceptsExplained": string[],
  "misconceptions": string[],
  "hintsGiven": string[],
  "concepts": [ {
    "slug": string, "label": string,
    "evidence": string,
    "studentUsedIt": boolean,
    "studentWasWrongFirst": boolean,
    "confirmedByPassingTests": boolean
  } ],
  "mistakes": [ { "slug": string, "label": string } ]
}

Field rules:
- "approach": the student's own stated plan, in their words (max 300 chars), else null.
- "claimedComplexity": the student's MOST RECENT complexity claim, verbatim (a corrected claim replaces an earlier one), else null.
- "conceptsExplained": concepts the MENTOR explained, as short slugs ("hash-map", "big-o-nested-loops").
- "misconceptions": things the student got wrong, one short line each.
- "hintsGiven": nudges the mentor gave, one short line each.
- "concepts": EVERY concept that came up, including complexity analysis ("big-o-nested-loops"), techniques the student applied ("brute-force-pair-search") and ideas they reasoned out ("complement-lookup"), and concepts only the mentor mentioned.
  - "evidence": one short line quoting or paraphrasing what happened.
  - "studentUsedIt": true only if the STUDENT applied or explained it themselves (in words or in code). False if only the mentor talked about it.
  - "studentWasWrongFirst": true if the student got this concept wrong at some point in these messages and needed a correction or nudge, even if they got it right afterwards.
  - "confirmedByPassingTests": true if code applying it passed all tests in these messages.
- "mistakes": recurring error PATTERNS worth remembering across problems ("off-by-one in loop bounds", "miscounting nested-loop complexity"), not one-off typos. A misconception the student had counts.

Example. Messages: STUDENT "It's O(n) because it's one loop?" MENTOR "Count again: for each i, how many j?" STUDENT "Oh, O(n^2)."
-> concept big-o-nested-loops: studentUsedIt true, studentWasWrongFirst true, confirmedByPassingTests false; mistake "miscounting nested-loop complexity".`

/** Status from facts: never "mastered" (the merge promotes that across problems). */
export function statusFromFacts(c: { studentUsedIt?: unknown; studentWasWrongFirst?: unknown; confirmedByPassingTests?: unknown }): ConceptStatus {
	if (c.studentUsedIt !== true) return "introduced"
	if (c.studentWasWrongFirst === true) return "shaky"
	return "understood"
}

function clean(list: unknown, max: number): string[] {
	return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().slice(0, 200)).slice(0, max) : []
}

export function readExtraction(raw: string): ExtractedMemory {
	const v = JSON.parse(raw) as Record<string, unknown>
	const str = (x: unknown, n: number) => (typeof x === "string" && x.trim() ? x.trim().slice(0, n) : undefined)
	const concepts = (Array.isArray(v.concepts) ? v.concepts : []).flatMap((c) => {
		if (!c || typeof c !== "object") return []
		const o = c as Record<string, unknown>
		if (typeof o.label !== "string" || !o.label.trim()) return []
		return [{ slug: typeof o.slug === "string" ? o.slug : o.label, label: o.label, status: statusFromFacts(o), note: typeof o.evidence === "string" ? o.evidence : "" }]
	})
	const mistakes = (Array.isArray(v.mistakes) ? v.mistakes : []).flatMap((m) => {
		if (!m || typeof m !== "object") return []
		const o = m as Record<string, unknown>
		return typeof o.label === "string" ? [{ slug: typeof o.slug === "string" ? o.slug : o.label, label: o.label }] : []
	})
	// A concept the student got wrong first is also a mistake pattern, whether
	// or not the model listed it: the counter across problems is what makes a
	// recurring weakness visible on the memory page.
	for (const c of (Array.isArray(v.concepts) ? v.concepts : []) as Array<Record<string, unknown>>) {
		if (c?.studentWasWrongFirst !== true || typeof c.label !== "string") continue
		const slug = `misread-${typeof c.slug === "string" ? c.slug : c.label}`
		if (!mistakes.some((m) => m.slug === slug)) mistakes.push({ slug, label: `Needed a correction on ${c.label.trim()}` })
	}
	return {
		approach: str(v.approach, 300),
		claimedComplexity: str(v.claimedComplexity, 120),
		conceptsExplained: clean(v.conceptsExplained, 10),
		misconceptions: clean(v.misconceptions, 6),
		hintsGiven: clean(v.hintsGiven, 6),
		concepts: concepts.slice(0, 10),
		mistakes: mistakes.slice(0, 5),
	}
}

export class PracticeMemoryUpdate extends JobDurableObject<Input> {
	protected readonly jobType: RunnableJobType = "practice_memory_update"
	protected override get initialPhaseLabel() {
		return "Reading the conversation"
	}

	protected async run(job: StoredJob<Input>, progress: ProgressFn): Promise<unknown> {
		const db = this.db()
		const session = await db.query.practiceUserSession.findFirst({
			where: and(eq(practiceUserSession.id, job.input.sessionId), eq(practiceUserSession.userId, job.userId)),
			columns: { id: true, userId: true, module: true, chatHistory: true, memoryWatermark: true, mentorState: true },
			with: { problem: { columns: { slug: true, title: true } } },
		})
		if (!session) throw new Error("That practice session no longer exists")

		const history = (Array.isArray(session.chatHistory) ? session.chatHistory : []) as ChatMessage[]
		const watermark = session.memoryWatermark
		if (history.length <= watermark) return { skipped: true, reason: "nothing new" }

		const window = history
			.slice(watermark)
			.filter((m) => !m.ephemeral && (m.role === "user" || m.role === "assistant") && m.content?.trim())
		const windowEnd = history.reduce((max, m) => (m.timestamp && m.timestamp > max ? m.timestamp : max), "")
			|| new Date().toISOString()
		if (window.length === 0) {
			await db.update(practiceUserSession).set({ memoryWatermark: history.length })
				.where(and(eq(practiceUserSession.id, session.id), eq(practiceUserSession.memoryWatermark, watermark)))
			return { skipped: true, reason: "no conversational messages" }
		}

		const profile = await db.query.practiceLearnerProfile.findFirst({
			where: and(eq(practiceLearnerProfile.userId, session.userId), eq(practiceLearnerProfile.module, session.module)),
		})

		await progress(40, "Extracting what you showed")
		const raw = await chatJSON({
			apiKey: this.env.OPENAI_API_KEY,
			model: modelFor("practiceMemory"),
			system: MEMORY_SYSTEM,
			user: `Problem: ${session.problem.title}\n\nAlready known about this problem: ${JSON.stringify(session.mentorState ?? {})}\n\nKnown concepts: ${(profile?.concepts ?? []).map((c) => `${c.slug}=${c.status}`).join(", ") || "(none)"}\n\nNEW messages:\n${window.map((m) => `${m.role === "user" ? "STUDENT" : "MENTOR"}: ${(m.content ?? "").slice(0, 2000)}`).join("\n\n")}`,
			temperature: 0,
			maxTokens: 1200,
		})
		let extracted: ExtractedMemory
		try {
			extracted = readExtraction(raw)
		} catch {
			throw new Error("The memory extraction returned output we could not read")
		}

		const mentorState: PracticeMentorState = mergeMentorState(session.mentorState, extracted)
		const merged = mergeProfile({
			concepts: profile?.concepts ?? [],
			mistakes: profile?.mistakes ?? [],
			deleted: profile?.deletedSlugs ?? [],
			updates: extracted,
			problemSlug: session.problem.slug,
			windowEnd,
		})

		await progress(80, "Saving")
		// One transaction: the watermark move is the guard. If another run already
		// consumed this window, the session update matches nothing and the profile
		// is left alone, so mistake counts are never applied twice.
		const applied = await withTransaction(this.env.DATABASE_URL, async (tx) => {
			const moved = await tx
				.update(practiceUserSession)
				.set({ mentorState, memoryWatermark: history.length })
				.where(and(eq(practiceUserSession.id, session.id), eq(practiceUserSession.memoryWatermark, watermark)))
				.returning({ id: practiceUserSession.id })
			if (moved.length === 0) return false
			await tx
				.insert(practiceLearnerProfile)
				.values({ userId: session.userId, module: session.module, concepts: merged.concepts, mistakes: merged.mistakes })
				.onConflictDoUpdate({
					target: [practiceLearnerProfile.userId, practiceLearnerProfile.module],
					set: { concepts: merged.concepts, mistakes: merged.mistakes, updatedAt: new Date() },
				})
			return true
		})

		return applied
			? { applied: true, window: window.length, concepts: extracted.concepts.length, mistakes: extracted.mistakes.length }
			: { skipped: true, reason: "window already applied" }
	}
}
