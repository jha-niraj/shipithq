/**
 * Run the scheduled progress reports by hand for one send day (plan/progress PRG-10), storing without email.
 *
 * The same batch code the worker's daily job runs, minus the email: the worker sends
 * those (it holds the Resend key). Use it to see who is due on a day and what each
 * report would say, or to store them so the pages and Settings list can be checked.
 *
 *   pnpm script progress-reports-run --day=2026-09-28                   preview: who is due, per frequency
 *   pnpm script progress-reports-run --day=2026-09-28 --email=a@b.com   one account
 *   pnpm script progress-reports-run --day=2026-09-28 --apply           store them (no email)
 */
import { db } from "../client";
import { frequenciesDue, periodEndingBefore, periodLabel, runReportBatch } from "../progress";
import { requireMigrationsApplied } from "./_migrations-check";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const apply = process.argv.includes("--apply");

async function main() {
    await requireMigrationsApplied();
    const day = arg("day") ?? new Date().toISOString().slice(0, 10);
    const email = arg("email");
    const date = new Date(`${day}T00:00:00Z`);
    const due = frequenciesDue(date);
    console.log(`\nProgress reports for ${day}${email ? `, ${email}` : ""} - ${apply ? "APPLY (store, no email)" : "preview (nothing will be written)"}\n`);
    if (!due.length) {
        console.log("  Not a send day: reports go out on Mondays (weekly), the 1st and the 16th.\n");
        return;
    }
    for (const frequency of due) {
        const period = periodEndingBefore(frequency, date)!;
        console.log(`  ${frequency}, ${periodLabel(period)}`);
        let cursor: string | null = null;
        let totals = { considered: 0, stored: 0, empty: 0, failed: 0 };
        for (;;) {
            if (!apply) {
                // Preview: the same due list, built but not stored.
                const r = await runReportBatch(db, { frequency, day: date, appUrl: "", send: null, afterUserId: cursor, limit: 50, onlyEmail: email, dryRun: true });
                totals = { considered: totals.considered + r.considered, stored: totals.stored, empty: totals.empty + r.empty, failed: totals.failed + r.failed };
                for (const line of r.preview ?? []) console.log(`    ${line}`);
                cursor = r.lastUserId;
                if (r.done) break;
            } else {
                const r = await runReportBatch(db, { frequency, day: date, appUrl: "", send: null, afterUserId: cursor, limit: 50, onlyEmail: email });
                totals = { considered: totals.considered + r.considered, stored: totals.stored + r.stored, empty: totals.empty + r.empty, failed: totals.failed + r.failed };
                cursor = r.lastUserId;
                if (r.done) break;
            }
        }
        console.log(`    ${totals.considered} due · ${apply ? `${totals.stored} stored · ` : ""}${totals.empty} with nothing to report · ${totals.failed} failed\n`);
    }
    if (!apply) console.log("  Preview only. Run with --apply to store (emails are sent by the worker's job).\n");
}

main().then(() => process.exit(0)).catch((error: unknown) => {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : null;
    console.error(cause ?? (error instanceof Error ? error.message : error));
    process.exit(1);
});
