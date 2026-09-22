// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers for the DSA judge, shared by apps/main (Run and Submit) and
// apps/worker (validating generated tests against the reference solution).
//
// They live here for one reason: the app and the worker must splice a harness
// and compare output IDENTICALLY, or a test passes in one place and fails in
// the other. No I/O in this file. Plan: plan/practice-dsa/tasks.md PD-2.
// ─────────────────────────────────────────────────────────────────────────────

import { HARNESS_PLACEHOLDER, type JudgeLanguage, type JudgeStatus, type JudgeTest } from "./practice-types";

export type SpliceResult =
    | { ok: true; code: string }
    | { ok: false; reason: "no-harness" | "placeholder-missing" | "placeholder-repeated" };

/**
 * Put the user's `class Solution` where the harness expects it.
 *
 * Refuses a harness without exactly one placeholder: a missing one would run
 * the bare harness with no solution, a repeated one would define the class
 * twice. Both compile-fail in confusing ways, so they are typed errors instead.
 */
export function spliceHarness(harness: string | null | undefined, userCode: string): SpliceResult {
    if (!harness) return { ok: false, reason: "no-harness" };
    const first = harness.indexOf(HARNESS_PLACEHOLDER);
    if (first === -1) return { ok: false, reason: "placeholder-missing" };
    if (harness.indexOf(HARNESS_PLACEHOLDER, first + HARNESS_PLACEHOLDER.length) !== -1) {
        return { ok: false, reason: "placeholder-repeated" };
    }
    return { ok: true, code: harness.replace(HARNESS_PLACEHOLDER, userCode) };
}

/**
 * Make compiler output point at the user's code instead of the spliced file.
 *
 * The compiler sees harness + user code in one temp file, so its paths are
 * meaningless to the user and its line numbers are offset by however many
 * harness lines precede the placeholder. Lines inside the user's block become
 * `solution:N`; lines in the harness become `harness` without a number, since
 * the user cannot see or fix those.
 */
export function mapCompilerOutput(output: string, harness: string, userCode: string): string {
    const before = harness.slice(0, Math.max(0, harness.indexOf(HARNESS_PLACEHOLDER))).split("\n").length - 1;
    const userLines = userCode.split("\n").length;
    return output
        .replace(/(?:[^\s:]*[\\/])?(?:main|Main|[A-Za-z0-9_]+)\.(?:cpp|c|java|py|js|ts):(\d+)(?::(\d+))?/g, (_m, line: string, col?: string) => {
            const n = Number(line) - before;
            if (n >= 1 && n <= userLines) return `solution:${n}${col ? `:${col}` : ""}`;
            return "harness";
        })
        // The source excerpt gutter ("    7 | code") uses the same spliced numbering.
        .replace(/^(\s*)(\d+)( \|)/gm, (_m, pad: string, line: string, bar: string) => {
            const n = Number(line) - before;
            return n >= 1 && n <= userLines ? `${pad}${String(n).padStart(line.length)}${bar}` : `${pad}${" ".repeat(line.length)}${bar}`;
        });
}

/** Pick the harness for a language, if the problem has one. */
export function harnessFor(
    harness: Partial<Record<JudgeLanguage, string>> | null | undefined,
    language: string,
): string | null {
    if (!harness) return null;
    const h = (harness as Record<string, string | undefined>)[language];
    return typeof h === "string" && h.length > 0 ? h : null;
}

/**
 * The comparison form of a program's stdout: CRLF to LF, trailing whitespace
 * stripped from every line, trailing blank lines dropped. The container trims
 * the whole string; this is stricter and is what the app uses to explain a
 * failure so "expected `1 2`, got `1 2 `" never happens.
 */
export function canonicalOutput(s: string): string {
    return s
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map((line) => line.replace(/[ \t]+$/g, ""))
        .join("\n")
        .replace(/\n+$/g, "");
}

export function outputsMatch(expected: string, actual: string): boolean {
    return canonicalOutput(expected) === canonicalOutput(actual);
}

export function sampleTests(tests: JudgeTest[] | null | undefined): JudgeTest[] {
    return (tests ?? []).filter((t) => !t.hidden);
}

export function hiddenTests(tests: JudgeTest[] | null | undefined): JudgeTest[] {
    return (tests ?? []).filter((t) => t.hidden);
}

/** What the browser is allowed to know about a problem's judge assets. */
export interface ClientJudgeView {
    functionSignature: string | null;
    judgeStatus: JudgeStatus;
    /** Sample cases only. Hidden cases never leave the server. */
    sampleTests: JudgeTest[];
    /** Which languages have a harness, so the editor can say "no tests for Python yet". */
    hasHarness: Partial<Record<JudgeLanguage, boolean>>;
}

/**
 * The ONLY projection of judge assets that may reach a client component.
 *
 * Takes the problem row (or any superset) and returns everything except
 * `referenceSolution`, `harness` and the hidden tests. Typed so that a caller
 * cannot accidentally forward the row: the return type has no such fields.
 */
export function clientSafeJudge(problem: {
    functionSignature: string | null;
    judgeStatus: JudgeStatus | string;
    judgeTests: JudgeTest[] | null;
    harness: Partial<Record<JudgeLanguage, string>> | null;
}): ClientJudgeView {
    const hasHarness: Partial<Record<JudgeLanguage, boolean>> = {};
    for (const [lang, code] of Object.entries(problem.harness ?? {})) {
        if (typeof code === "string" && code.length > 0) hasHarness[lang as JudgeLanguage] = true;
    }
    const status = problem.judgeStatus;
    return {
        functionSignature: problem.functionSignature,
        judgeStatus: status === "generating" || status === "ready" || status === "failed" ? status : "none",
        sampleTests: sampleTests(problem.judgeTests),
        hasHarness,
    };
}
