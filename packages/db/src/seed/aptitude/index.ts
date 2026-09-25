/**
 * ShipItHQ's aptitude bank (plan/hiring-rounds HR-3): about 100 questions
 * each of QUANT, LOGICAL and VERBAL. Seeded by `pnpm script seed-aptitude`,
 * which refuses to write while `validateBank` reports any problem.
 */
import { norm } from "./helpers";
import { LOGICAL } from "./logical";
import { QUANT } from "./quant";
import type { AptitudeSeed, AptitudeSection } from "./types";
import { VERBAL } from "./verbal";

export type { AptitudeSeed, AptitudeSection, AptitudeDifficulty } from "./types";

export const APTITUDE_BANK: AptitudeSeed[] = [...QUANT, ...LOGICAL, ...VERBAL];

/** The bank's shape: each section should land near this many questions. */
export const SECTION_TARGET = { min: 95, max: 115 } as const;

export interface BankStats {
    perSection: Record<AptitudeSection, number>;
    perDifficulty: Record<string, number>;
    perTopic: Record<string, number>;
    /** How often the answer sits at A, B, C, D. */
    correctIndex: [number, number, number, number];
}

export function bankStats(bank: AptitudeSeed[]): BankStats {
    const s: BankStats = {
        perSection: { QUANT: 0, LOGICAL: 0, VERBAL: 0 },
        perDifficulty: {},
        perTopic: {},
        correctIndex: [0, 0, 0, 0],
    };
    for (const q of bank) {
        s.perSection[q.section]++;
        const d = `${q.section} ${q.difficulty}`;
        s.perDifficulty[d] = (s.perDifficulty[d] ?? 0) + 1;
        const t = `${q.section} ${q.topic}`;
        s.perTopic[t] = (s.perTopic[t] ?? 0) + 1;
        if (q.correctIndex >= 0 && q.correctIndex <= 3) s.correctIndex[q.correctIndex as 0 | 1 | 2 | 3]++;
    }
    return s;
}

/** En and em dash, written as escapes so this file passes the repo dash check. */
const DASHES = /[\u2013\u2014]/;

/** Every problem in the bank, one line each. Empty means it is safe to seed. */
export function validateBank(bank: AptitudeSeed[]): string[] {
    const problems: string[] = [];
    const keys = new Set<string>();
    for (const q of bank) {
        const at = q.key || "(no key)";
        if (!/^(quant|logical|verbal)-[a-z0-9-]+-\d{3}$/.test(q.key)) problems.push(`${at}: key is not "<section>-<topic>-NNN"`);
        if (keys.has(q.key)) problems.push(`${at}: duplicate key`);
        keys.add(q.key);
        if (!q.key.startsWith(`${q.section.toLowerCase()}-${q.topic}-`)) problems.push(`${at}: key does not match section ${q.section} and topic ${q.topic}`);
        if (!q.prompt.trim()) problems.push(`${at}: empty prompt`);
        if (q.options.length !== 4) problems.push(`${at}: ${q.options.length} options, not 4`);
        if (q.options.some((o) => !o.trim())) problems.push(`${at}: an empty option`);
        if (new Set(q.options.map(norm)).size !== q.options.length) problems.push(`${at}: options are not all distinct`);
        if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3 || q.correctIndex >= q.options.length)
            problems.push(`${at}: correctIndex ${q.correctIndex} out of range`);
        if (!q.explanation.trim()) problems.push(`${at}: empty explanation`);
        const text = [q.prompt, q.explanation, ...q.options].join("\n");
        if (DASHES.test(text)) problems.push(`${at}: contains an em or en dash`);
        if (/\b(NaN|undefined|Infinity|none)\b/.test(q.options.join("|"))) problems.push(`${at}: an option reads NaN/undefined/none`);
        if (q.recheck) {
            let expected: string;
            try {
                expected = q.recheck();
            } catch (error: unknown) {
                expected = `(recheck threw: ${error instanceof Error ? error.message : String(error)})`;
            }
            const got = q.options[q.correctIndex] ?? "";
            if (norm(expected) !== norm(got)) problems.push(`${at}: recheck gives "${expected}" but the marked answer is "${got}"`);
        }
    }
    const s = bankStats(bank);
    for (const sec of ["QUANT", "LOGICAL", "VERBAL"] as const) {
        const n = s.perSection[sec];
        if (n < SECTION_TARGET.min || n > SECTION_TARGET.max) problems.push(`${sec}: ${n} questions, expected ${SECTION_TARGET.min}-${SECTION_TARGET.max}`);
    }
    const total = bank.length;
    s.correctIndex.forEach((c, i) => {
        // Evenly spread is 25% each; flag anything outside 18-32%.
        if (total && (c / total < 0.18 || c / total > 0.32)) problems.push(`answer position ${"ABCD"[i]} holds ${c} of ${total} answers (uneven)`);
    });
    return problems;
}
