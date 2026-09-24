/**
 * Proves every starter's tests mean something (plan/project-workspace WS-2).
 *
 *   pnpm starters:check
 *
 * For each starter in this directory:
 *   1. the untouched files: EVERY test file must fail. A test that passes on
 *      the stub checks nothing, and would tick the task for a learner who has
 *      done nothing.
 *   2. files + solution/: EVERY test must pass. A test the reference solution
 *      cannot pass is a test nobody can pass.
 *
 * The tests use only describe/it/expect, which both vitest (here) and
 * Sandpack's in-browser Jest (the workspace) provide, so passing here means the
 * same files behave the same in the browser.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const HERE = resolve(import.meta.dirname);
const WORK = resolve(HERE, "../../../.starter-check");

interface FileResult { name: string; status: "passed" | "failed"; failing: number }

function run(dir: string): FileResult[] {
    const out = spawnSync(
        "npx",
        ["vitest", "run", "--globals", "--config", join(HERE, "vitest.check.config.ts"), "--root", dir, "--reporter=json", "--outputFile", join(dir, "result.json"), "--silent"],
        { cwd: resolve(HERE, "../../.."), encoding: "utf8" },
    );
    const resultPath = join(dir, "result.json");
    if (!existsSync(resultPath)) {
        throw new Error(`vitest produced no report for ${dir}:\n${out.stdout}\n${out.stderr}`);
    }
    const report = JSON.parse(readFileSync(resultPath, "utf8")) as {
        testResults: { name: string; status: string; assertionResults: { status: string }[] }[]
    };
    return report.testResults.map((t) => ({
        name: t.name.slice(dir.length + 1),
        status: t.status === "passed" ? "passed" : "failed",
        failing: t.assertionResults.filter((a) => a.status !== "passed").length,
    }));
}

let problems = 0;
const starters = readdirSync(HERE).filter((d) => statSync(join(HERE, d)).isDirectory() && existsSync(join(HERE, d, "files")));

for (const slug of starters) {
    const files = join(HERE, slug, "files");
    const solution = join(HERE, slug, "solution");
    if (!existsSync(files)) continue;

    for (const [label, withSolution] of [["starter", false], ["solution", true]] as const) {
        const dir = join(WORK, slug, label);
        rmSync(dir, { recursive: true, force: true });
        mkdirSync(dir, { recursive: true });
        cpSync(files, dir, { recursive: true });
        if (withSolution && existsSync(solution)) cpSync(solution, dir, { recursive: true });

        const results = run(dir);
        for (const r of results) {
            // Failing with zero failed tests means the FILE errored on load; in the
            // workspace that reads as a crash, not as "this test is not done yet".
            const ok = withSolution ? r.status === "passed" : r.status === "failed" && r.failing > 0;
            if (!ok) problems++;
            const verdict = ok ? "ok  " : "BAD ";
            const detail = withSolution
                ? (r.status === "passed" ? "passes" : `${r.failing} failing`)
                : (r.status === "passed" ? "PASSES ON THE STUB" : r.failing === 0 ? "ERRORS ON LOAD" : `fails (${r.failing})`);
            console.log(`${verdict} ${slug.padEnd(30)} ${label.padEnd(9)} ${r.name.padEnd(22)} ${detail}`);
        }
    }
}

rmSync(WORK, { recursive: true, force: true });
console.log(problems ? `\n${problems} problem(s)` : "\nevery starter test fails on the stub and passes on the solution");
process.exit(problems ? 1 : 0);
