import { BEHAVIOURAL_KNOWLEDGE, BEHAVIOURAL_RUBRIC, CULTURE_KNOWLEDGE, CULTURE_RUBRIC } from "@repo/db/hiring-defaults"
import { V1_ROUND_TYPES, type PoolLevel, type RoundDraft, type V1RoundType } from "@/types/pipeline"

/*
 * Turning an AI's pipeline draft into rounds the builder accepts (plan/hiring-
 * rounds HR-10; plan/hiring-app HA-12). Shared by "Draft with AI" in the
 * pipeline builder and the AI panel's pipeline proposal, so both clamp and
 * check a draft the same way. Pure: no database.
 */

export const isV1 = (t: string): t is V1RoundType => (V1_ROUND_TYPES as readonly string[]).includes(t)

/** Defaults a new voice round starts with (the platform pipelines' rubric and brief). */
export function voiceDefaults(roundType: string) {
    if (roundType === "VOICE_BEHAVIOURAL") return { rubric: BEHAVIOURAL_RUBRIC, mockKnowledgeBase: BEHAVIOURAL_KNOWLEDGE }
    if (roundType === "VOICE_CULTURE") return { rubric: CULTURE_RUBRIC, mockKnowledgeBase: CULTURE_KNOWLEDGE }
    return { rubric: null, mockKnowledgeBase: null }
}

/** The prompt a pipeline draft is written from (HR-10); the reply goes through `normalisePipelineDraft`. */
export const DRAFT_SYSTEM = `You design interview pipelines for a hiring platform where candidates take rounds online before any human interview. Given a role and what the company says about it, choose 3 to 6 rounds, in order, from ONLY these types:
- APTITUDE: ONE timed multiple-choice round covering quant, logical and verbal together; it can't be split by section. Scored automatically.
- DSA: data structures and algorithms coding problems, run against hidden tests. Scored automatically.
- SYSTEM_DESIGN: design a system from a brief; AI-assessed against a rubric. Use for roles with real backend or architecture work, not for interns.
- VOICE_BEHAVIOURAL: a spoken or typed behavioural interview; AI-assessed.
- VOICE_CULTURE: a conversation about how the person works and learns; AI-assessed.

Rules:
- At most one round of each type, except DSA, which may have two (an easier one, then a harder one).
- Automatically scored rounds (APTITUDE, DSA) come before AI-assessed ones, and are usually "HARD" gates. AI-assessed rounds are "ADVISORY".
- passMark: 50 to 75 for HARD rounds; 60 for ADVISORY.
- timeLimitMinutes: APTITUDE 20-30, DSA 30-60, SYSTEM_DESIGN 40-60, voice 15-25.
- drawCount: APTITUDE 15-25 questions, DSA 1, SYSTEM_DESIGN 1, voice 1.
- level: EASY for interns and freshers, MEDIUM for 1-3 years, HARD only for senior roles.
- title: short and honest about what the round is ("Aptitude", "Coding: data structures", "System design"). Never promise a topic the round can't guarantee: questions are drawn from a shared bank. description: one or two sentences telling the candidate what the round checks.

Reply with one JSON object: { "name": string, "description": string, "rounds": [{ "roundType": string, "title": string, "description": string, "gateMode": "HARD"|"ADVISORY", "passMark": number, "timeLimitMinutes": number, "drawCount": number, "level": "EASY"|"MEDIUM"|"HARD" }] }`

export interface NormalisedDraft { name: string; description: string; rounds: RoundDraft[] }

/**
 * Everything the model says is checked and clamped before it becomes rounds.
 * Null when fewer than two usable rounds remain.
 */
export function normalisePipelineDraft(raw: unknown, fallbackName: string): NormalisedDraft | null {
    const obj = (raw ?? {}) as { name?: unknown; description?: unknown; rounds?: unknown }
    const clamp = (v: unknown, lo: number, hi: number, dflt: number) => {
        const n = Math.round(Number(v))
        return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt
    }
    const drafts: RoundDraft[] = (Array.isArray(obj.rounds) ? obj.rounds : [])
        .map((x) => x as Record<string, unknown>)
        .filter((x) => typeof x.roundType === "string" && isV1(x.roundType))
        // One round per type (two for DSA), whatever the model returned: a pool
        // is shared across a type, so a second aptitude round only repeats the first.
        .filter((x, i, all) => all.slice(0, i).filter((y) => y.roundType === x.roundType).length < (x.roundType === "DSA" ? 2 : 1))
        .slice(0, 8)
        .map((x) => {
            const t = x.roundType as V1RoundType
            const aiAssessed = t === "SYSTEM_DESIGN" || t.startsWith("VOICE_")
            const gateMode = aiAssessed ? "ADVISORY" : x.gateMode === "ADVISORY" ? "ADVISORY" : "HARD"
            const level = (["EASY", "MEDIUM", "HARD"] as const).includes(x.level as PoolLevel) ? (x.level as PoolLevel) : "MEDIUM"
            const voice = voiceDefaults(t)
            return {
                roundType: t,
                title: typeof x.title === "string" && x.title.trim() ? x.title.trim().slice(0, 80) : t,
                description: typeof x.description === "string" ? x.description.trim().slice(0, 500) : "",
                gateMode,
                passMark: gateMode === "HARD" ? clamp(x.passMark, 40, 90, 60) : 60,
                timeLimitMinutes: clamp(x.timeLimitMinutes, 10, 90, t === "APTITUDE" ? 25 : t.startsWith("VOICE_") ? 20 : 45),
                drawCount: t === "APTITUDE" ? clamp(x.drawCount, 10, 25, 20) : 1,
                cooldownHours: 24,
                responseMode: t.startsWith("VOICE_") ? "EITHER" : "TYPED",
                rubric: voice.rubric,
                mockKnowledgeBase: voice.mockKnowledgeBase,
                poolLevel: level,
            } satisfies RoundDraft
        })
    // Two coding rounds must differ: the second one draws a level harder, and
    // each is titled by the level it really draws ("(easy)"), never the model's guess.
    const coding = drafts.filter((d) => d.roundType === "DSA")
    if (coding.length === 2 && coding[0]!.poolLevel === coding[1]!.poolLevel) {
        coding[1]!.poolLevel = coding[1]!.poolLevel === "EASY" ? "MEDIUM" : "HARD"
    }
    for (const d of coding) d.title = `Coding (${(d.poolLevel ?? "MEDIUM").toLowerCase()})`
    if (drafts.length < 2) return null
    const name = typeof obj.name === "string" && obj.name.trim() ? obj.name.trim().slice(0, 120) : fallbackName
    return { name, description: typeof obj.description === "string" ? obj.description.trim().slice(0, 1000) : "", rounds: drafts }
}
