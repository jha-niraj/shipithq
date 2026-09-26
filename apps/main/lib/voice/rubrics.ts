import type { RubricCriterion } from "@/lib/hiring/design"

/**
 * The rubric a mock interview is scored against (plan/voice DoD 9). The names
 * match the three sections the mock results page has always shown; the weights
 * are a decision recorded in plan/voice overview.md.
 */
export const MOCK_RUBRIC: RubricCriterion[] = [
    { criterion: "Communication", weight: 35, lookFor: "Clear, structured answers that stay on the question; explains reasoning in plain words; concise." },
    { criterion: "Technical depth", weight: 35, lookFor: "Accurate, specific knowledge for the role and level; names concrete tools, trade-offs and details rather than generalities." },
    { criterion: "Problem solving", weight: 30, lookFor: "Breaks a problem down, considers alternatives, backs claims with examples and results from their own work." },
]
