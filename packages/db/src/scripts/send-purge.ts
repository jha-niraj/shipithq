/**
 * Remove withdrawn and declined send data past its 90-day purge date (plan/hiring-rounds HR-21).
 *
 *   pnpm script send-purge            preview: each send due, its status and purge date; nothing written
 *   pnpm script send-purge --apply    remove their snapshots and profiles, then preview again (should be empty)
 *
 * The worker's daily cron runs the same `purgeExpiredSends`; this is the manual
 * run and the check. A purged send keeps its row (status, dates, outcomes) and
 * none of the student's data.
 */
import { db } from "../client"
import { requireMigrationsApplied } from "./_migrations-check"
import { purgeExpiredSends, sendsDueForPurge } from "../hiring-purge"

const apply = process.argv.includes("--apply")

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)"
    } catch {
        return "(DATABASE_URL is not a URL)"
    }
}

async function preview(): Promise<number> {
    const due = await sendsDueForPurge(db)
    if (!due.length) {
        console.log("  Nothing to purge: no send is past its purge date with data left.")
        return 0
    }
    console.log(`  ${due.length} ${due.length === 1 ? "send is" : "sends are"} due:`)
    for (const s of due) console.log(`    ${s.id}  ${s.status.padEnd(9)}  purge after ${s.purgeAfter?.toISOString() ?? "-"}`)
    return due.length
}

async function main() {
    await requireMigrationsApplied()
    console.log(`\nSend purge on ${host()} - ${apply ? "APPLY" : "preview (nothing will be written)"}\n`)
    const due = await preview()
    if (!apply) {
        if (due) console.log("\n  Preview only. Run with --apply to remove them.")
        return
    }
    if (!due) return
    const n = await purgeExpiredSends(db)
    console.log(`\n  Removed the data of ${n} ${n === 1 ? "send" : "sends"}. Checking again:\n`)
    await preview()
}

main().then(() => process.exit(0)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
})
