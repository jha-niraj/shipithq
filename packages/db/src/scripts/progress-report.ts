/**
 * Build one progress report for an account (plan/progress PRG-7): print it, or store it with --apply.
 *
 * Uses the same builder the scheduled job uses. The period is the last full one for the
 * frequency (last Mon to Sun for weekly), or `--from=yyyy-mm-dd --to=yyyy-mm-dd`.
 * Storing is once per period: a second --apply finds the report already there.
 *
 *   pnpm script progress-report --email=a@b.com                      preview last week's
 *   pnpm script progress-report --email=a@b.com --frequency=monthly  last month's
 *   pnpm script progress-report --email=a@b.com --apply              store it
 */
import { eq } from "drizzle-orm";
import { db } from "../client";
import { users } from "../schema";
import { buildReport, lastFullPeriod, periodLabel, storeReport, type ReportFrequency } from "../progress";
import { requireMigrationsApplied } from "./_migrations-check";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const apply = process.argv.includes("--apply");
const FREQ: Record<string, ReportFrequency> = { weekly: "WEEKLY", half: "HALF_MONTHLY", "half-monthly": "HALF_MONTHLY", monthly: "MONTHLY" };

async function main() {
    await requireMigrationsApplied();
    const email = arg("email");
    if (!email) throw new Error("Pass --email=<account>");
    const frequency = FREQ[arg("frequency") ?? "weekly"];
    if (!frequency) throw new Error("--frequency is weekly, half-monthly or monthly");
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (!u) throw new Error(`No account for ${email}`);
    const from = arg("from"), to = arg("to");
    const period = from && to ? { from, to } : lastFullPeriod(frequency, new Date());

    console.log(`\nProgress report for ${email}, ${frequency}, ${periodLabel(period)} - ${apply ? "APPLY" : "preview (nothing will be written)"}\n`);
    const r = await buildReport(db, u.id, frequency, period);
    if (!r) {
        console.log("  Nothing recorded in this period: no report (the job would send nothing).\n");
        return;
    }
    const ch = (v: number | null) => (v === null ? "" : ` (${v > 0 ? "+" : ""}${v}%)`);
    console.log(`  XP ${r.totals.xp}${ch(r.change.xp)} · active days ${r.totals.activeDays}${ch(r.change.activeDays)} · activities ${r.totals.activities}${ch(r.change.activities)} · minutes ${r.totals.minutes}`);
    console.log(`  streak ${r.streak.current} (longest ${r.streak.longest}) · xp chart ${r.xp.series.length} points (${r.xp.bucket})`);
    console.log(`  modules: ${r.modules.map((m) => m.key).join(", ") || "-"}`);
    console.log(`  wins: ${r.wins.map((w) => w.title).join(" | ") || "-"}`);
    console.log(`  next up: ${r.nextUp.map((n) => n.title).join(" | ") || "-"}`);
    console.log(`  entries: ${r.entries.length}`);
    if (!apply) {
        console.log("\n  Preview only. Run with --apply to store it.\n");
        return;
    }
    const s = await storeReport(db, u.id, r);
    console.log(s.created ? `\n  Stored as ${s.id}: /reports/${s.id}\n` : `\n  Already stored as ${s.id}: nothing written.\n`);
}

main().then(() => process.exit(0)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
