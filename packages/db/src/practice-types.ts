// ─────────────────────────────────────────────────────────────────────────────
// The shapes of the jsonb columns the guided DSA session writes and reads:
// judge assets on `practice_problem`, the mentor's per-problem memory on
// `practice_user_session`, and the learner profile. Shared by apps/main (the
// mentor route, Run and Submit) and apps/worker (test generation, memory
// consolidation, reflection). jsonb enforces nothing; this file is the contract.
// Plan: plan/practice-dsa/tasks.md PD-1.
// ─────────────────────────────────────────────────────────────────────────────

/** Languages a hidden harness can exist for. C++ first; the others slot in later. */
export type JudgeLanguage = "cpp" | "javascript" | "typescript" | "python" | "java";

export interface JudgeTest {
    id: string;
    label: string;
    /** Exact stdin for one run of the spliced program. */
    input: string;
    /** Exact expected stdout, compared after trimming. */
    expectedOutput: string;
    hidden: boolean;
    /** Why this case exists, shown next to a failing sample. */
    explanation?: string;
}

/** `none` until generation is dispatched; `ready` only after the reference solution passed every test in the real container. */
export type JudgeStatus = "none" | "generating" | "ready" | "failed";

/** The literal a harness must contain exactly once. `class Solution` is spliced in its place. */
export const HARNESS_PLACEHOLDER = "// {{USER_CODE}}";

export type PracticeStage = "understand" | "approach" | "brute_force" | "optimise" | "reflect" | "done";

export const PRACTICE_STAGES: readonly PracticeStage[] = [
    "understand",
    "approach",
    "brute_force",
    "optimise",
    "reflect",
    "done",
];

export interface JudgeRunRecord {
    at: string;
    stage: PracticeStage;
    language: string;
    passed: boolean;
    /** Ids of failing cases, empty when passed. */
    failedIds: string[];
    /** `run` is sample tests only; `submit` is sample plus hidden. */
    kind: "run" | "submit";
}

/**
 * The mentor's structured memory of one user on one problem. Rewritten by the
 * `practice_memory_update` job at stage boundaries; a few fields are written
 * directly by Run, Submit and the stage verdict because they are hard signals.
 */
export interface PracticeMentorState {
    /** The user's approach in their own words, as the mentor recorded it. */
    approach?: string;
    /** The complexity the user claimed for their current solution, verbatim. */
    claimedComplexity?: string;
    /** Concepts the mentor explained during this problem, as slugs. */
    conceptsExplained: string[];
    /** Misconceptions the mentor saw, one line each. */
    misconceptions: string[];
    /** Hints given, one line each, so the mentor does not repeat itself. */
    hintsGiven: string[];
    /** Stages in which all tests (sample plus hidden) passed. */
    testsPassedAt: Array<{ stage: PracticeStage; at: string }>;
    lastRun?: JudgeRunRecord;
    lastSubmit?: JudgeRunRecord;
    /** The user's own reflection, verbatim, written in the reflect stage. */
    reflection?: string;
    /** Whether the optimise verdict recorded an optimal, correctly justified complexity. */
    optimalConfirmed?: boolean;
}

export function emptyMentorState(): PracticeMentorState {
    return { conceptsExplained: [], misconceptions: [], hintsGiven: [], testsPassedAt: [] };
}

export type ConceptStatus = "introduced" | "shaky" | "understood" | "mastered";

export const CONCEPT_STATUS_ORDER: readonly ConceptStatus[] = ["introduced", "shaky", "understood", "mastered"];

export interface ConceptEvidence {
    problemSlug: string;
    at: string;
    note: string;
}

export interface LearnerConcept {
    slug: string;
    label: string;
    status: ConceptStatus;
    evidence: ConceptEvidence[];
    lastSeenAt: string;
}

export interface LearnerMistake {
    slug: string;
    label: string;
    count: number;
    lastProblemSlug: string;
    lastSeenAt: string;
}

/** A concept the user deleted from their profile; the consolidation job must not resurrect it from older transcript. */
export interface DeletedConcept {
    slug: string;
    deletedAt: string;
}

/**
 * One problem the model picked for this user (PD-15). `why` is its own one-line
 * reason, shown under the title on the Recommended tab; it is the model's words,
 * so it is capped and never rendered as anything but text.
 */
export interface RecommendedProblem {
    slug: string
    why: string
}

// ── The practice path (plan/practice-path) ───────────────────────────────────

/** Which part of a stage's checkpoint. They are taken in this order. */
export type CheckpointPart = "quiz" | "mock" | "exam"

export interface CheckpointPartState {
    status: "todo" | "passed" | "weak"
    /** 0-100 where the part produces one. A mock has no pass mark; it records that it happened. */
    score?: number
    /** What it was weak on, in the grader's words. Feeds the extra practice a weak part adds. */
    missed?: string[]
    at?: string
}

export interface PathCheckpoint {
    quiz: CheckpointPartState
    mock: CheckpointPartState
    exam: CheckpointPartState
    /** The problem the exam part opens; a catalogue slug. */
    examSlug?: string
    /** The quiz as generated, so a retake is the same quiz and scoring needs no model. */
    quizQuestions?: CheckpointQuizQuestion[]
}

export interface CheckpointQuizQuestion {
    id: string
    text: string
    options: string[]
    /** Index into `options`. Never sent to the browser while the quiz is open. */
    answer: number
    /** One line shown after answering. */
    why: string
    /** The concept this question is about, so a weak answer can pick practice. */
    concept: string
}

export interface PathStage {
    /** The catalogue category this stage is built on. */
    topic: string
    /** One line: what the learner should be able to do at the end of it. */
    goal: string
    /** Catalogue slugs, in the order to attempt them. */
    slugs: string[]
    /** Slugs added because a checkpoint went badly (PP-7). */
    addedSlugs?: string[]
    checkpoint: PathCheckpoint
}

/**
 * One project the model proposes for this user (plan/projects, PJ-1).
 *
 * INVENTED, not picked from a catalogue: a project idea has no tests to get
 * wrong, and one shaped to the hours and the history this person described beats
 * the nearest row in a fixed list (Niraj, 2026-09-22). The curated catalogue
 * still exists for browsing on the ideas page; this is the personal set.
 *
 * Every field is model text and is rendered as text only. "Build this" hands the
 * title and description to the existing generator, which writes the blueprint.
 */
export interface RecommendedIdea {
    title: string
    description: string
    /** EASY | MEDIUM | HARD, as the generator spells it. */
    difficulty: string
    technologies: string[]
    why: string
}
