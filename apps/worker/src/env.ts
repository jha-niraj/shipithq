import type { JobType } from "@repo/db/schema"

/**
 * The job types this worker actually runs, mapped to the Durable Object binding
 * that owns them.
 *
 * `JobType` comes from @repo/db and is the vocabulary the whole product shares;
 * this map is the subset that has a Durable Object behind it today. Keeping the
 * two separate is deliberate - a job type the app can name but the worker cannot
 * run must fail loudly at dispatch, not sit at `waiting` forever.
 *
 * Adding a job type: add the class in `src/jobs/`, add it here, then add the
 * matching binding AND migration entry in `wrangler.jsonc`. All three or none.
 */
export const JOB_BINDINGS = {
	project_generation: "PROJECT_GENERATION",
	verification_generation: "VERIFICATION_GENERATION",
	sprint_generation: "SPRINT_GENERATION",
	project_quiz: "PROJECT_QUIZ",
	standup_voice: "STANDUP_VOICE",
	mock_conversation: "MOCK_CONVERSATION",
	mock_feedback: "MOCK_FEEDBACK",
	resume_structure: "RESUME_STRUCTURE",
	resume_tailor: "RESUME_TAILOR",
	cover_letter: "COVER_LETTER",
	resume_ats_score: "RESUME_ATS_SCORE",
	cover_letter_questions: "COVER_LETTER_QUESTIONS",
	resume_import: "RESUME_IMPORT",
	subgoal_generation: "SUBGOAL_GENERATION",
	goal_creation: "GOAL_CREATION",
	interview_prep_generation: "INTERVIEW_PREP_GENERATION",
	practice_tests_generate: "PRACTICE_TESTS_GENERATE",
	practice_memory_update: "PRACTICE_MEMORY_UPDATE",
	practice_reflect: "PRACTICE_REFLECT",
	sprint_quiz: "SPRINT_QUIZ",
	sprint_mock: "SPRINT_MOCK",
	company_scrape: "COMPANY_SCRAPE",
} as const satisfies Partial<Record<JobType, string>>

export type RunnableJobType = keyof typeof JOB_BINDINGS
export type JobBindingName = (typeof JOB_BINDINGS)[RunnableJobType]

export function isRunnableJobType(value: unknown): value is RunnableJobType {
	return typeof value === "string" && value in JOB_BINDINGS
}

export type Env = {
	[K in JobBindingName]: DurableObjectNamespace
} & {
	DATABASE_URL: string
	OPENAI_API_KEY: string
	/** OpenAI Assistant used for Pathfinder verification generation. */
	PATHFINDER_ASSISTANT_ID?: string
	/** ElevenLabs, for the voice jobs (mock interview + standup transcripts). */
	ELEVENLABS_API_KEY?: string
	/**
	 * Exa, for the resume import job's LinkedIn / Twitter / portfolio scrapes.
	 *
	 * Optional on the type because a worker without it still runs every other
	 * job, but `ResumeImport` fails loudly on the first line of `run()` when it is
	 * missing rather than scraping nothing. An unset key would otherwise reach the
	 * user as "make sure your profiles are public", which sends them to fix
	 * something that is not broken.
	 */
	EXA_API_KEY?: string
	/**
	 * Firecrawl, for `company_scrape` (plan/hiring-rounds HR-5). Optional for the
	 * same reason as Exa: that job fails on its first line without it.
	 */
	FIRECRAWL_API_KEY?: string
	/**
	 * GitHub token for the import job's REST calls. Genuinely optional - the
	 * GitHub API serves unauthenticated requests at 60/hour, which is enough for
	 * development and fails only under load.
	 */
	GITHUB_TOKEN?: string
	WORKER_SECRET: string
	/**
	 * The code-execution worker (apps/shipitworker), for validating generated
	 * DSA tests. A service binding in production; absent under `wrangler dev`,
	 * where `EXECUTOR_URL` (http://localhost:8788 or wherever the executor is
	 * served) takes over. With neither set, `runJudge` fails with a readable
	 * error rather than hanging.
	 */
	CODE_EXECUTOR?: Fetcher
	EXECUTOR_URL?: string
	NODE_ENV?: string
}
