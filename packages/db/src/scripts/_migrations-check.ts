/**
 * Helper, not a script: "are the migrations this script needs applied?"
 *
 * A seed that runs against a database missing its tables fails with a raw
 * "Failed query: select ... from design_prompt", which says nothing about the
 * fix. Every data script calls `requireMigrationsApplied()` first; with
 * migrations pending it lists them, prints the one command to run, and exits.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { neon } from "@neondatabase/serverless"

interface JournalEntry { idx: number; when: number; tag: string }

const root = resolve(import.meta.dirname, "../..")

/** Migrations in drizzle/ that the database has not recorded as applied. */
export async function pendingMigrations(): Promise<JournalEntry[]> {
    const journal = JSON.parse(readFileSync(resolve(root, "drizzle/meta/_journal.json"), "utf8")) as { entries: JournalEntry[] }
    const sql = neon(process.env.DATABASE_URL!)
    let applied: string[] = []
    try {
        const rows = await sql`select created_at from drizzle.__drizzle_migrations`
        applied = rows.map((r) => String(r.created_at))
    } catch {
        // No migrations table yet: nothing has been applied.
    }
    const done = new Set(applied)
    return journal.entries.filter((e) => !done.has(String(e.when)))
}

/** Exit with the fix when any migration is pending. Call before the first query. */
export async function requireMigrationsApplied(): Promise<void> {
    const list = await pendingMigrations()
    if (!list.length) return
    console.error(`\n${list.length} migration(s) are not applied to this database yet:\n`)
    for (const e of list) console.error(`  * ${e.tag}`)
    console.error("\nApply them first, then run this again:\n")
    console.error("  pnpm script migrations            # preview: shows each migration's SQL")
    console.error("  pnpm script migrations --apply    # apply\n")
    process.exit(1)
}
