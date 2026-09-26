/**
 * Database migrations, preview first (Niraj, 2026-09-24).
 *
 *   pnpm script migrations            list the migrations not yet applied, with their SQL
 *   pnpm script migrations --apply    apply them (drizzle-kit migrate), then check again
 *
 * (`pnpm db:migrations [--apply]` is the same script.)
 *
 * Generating a migration is unchanged: `pnpm db:generate --name <name>`. This
 * replaces running `pnpm db:migrate` blind: read the SQL, then apply.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { neon } from "@neondatabase/serverless";

const apply = process.argv.includes("--apply");
const root = resolve(import.meta.dirname, "../..");

interface JournalEntry { idx: number; when: number; tag: string }

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
    } catch {
        return "(DATABASE_URL is not a URL)";
    }
}

async function pending(): Promise<JournalEntry[]> {
    const journal = JSON.parse(readFileSync(resolve(root, "drizzle/meta/_journal.json"), "utf8")) as { entries: JournalEntry[] };
    const sql = neon(process.env.DATABASE_URL!);
    let applied: string[] = [];
    try {
        const rows = await sql`select created_at from drizzle.__drizzle_migrations`;
        applied = rows.map((r) => String(r.created_at));
    } catch {
        // No migrations table yet: nothing has been applied.
    }
    const done = new Set(applied);
    return journal.entries.filter((e) => !done.has(String(e.when)));
}

function show(list: JournalEntry[]) {
    for (const e of list) {
        const file = resolve(root, `drizzle/${e.tag}.sql`);
        const body = readFileSync(file, "utf8").replaceAll("--> statement-breakpoint", "").trim();
        console.log(`  * ${e.tag}.sql\n`);
        for (const line of body.split("\n")) console.log(`      ${line}`);
        console.log("");
    }
}

async function main() {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    console.log(`\nMigrations on ${host()} - ${apply ? "APPLY" : "preview (nothing will be applied)"}\n`);
    const before = await pending();
    if (before.length === 0) {
        console.log("  Nothing pending: the database is up to date.\n");
        return;
    }
    console.log(`  ${before.length} pending:\n`);
    show(before);

    if (!apply) {
        console.log("  Preview only. Run with --apply to apply these.\n");
        return;
    }

    const run = spawnSync("npx", ["drizzle-kit", "migrate"], { cwd: root, stdio: "inherit", env: process.env });
    if (run.status !== 0) throw new Error(`drizzle-kit migrate exited with ${run.status}`);

    const after = await pending();
    console.log(after.length ? `\n  ${after.length} still pending: ${after.map((e) => e.tag).join(", ")}\n` : "\n  Done: every migration is applied.\n");
    if (after.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
