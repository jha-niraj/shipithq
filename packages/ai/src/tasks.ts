import { DEFAULT_CHAT_MODEL, type ModelId } from "./models"

/**
 * Which model each AI task uses. The ONE place to change a model.
 *
 * Every task defaults to gpt-4o-mini (Niraj, 2026-09-22: cost). Where mini
 * fell short in testing, the answer was a better prompt, not a bigger model,
 * and the prompts carry the checks that proved it (plan/practice-dsa). To move
 * a single task to a stronger model, change its line here and re-run that
 * task's recorded check.
 */
export const AI_TASKS = {
    /** Adaptive onboarding: the next question, or the finished profile. */
    onboardingQuestion: DEFAULT_CHAT_MODEL,
    /** Guided DSA mentor: the streamed reply. */
    practiceMentor: DEFAULT_CHAT_MODEL,
    /** Guided DSA: whether the current stage's goal has been met. */
    practiceStageVerdict: DEFAULT_CHAT_MODEL,
    /** Guided DSA: consolidating a conversation window into memory. */
    practiceMemory: DEFAULT_CHAT_MODEL,
    /** Guided DSA: the closing feedback. */
    practiceReflect: DEFAULT_CHAT_MODEL,
    /** DSA judge: harness, solutions and samples. */
    practiceJudgeAssets: DEFAULT_CHAT_MODEL,
    /** DSA judge: hidden test inputs (outputs are computed, never written). */
    practiceJudgeInputs: DEFAULT_CHAT_MODEL,
    /** Projects: which ideas to suggest from the catalogue (plan/projects, PJ-1). */
    projectRecommendations: DEFAULT_CHAT_MODEL,
    /** Practice: laying the catalogue out as a path of stages (plan/practice-path). */
    practicePath: DEFAULT_CHAT_MODEL,
    /** Practice: a stage checkpoint's quiz. */
    practiceCheckpointQuiz: DEFAULT_CHAT_MODEL,
    /** Practice: which problems to recommend from a module's catalogue (PD-15). */
    practiceRecommendations: DEFAULT_CHAT_MODEL,
    /** ShipItHQ AI panel: tool rounds and the streamed reply (plan/ai-chat). */
    assistantChat: DEFAULT_CHAT_MODEL,
    /** ShipItHQ AI panel: a short title for a conversation after its first exchange. */
    assistantChatTitle: DEFAULT_CHAT_MODEL,
    /** Project workspace AI: answers, task and sprint proposals (plan/project-workspace WS-15). */
    projectAi: DEFAULT_CHAT_MODEL,
    /** A sprint quiz: ten questions from the tasks and the learner's notes (plan/project-workspace WS-12). */
    sprintQuiz: DEFAULT_CHAT_MODEL,
    /** A sprint mock interview: questions, follow-ups and the feedback (plan/project-workspace WS-13). */
    sprintMock: DEFAULT_CHAT_MODEL,
    /** A company's draft profile, drafted from its own site's pages (plan/hiring-rounds HR-5). */
    companyProfileDraft: DEFAULT_CHAT_MODEL,
} as const satisfies Record<string, ModelId>

export type AiTask = keyof typeof AI_TASKS

export function modelFor(task: AiTask): ModelId {
    return AI_TASKS[task]
}
