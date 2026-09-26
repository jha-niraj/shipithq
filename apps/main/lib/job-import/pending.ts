import "server-only"
import { and, count, desc, eq, inArray, or } from "drizzle-orm"
import { db, companies, companyRequests, importedJobs, interviewRounds } from "@repo/db"

/*
 * The ShipItHQ holding page for a company still under review (plan/job-import,
 * decision round 2): "Acme (under review by ShipItHQ)" and every job students
 * imported for it, each practisable. Once an admin publishes the company, the
 * page redirects to the real one.
 */

export interface PendingCompany {
    requestId: string
    name: string
    domain: string
    status: string
    rejected: boolean
    /** Published: the page to redirect to. */
    companySlug: string | null
    jobs: { id: string; title: string; level: string | null; location: string | null; rounds: number; private: boolean }[]
}

export async function loadPendingCompany(requestId: string, userId: string | null): Promise<PendingCompany | null> {
    const req = await db.query.companyRequests.findFirst({ where: eq(companyRequests.id, requestId) })
    if (!req) return null
    const company = req.companyId ? await db.query.companies.findFirst({ where: eq(companies.id, req.companyId), columns: { slug: true } }) : null
    const visible = userId
        ? or(eq(importedJobs.visibility, "PUBLIC"), eq(importedJobs.ownerId, userId))
        : eq(importedJobs.visibility, "PUBLIC")
    const rows = await db.select({ id: importedJobs.id, extracted: importedJobs.extracted, visibility: importedJobs.visibility, processId: importedJobs.processId })
        .from(importedJobs)
        .where(and(eq(importedJobs.companyRequestId, requestId), eq(importedJobs.status, "READY"), visible))
        .orderBy(desc(importedJobs.createdAt))
    const processIds = rows.map((r) => r.processId).filter((x): x is string => Boolean(x))
    const counts = processIds.length
        ? await db.select({ processId: interviewRounds.processId, n: count() }).from(interviewRounds).where(inArray(interviewRounds.processId, processIds)).groupBy(interviewRounds.processId)
        : []
    return {
        requestId: req.id,
        name: req.name,
        domain: req.domain,
        status: req.status,
        rejected: req.status === "REJECTED",
        companySlug: company?.slug ?? null,
        jobs: rows.map((r) => ({
            id: r.id,
            title: r.extracted?.title ?? "Imported job",
            level: r.extracted?.level ?? null,
            location: r.extracted?.location ?? null,
            rounds: Number(counts.find((c) => c.processId === r.processId)?.n ?? 0),
            private: r.visibility === "PRIVATE",
        })),
    }
}
