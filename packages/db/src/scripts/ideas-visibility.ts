/**
 * Hide bug reports from the public Ideas boards (plan/web/revamp REV-40).
 *
 * `feedback.is_public` arrived defaulting to true, so every existing row became
 * public, bug reports included. Bugs can carry account details and are never shown on
 * shipithq.com/ideas or the app's board; this sets them private. Nothing else is
 * touched, so it is safe to run twice.
 *
 *   pnpm script ideas-visibility            preview: which rows would be hidden
 *   pnpm script ideas-visibility --apply    write, then preview again (should be empty)
 */
import { and, eq } from "drizzle-orm";
import { db } from "../client";
import { feedbacks } from "../schema";

const apply = process.argv.includes("--apply");

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
    } catch {
        return "(DATABASE_URL is not a URL)";
    }
}

async function plan() {
    return db
        .select({ id: feedbacks.id, title: feedbacks.title, createdAt: feedbacks.createdAt })
        .from(feedbacks)
        .where(and(eq(feedbacks.category, "BUG"), eq(feedbacks.isPublic, true)));
}

function print(rows: Awaited<ReturnType<typeof plan>>): number {
    for (const r of rows) console.log(`  - ${r.id}  "${r.title.slice(0, 70)}"  (${r.createdAt.toISOString().slice(0, 10)})  -> private`);
    console.log(`\n  ${rows.length} public bug report${rows.length === 1 ? "" : "s"}.`);
    return rows.length;
}

async function main() {
    console.log(`\nIdeas visibility on ${host()} - ${apply ? "APPLY" : "preview (nothing will be written)"}\n`);
    const n = print(await plan());
    if (!apply) {
        console.log(n ? "\n  Preview only. Run with --apply to hide these.\n" : "\n  Nothing to do.\n");
        return;
    }
    if (!n) {
        console.log("\n  Nothing to write.\n");
        return;
    }
    await db.update(feedbacks).set({ isPublic: false }).where(and(eq(feedbacks.category, "BUG"), eq(feedbacks.isPublic, true)));
    console.log(`\n  Hid ${n}. Checking again...\n`);
    const left = print(await plan());
    console.log(left ? "\n  Some are still public - read the lines above.\n" : "\n  Done: no bug report is public.\n");
    if (left) process.exitCode = 1;
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
