/**
 * Award every platform badge already earned by past work (plan/badges BDG-3), dated from the ledger.
 *
 * Measures each badge for every user with any recorded activity, the same way live awarding
 * does. A new badge is dated by the ledger entry that reached it (the Nth event of its types,
 * for a count badge), or now when the ledger cannot say. No Inbox notes and no toasts: these
 * are marked seen, because they are old news.
 *
 *   pnpm script badges-backfill                   preview: per user, what would be awarded
 *   pnpm script badges-backfill --apply           award, then preview again (nothing left)
 *   pnpm script badges-backfill --email=a@b.com   one account
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../client";
import { BADGES, awardBadges, type BadgeDef } from "../badges";
import { activityEntries, userBadges } from "../schema";
import { requireMigrationsApplied } from "./_migrations-check";

const apply = process.argv.includes("--apply");
const email = process.argv.find((a) => a.startsWith("--email="))?.slice("--email=".length);

async function candidates() {
    const rows = await db.execute(sql`
        select distinct u.id, u.email from "user" u
        where exists (select 1 from activity_entry a where a.user_id = u.id)
        ${email ? sql`and u.email = ${email}` : sql``}
        order by u.id`);
    return ((rows as unknown as { rows?: { id: string; email: string }[] }).rows ?? (rows as unknown as { id: string; email: string }[]));
}

/** Badges a user has reached but not been given. */
async function due(userId: string): Promise<BadgeDef[]> {
    const have = new Set((await db.select({ key: userBadges.badgeKey }).from(userBadges).where(eq(userBadges.userId, userId))).map((r) => r.key));
    const open = BADGES.filter((b) => !have.has(b.key));
    const values = await Promise.all(open.map((b) => b.measure(db, userId)));
    return open.filter((b, i) => values[i]! >= b.max);
}

/** When the ledger says a count badge was reached: its Nth entry of the badge's types. */
async function reachedAt(userId: string, b: BadgeDef): Promise<Date | null> {
    if (!b.triggers.length || b.max > 1000) return null;
    const [row] = await db.select({ at: activityEntries.createdAt }).from(activityEntries)
        .where(and(eq(activityEntries.userId, userId), inArray(activityEntries.activityType, b.triggers)))
        .orderBy(asc(activityEntries.createdAt)).offset(b.max - 1).limit(1);
    return row?.at ?? null;
}

async function main() {
    await requireMigrationsApplied();
    console.log(`\nBadges backfill${email ? ` for ${email}` : ""} - ${apply ? "APPLY" : "preview (nothing will be written)"}\n`);
    let total = 0;
    for (const u of await candidates()) {
        const list = await due(u.id);
        if (!list.length) continue;
        total += list.length;
        console.log(`  ${u.email}: ${list.map((b) => b.title).join(", ")}`);
        if (!apply) continue;
        const fresh = await awardBadges(db, u.id, { includeLazy: true, notify: false, seen: true });
        for (const b of fresh) {
            const at = await reachedAt(u.id, b);
            if (at) await db.update(userBadges).set({ earnedAt: at, seenAt: at }).where(and(eq(userBadges.userId, u.id), eq(userBadges.badgeKey, b.key)));
        }
    }
    console.log(`\n  ${total} badge${total === 1 ? "" : "s"} ${apply ? "awarded" : "to award"}.`);
    if (!apply) {
        console.log(total ? "\n  Preview only. Run with --apply to award.\n" : "\n  Nothing to do.\n");
        return;
    }
    let left = 0;
    for (const u of await candidates()) left += (await due(u.id)).length;
    console.log(left ? `\n  ${left} still due - read the lines above.\n` : "\n  Done. Planning again finds nothing left.\n");
    if (left) process.exitCode = 1;
}

main().then(() => process.exit(process.exitCode ?? 0)).catch((error: unknown) => {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : null;
    console.error(cause ?? (error instanceof Error ? error.message : error));
    process.exit(1);
});
