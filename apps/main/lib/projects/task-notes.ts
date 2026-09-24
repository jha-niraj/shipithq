/**
 * The note a learner writes when they mark a task done (plan/project-repos
 * RP-6; limits decided in the overview's Decisions, 2026-09-24). It is what the
 * sprint quiz and mock interview test them on, so a sprint task needs one;
 * Setup steps do not, there is nothing to decide in "install Node".
 */
export const TASK_NOTE_MIN = 10
export const TASK_NOTE_MAX = 500

/** Null when the note is acceptable, else what to tell the learner. */
export function taskNoteProblem(note: string): string | null {
    const n = note.trim().length
    if (n < TASK_NOTE_MIN) return `Write at least ${TASK_NOTE_MIN} characters on what you built or decided.`
    if (n > TASK_NOTE_MAX) return `Keep it under ${TASK_NOTE_MAX} characters - a line or two is enough.`
    return null
}
