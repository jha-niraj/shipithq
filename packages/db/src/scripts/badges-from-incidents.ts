/**
 * Copy earned Incidents badges into the platform badge table (plan/badges BDG-1), keeping their dates.
 *
 * Each `incident_badge` row becomes a `user_badge` row keyed `incidents:<key>`, marked
 * seen (they were toasted when earned). A badge already in `user_badge` keeps the older
 * date. `incident_badge` itself is left as it is; dropping it is a separate, approved step.
 *
 *   pnpm script badges-from-incidents            preview: what would be copied
 *   pnpm script badges-from-incidents --apply    copy, then preview again (nothing left)
 */
import { sql } from "drizzle-orm";
import { db } from "../client";
import { requireMigrationsApplied } from "./_migrations-check";

const apply = process.argv.includes("--apply");

type Row = { user_id: string; key: string; earned_at: string; existing_at: string | null };

async function plan(): Promise<Row[]> {
    const r = await db.execute(sql`
        select b.user_id, 'incidents:' || b.badge_key as key, b.earned_at, u.earned_at as existing_at
        from incident_badge b
        left join user_badge u on u.user_id = b.user_id and u.badge_key = 'incidents:' || b.badge_key
        where u.id is null or u.earned_at > b.earned_at
        order by b.earned_at`);
    return ((r as unknown as { rows?: Row[] }).rows ?? (r as unknown as Row[]));
}

async function main() {
    await requireMigrationsApplied();
    console.log(`\nIncidents badges into user_badge - ${apply ? "APPLY" : "preview (nothing will be written)"}\n`);
    const rows = await plan();
    for (const r of rows) console.log(`  ${r.user_id}  ${r.key}  ${new Date(r.earned_at).toISOString().slice(0, 10)}${r.existing_at ? "  (earlier date than the copy already there)" : ""}`);
    console.log(`\n  ${rows.length} to copy.`);
    if (!apply || !rows.length) {
        console.log(rows.length ? "\n  Preview only. Run with --apply to copy.\n" : "\n  Nothing to do.\n");
        return;
    }
    await db.execute(sql`
        insert into user_badge (id, user_id, badge_key, earned_at, seen_at)
        select md5(random()::text || b.id), b.user_id, 'incidents:' || b.badge_key, b.earned_at, b.earned_at
        from incident_badge b
        on conflict (user_id, badge_key) do update set earned_at = least(user_badge.earned_at, excluded.earned_at)`);
    const left = await plan();
    console.log(left.length ? `\n  ${left.length} still to copy - read the lines above.\n` : "\n  Done. Planning again finds nothing left.\n");
    if (left.length) process.exitCode = 1;
}

main().then(() => process.exit(process.exitCode ?? 0)).catch((error: unknown) => {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : null;
    console.error(cause ?? (error instanceof Error ? error.message : error));
    process.exit(1);
});
