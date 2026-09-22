import type { JudgeLanguage } from "@repo/db"
import type { PracticeProblemDetail } from "@/types/practice"

// ─────────────────────────────────────────────────────────────────────────────
// What the editor starts with for a language (PD-5).
//
// A language with a harness gets the problem's class starter (`class Solution`,
// or the design problem's own class): the user writes only the class, as on
// takeUforward. A language without one runs
// as a whole program with no tests, so it gets a minimal program instead and
// the workspace says so above the editor. Client-safe: no server imports.
// ─────────────────────────────────────────────────────────────────────────────

const FULL_PROGRAM: Record<string, string> = {
    cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    // No tests for this problem in C++ yet: this runs as a whole program.
    // Try your idea on the examples from the problem and print the result.
    return 0;
}
`,
    javascript: `// No tests for JavaScript yet: this runs as a whole program.
// Try your idea on the examples from the problem and print the result.

`,
    typescript: `// No tests for TypeScript yet: this runs as a whole program.
// Try your idea on the examples from the problem and print the result.

`,
    python: `# No tests for Python yet: this runs as a whole program.
# Try your idea on the examples from the problem and print the result.

`,
    java: `public class Main {
    public static void main(String[] args) {
        // No tests for Java yet: this runs as a whole program.
        // Try your idea on the examples from the problem and print the result.
    }
}
`,
}

export const LANGUAGE_LABELS: Record<string, string> = {
    cpp: "C++",
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    java: "Java",
}

export function hasTestsFor(problem: PracticeProblemDetail, language: string): boolean {
    return (
        problem.module === "DSA" &&
        problem.judge.judgeStatus === "ready" &&
        Boolean(problem.judge.hasHarness[language as JudgeLanguage])
    )
}

/** The code a language starts with when the user has not written any in it yet. */
export function starterFor(problem: PracticeProblemDetail, language: string): string {
    if (problem.module !== "DSA") return problem.starterCode ?? ""
    if (hasTestsFor(problem, language)) return problem.starterCode ?? ""
    return FULL_PROGRAM[language] ?? ""
}
