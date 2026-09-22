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
    updateSessionAfterAssess,
    getModuleProgress,
    getLeaderboard,
    getUserPracticeStats,
    getDailyChallenge,
} from "./practice.action";

// AI Assessment & Mentor
export { assessPracticeWork, getMentorResponse } from "./assess.action";

// Voice (ElevenLabs STT/TTS)
export { getScribeToken, generateTTSAudio } from "./voice.action";

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
