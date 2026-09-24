/**
 * Sprint 0 is Setup (plan/project-repos RP-3, decided 2026-09-24): the tasks
 * that take a learner from an empty folder to a running app, before sprint 1.
 * It is an ordinary sprint row with `sprint_number = 0` - no schema of its own -
 * so every place that names or gates a sprint asks these two helpers.
 */
export const SETUP_SPRINT_NUMBER = 0

export const isSetupSprint = (sprintNumber: number) => sprintNumber === SETUP_SPRINT_NUMBER

/** "Setup" for sprint 0, "Sprint 3" otherwise. */
export const sprintLabel = (sprintNumber: number) => (isSetupSprint(sprintNumber) ? 'Setup' : `Sprint ${sprintNumber}`)
