/**
 * Give existing Pathfinder verifications judged Practice problems for coding, replacing the AI-written ones (plan/pathfinder PF-17).
 *
 *   pnpm script pathfinder-coding-problems            preview: what each verification would get, nothing written
 *   pnpm script pathfinder-coding-problems --apply    write it, then preview again (should be empty)
 *
 * Only verifications whose plan has no `codingProblemIds` yet are touched. Each
 * gets the problems `pickVerificationProblems` picks (the same as the worker),
 * and its `codingQuestions` are dropped. An unfinished coding section starts
 * again at PENDING with no score (the old score was never judged); a goal with
 * no matching problems gets LOCKED, meaning no coding section. A COMPLETED
 * section is left as it is.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../client";
import { pathfinderGoals, pathfinderVerifications, practiceProblem } from "../schema";
import { pickVerificationProblems, type CodingCandidate } from "../pathfinder-coding";

const apply = process.argv.includes("--apply");

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
    } catch {
        return "(DATABASE_URL is not a URL)";
    }
}

type Change = {
    verificationId: string;
    goal: string;
    plan: Record<string, unknown>;
    ids: string[];
    titles: string[];
    statusFrom: string;
    statusTo: string;
};

async function plan(): Promise<{ changes: Change[]; read: number }> {
    const candidates: CodingCandidate[] = await db
        .select({
            id: practiceProblem.id, title: practiceProblem.title, tags: practiceProblem.tags,
            difficulty: practiceProblem.difficulty, sortOrder: practiceProblem.sortOrder,
        })
        .from(practiceProblem)
        .where(and(eq(practiceProblem.module, "DSA"), eq(practiceProblem.judgeStatus, "ready"), eq(practiceProblem.isActive, true)));
    const titleOf = new Map(candidates.map((c) => [c.id, c.title]));

    const goals = await db.query.pathfinderGoals.findMany({
        columns: { id: true, title: true, category: true },
        with: {
            verification: { columns: { id: true, generatedPlan: true, codingStatus: true } },
            dailySessions: { columns: { id: true }, with: { subGoals: { columns: { title: true } } } },
        },
    });

    const changes: Change[] = [];
    let read = 0;
    for (const g of goals) {
        const v = g.verification;
        const stored = v?.generatedPlan as Record<string, unknown> | null | undefined;
        if (!v || !stored || typeof stored !== "object") continue;
        read++;
        if (Array.isArray(stored.codingProblemIds)) continue;

        const ids = pickVerificationProblems(candidates, {
            title: g.title,
            category: g.category,
            topics: g.dailySessions.flatMap((s) => s.subGoals.map((sg) => sg.title)),
        });
        const { codingQuestions: _old, ...rest } = stored;
        changes.push({
            verificationId: v.id,
            goal: g.title,
            plan: { ...rest, codingProblemIds: ids },
            ids,
            titles: ids.map((id) => titleOf.get(id) ?? id),
            statusFrom: v.codingStatus,
            statusTo: v.codingStatus === "COMPLETED" ? "COMPLETED" : ids.length ? "PENDING" : "LOCKED",
        });
    }
    return { changes, read };
}

function print(changes: Change[], read: number) {
    for (const c of changes) {
        console.log(`  ~ ${c.verificationId}  "${c.goal}"`);
        console.log(`      problems: ${c.titles.length ? c.titles.join(" | ") : "none (no coding section)"}`);
        console.log(`      coding:   ${c.statusFrom} -> ${c.statusTo}${c.statusTo === "PENDING" && c.statusFrom !== "PENDING" ? " (score cleared)" : ""}`);
    }
    console.log(`\n  ${read} generated verifications read: ${changes.length} to give judged problems.`);
}

async function main() {
    console.log(`\nPathfinder coding problems on ${host()} - ${apply ? "APPLY" : "preview (nothing will be written)"}\n`);
    const before = await plan();
    print(before.changes, before.read);

    if (!apply) {
        console.log(before.changes.length ? "\n  Preview only. Run with --apply to write these changes.\n" : "\n  Nothing to do.\n");
        return;
    }
    if (!before.changes.length) {
        console.log("\n  Nothing to write.\n");
        return;
    }

    for (const c of before.changes) {
        await db.update(pathfinderVerifications)
            .set({
                generatedPlan: c.plan,
                ...(c.statusTo === "COMPLETED" ? {} : { codingStatus: c.statusTo as "PENDING" | "LOCKED", codingScore: null }),
            })
            .where(eq(pathfinderVerifications.id, c.verificationId));
    }

    console.log(`\n  Wrote ${before.changes.length}. Checking again...\n`);
    const after = await plan();
    print(after.changes, after.read);
    console.log(after.changes.length ? `\n  ${after.changes.length} still without problems - read the lines above.\n` : "\n  Done: every generated verification has judged problems.\n");
    if (after.changes.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
