/**
 * Add or refresh the Setup sprint on every curated project and learner copy (plan/project-repos RP-3, RP-4).
 *
 *   pnpm script project-setup            preview: what would change, nothing written
 *   pnpm script project-setup --apply    write it, then preview again (should be empty)
 *
 * Preview first, always (Niraj, 2026-09-24): every data change ships as a script
 * like this one, so the output can be read before anything is touched.
 */
import { applySetupSprints, planSetupSprints, type SetupPlan, type TargetPlan } from "../seed/setup-sprints";

const apply = process.argv.includes("--apply");

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
    } catch {
        return "(DATABASE_URL is not a URL)";
    }
}

const pct = (done: number, total: number) => (total ? `${Math.round((done / total) * 100)}%` : "0%");

function describe(t: TargetPlan): string[] {
    const lines: string[] = [];
    if (t.setup.kind === "insert") lines.push(`+ add Setup: ${t.setup.tasks} steps`);
    if (t.setup.kind === "refresh") {
        const r = t.setup;
        if (r.sprintChanged) lines.push("~ update the Setup sprint's name, goal or order");
        for (const u of r.update) lines.push(`~ update step ${u.index + 1}: ${u.title}`);
        for (const j of r.insert) lines.push(`+ add step ${j + 1}`);
        if (r.remove.length) lines.push(`- remove ${r.remove.length} extra step${r.remove.length === 1 ? "" : "s"} nobody has started`);
        if (r.keptSurplus) lines.push(`= keep ${r.keptSurplus} extra step${r.keptSurplus === 1 ? "" : "s"} a learner has touched`);
    }
    if (t.rewriteFirst) lines.push(`~ sprint 1 task 1: "${t.rewriteFirst.from}" -> "${t.rewriteFirst.to}"`);
    for (const p of t.progress) {
        lines.push(`~ progress of ${p.user}: ${p.before.done}/${p.before.total} (${pct(p.before.done, p.before.total)}) -> ${p.after.done}/${p.after.total} (${pct(p.after.done, p.after.total)})`);
    }
    if (t.bumpPublished) lines.push("~ published_at -> now, so new enrolees see the change");
    return lines;
}

function print(plan: SetupPlan) {
    const changed = plan.targets.filter((t) => t.changed);
    for (const t of plan.targets) {
        const label = `${t.slug}${t.isOriginal ? "" : `  (copy, ${t.owner})`}`;
        if (!t.changed) {
            console.log(`  = ${label}: up to date`);
            continue;
        }
        console.log(`  * ${label}`);
        for (const line of describe(t)) console.log(`      ${line}`);
    }
    for (const s of plan.skipped) console.log(`  ! skipped ${s}`);
    const copies = plan.targets.filter((t) => !t.isOriginal).length;
    console.log(`\n  ${plan.targets.length - copies} projects, ${copies} copies: ${changed.length} to change, ${plan.targets.length - changed.length} up to date.`);
    return changed.length;
}

async function main() {
    console.log(`\nSetup sprints on ${host()} - ${apply ? "APPLY" : "preview (nothing will be written)"}\n`);
    const plan = await planSetupSprints();
    const toChange = print(plan);

    if (!apply) {
        console.log(toChange ? "\n  Preview only. Run with --apply to write these changes.\n" : "\n  Nothing to do.\n");
        return;
    }
    if (!toChange) {
        console.log("\n  Nothing to write.\n");
        return;
    }

    const written = await applySetupSprints(plan);
    console.log(`\n  Wrote ${written} of ${plan.targets.length} projects and copies. Checking again...\n`);
    const after = await planSetupSprints();
    const left = print(after);
    console.log(left ? `\n  ${left} still differ - read the lines above.\n` : "\n  Done: everything is up to date.\n");
    if (left) process.exitCode = 1;
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
