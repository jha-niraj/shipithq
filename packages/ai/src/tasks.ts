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
    /** Incidents: feedback on a talk-it-through conversation (plan/incidents INC-15). */
    incidentMockFeedback: DEFAULT_CHAT_MODEL,
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
    /** Hiring: a pipeline's rounds drafted from a role description (plan/hiring-rounds HR-10). Inline, 25s. */
    pipelineDraft: DEFAULT_CHAT_MODEL,
    /** Hiring: a company's aptitude questions on its own topics, as drafts it approves (HR-11). Worker job. */
    aptitudeGenerate: DEFAULT_CHAT_MODEL,
    /** Hiring rounds: a system design answer scored against its prompt's rubric (HR-16). Inline, 25s. */
    hiringDesignScore: DEFAULT_CHAT_MODEL,
    /** A typed interview: the interviewer's next question, on the same brief as the voice agent (plan/voice VO-8). Inline, 25s. */
    voiceInterviewer: DEFAULT_CHAT_MODEL,
    /** A voice or typed interview scored against its rubric from the transcript (plan/voice VO-9). Worker job. */
    voiceInterviewScore: DEFAULT_CHAT_MODEL,
    /** A daily standup's done / planned / blockers and a one-line summary, from its transcript (plan/voice VO-12). Worker job. */
    standupExtract: DEFAULT_CHAT_MODEL,
    /** Hiring: a personal invite or decline note drafted from a candidate's round results (plan/hiring-rounds HR-19). Inline, 25s. */
    candidateFeedback: DEFAULT_CHAT_MODEL,
    /** The company AI panel: answers about the company's roles, results and threads, with tool rounds (plan/hiring-app HA-11). Inline, streamed, 25s. */
    hiringAi: DEFAULT_CHAT_MODEL,
    /** The company AI panel's conversation titles (HA-11). Inline. */
    hiringAiTitle: DEFAULT_CHAT_MODEL,
    /** Job import: a pasted posting read into a strict schema (plan/job-import JI-3). Worker step. */
    jobImportExtract: DEFAULT_CHAT_MODEL,
    /** Job import: the posting's interview planned as rounds of our five types (JI-5). Worker step. */
    jobImportPlan: DEFAULT_CHAT_MODEL,
    /** Job import: one round built from our banks, or drafted where a bank is thin (JI-5). Worker step, one per round. */
    jobImportRound: DEFAULT_CHAT_MODEL,

    // ── Moved here from call sites (plan/ai-models AM-1, 2026-09-26). Each keeps the ──
    // ── model it used before; changing one is a decision with its own re-check.     ──

    /** Resume: a pasted or uploaded resume structured into the builder's sections. Worker job. */
    resumeStructure: "gpt-4o",
    /** Resume: an imported resume read into the builder (RES-9). Worker job. */
    resumeImport: "gpt-4o",
    /** Resume: tailored to a job description. Worker job. */
    resumeTailor: "gpt-4o",
    /** Resume: the ATS score against a job. Worker job. */
    resumeAtsScore: "gpt-4o-mini",
    /** Cover letter: the letter itself. Worker job. */
    coverLetter: "gpt-4o",
    /** Cover letter: the questions asked before writing it. Worker job. */
    coverLetterQuestions: "gpt-4o",
    /** Projects: the project quiz. Worker job. Still on gpt-4-turbo-preview, as it was. */
    projectQuiz: "gpt-4-turbo-preview",
    /** Projects: a generated project's blueprint (the worker's pipeline; it relied on the helper's mini fallback). Worker job. */
    projectBlueprint: "gpt-4o-mini",
    /** Projects: a project's sprints generated. Worker job. */
    sprintGeneration: "gpt-4o-mini",
    /** Pathfinder: a goal's first sub-goals. Worker job. */
    pathfinderGoalCreation: "gpt-4o-mini",
    /** Pathfinder: a sub-goal's explanation. Worker job. */
    pathfinderSubgoalExplain: "gpt-4o-mini",
    /** Pathfinder: a sub-goal's practice problems. Worker job. */
    pathfinderSubgoalPractice: "gpt-4o-mini",
    /** Pathfinder: a goal's quiz and coding problems. Inline. */
    pathfinderQuizAndCoding: "gpt-4o-mini",
    /** Pathfinder: a sub-goal's submitted code reviewed. Inline. */
    pathfinderCodingReview: "gpt-4o-mini",
    /** Interview prep: the questions a posting implies (plan/interview-prep). Worker job. */
    interviewPrepQuestions: "gpt-4o-mini",
    /** Study spaces: an explanation, videos, documents, a quiz, flashcards and note help. Inline. */
    studioExplanation: "gpt-4o-mini",
    studioVideos: "gpt-4o-mini",
    studioDocuments: "gpt-4o-mini",
    studioQuiz: "gpt-4o-mini",
    studioFlashcards: "gpt-4o-mini",
    studioNoteEnhance: "gpt-4o-mini",
    /** Mock voice: a custom mock's knowledge base, from a syllabus or from a title. Inline. */
    mockKnowledgeFromSyllabus: "gpt-4o-mini",
    mockKnowledgeFromTitle: "gpt-4o-mini",
    /** A mock interview scored from its transcript (the older mock voice flow). Inline route. */
    mockInterviewScore: "gpt-4o",
    /** Practice (web and system design): a problem generated from a URL or a name. Inline. */
    practiceProblemFromUrl: "gpt-4o",
    practiceProblemFromName: "gpt-4o",
    /** Practice (web and system design): work assessed, and the mentor's reply. Inline. */
    practiceAssess: "gpt-4o",
    practiceAssessMentor: "gpt-4o",
    /** Practice chat mentor route (web and system design), streamed. */
    practiceChatMentor: "gpt-4o",
    /** KnowMe: the persona's reply, and its embeddings. */
    knowmeReply: "gpt-4o-mini",
    knowmeEmbedding: "text-embedding-3-small",
    /** Voice notes transcribed. */
    transcription: "whisper-1",
    /** The admin console's AI panel (was OPENAI_CHAT_MODEL, empty on dev: mini). */
    adminAssistant: "gpt-4o-mini",
    /** The mentor check script's grader (plan/practice-dsa mentor-adversarial). */
    practiceCheckGrader: "gpt-4o",
} as const satisfies Record<string, ModelId>

export type AiTask = keyof typeof AI_TASKS

export function modelFor(task: AiTask): ModelId {
    return AI_TASKS[task]
}
