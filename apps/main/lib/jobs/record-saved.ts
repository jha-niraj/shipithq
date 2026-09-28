import "server-only"
import { eq } from "drizzle-orm"
import { db, companies, jobs } from "@repo/db"
import { recordActivity, activityKey } from "@repo/db/activity"

/**
 * One ledger entry for a saved job (plan/progress PRG-3), from every place a job is
 * saved (the list, the job page, Spark). Called on a save only, never on an unsave;
 * saving the same job again repeats the key and records nothing.
 */
export async function recordJobSaved(userId: string, jobId: string): Promise<void> {
    const [job] = await db.select({ title: jobs.title, company: companies.name })
        .from(jobs).leftJoin(companies, eq(companies.id, jobs.companyId))
        .where(eq(jobs.id, jobId)).limit(1)
    await recordActivity(db, userId, {
        type: "JOB_SAVED",
        title: `Saved ${job?.title ?? "a job"}`,
        description: job?.company ?? null,
        xp: 0,
        key: activityKey.jobSaved(jobId),
        meta: { jobId },
    })
}
