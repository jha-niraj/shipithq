import type { DesignRubricCriterion } from "../schema/hiring-rounds"

/**
 * ShipItHQ's generic role pipelines (plan/hiring-rounds HR-4). They are what an
 * unclaimed company page offers for practice, labelled "By ShipItHQ", and what a
 * company can adopt as its own template once it claims its page.
 *
 * Every number here is a decision recorded in plan/hiring-rounds/overview.md,
 * "ShipItHQ's platform pipelines" (Niraj, 2026-09-25): pass mark 60, HARD on
 * aptitude and DSA, ADVISORY on AI-assessed rounds, and the standard sizes.
 * Change the overview first, then this file.
 *
 * Seeded by `pnpm script seed-pipelines`. `templateKey` and `roundNumber` are the
 * seed keys: renaming a title is safe, renumbering a round is not.
 */

type Difficulty = "EASY" | "MEDIUM" | "HARD"

/** How a round's pool is filled. Resolved against the database by the seed script. */
export type PoolSource =
    | { kind: "APTITUDE_QUESTION"; difficulties: Difficulty[] }
    | { kind: "PRACTICE_PROBLEM"; difficulty: Difficulty }
    | { kind: "DESIGN_PROMPT"; difficulties: Difficulty[] }

export interface PlatformRoundSeed {
    roundNumber: number
    roundType: "APTITUDE" | "DSA" | "SYSTEM_DESIGN" | "VOICE_BEHAVIOURAL" | "VOICE_CULTURE"
    title: string
    description: string
    format: "VOICE" | "LIVE_CODING" | "WHITEBOARD" | "VIDEO"
    gateMode: "HARD" | "ADVISORY"
    passMark: number
    timeLimitMinutes: number
    drawCount: number
    cooldownHours: number
    responseMode: "VOICE" | "TYPED" | "EITHER"
    topicsCovered: string[]
    /** AI-assessed rounds only: what the answer is scored against. */
    rubric: DesignRubricCriterion[] | null
    /** Voice rounds only: what the interviewer should probe. */
    mockKnowledgeBase: string | null
    /** Null for voice rounds, which have no pool. */
    pool: PoolSource | null
}

export interface PlatformPipelineSeed {
    templateKey: string
    name: string
    description: string
    rounds: PlatformRoundSeed[]
}

// ── The decisions (overview.md, "ShipItHQ's platform pipelines") ─────────────
export const PLATFORM_PASS_MARK = 60
export const PLATFORM_COOLDOWN_HOURS = 24
/** A pool must hold this many times its draw, so a retake draws a fresh set. */
export const POOL_TO_DRAW_RATIO = 4

const c = (criterion: string, weight: number, lookFor: string): DesignRubricCriterion => ({ criterion, weight, lookFor })

export const BEHAVIOURAL_RUBRIC: DesignRubricCriterion[] = [
    c("Structure", 20, "Answers follow situation, task, action and result, and stay on the question asked."),
    c("Ownership", 25, "Says what they did, in the first person, including decisions they made and why."),
    c("Evidence of impact", 20, "A concrete result: a number, a shipped change, or a clear before and after."),
    c("Handling difficulty", 20, "A real setback or disagreement, what they did about it, and what they would do differently."),
    c("Communication", 15, "Clear and concise; technical detail pitched at a listener who was not there."),
]

export const CULTURE_RUBRIC: DesignRubricCriterion[] = [
    c("Collaboration", 25, "Specific examples of working with others: giving and taking feedback, unblocking a teammate."),
    c("Learning and curiosity", 20, "Something they taught themselves recently, how, and what they built with it."),
    c("Accountability", 20, "Owns a mistake without blaming others, and describes the fix and the lesson."),
    c("Motivation", 20, "Why this kind of work and role, in their own words rather than a generic line."),
    c("Communication", 15, "Listens to the question, answers it directly, and asks a good question back."),
]

