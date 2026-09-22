// ─────────────────────────────────────────────────────────────────────────────
// The shape of `module_onboarding.turns` and `module_onboarding.profile`.
//
// Both columns are jsonb, so the database enforces nothing about them. This
// file is the only contract, shared by the app (which writes turns and reads
// the profile for gates and widgets) and by anything else that later reads the
// profile to personalise a module (the DSA mentor, PD-6 in plan/practice-dsa).
// ─────────────────────────────────────────────────────────────────────────────

export type OnboardingQuestionKind = "single" | "multi" | "open";

export type OnboardingLevel = "beginner" | "developing" | "intermediate" | "advanced";

export const ONBOARDING_LEVELS: readonly OnboardingLevel[] = [
    "beginner",
    "developing",
    "intermediate",
    "advanced",
];

export interface OnboardingQuestion {
    text: string;
    kind: OnboardingQuestionKind;
    /** Empty for `open`. 3 to 6 entries for `single` and `multi`. */
    options: string[];
    /** One line on why this question follows from what the user said. Shown muted. */
    why: string;
}

export interface OnboardingAnswer {
    /** One entry for `single` and `open`, one or more for `multi`. */
    values: string[];
    viaVoice: boolean;
}

export interface OnboardingTurn {
    /** 0-based position in the run. Equal to the array index; stored so a turn is self-describing. */
    index: number;
    question: OnboardingQuestion;
    answer: OnboardingAnswer | null;
    askedAt: string;
    answeredAt: string | null;
}

export interface OnboardingProfile {
    level: OnboardingLevel;
    /** Things the user stated about themselves, in their words where possible. */
    facts: string[];
    strengths: string[];
    gaps: string[];
    goals: string[];
    /** Exactly three short lines, shown on the summary card and the widget. */
    summary: [string, string, string];
}

export type OnboardingRunStatus = "in_progress" | "completed";

/** Floor and ceiling on answered questions per run. Decision in plan/module-onboarding/overview.md. */
export const ONBOARDING_MIN_QUESTIONS = 6;
export const ONBOARDING_MAX_QUESTIONS = 10;
/** How many `open` questions a run may contain. */
export const ONBOARDING_MAX_OPEN_QUESTIONS = 2;
/** Open answers are trimmed to this many characters before they are stored or sent to a prompt. */
export const ONBOARDING_OPEN_ANSWER_MAX_CHARS = 500;

export function isOnboardingLevel(value: unknown): value is OnboardingLevel {
    return typeof value === "string" && (ONBOARDING_LEVELS as readonly string[]).includes(value);
}
