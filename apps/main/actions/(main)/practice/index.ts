// Practice module server actions

// Core CRUD + data fetching
export {
    getProblemsForModule,
    getProblemBySlug,
    getCategoriesForModule,
    getOrCreateSession,
    getGuidedSession,
    startGuidedSession,
    finishGuidedSession,
    applyGuidedCompletion,
    saveSessionProgress,
    getModuleProgress,
    getLeaderboard,
    getUserPracticeStats,
    getDailyChallenge,
} from "./practice.action";

// AI Assessment & Mentor
export { assessPracticeWork, getMentorResponse } from "./assess.action";

// Voice: Sarvam AI (plan/practice-workspace, PW-4; plan/voice).
export { speakMentorReply, isVoiceAvailable } from "./voice-sarvam.action";

// User-generated problems (Exa + AI)
export {
    generateProblemFromURL,
    generateProblemFromName,
    createUserPracticeProblem,
} from "./generate-problem.action";

// DSA judge: test generation, Run and Submit
export { requestJudgeAssets, runSampleTests, submitSolution } from "./judge.action";

// Mentor memory: consolidation, the learner profile page
export { requestMemoryUpdate, getLearnerProfile, deleteLearnerEntry } from "./memory.action";

// Recommended problems, picked by the model from the onboarding profile (PD-15)
export { getRecommendations, type RecommendationsView } from "./recommendations.action";

// The practice path: stages of problems with a checkpoint each (plan/practice-path)
export { getPath, type PathView } from "./path.action";