export const BEHAVIOURAL_KNOWLEDGE = `You are interviewing a candidate for an entry-level software engineering role. Ask 4 to 5 behavioural questions, one at a time, and follow up on vague answers ("what did you do, specifically?", "what was the result?").

Draw from: a project they are proud of and their exact part in it; a bug or outage they tracked down; a disagreement with a teammate and how it ended; a time they missed a deadline or got something wrong; a time they had to learn something fast.

Do not ask about age, family, religion, health or anything unrelated to the work. Do not score out loud or hint at the rubric.`

export const CULTURE_KNOWLEDGE = `You are having a culture conversation with a candidate for an entry-level full-stack role. Ask 4 to 5 questions, one at a time, and follow up where an answer is general.

Draw from: how they like to receive feedback, with an example; the last thing they learned on their own; how they decide what to work on when everything is urgent; a team they enjoyed being part of and why; what they want to be better at in a year.

Keep it conversational. Do not ask about age, family, religion, health or anything unrelated to the work. Do not score out loud or hint at the rubric.`

// ── Round builders ───────────────────────────────────────────────────────────

function aptitude(roundNumber: number, difficulties: Difficulty[]): PlatformRoundSeed {
    return {
        roundNumber,
        roundType: "APTITUDE",
        title: "Aptitude",
        description: "20 multiple-choice questions across quantitative, logical and verbal reasoning, in 25 minutes. Scored automatically.",
        format: "VIDEO",
        gateMode: "HARD",
        passMark: PLATFORM_PASS_MARK,
        timeLimitMinutes: 25,
        drawCount: 20,
        cooldownHours: PLATFORM_COOLDOWN_HOURS,
        responseMode: "TYPED",
        topicsCovered: ["Quantitative aptitude", "Logical reasoning", "Verbal ability"],
        rubric: null,
        mockKnowledgeBase: null,
        pool: { kind: "APTITUDE_QUESTION", difficulties },
    }
}

function dsa(roundNumber: number, difficulty: Difficulty): PlatformRoundSeed {
    const label = difficulty === "EASY" ? "easy" : "medium"
    return {
        roundNumber,
        roundType: "DSA",
        title: `Coding (${label})`,
        description: `One ${label} data structures and algorithms problem in 45 minutes, run against hidden tests. Scored automatically.`,
        format: "LIVE_CODING",
        gateMode: "HARD",
        passMark: PLATFORM_PASS_MARK,
        timeLimitMinutes: 45,
        drawCount: 1,
        cooldownHours: PLATFORM_COOLDOWN_HOURS,
        responseMode: "TYPED",
        topicsCovered: ["Data structures", "Algorithms", "Complexity"],
        rubric: null,
        mockKnowledgeBase: null,
        pool: { kind: "PRACTICE_PROBLEM", difficulty },
    }
}

function systemDesign(roundNumber: number): PlatformRoundSeed {
    return {
        roundNumber,
        roundType: "SYSTEM_DESIGN",
        title: "System design",
        description: "Design one system in 45 minutes: a diagram and a written answer. AI-assessed against the prompt's rubric, which you can see.",
        format: "WHITEBOARD",
        gateMode: "ADVISORY",
        passMark: PLATFORM_PASS_MARK,
        timeLimitMinutes: 45,
        drawCount: 1,
        cooldownHours: PLATFORM_COOLDOWN_HOURS,
        responseMode: "TYPED",
        topicsCovered: ["Requirements", "APIs and data models", "Scaling", "Trade-offs"],
        // Each prompt carries its own rubric (design_prompt.rubric).
        rubric: null,
        mockKnowledgeBase: null,
        pool: { kind: "DESIGN_PROMPT", difficulties: ["EASY", "MEDIUM"] },
    }
}

