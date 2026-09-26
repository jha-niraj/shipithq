/**
 * Limits on what a company does with AI in the hiring app. Niraj sets these
 * (2026-09-25: "we will define this inside the pricing itself"); the app reads
 * them from here and never repeats the number.
 */
export const HIRING_AI_LIMITS = {
	/**
	 * "Draft with AI" in the pipeline builder (plan/hiring-rounds HR-10): one
	 * gpt-4o-mini call each, free to the company, per company per rolling day.
	 */
	pipelineDraftsPerDay: 10,
	/**
	 * "Generate with AI" for aptitude questions (HR-11): a worker job per
	 * generation, free to the company, per company per rolling day.
	 */
	aptitudeGenerationsPerDay: 5,
	/** How many questions one generation may ask for; the company picks within this. */
	aptitudeQuestionsPerGeneration: { min: 5, max: 30 },
	/**
	 * "Draft feedback" when inviting or declining (HR-19): one gpt-4o-mini call per
	 * candidate, free to the company, per company per rolling day (Niraj, 2026-09-26).
	 */
	feedbackDraftsPerDay: 100,
	/**
	 * The company AI panel (plan/hiring-app HA-11): questions a company's members
	 * may ask it per calendar month, all members together. One question is one,
	 * however many tool steps its answer takes (Niraj, 2026-09-26).
	 */
	panelMessagesPerMonth: 300,
} as const;
