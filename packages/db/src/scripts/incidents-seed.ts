/**
 * Write the Incidents cases and their player steps from apps/main/content/incidents to the database (plan/incidents INC-11).
 *
 * Cases are authored as typed files in the repo; the app reads them from
 * `incident_case` and `incident_step`. This previews, per case, which steps it would
 * add, change or remove (matched by the step's stable `key`, so a reader's saved
 * answers survive an edit), and writes only with --apply, then plans again.
 *
 *   pnpm script incidents-seed            preview
 *   pnpm script incidents-seed --apply    write, then preview again (should be empty)
 *
 * Removing a case from the content does not delete it here: it is listed as
 * "not in content" and left alone, because readers' progress points at it.
 */
import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db, withTransaction } from "../client";
import { incidentCases, incidentSteps } from "../schema";
import { requireMigrationsApplied } from "./_migrations-check";
import { INCIDENT_CASES } from "../../../../apps/main/content/incidents/cases";
import { stepsFor, type AuthoredStep } from "../../../../apps/main/content/incidents/steps";

const apply = process.argv.includes("--apply");

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
    } catch {
        return "(DATABASE_URL is not a URL)";
    }
}

/** Key-sorted and undefined-free, because jsonb returns keys in its own order. */
function canonical(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === "object") {
        return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, x]) => [k, canonical(x)]));
    }
    return v;
}
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(canonical(v))).digest("hex").slice(0, 16);

type CaseRow = { slug: string; title: string; summary: string; topic: string; minutes: number; meta: Record<string, unknown>; version: string };
type Plan = {
    slug: string;
    caseAction: "insert" | "update" | "same";
    row: CaseRow;
    steps: AuthoredStep[];
    add: string[];
    change: string[];
    remove: string[];
    reorder: boolean;
};

function authored() {
    return Object.values(INCIDENT_CASES).map((c) => {
        const steps = stepsFor(c);
        const meta = { sources: c.sources, diagram: c.model.diagram, simulator: c.slug };
        const row: CaseRow = { slug: c.slug, title: c.title, summary: c.summary, topic: c.topic, minutes: c.minutes, meta, version: "" };
        row.version = hash({ row: { ...row, version: undefined }, steps });
        return { row, steps };
    });
}

async function plan(): Promise<{ plans: Plan[]; orphans: string[] }> {
    const wanted = authored();
    const existing = await db.select().from(incidentCases);
    const plans: Plan[] = [];
    for (const { row, steps } of wanted) {
        const have = existing.find((e) => e.slug === row.slug);
        const haveSteps = have ? await db.select().from(incidentSteps).where(eq(incidentSteps.caseId, have.id)) : [];
        const byKey = new Map(haveSteps.map((s) => [s.key, s]));
        const add = steps.filter((s) => !byKey.has(s.key)).map((s) => s.key);
        const change = steps
            .filter((s) => {
                const h = byKey.get(s.key);
                return h && hash({ p: h.part, k: h.kind, t: h.title, c: h.content, x: h.xp }) !== hash({ p: s.part, k: s.kind, t: s.title, c: s.content, x: s.xp });
            })
            .map((s) => s.key);
        const remove = haveSteps.filter((h) => !steps.some((s) => s.key === h.key)).map((h) => h.key);
        const reorder = steps.some((s, i) => byKey.has(s.key) && byKey.get(s.key)!.ordinal !== i);
        const caseAction = !have ? "insert" : have.version !== row.version ? "update" : "same";
        if (caseAction !== "same" || add.length || change.length || remove.length || reorder) {
            plans.push({ slug: row.slug, caseAction: caseAction === "same" ? "update" : caseAction, row, steps, add, change, remove, reorder });
        }
    }
    const orphans = existing.filter((e) => !wanted.some((w) => w.row.slug === e.slug)).map((e) => e.slug);
    return { plans, orphans };
}

function print({ plans, orphans }: Awaited<ReturnType<typeof plan>>): number {
    for (const p of plans) {
        console.log(`  ${p.caseAction === "insert" ? "+ new case" : "~ case"}  ${p.slug}  (${p.steps.length} steps)`);
        if (p.caseAction === "insert") continue;
        if (p.add.length) console.log(`      + ${p.add.length} step(s): ${p.add.join(", ")}`);
        if (p.change.length) console.log(`      ~ ${p.change.length} step(s): ${p.change.join(", ")}`);
        if (p.remove.length) console.log(`      - ${p.remove.length} step(s): ${p.remove.join(", ")}`);
        if (p.reorder) console.log("      ~ step order");
    }
    for (const o of orphans) console.log(`  ! ${o} is in the database but not in the content (left alone)`);
    console.log(`\n  ${plans.length} case${plans.length === 1 ? "" : "s"} to write.`);
    return plans.length;
}

async function write(plans: Plan[]) {
    for (const p of plans) {
        await withTransaction(async (tx) => {
            const [c] = await tx
                .insert(incidentCases)
                .values({ ...p.row, status: "LIVE" })
                .onConflictDoUpdate({ target: incidentCases.slug, set: { title: p.row.title, summary: p.row.summary, topic: p.row.topic, minutes: p.row.minutes, meta: p.row.meta, version: p.row.version } })
                .returning({ id: incidentCases.id });
            const caseId = c!.id;
            if (p.remove.length) {
                await tx.delete(incidentSteps).where(and(eq(incidentSteps.caseId, caseId), inArray(incidentSteps.key, p.remove)));
            }
            for (const [i, s] of p.steps.entries()) {
                await tx
                    .insert(incidentSteps)
                    .values({ caseId, key: s.key, ordinal: i, part: s.part, kind: s.kind, title: s.title, content: s.content, xp: s.xp })
                    .onConflictDoUpdate({ target: [incidentSteps.caseId, incidentSteps.key], set: { ordinal: i, part: s.part, kind: s.kind, title: s.title, content: s.content, xp: s.xp } });
            }
        });
        console.log(`  wrote ${p.slug}`);
    }
}

async function main() {
    await requireMigrationsApplied();
    console.log(`\nIncidents seed on ${host()} - ${apply ? "APPLY" : "preview (nothing will be written)"}\n`);
    const first = await plan();
    const n = print(first);
    if (!apply) {
        console.log(n ? "\n  Preview only. Run with --apply to write these.\n" : "\n  Nothing to change.\n");
        return;
    }
    if (!n) {
        console.log("\n  Nothing to write.\n");
        return;
    }
    await write(first.plans);
    console.log("\n  Written. Checking again...\n");
    const left = print(await plan());
    console.log(left ? "\n  Something is still different - read the lines above.\n" : "\n  Done: the database matches the content.\n");
    if (left) process.exitCode = 1;
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