function voice(roundNumber: number, kind: "behavioural" | "culture"): PlatformRoundSeed {
    const behavioural = kind === "behavioural"
    return {
        roundNumber,
        roundType: behavioural ? "VOICE_BEHAVIOURAL" : "VOICE_CULTURE",
        title: behavioural ? "Behavioural interview" : "Culture conversation",
        description: behavioural
            ? "A 20-minute behavioural interview with an AI interviewer, spoken or typed. AI-assessed against the rubric shown."
            : "A 20-minute conversation about how you work and learn, with an AI interviewer, spoken or typed. AI-assessed against the rubric shown.",
        format: "VOICE",
        gateMode: "ADVISORY",
        passMark: PLATFORM_PASS_MARK,
        timeLimitMinutes: 20,
        drawCount: 1,
        cooldownHours: PLATFORM_COOLDOWN_HOURS,
        responseMode: "EITHER",
        topicsCovered: behavioural
            ? ["Ownership", "Impact", "Handling setbacks", "Communication"]
            : ["Collaboration", "Learning", "Accountability", "Motivation"],
        rubric: behavioural ? BEHAVIOURAL_RUBRIC : CULTURE_RUBRIC,
        mockKnowledgeBase: behavioural ? BEHAVIOURAL_KNOWLEDGE : CULTURE_KNOWLEDGE,
        pool: null,
    }
}

// ── The pipelines ────────────────────────────────────────────────────────────

export const PLATFORM_PIPELINES: PlatformPipelineSeed[] = [
    {
        templateKey: "platform-backend-sde-1",
        name: "Backend SDE-1",
        description: "ShipItHQ's generic pipeline for an entry-level backend engineer: aptitude, two coding rounds, system design and a behavioural interview.",
        rounds: [aptitude(1, ["EASY", "MEDIUM", "HARD"]), dsa(2, "EASY"), dsa(3, "MEDIUM"), systemDesign(4), voice(5, "behavioural")],
    },
    {
        templateKey: "platform-frontend-intern",
        name: "Frontend intern",
        description: "ShipItHQ's generic pipeline for a frontend internship: aptitude, one coding round and a behavioural interview.",
        rounds: [aptitude(1, ["EASY", "MEDIUM"]), dsa(2, "EASY"), voice(3, "behavioural")],
    },
    {
        templateKey: "platform-full-stack-sde-1",
        name: "Full-stack SDE-1",
        description: "ShipItHQ's generic pipeline for an entry-level full-stack engineer: aptitude, two coding rounds, system design and a culture conversation.",
        rounds: [aptitude(1, ["EASY", "MEDIUM", "HARD"]), dsa(2, "EASY"), dsa(3, "MEDIUM"), systemDesign(4), voice(5, "culture")],
    },
]

/** Problems with the definitions themselves, before any database is read. */
export function validatePipelines(pipelines: PlatformPipelineSeed[] = PLATFORM_PIPELINES): string[] {
    const problems: string[] = []
    const keys = new Set<string>()
    for (const p of pipelines) {
        if (keys.has(p.templateKey)) problems.push(`${p.templateKey}: duplicate templateKey`)
        keys.add(p.templateKey)
        p.rounds.forEach((r, i) => {
            const at = `${p.templateKey} round ${r.roundNumber}`
            if (r.roundNumber !== i + 1) problems.push(`${at}: rounds must be numbered 1..n in order`)
            if (r.passMark !== PLATFORM_PASS_MARK) problems.push(`${at}: pass mark is not the decided ${PLATFORM_PASS_MARK}`)
            const aiAssessed = r.roundType === "SYSTEM_DESIGN" || r.roundType.startsWith("VOICE_")
            if (aiAssessed && r.gateMode !== "ADVISORY") problems.push(`${at}: AI-assessed rounds are ADVISORY`)
            if (!aiAssessed && r.gateMode !== "HARD") problems.push(`${at}: aptitude and DSA rounds are HARD`)
            if (r.roundType.startsWith("VOICE_") && (r.pool || !r.rubric || !r.mockKnowledgeBase)) problems.push(`${at}: a voice round has a rubric and knowledge, and no pool`)
            if (!r.roundType.startsWith("VOICE_") && !r.pool) problems.push(`${at}: needs a pool`)
            if (r.rubric && r.rubric.reduce((n, x) => n + x.weight, 0) !== 100) problems.push(`${at}: rubric weights do not sum to 100`)
        })
        if (/[\u2013\u2014]/.test(JSON.stringify(p))) problems.push(`${p.templateKey}: contains an em or en dash`)
    }
    return problems
}
