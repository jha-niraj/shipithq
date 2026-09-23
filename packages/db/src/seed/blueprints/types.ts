/**
 * The shape of a hand-written project blueprint (plan/projects, PJ-11).
 *
 * A curated project is not model output: somebody sat down and decided what the
 * four sprints are and what the five tasks in each one ask you to do. These
 * types are what that work is written into, one file per project in this
 * directory.
 *
 * The rule for a task, and the reason these are written rather than generated:
 * a task names a thing to build, says how you will know it works, and stops.
 * It does not hand over the answer - the hints are nudges, not solutions.
 */

export type SeedDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED"

export interface SeedTask {
    /** An imperative: "Store a board and its notes", not "Board storage". */
    title: string
    /** One or two short paragraphs. What to build, and what makes it interesting. */
    description: string[]
    /** Falsifiable. "Two browsers see the same note within 200ms", not "It works well". */
    criteria: string[]
    /** One or two. A direction to look in, never the implementation. */
    hints: string[]
    difficulty: SeedDifficulty
    /** Human, e.g. "2 hours", "45 minutes". */
    estimatedTime: string
    /** One word, lowercase: setup, backend, frontend, data, realtime, testing, deploy. */
    category: string
}

export interface SeedSprint {
    /** Four to six words: "Persist a board", "Make it multiplayer". */
    name: string
    /** One sentence: what is true at the end of this sprint that was not true before. */
    goal: string
    /** e.g. "1 week". */
    duration: string
    tasks: SeedTask[]
}
