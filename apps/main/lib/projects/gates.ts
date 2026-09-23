/**
 * When the quiz and the mock interview open.
 *
 * These two numbers are a DECISION and they live in `plan/projects/overview.md`;
 * this file is where the product reads them, and nothing else may restate them.
 *
 * They were restated, four times, and they disagreed. The sprints board disabled
 * the quiz at `progressPercent <= 50` and the mock at `<= 75`, while the quiz and
 * mock pages admitted anyone at `>= 50` and `>= 75`. At exactly 50 percent the
 * board said locked and the page said open, so the button you could not press
 * led to a page that would have let you in (plan/projects, PJ-12).
 *
 * One helper, one comparison, used by the board, the detail page and both routes.
 */

export const QUIZ_UNLOCK_PERCENT = 50
export const MOCK_UNLOCK_PERCENT = 75

/** The quiz is open from 50 percent of the project's tasks, inclusive. */
export const quizUnlocked = (progressPercentage: number): boolean =>
    progressPercentage >= QUIZ_UNLOCK_PERCENT

/** The mock interview is open from 75 percent, inclusive. */
export const mockUnlocked = (progressPercentage: number): boolean =>
    progressPercentage >= MOCK_UNLOCK_PERCENT
