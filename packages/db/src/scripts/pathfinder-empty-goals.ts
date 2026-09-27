/**
 * Delete Pathfinder goals that have no content: zero subgoals (Niraj, 2026-09-27: "if that has no content, please delete it").
 *
 * A goal with no subgoals has nothing to read, practise or verify; it is what a failed
 * or abandoned generation leaves behind. Everything that references a goal cascades on
 * delete (sessions, attempts, submissions, verifications, purchases, the usage ledger).
 * `forked_from_id` is not a foreign key, so any goal forked FROM one of these is listed
 * and left alone.
 *
 *   pnpm script pathfinder-empty-goals            preview: which goals would go
 *   pnpm script pathfinder-empty-goals --apply    delete them, then preview again (should be empty)
 */
import { inArray, sql } from "drizzle-orm";
import { db } from "../client";
import { pathfinderGoals } from "../schema";
import { requireMigrationsApplied } from "./_migrations-check";

const apply = process.argv.includes("--apply");

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
    } catch {
        return "(DATABASE_URL is not a URL)";
    }
}

type Row = { id: string; title: string; isPublic: boolean; createdAt: Date; forks: number };

async function plan(): Promise<Row[]> {
    const rows = await db.execute(sql`
        select g.id, g.title, g.is_public as "isPublic", g.created_at as "createdAt",
               (select count(*)::int from pathfinder_goal f where f.forked_from_id = g.id) as forks
        from pathfinder_goal g
        where not exists (select 1 from pathfinder_sub_goal s where s.goal_id = g.id)
        order by g.created_at
    `);
    return (rows as unknown as { rows?: Row[] }).rows ?? (rows as unknown as Row[]);
}

function print(rows: Row[]): number {
    for (const r of rows) {
        console.log(`  - ${r.id}  "${r.title.slice(0, 60)}"  ${r.isPublic ? "public" : "private"}  ${new Date(r.createdAt).toISOString().slice(0, 10)}${r.forks ? `  (${r.forks} fork(s) point at it, left alone)` : ""}`);
    }
    console.log(`\n  ${rows.length} goal${rows.length === 1 ? "" : "s"} with no content.`);
    return rows.length;
}

async function main() {
    await requireMigrationsApplied();
    console.log(`\nEmpty Pathfinder goals on ${host()} - ${apply ? "APPLY" : "preview (nothing will be written)"}\n`);
    const rows = await plan();
    const n = print(rows);
    if (!apply) {
        console.log(n ? "\n  Preview only. Run with --apply to delete these.\n" : "\n  Nothing to do.\n");
        return;
    }
    if (!n) {
        console.log("\n  Nothing to delete.\n");
        return;
    }
    await db.delete(pathfinderGoals).where(inArray(pathfinderGoals.id, rows.map((r) => r.id)));
    console.log(`\n  Deleted ${n}. Checking again...\n`);
    const left = print(await plan());
    console.log(left ? "\n  Some are still here - read the lines above.\n" : "\n  Done: every goal has content.\n");
    if (left) process.exitCode = 1;
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
