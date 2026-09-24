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
 * The numbers now live in `@repo/db/project-gates` (2026-09-24), so the worker
 * re-checks the same ones when it generates a final quiz or mock.
 */

export { MOCK_UNLOCK_PERCENT, QUIZ_UNLOCK_PERCENT, mockUnlocked, quizUnlocked } from '@repo/db/project-gates'
