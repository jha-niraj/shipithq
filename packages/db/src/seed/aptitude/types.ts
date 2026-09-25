/**
 * ShipItHQ's aptitude question bank (plan/hiring-rounds HR-3).
 *
 * Every question is written as data here and upserted by `key` with
 * `pnpm script seed-aptitude [--apply]`. Keys are stable: never renumber a
 * question that has been seeded, because past attempts reference it.
 */

export type AptitudeSection = "QUANT" | "LOGICAL" | "VERBAL";
export type AptitudeDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface AptitudeSeed {
    /** Stable upsert key, e.g. "quant-percentages-007". */
    key: string;
    section: AptitudeSection;
    topic: string;
    difficulty: AptitudeDifficulty;
    prompt: string;
    /** Exactly four, all distinct. */
    options: string[];
    /** 0-3, index into `options`. */
    correctIndex: number;
    /** One or two sentences showing why the answer is right. */
    explanation: string;
    /**
     * Generator-made questions only: recomputes the correct option by a
     * second route (brute force, simulation or a year-by-year loop where one
     * exists). `validateBank` compares it with `options[correctIndex]`. Not
     * stored in the database.
     */
    recheck?: () => string;
}
