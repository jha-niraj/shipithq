import type { AptitudeDifficulty, AptitudeSeed, AptitudeSection } from "./types";

/** FNV-1a, 32-bit. Deterministic, so a question's answer position never moves between runs. */
export function hash(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    // Final avalanche (murmur3 fmix32): without it, keys that differ only in
    // the last digit land on consecutive positions.
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}

/** Options are compared case- and whitespace-insensitively. */
export function norm(s: string): string {
    return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** A number as it appears in an option: integers grouped Indian style, otherwise up to 2 decimals. */
export function fmt(n: number): string {
    const r = Math.round(n * 100) / 100;
    if (Math.abs(r - Math.round(r)) < 1e-9) {
        const i = Math.round(r);
        return Math.abs(i) >= 10000 ? i.toLocaleString("en-IN") : String(i);
    }
    return r.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a;
}

export function lcm(a: number, b: number): number {
    return (a / gcd(a, b)) * b;
}

/** A reduced fraction "p/q" ("1" when q divides p). */
export function frac(p: number, q: number): string {
    const g = gcd(p, q);
    const [a, b] = [p / g, q / g];
    return b === 1 ? String(a) : `${a}/${b}`;
}

export function pad(n: number): string {
    return String(n).padStart(3, "0");
}

/**
 * Mixed into the hash that places each answer. Any fixed value keeps
 * positions stable; this one was picked (from v0..v199) because it spreads
 * the answers of the 2026-09-25 bank most evenly over A-D within each
 * section. Changing it moves every answer, so never change it after seeding.
 */
const POSITION_SALT = "v127:";

export interface Draft {
    difficulty: AptitudeDifficulty;
    prompt: string;
    answer: string;
    /** Plausible mistakes, best first. Duplicates of the answer or of each other are skipped; the first three distinct ones are used. */
    distractors: string[];
    explanation: string;
    recheck?: () => string;
}

/**
 * Builds the four options: the answer plus the first three distinct
 * distractors, then puts the answer at a position picked by a hash of the key
 * (after the answer is known, so the shuffle cannot change it). Too few
 * distinct distractors leaves fewer than four options, which `validateBank`
 * reports.
 */
export function build(key: string, section: AptitudeSection, topic: string, d: Draft): AptitudeSeed {
    const seen = new Set([norm(d.answer)]);
    const wrong: string[] = [];
    for (const x of d.distractors) {
        if (wrong.length === 3) break;
        if (seen.has(norm(x))) continue;
        seen.add(norm(x));
        wrong.push(x);
    }
    const pos = hash(POSITION_SALT + key) % 4;
    const options = [...wrong];
    options.splice(Math.min(pos, options.length), 0, d.answer);
    return {
        key,
        section,
        topic,
        difficulty: d.difficulty,
        prompt: d.prompt,
        options,
        correctIndex: options.indexOf(d.answer),
        explanation: d.explanation,
        ...(d.recheck ? { recheck: d.recheck } : {}),
    };
}

/** Numbers each topic's questions in order: "quant-percentages-001", "-002", ... */
export function bank(section: AptitudeSection) {
    const out: AptitudeSeed[] = [];
    const counters = new Map<string, number>();
    return {
        out,
        add(topic: string, d: Draft) {
            const n = (counters.get(topic) ?? 0) + 1;
            counters.set(topic, n);
            out.push(build(`${section.toLowerCase()}-${topic}-${pad(n)}`, section, topic, d));
        },
    };
}
