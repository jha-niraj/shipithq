// ─────────────────────────────────────────────────────────────────────────────
// The rules the server holds regardless of what the model says: how many
// questions a run has, how many may be open, and what a well-formed question
// looks like. Pure functions, no I/O, so the route can be reasoned about in
// isolation and the numbers are only written once (in @repo/db, next to the
// column shapes they govern).
// ─────────────────────────────────────────────────────────────────────────────

import {
    ONBOARDING_MAX_OPEN_QUESTIONS, ONBOARDING_MAX_QUESTIONS, ONBOARDING_MIN_QUESTIONS,
    ONBOARDING_OPEN_ANSWER_MAX_CHARS, isOnboardingLevel,
    type OnboardingProfile, type OnboardingQuestion, type OnboardingTurn,
} from "@repo/db"

export const OPTION_MAX_CHARS = 60
export const OPTION_MIN_COUNT = 3
export const OPTION_MAX_COUNT = 6

/** Turns that have an answer. The run's "length" for floor and ceiling purposes. */
export function answeredCount(turns: OnboardingTurn[]): number {
    return turns.filter((t) => t.answer !== null).length
}

export function openCount(turns: OnboardingTurn[]): number {
    return turns.filter((t) => t.question.kind === "open").length
}

/** The model may end the run only once the floor is met. */
export function mayFinish(answered: number): boolean {
    return answered >= ONBOARDING_MIN_QUESTIONS
}

/** Once the ceiling is hit the run must end, whatever the model wanted. */
export function mustFinish(answered: number): boolean {
    return answered >= ONBOARDING_MAX_QUESTIONS
}

export function mayAskOpen(turns: OnboardingTurn[]): boolean {
    return openCount(turns) < ONBOARDING_MAX_OPEN_QUESTIONS
}

/** Control characters out, whitespace collapsed, length capped. Applied to every free-text answer. */
export function sanitiseOpenAnswer(value: string): string {
    return value
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, ONBOARDING_OPEN_ANSWER_MAX_CHARS)
}

export type QuestionCheck =
    | { ok: true; question: OnboardingQuestion }
    | { ok: false; reason: string }

/**
 * Normalise a model-produced question and say whether it is usable.
 *
 * Options are trimmed, de-duplicated case-insensitively and capped in length.
 * A choice question that ends up with fewer than three or more than six options
 * is rejected so the route retries rather than showing a two-option "quiz".
 */
export function checkQuestion(raw: unknown, allowOpen: boolean): QuestionCheck {
    if (!raw || typeof raw !== "object") return { ok: false, reason: "question missing" }
    const q = raw as Record<string, unknown>
    const text = typeof q.text === "string" ? q.text.trim() : ""
    if (text.length < 8) return { ok: false, reason: "question text too short" }
    const kind = q.kind === "single" || q.kind === "multi" || q.kind === "open" ? q.kind : null
    if (!kind) return { ok: false, reason: "unknown question kind" }
    if (kind === "open" && !allowOpen) return { ok: false, reason: "open question not allowed" }
    const why = typeof q.why === "string" ? q.why.trim().slice(0, 160) : ""

    if (kind === "open") {
        return { ok: true, question: { text, kind, options: [], why } }
    }

    const seen = new Set<string>()
    const options: string[] = []
    for (const o of Array.isArray(q.options) ? q.options : []) {
        if (typeof o !== "string") continue
        const t = o.trim().slice(0, OPTION_MAX_CHARS)
        const key = t.toLowerCase()
        if (!t || seen.has(key)) continue
        seen.add(key)
        options.push(t)
    }
    if (options.length < OPTION_MIN_COUNT) return { ok: false, reason: "too few options" }
    if (options.length > OPTION_MAX_COUNT) options.length = OPTION_MAX_COUNT

    return { ok: true, question: { text, kind, options, why } }
}

export type ProfileCheck =
    | { ok: true; profile: OnboardingProfile }
    | { ok: false; reason: string }

function stringList(value: unknown, max: number): string[] {
    if (!Array.isArray(value)) return []
    const out: string[] = []
    for (const v of value) {
        if (typeof v !== "string") continue
        const t = v.trim().slice(0, 200)
        if (t) out.push(t)
        if (out.length >= max) break
    }
    return out
}

export function checkProfile(raw: unknown): ProfileCheck {
    if (!raw || typeof raw !== "object") return { ok: false, reason: "profile missing" }
    const p = raw as Record<string, unknown>
    if (!isOnboardingLevel(p.level)) return { ok: false, reason: "level invalid" }
    const summary = stringList(p.summary, 3)
    if (summary.length !== 3) return { ok: false, reason: "summary must be three lines" }
    return {
        ok: true,
        profile: {
            level: p.level,
            facts: stringList(p.facts, 12),
            strengths: stringList(p.strengths, 8),
            gaps: stringList(p.gaps, 8),
            goals: stringList(p.goals, 6),
            summary: [summary[0]!, summary[1]!, summary[2]!],
        },
    }
}

/** Validate a submitted answer against the turn it answers. Returns the cleaned values or an error. */
export function checkAnswer(
    turn: OnboardingTurn,
    values: unknown,
): { ok: true; values: string[] } | { ok: false; error: string } {
    if (!Array.isArray(values)) return { ok: false, error: "Answer must be a list." }
    const strings = values.filter((v): v is string => typeof v === "string")

    if (turn.question.kind === "open") {
        const text = sanitiseOpenAnswer(strings[0] ?? "")
        if (!text) return { ok: false, error: "Type or say your answer first." }
        return { ok: true, values: [text] }
    }

    const allowed = new Set(turn.question.options)
    const picked = Array.from(new Set(strings.filter((s) => allowed.has(s))))
    if (picked.length === 0) return { ok: false, error: "Pick an option." }
    if (turn.question.kind === "single" && picked.length > 1) {
        return { ok: false, error: "Pick one option." }
    }
    return { ok: true, values: picked }
}
