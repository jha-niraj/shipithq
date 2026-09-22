import type { PracticeJudgeResult } from "@/types/practice"

/**
 * A one-message summary of a verdict for the mentor chat, so the conversation
 * reacts to the run the way a person sitting next to you would.
 */
export function verdictForMentor(result: PracticeJudgeResult): string {
    if (result.status === "compile_error") {
        return `My code did not compile (${result.language}). Compiler output:\n\`\`\`\n${result.message.slice(0, 1500)}\n\`\`\``;
    }
    if (result.status === "unavailable") return `I tried to run my code but it did not run: ${result.message}`;
    const what = result.kind === "run" ? "ran the sample tests" : "submitted";
    if (result.passed) {
        return result.kind === "run"
            ? `I ${what}: all ${result.sampleTotal} sample cases passed.`
            : `I ${what}: all ${result.sampleTotal + result.hiddenTotal} tests passed, including ${result.hiddenTotal} hidden ones.`;
    }
    const failing = result.cases.filter((c) => !c.passed).slice(0, 2);
    const lines = failing.map((c) =>
        c.timedOut
            ? `- ${c.hidden ? "A hidden case" : c.label} hit the time limit.`
            : `- ${c.hidden ? "A hidden case" : c.label}: input \`${c.input.trim().replace(/\n/g, " / ").slice(0, 200)}\`, expected \`${c.expectedOutput.slice(0, 120)}\`, got \`${c.actualOutput.trim().slice(0, 120) || "(nothing)"}\``,
    );
    const counts = result.kind === "run"
        ? `${result.samplePassed} of ${result.sampleTotal} sample cases passed`
        : `${result.samplePassed + result.hiddenPassed} of ${result.sampleTotal + result.hiddenTotal} tests passed`;
    return `I ${what}: ${counts}.\n${lines.join("\n")}`;
}
