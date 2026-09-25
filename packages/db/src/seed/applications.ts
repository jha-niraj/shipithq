import { and, eq, inArray } from "drizzle-orm";
import { db } from "../client";
import { jobApplications, jobs, users } from "../index";

/**
 * A believable application history for ONE named user (plan/jobs JB-5), shared
 * by `pnpm db:seed --applications=<email>` and the preview-first
 * `pnpm script seed-applications --email=<email>` (plan/ui-pass UI-13).
 *
 * The statuses are spread across the pipeline on purpose: the applications page
 * groups into All / Active / Offers / Closed, and every one of those buckets
 * needs a row or the tabs cannot be told apart.
 */
export const APPLICATION_PLAN: { jobSlug: string; status: string; daysAgo: number }[] = [
    { jobSlug: "lumen-labs-backend-engineer-traces", status: "INTERVIEW_SCHEDULED", daysAgo: 9 },
    { jobSlug: "northwind-payments-backend-engineer", status: "UNDER_REVIEW", daysAgo: 5 },
    { jobSlug: "cobalt-security-rust-engineer", status: "OFFER_EXTENDED", daysAgo: 21 },
    { jobSlug: "verdant-health-fullstack-intern", status: "APPLIED", daysAgo: 2 },
    { jobSlug: "atlas-mobility-mobile-engineer", status: "REJECTED", daysAgo: 30 },
    { jobSlug: "quanta-retail-data-engineer", status: "SHORTLISTED", daysAgo: 12 },
    { jobSlug: "lumen-labs-frontend-engineer", status: "INTERESTED", daysAgo: 1 },
    { jobSlug: "cobalt-security-frontend-intern", status: "WITHDRAWN", daysAgo: 40 },
];

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

export type ApplicationStep =
    | { kind: "insert"; jobSlug: string; jobId: string; status: string; daysAgo: number }
    | { kind: "update"; jobSlug: string; applicationId: string; from: string; status: string; daysAgo: number }
    | { kind: "same"; jobSlug: string; status: string }
    | { kind: "missing-job"; jobSlug: string };

/** What seeding `email` would do, row by row. Writes nothing. */
export async function planApplications(email: string): Promise<{ userId: string | null; steps: ApplicationStep[] }> {
    const user = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } });
    if (!user) return { userId: null, steps: [] };

    const jobRows = await db.select({ id: jobs.id, slug: jobs.slug }).from(jobs)
        .where(inArray(jobs.slug, APPLICATION_PLAN.map((a) => a.jobSlug)));
    const jobIdBySlug = new Map(jobRows.map((r) => [r.slug, r.id]));
    const existing = jobRows.length === 0 ? [] : await db
        .select({ id: jobApplications.id, jobId: jobApplications.jobId, status: jobApplications.status })
        .from(jobApplications)
        .where(and(eq(jobApplications.userId, user.id), inArray(jobApplications.jobId, jobRows.map((r) => r.id))));
    const byJob = new Map(existing.map((e) => [e.jobId, e]));

    const steps = APPLICATION_PLAN.map((p): ApplicationStep => {
        const jobId = jobIdBySlug.get(p.jobSlug);
        if (!jobId) return { kind: "missing-job", jobSlug: p.jobSlug };
        const row = byJob.get(jobId);
        if (!row) return { kind: "insert", jobSlug: p.jobSlug, jobId, status: p.status, daysAgo: p.daysAgo };
        if (row.status === p.status) return { kind: "same", jobSlug: p.jobSlug, status: p.status };
        return { kind: "update", jobSlug: p.jobSlug, applicationId: row.id, from: String(row.status), status: p.status, daysAgo: p.daysAgo };
    });
    return { userId: user.id, steps };
}

/** Writes the plan. Idempotent: a re-run finds every row "same". */
export async function applyApplications(userId: string, steps: ApplicationStep[]): Promise<number> {
    let n = 0;
    for (const s of steps) {
        if (s.kind === "insert") {
            const when = daysAgo(s.daysAgo);
            await db.insert(jobApplications).values({
                jobId: s.jobId, userId, status: s.status as never, appliedAt: when, createdAt: when,
                matchScore: Math.round(55 + Math.random() * 40),
            });
            n++;
        } else if (s.kind === "update") {
            await db.update(jobApplications)
                .set({ status: s.status as never, appliedAt: daysAgo(s.daysAgo) })
                .where(eq(jobApplications.id, s.applicationId));
            n++;
        }
    }
    return n;
}
