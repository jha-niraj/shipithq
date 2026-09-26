import { JOB_BINDINGS, type Env, type RunnableJobType } from "../env"

export { ProjectGeneration } from "./project-generation"
export { VerificationGeneration } from "./verification-generation"
export { SprintGeneration } from "./sprint-generation"
export { ProjectQuiz } from "./project-quiz"
export { StandupVoice } from "./standup-voice"
export { ResumeStructure } from "./resume-structure"
export { ResumeTailor } from "./resume-tailor"
export { CoverLetter } from "./cover-letter"
export { ResumeAtsScore } from "./resume-ats-score"
export { CoverLetterQuestions } from "./cover-letter-questions"
export { ResumeImport } from "./resume-import"
export { SubGoalGeneration } from "./subgoal-generation"
export { GoalCreation } from "./goal-creation"
export { InterviewPrepGeneration } from "./interview-prep-generation"
export { PracticeTestsGenerate } from "./practice-tests-generate"
export { PracticeMemoryUpdate } from "./practice-memory-update"
export { PracticeReflect } from "./practice-reflect"
export { SprintQuiz } from "./sprint-quiz"
export { CompanyScrape } from "./company-scrape"
export { AptitudeGenerate } from "./aptitude-generate"
export { VoiceInterviewScore } from "./voice-interview-score"

/**
 * Resolve the Durable Object that owns a job type.
 *
 * One instance per jobId (`idFromName`), which is what makes the whole thing
 * safe: two dispatches of the same job land on the same object, and that object
 * refuses the second one.
 */
export function jobStub(env: Env, type: RunnableJobType, jobId: string): DurableObjectStub {
	const namespace = env[JOB_BINDINGS[type]]
	if (!namespace) {
		// Only reachable if wrangler.jsonc and env.ts have drifted apart. Loud on
		// purpose: the alternative is a job that is accepted and never runs.
		throw new Error(`No Durable Object binding configured for job type "${type}"`)
	}
	return namespace.get(namespace.idFromName(jobId))
}
