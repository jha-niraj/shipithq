/**
 * Seed one user's job application history, for testing (plan/ui-pass UI-13).
 *
 * On its own so it can be added to a test account without re-running the whole seed.
 *
 *   pnpm script seed-applications --email=<email>            preview, nothing written
 *   pnpm script seed-applications --email=<email> --apply    write, then preview again
 *
 * Preview first, always (Niraj, 2026-09-24).
 */
import { applyApplications, planApplications, type ApplicationStep } from "../seed/applications";

const apply = process.argv.includes("--apply");
const email = process.argv.find((a) => a.startsWith("--email="))?.split("=")[1] ?? "";

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
    } catch {
        return "(DATABASE_URL is not a URL)";
    }
}

function line(s: ApplicationStep): string {
    switch (s.kind) {
        case "insert": return `+ apply to ${s.jobSlug} as ${s.status} (${s.daysAgo} days ago)`;
        case "update": return `~ ${s.jobSlug}: ${s.from} -> ${s.status}`;
        case "same": return `= ${s.jobSlug}: already ${s.status}`;
        case "missing-job": return `! ${s.jobSlug}: no such job (run pnpm db:seed first); skipped`;
    }
}

async function report(): Promise<{ userId: string | null; steps: ApplicationStep[] }> {
    const plan = await planApplications(email);
    if (!plan.userId) {
        console.log(`No user with email ${email}. Nothing to do.`);
        return plan;
    }
    for (const s of plan.steps) console.log(`  ${line(s)}`);
    const pending = plan.steps.filter((s) => s.kind === "insert" || s.kind === "update").length;
    console.log(pending ? `\n${pending} change${pending === 1 ? "" : "s"} pending.` : "\nNothing to change.");
    return plan;
}

async function main() {
    if (!email) {
        console.error("Pass --email=<email>: applications are seeded for one named account only.");
        process.exit(1);
    }
    console.log(`Database: ${host()}\nUser:     ${email}\nMode:     ${apply ? "APPLY" : "preview (add --apply to write)"}\n`);
    const plan = await report();
    if (!apply || !plan.userId) return;
    const written = await applyApplications(plan.userId, plan.steps);
    console.log(`\nWrote ${written} row${written === 1 ? "" : "s"}. Checking again:\n`);
    await report();
}

main().then(() => process.exit(0), (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
