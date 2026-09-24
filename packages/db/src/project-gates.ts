/**
 * When a project's final quiz and final mock interview open, as a share of its
 * tasks done. A DECISION recorded in `plan/projects/overview.md`; here so the
 * app (`apps/main/lib/projects/gates.ts`, which re-exports these) and the
 * worker (which re-checks at generation) read one number, not two copies.
 */
export const QUIZ_UNLOCK_PERCENT = 50
export const MOCK_UNLOCK_PERCENT = 75

/** The quiz is open from 50 percent of the project's tasks, inclusive. */
export const quizUnlocked = (progressPercentage: number): boolean => progressPercentage >= QUIZ_UNLOCK_PERCENT

/** The mock interview is open from 75 percent, inclusive. */
export const mockUnlocked = (progressPercentage: number): boolean => progressPercentage >= MOCK_UNLOCK_PERCENT
