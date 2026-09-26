/*
 * The pipeline builder's shapes (plan/hiring-rounds HR-10). Kept out of the
 * "use server" action file: such a file may export only async functions.
 */

/** The round types a student can take on ShipItHQ (v1). Anything else is legacy. */
export const V1_ROUND_TYPES = ["APTITUDE", "DSA", "SYSTEM_DESIGN", "VOICE_BEHAVIOURAL", "VOICE_CULTURE"] as const
export type V1RoundType = (typeof V1_ROUND_TYPES)[number]

export const ROUND_TYPE_LABEL: Record<V1RoundType, string> = {
    APTITUDE: "Aptitude",
    DSA: "Coding (DSA)",
    SYSTEM_DESIGN: "System design",
    VOICE_BEHAVIOURAL: "Behavioural interview",
    VOICE_CULTURE: "Culture conversation",
}

/** Rounds that draw questions from a pool; voice rounds use a rubric instead. */
export const POOLED_TYPES: readonly V1RoundType[] = ["APTITUDE", "DSA", "SYSTEM_DESIGN"]
/** Scored by AI: shown as "AI-assessed" to students. */
export const AI_ASSESSED_TYPES: readonly V1RoundType[] = ["SYSTEM_DESIGN", "VOICE_BEHAVIOURAL", "VOICE_CULTURE"]

export type PoolLevel = "EASY" | "MEDIUM" | "HARD"

export interface RubricCriterion {
    criterion: string
    weight: number
    lookFor: string
}

/** One round as the builder edits it. `id` is set for a saved round. */
export interface RoundDraft {
    id?: string
    /** A v1 type, or the old type of a legacy round until it is changed. */
    roundType: string
    title: string
    description: string
    gateMode: "HARD" | "ADVISORY"
    passMark: number
    timeLimitMinutes: number
    drawCount: number
    cooldownHours: number
    responseMode: "VOICE" | "TYPED" | "EITHER"
    /** Voice rounds: what the answer is scored against. */
    rubric: RubricCriterion[] | null
    /** Voice rounds: what the interviewer should probe. */
    mockKnowledgeBase: string | null
    /**
     * For a new round, or one whose type changed: the level its default pool is
     * filled at. Ignored otherwise (HR-11 edits pools).
     */
    poolLevel?: PoolLevel
    /**
     * The round's pool as picked in the pool sheet (HR-11): ref ids of the
     * round's kind. Unset means "keep the saved pool" (or the default for a new
     * or changed type).
     */
    pool?: string[]
}

/** A saved round, with what the builder needs to check it. */
export interface BuilderRound extends RoundDraft {
    id: string
    /** Items in the round's pool now. */
    poolSize: number
    /** The saved pool's ref ids, for the pool sheet. */
    savedPool: string[]
    legacy: boolean
}

/** One item the pool sheet can pick (HR-11). */
export interface CatalogItem {
    id: string
    title: string
    difficulty: "EASY" | "MEDIUM" | "HARD"
    /** DSA: category; aptitude: section and topic; design: "ShipItHQ" or "Yours". */
    tag: string
    /** Aptitude: QUANT / LOGICAL / VERBAL. */
    section?: string
    /** The company's own item (its AI questions, its written prompts). */
    own: boolean
    /** A company's AI question not yet approved: shown, never drawable. */
    draft?: boolean
}

export type PoolKind = "APTITUDE_QUESTION" | "PRACTICE_PROBLEM" | "DESIGN_PROMPT"

export const POOL_KIND_FOR: Record<"APTITUDE" | "DSA" | "SYSTEM_DESIGN", PoolKind> = {
    APTITUDE: "APTITUDE_QUESTION",
    DSA: "PRACTICE_PROBLEM",
    SYSTEM_DESIGN: "DESIGN_PROMPT",
}

export interface PipelineSummary {
    id: string
    name: string
    description: string | null
    roundCount: number
    gatedCount: number
    legacyCount: number
    jobsUsing: number
    updatedAt: Date
}

export interface TemplateSummary {
    id: string
    name: string
    description: string | null
    rounds: { title: string; roundType: string }[]
}

/** Limits every saved pipeline is checked against, client and server alike. */
export const PIPELINE_LIMITS = {
    maxRounds: 12,
    passMark: { min: 0, max: 100 },
    timeLimitMinutes: { min: 5, max: 180 },
    cooldownHours: { min: 0, max: 720 },
    drawCount: { min: 1, max: 50 },
    /** Mirrors POOL_TO_DRAW_RATIO in @repo/db: fewer means retakes repeat questions. */
    poolToDrawWarning: 2,
} as const

/** Human-readable problems with one round; empty means it can be saved. */
export function roundProblems(r: RoundDraft, poolSize: number | null): string[] {
    const p: string[] = []
    const L = PIPELINE_LIMITS
    if (!(V1_ROUND_TYPES as readonly string[]).includes(r.roundType)) p.push("This is a legacy round type. Pick one students can take on ShipItHQ.")
    if (!r.title.trim()) p.push("Give the round a title.")
    if (!Number.isInteger(r.passMark) || r.passMark < L.passMark.min || r.passMark > L.passMark.max) p.push("The pass mark is a whole number from 0 to 100.")
    if (r.gateMode === "HARD" && r.passMark <= 0) p.push("A HARD gate needs a pass mark above 0.")
    // NaN (an emptied box) fails every comparison, so "in range" is checked positively.
    const inRange = (v: number, lo: number, hi: number) => Number.isFinite(v) && v >= lo && v <= hi
    if (!inRange(r.timeLimitMinutes, L.timeLimitMinutes.min, L.timeLimitMinutes.max)) p.push(`The time limit is ${L.timeLimitMinutes.min} to ${L.timeLimitMinutes.max} minutes.`)
    if (!inRange(r.cooldownHours, L.cooldownHours.min, L.cooldownHours.max)) p.push(`The cool-down is ${L.cooldownHours.min} to ${L.cooldownHours.max} hours.`)
    const pooled = (POOLED_TYPES as readonly string[]).includes(r.roundType)
    if (pooled) {
        if (r.drawCount < L.drawCount.min || r.drawCount > L.drawCount.max || !Number.isInteger(r.drawCount)) p.push(`Draw ${L.drawCount.min} to ${L.drawCount.max} questions.`)
        else if (poolSize !== null && r.drawCount > poolSize) p.push(`The pool has ${poolSize} ${poolSize === 1 ? "item" : "items"}, so the round can't draw ${r.drawCount}.`)
    }
    if (r.roundType === "VOICE_BEHAVIOURAL" || r.roundType === "VOICE_CULTURE") {
        const rubric = r.rubric ?? []
        if (rubric.length === 0) p.push("A voice round needs a rubric.")
        else {
            const total = rubric.reduce((n, c) => n + (Number.isFinite(c.weight) ? c.weight : 0), 0)
            if (total !== 100) p.push(`The rubric's weights add up to ${total}, not 100.`)
            if (rubric.some((c) => !c.criterion.trim())) p.push("Every rubric line needs a criterion.")
        }
    }
    return p
}
