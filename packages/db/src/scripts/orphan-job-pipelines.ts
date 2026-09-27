/**
 * Delete job pipeline copies whose job was deleted and that no candidate run uses (plan/hiring-ui HU-18).
 *
 *   pnpm script orphan-job-pipelines            preview: every orphan, per company
 *   pnpm script orphan-job-pipelines --apply    delete them, then check again
 *
 * A job's own copy (`interview_process` with `job_id` set, `is_template` false) has no
 * foreign key back to its job, so `deleteJob` used to leave it behind. Copies that
 * candidates have runs on are kept and listed: the runs point at them.
 */
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { db } from "../client"
import { companies, hiringRuns, interviewProcesses } from "../index"

const apply = process.argv.includes("--apply")

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)"
    } catch {
        return "(DATABASE_URL is not a URL)"
    }
}

async function plan() {
    const orphans = await db
        .select({ id: interviewProcesses.id, name: interviewProcesses.name, jobId: interviewProcesses.jobId, companyId: interviewProcesses.companyId, company: companies.name })
        .from(interviewProcesses)
        .leftJoin(companies, eq(companies.id, interviewProcesses.companyId))
        .where(and(
            isNotNull(interviewProcesses.jobId),
            eq(interviewProcesses.isTemplate, false),
            sql`not exists (select 1 from job where job.id = ${interviewProcesses.jobId})`,
        ))
    const used = orphans.length
        ? await db.selectDistinct({ id: hiringRuns.processId }).from(hiringRuns).where(inArray(hiringRuns.processId, orphans.map((o) => o.id)))
        : []
    const kept = new Set(used.map((u) => u.id))
    return { remove: orphans.filter((o) => !kept.has(o.id)), keep: orphans.filter((o) => kept.has(o.id)) }
}

function print(p: Awaited<ReturnType<typeof plan>>) {
    if (!p.remove.length && !p.keep.length) { console.log("  No orphaned job pipelines."); return }
    const byCompany = new Map<string, typeof p.remove>()
    for (const o of p.remove) byCompany.set(o.company ?? o.companyId ?? "(no company)", [...(byCompany.get(o.company ?? o.companyId ?? "(no company)") ?? []), o])
    for (const [company, rows] of byCompany) {
        console.log(`  ${company}: ${rows.length} to delete`)
        for (const r of rows) console.log(`    - ${r.name} (${r.id}, job ${r.jobId})`)
    }
    if (p.keep.length) console.log(`  Kept, candidates have runs on them: ${p.keep.map((k) => `${k.name} (${k.id})`).join(", ")}`)
}

async function main() {
    const h = host()
    console.log(`Database: ${h}\nMode:     ${apply ? "APPLY" : "preview (add --apply to write)"}\n`)
    const before = await plan()
    print(before)
    if (!apply || !before.remove.length) return
    await db.delete(interviewProcesses).where(inArray(interviewProcesses.id, before.remove.map((o) => o.id)))
    console.log(`\n  Deleted ${before.remove.length}. Checking again:\n`)
    const after = await plan()
    print(after)
    console.log(after.remove.length ? `\n  ! ${after.remove.length} still to delete` : "\n  Nothing left to delete.")
}

main().then(() => process.exit(0), (error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
})
