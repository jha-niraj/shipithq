import {
	CONCEPT_STATUS_ORDER, emptyMentorState,
	type ConceptStatus, type DeletedConcept, type LearnerConcept, type LearnerMistake, type PracticeMentorState,
} from "@repo/db/practice"

// ─────────────────────────────────────────────────────────────────────────────
// The merge rules for the mentor's memory (plan/practice-dsa PD-8). Pure, so
// the two properties that matter can be checked without a database:
//
// 1. Idempotent. Running the same window twice changes nothing: statuses take
//    the max on an ordered scale, evidence is de-duplicated on (problem, note),
//    lists are unioned. Mistake counts are the one non-idempotent field, which
//    is why the job applies a window at most once (conditional on the
//    watermark it read).
// 2. Deletion sticks. A slug the user deleted is not re-added from a window
//    that ended before the deletion.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConceptUpdate {
	slug: string
	label: string
	status: ConceptStatus
	note: string
}

export interface MistakeUpdate {
	slug: string
	label: string
}

export interface ExtractedMemory {
	approach?: string
	claimedComplexity?: string
	conceptsExplained: string[]
	misconceptions: string[]
	hintsGiven: string[]
	concepts: ConceptUpdate[]
	mistakes: MistakeUpdate[]
}

const MAX_EVIDENCE = 6
const MAX_LIST = 12

export function normaliseSlug(raw: string): string {
	return raw
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40)
}

function union(a: string[], b: string[], max = MAX_LIST): string[] {
	const seen = new Set<string>()
	const out: string[] = []
	for (const x of [...a, ...b]) {
		const t = x.trim()
		const k = t.toLowerCase()
		if (!t || seen.has(k)) continue
		seen.add(k)
		out.push(t)
	}
	return out.slice(-max)
}

function rank(s: ConceptStatus): number {
	return CONCEPT_STATUS_ORDER.indexOf(s)
}

export function mergeMentorState(prev: PracticeMentorState | null, x: ExtractedMemory): PracticeMentorState {
	const base = { ...emptyMentorState(), ...(prev ?? {}) }
	return {
		...base,
		approach: base.approach ?? x.approach,
		claimedComplexity: x.claimedComplexity ?? base.claimedComplexity,
		conceptsExplained: union(base.conceptsExplained, x.conceptsExplained.map(normaliseSlug)),
		misconceptions: union(base.misconceptions, x.misconceptions),
		hintsGiven: union(base.hintsGiven, x.hintsGiven),
	}
}

export function mergeProfile(input: {
	concepts: LearnerConcept[]
	mistakes: LearnerMistake[]
	deleted: DeletedConcept[]
	updates: ExtractedMemory
	problemSlug: string
	/** Timestamp of the newest message in the window. */
	windowEnd: string
}): { concepts: LearnerConcept[]; mistakes: LearnerMistake[] } {
	const { problemSlug, windowEnd } = input
	const deletedAfter = new Map(input.deleted.map((d) => [d.slug, d.deletedAt]))
	const blocked = (slug: string) => {
		const at = deletedAfter.get(slug)
		return at !== undefined && at >= windowEnd
	}

	const concepts = new Map(input.concepts.map((c) => [c.slug, { ...c, evidence: [...c.evidence] }]))
	for (const u of input.updates.concepts) {
		const slug = normaliseSlug(u.slug || u.label)
		if (!slug || !u.label.trim() || blocked(slug)) continue
		const note = u.note.trim().slice(0, 200)
		// The model never decides "mastered"; the system does: a concept already
		// understood on another problem and understood again here is mastered.
		const incoming: ConceptStatus = u.status === "mastered" ? "understood" : u.status
		const existing = concepts.get(slug)
		if (!existing) {
			concepts.set(slug, { slug, label: u.label.trim().slice(0, 60), status: incoming, evidence: [{ problemSlug, at: windowEnd, note }], lastSeenAt: windowEnd })
			continue
		}
		let status: ConceptStatus = rank(incoming) > rank(existing.status) ? incoming : existing.status
		if (existing.status === "understood" && incoming === "understood" && existing.evidence.some((e) => e.problemSlug !== problemSlug)) {
			status = "mastered"
		}
		const dup = existing.evidence.some((e) => e.problemSlug === problemSlug && e.note === note)
		concepts.set(slug, {
			...existing,
			status,
			evidence: dup ? existing.evidence : [...existing.evidence, { problemSlug, at: windowEnd, note }].slice(-MAX_EVIDENCE),
			lastSeenAt: windowEnd > existing.lastSeenAt ? windowEnd : existing.lastSeenAt,
		})
	}

	const mistakes = new Map(input.mistakes.map((m) => [m.slug, { ...m }]))
	for (const u of input.updates.mistakes) {
		const slug = normaliseSlug(u.slug || u.label)
		if (!slug || !u.label.trim()) continue
		const existing = mistakes.get(slug)
		mistakes.set(slug, existing
			? { ...existing, count: existing.count + 1, lastProblemSlug: problemSlug, lastSeenAt: windowEnd }
			: { slug, label: u.label.trim().slice(0, 80), count: 1, lastProblemSlug: problemSlug, lastSeenAt: windowEnd })
	}

	return { concepts: [...concepts.values()], mistakes: [...mistakes.values()] }
}
