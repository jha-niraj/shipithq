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
