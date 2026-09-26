"use server"

import crypto from "crypto"
import { and, desc, eq, inArray, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import {
    db, backgroundJobs, companies, companyFollowers, companyProfileDrafts, companyRequests, companyRequestVotes,
    users, isTerminalJobStatus, notifyUsers, notificationRows,
    type CompanyDraftFields,
} from "@repo/db"
import { SOCIAL_DOMAINS, toCompanyDomain } from "@repo/exa"
import { checkModuleAccess } from "@/lib/module-access"
import { logAdminAudit } from "@/lib/audit-log"
import { dispatchJob } from "@/lib/workers"
import { sendCompanyRequestEmail } from "@/lib/emails/company-request"

/*
 * Unclaimed company pages, built from the company's own site (plan/hiring-rounds
 * HR-6). An admin starts a scrape from a URL; the `company_scrape` worker job
 * fills a `company_profile_draft`; the admin reviews it field by field and
 * publishes it as a SCRAPED, UNCLAIMED company with no logo. The draft keeps
 * each field's source page, which the public page cites (HR-23).
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

/** A SCRAPING draft older than this, or whose job has ended, is orphaned (HR-6 edge case). */
const ORPHAN_AFTER_MS = 15 * 60 * 1000
const MAIN_URL = process.env.NEXT_PUBLIC_MAIN_URL || "https://shipithq.com"

/** A student request still waiting on this domain (HR-7). */
const OPEN_REQUEST = ["PENDING", "SCRAPING", "DRAFTED"] as const

export type DraftStatus = "SCRAPING" | "READY" | "FAILED" | "PUBLISHED" | "DISCARDED"

export interface DraftRow {
    id: string
    domain: string
    status: DraftStatus
    fieldCount: number
    pageCount: number
    degraded: boolean
    error: string | null
    companyId: string | null
    companySlug: string | null
    /** The students' request behind it, if any (HR-7): the queue sorts by votes. */
    request: { id: string; name: string; votes: number } | null
    createdAt: Date
}

export interface DraftDetail extends DraftRow {
    fields: CompanyDraftFields
    sourcePages: { url: string; title: string | null }[]
    failedUrls: string[]
    robotsSkipped: string[]
    /** What the worker's checks threw away, and why (from the job's result). */
    dropped: { field: string; reason: string; cited?: string }[]
}

/** A domain that is never a company's own site: social networks, and hosts that are not public. */
function refusedDomain(domain: string): string | null {
    const d = domain.toLowerCase()
    if (SOCIAL_DOMAINS.some((s) => d === s || d.endsWith(`.${s}`))) {
        return `${d} is a social profile, not the company's own site. Use the company's website.`
    }
    if (!d.includes(".") || /^\d+(\.\d+){3}$/.test(d) || d === "localhost" || d.endsWith(".local") || d.endsWith(".internal")) {
        return `${d} is not a public website.`
    }
    return null
}

const bare = (domain: string) => domain.trim().toLowerCase().replace(/^www\./, "")

/** Mark orphaned SCRAPING drafts for a domain FAILED, so they stop blocking it. */
async function clearOrphans(domain: string) {
    const scraping = await db.select({ id: companyProfileDrafts.id, jobId: companyProfileDrafts.workerJobId, createdAt: companyProfileDrafts.createdAt })
        .from(companyProfileDrafts)
        .where(and(eq(companyProfileDrafts.domain, domain), eq(companyProfileDrafts.status, "SCRAPING")))
    if (!scraping.length) return
    const jobIds = scraping.map((d) => d.jobId).filter((x): x is string => Boolean(x))
    const jobs = jobIds.length
        ? await db.select({ jobId: backgroundJobs.jobId, status: backgroundJobs.status, error: backgroundJobs.error }).from(backgroundJobs).where(inArray(backgroundJobs.jobId, jobIds))
        : []
    for (const d of scraping) {
        const job = jobs.find((j) => j.jobId === d.jobId)
        const ended = job ? isTerminalJobStatus(job.status) : false
        const stale = Date.now() - d.createdAt.getTime() > ORPHAN_AFTER_MS
        if (!ended && !stale) continue
        await db.update(companyProfileDrafts)
            .set({ status: "FAILED", error: job?.error ?? (stale ? "The scrape stopped without finishing." : "The scrape ended without writing its draft.") })
            .where(and(eq(companyProfileDrafts.id, d.id), eq(companyProfileDrafts.status, "SCRAPING")))
    }
}

/**
 * Start reading a company's site. Returns the draft to watch, or the company
 * that already owns the domain.
 */
export async function startCompanyScrape(input: string): Promise<Result<{ draftId: string } | { existingCompany: { id: string; name: string; slug: string } }>> {
    const access = await checkModuleAccess("hiring", "write")
    if (!access.authorized) return { success: false, error: access.error }
    const userId = access.adminAccess.userId

    const parsed = toCompanyDomain(input)
    if (!parsed) return { success: false, error: "Enter the company's website, like acme.io or https://acme.io." }
    const domain = bare(parsed)
    const refused = refusedDomain(domain)
    if (refused) return { success: false, error: refused }

    try {
        const existing = await db.query.companies.findFirst({
            where: eq(companies.websiteDomain, domain),
            columns: { id: true, name: true, slug: true },
        })
        if (existing) return { success: true, data: { existingCompany: existing } }

        await clearOrphans(domain)
        const inFlight = await db.query.companyProfileDrafts.findFirst({
            where: and(eq(companyProfileDrafts.domain, domain), eq(companyProfileDrafts.status, "SCRAPING")),
            columns: { id: true },
        })
        if (inFlight) return { success: true, data: { draftId: inFlight.id } }

        // A retry of a student's request stays linked to it (HR-7).
        const openRequest = await db.query.companyRequests.findFirst({
            where: and(eq(companyRequests.domain, domain), inArray(companyRequests.status, [...OPEN_REQUEST])),
            columns: { id: true },
        })

        const jobId = crypto.randomUUID()
        const [draft] = await db.insert(companyProfileDrafts)
            .values({ domain, createdByUserId: userId, workerJobId: jobId, requestId: openRequest?.id ?? null })
            .onConflictDoNothing()
            .returning({ id: companyProfileDrafts.id })
        if (!draft) {
            // Another admin started the same domain a moment ago: watch theirs.
            const theirs = await db.query.companyProfileDrafts.findFirst({
                where: and(eq(companyProfileDrafts.domain, domain), eq(companyProfileDrafts.status, "SCRAPING")),
                columns: { id: true },
            })
            if (theirs) return { success: true, data: { draftId: theirs.id } }
            return { success: false, error: "Could not start the scrape. Try again." }
        }

        await db.insert(backgroundJobs).values({ jobId, type: "company_scrape", status: "waiting", progress: 0, input: { draftId: draft.id }, userId })
        if (openRequest) await db.update(companyRequests).set({ status: "SCRAPING" }).where(eq(companyRequests.id, openRequest.id))
        try {
            await dispatchJob("company_scrape", jobId, userId, { draftId: draft.id })
        } catch (error: unknown) {
            const reason = error instanceof Error ? error.message : "The job worker could not be reached"
            await db.batch([
                db.update(companyProfileDrafts).set({ status: "FAILED", error: reason.slice(0, 500) }).where(eq(companyProfileDrafts.id, draft.id)),
                db.update(backgroundJobs).set({ status: "failed", error: reason.slice(0, 500) }).where(eq(backgroundJobs.jobId, jobId)),
            ])
            return { success: false, error: reason }
        }

        await logAdminAudit({
            adminId: access.adminAccess.id,
            action: "CREATE",
            module: "hiring",
            resourceType: "CompanyProfileDraft",
            resourceId: draft.id,
            description: `Started a company scrape of ${domain}`,
        })
        revalidatePath("/hiring/companies/drafts")
        return { success: true, data: { draftId: draft.id } }
    } catch (error: unknown) {
        console.error("startCompanyScrape:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not start the scrape" }
    }
}

type RequestInfo = { id: string; name: string; votes: number }

/** Each linked request's name and vote count. */
async function requestsFor(requestIds: string[]): Promise<Map<string, RequestInfo>> {
    const ids = [...new Set(requestIds)]
    if (!ids.length) return new Map()
    const [rows, votes] = await Promise.all([
        db.select({ id: companyRequests.id, name: companyRequests.name }).from(companyRequests).where(inArray(companyRequests.id, ids)),
        db.select({ requestId: companyRequestVotes.requestId, n: sql<number>`count(*)::int` }).from(companyRequestVotes)
            .where(inArray(companyRequestVotes.requestId, ids)).groupBy(companyRequestVotes.requestId),
    ])
    return new Map(rows.map((r) => [r.id, { id: r.id, name: r.name, votes: votes.find((v) => v.requestId === r.id)?.n ?? 0 }]))
}

function toRow(d: typeof companyProfileDrafts.$inferSelect, slug: string | null, request: RequestInfo | null = null): DraftRow {
    return {
        id: d.id,
        domain: d.domain,
        status: d.status,
        fieldCount: Object.keys(d.fields ?? {}).length,
        pageCount: (d.sourcePages ?? []).length,
        degraded: d.degraded,
        error: d.error,
        companyId: d.companyId,
        companySlug: slug,
        request,
        createdAt: d.createdAt,
    }
}

export async function listCompanyDrafts(): Promise<Result<{ drafts: DraftRow[]; counts: Record<DraftStatus, number> }>> {
    const access = await checkModuleAccess("hiring", "read")
    if (!access.authorized) return { success: false, error: access.error }
    try {
        // Orphans are cleared lazily, here and on start, rather than by a cron:
        // `clearOrphans` fails any SCRAPING draft whose job has ended or which is
        // older than ORPHAN_AFTER_MS.
        const scraping = await db.selectDistinct({ domain: companyProfileDrafts.domain }).from(companyProfileDrafts)
            .where(eq(companyProfileDrafts.status, "SCRAPING"))
        for (const { domain } of scraping) await clearOrphans(domain)

        const rows = await db.select().from(companyProfileDrafts).orderBy(desc(companyProfileDrafts.createdAt)).limit(200)
        const companyIds = rows.map((r) => r.companyId).filter((x): x is string => Boolean(x))
        const slugs = companyIds.length
            ? await db.select({ id: companies.id, slug: companies.slug }).from(companies).where(inArray(companies.id, companyIds))
            : []
        const counts: Record<DraftStatus, number> = { SCRAPING: 0, READY: 0, FAILED: 0, PUBLISHED: 0, DISCARDED: 0 }
        for (const r of rows) counts[r.status]++
        const reqs = await requestsFor(rows.map((r) => r.requestId).filter((x): x is string => Boolean(x)))
        const drafts = rows.map((r) => toRow(r, slugs.find((s) => s.id === r.companyId)?.slug ?? null, r.requestId ? reqs.get(r.requestId) ?? null : null))
        // The queue: drafts waiting for review first, most-asked-for first (HR-7); then the rest, newest first.
        const waiting = drafts.filter((d) => d.status === "READY").sort((a, b) => (b.request?.votes ?? 0) - (a.request?.votes ?? 0))
        return { success: true, data: { drafts: [...waiting, ...drafts.filter((d) => d.status !== "READY")], counts } }
    } catch (error: unknown) {
        console.error("listCompanyDrafts:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the drafts" }
    }
}

export async function getCompanyDraft(id: string): Promise<Result<DraftDetail>> {
    const access = await checkModuleAccess("hiring", "read")
    if (!access.authorized) return { success: false, error: access.error }
    try {
        const d = await db.query.companyProfileDrafts.findFirst({ where: eq(companyProfileDrafts.id, id) })
        if (!d) return { success: false, error: "That draft does not exist." }
        const [job, company] = await Promise.all([
            d.workerJobId ? db.query.backgroundJobs.findFirst({ where: eq(backgroundJobs.jobId, d.workerJobId), columns: { result: true } }) : null,
            d.companyId ? db.query.companies.findFirst({ where: eq(companies.id, d.companyId), columns: { slug: true } }) : null,
        ])
        const result = (job?.result ?? {}) as { dropped?: DraftDetail["dropped"] }
        const request = d.requestId ? (await requestsFor([d.requestId])).get(d.requestId) ?? null : null
        return {
            success: true,
            data: {
                ...toRow(d, company?.slug ?? null, request),
                fields: d.fields ?? {},
                sourcePages: d.sourcePages ?? [],
                failedUrls: d.failedUrls ?? [],
                robotsSkipped: d.robotsSkipped ?? [],
                dropped: Array.isArray(result.dropped) ? result.dropped : [],
            },
        }
    } catch (error: unknown) {
        console.error("getCompanyDraft:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the draft" }
    }
}

/** Everyone who asked for or voted on a request, with their email. */
async function voters(requestId: string) {
    return db.select({ userId: users.id, email: users.email }).from(companyRequestVotes)
        .innerJoin(users, eq(users.id, companyRequestVotes.userId))
        .where(eq(companyRequestVotes.requestId, requestId))
}

/**
 * Discard a draft. When students asked for the company (HR-7), it is a
 * rejection: `reason` is required, stored on the request, and sent to everyone
 * who asked. They can ask again after 30 days.
 */
export async function discardCompanyDraft(id: string, reason?: string): Promise<Result<null>> {
    const access = await checkModuleAccess("hiring", "write")
    if (!access.authorized) return { success: false, error: access.error }
    try {
        const draft = await db.query.companyProfileDrafts.findFirst({ where: eq(companyProfileDrafts.id, id) })
        if (!draft || (draft.status !== "READY" && draft.status !== "FAILED")) return { success: false, error: "Only a ready or failed draft can be discarded." }
        const request = draft.requestId
            ? await db.query.companyRequests.findFirst({ where: eq(companyRequests.id, draft.requestId) })
            : null
        const openRequest = request && (OPEN_REQUEST as readonly string[]).includes(request.status) ? request : null
        const why = (reason ?? "").trim().replace(/\s+/g, " ").slice(0, 300)
        if (openRequest && why.length < 5) return { success: false, error: "Students asked for this company: say briefly why it isn't being added. They'll see it." }

        await db.update(companyProfileDrafts).set({ status: "DISCARDED" }).where(eq(companyProfileDrafts.id, id))
        if (openRequest) {
            await db.update(companyRequests).set({ status: "REJECTED", rejectReason: why, rejectedAt: new Date() }).where(eq(companyRequests.id, openRequest.id))
            const people = await voters(openRequest.id)
            if (people.length) {
                await notifyUsers(people.map((p) => p.userId), {
                    platform: "MAIN",
                    kind: "COMPANY_REQUEST_REJECTED",
                    title: `We didn't add ${openRequest.name}`,
                    body: why,
                    context: { label: openRequest.name, href: "/companies/request" },
                    href: "/companies/request",
                })
                await Promise.all(people.map((p) => sendCompanyRequestEmail(p.email, {
                    kind: "not_added", companyName: openRequest.name, reason: why, url: `${MAIN_URL}/companies/request`,
                })))
            }
        }
        await logAdminAudit({
            adminId: access.adminAccess.id, action: "UPDATE", module: "hiring", resourceType: "CompanyProfileDraft", resourceId: id,
            description: `Discarded the draft for ${draft.domain}${openRequest ? ` and rejected the students' request: ${why}` : ""}`,
        })
        revalidatePath("/hiring/companies/drafts")
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("discardCompanyDraft:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not discard the draft" }
    }
}

export interface PublishInput {
    name: string
    description: string
    industry?: string
    size?: string
    locations?: string[]
    techStack?: string[]
    culture?: string
    benefits?: string[]
    careersUrl?: string
}

const clean = (s: string | undefined, max: number) => (s ?? "").trim().replace(/\s+/g, " ").slice(0, max)
const cleanList = (xs: string[] | undefined, maxItems: number) =>
    [...new Set((xs ?? []).map((x) => clean(x, 120)).filter(Boolean))].slice(0, maxItems)

/** Static routes under /companies in apps/main: a company with one of these slugs would be unreachable. */
const RESERVED_SLUGS = new Set(["request"])

function slugify(name: string): string {
    const slug = name.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 60) || "company"
    return RESERVED_SLUGS.has(slug) ? `${slug}-company` : slug
}

/** Publish a reviewed draft as an unclaimed company. The values are the admin's edited, kept ones. */
export async function publishCompanyDraft(id: string, input: PublishInput): Promise<Result<{ companyId: string; slug: string }>> {
    const access = await checkModuleAccess("hiring", "write")
    if (!access.authorized) return { success: false, error: access.error }

    const name = clean(input.name, 120)
    const description = (input.description ?? "").trim().slice(0, 2000)
    if (!name) return { success: false, error: "A company needs a name." }
    if (!description) return { success: false, error: "A company needs a description." }

    try {
        const draft = await db.query.companyProfileDrafts.findFirst({ where: eq(companyProfileDrafts.id, id) })
        if (!draft) return { success: false, error: "That draft does not exist." }
        if (draft.status !== "READY") return { success: false, error: "Only a ready draft can be published." }

        // Checked again here: a self-serve sign-up can take the domain after the scrape.
        const owner = await db.query.companies.findFirst({ where: eq(companies.websiteDomain, draft.domain), columns: { id: true, name: true } })
        if (owner) return { success: false, error: `${owner.name} already owns ${draft.domain}. Discard this draft.` }

        const base = slugify(name)
        const taken = await db.select({ slug: companies.slug }).from(companies)
            .where(or(eq(companies.slug, base), sql`${companies.slug} like ${`${base}-%`}`))
        const used = new Set(taken.map((t) => t.slug))
        let slug = base
        for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`

        const careersUrl = clean(input.careersUrl, 300)
        const locations = cleanList(input.locations, 10)
        const [company] = await db.insert(companies).values({
            name,
            slug,
            website: `https://${draft.domain}`,
            websiteDomain: draft.domain,
            profileSource: "SCRAPED",
            claimStatus: "UNCLAIMED",
            scrapedAt: draft.updatedAt,
            description,
            industry: clean(input.industry, 80) || null,
            companySize: clean(input.size, 80) || null,
            headquarters: locations[0] ?? null,
            culture: (input.culture ?? "").trim().slice(0, 1200) || null,
            techStack: cleanList(input.techStack, 30),
            benefits: cleanList(input.benefits, 30),
            socialLinks: careersUrl ? { careers: careersUrl } : null,
            logoUrl: null,
            updatedAt: new Date(),
        }).onConflictDoNothing().returning({ id: companies.id, slug: companies.slug })
        if (!company) return { success: false, error: `${draft.domain} or the slug "${slug}" was just taken. Try again.` }

        // The draft keeps each field's source; publishing does not touch `fields`.
        await db.update(companyProfileDrafts)
            .set({ status: "PUBLISHED", companyId: company.id })
            .where(eq(companyProfileDrafts.id, id))

        // Students asked for it (HR-7): it's theirs now. Each follows it and is told.
        let told = 0
        if (draft.requestId) {
            const people = await voters(draft.requestId)
            await db.update(companyRequests).set({ status: "PUBLISHED", companyId: company.id }).where(eq(companyRequests.id, draft.requestId))
            if (people.length) {
                const url = `${MAIN_URL}/companies/${company.slug}`
                await db.batch([
                    db.insert(companyFollowers).values(people.map((p) => ({ userId: p.userId, companyId: company.id }))).onConflictDoNothing(),
                    notificationRows(people.map((p) => p.userId), {
                        platform: "MAIN",
                        kind: "COMPANY_PUBLISHED",
                        severity: "SUCCESS",
                        title: "is on ShipItHQ now",
                        body: "The company you asked for is live, and you're following it.",
                        actor: { name },
                        context: { label: name, href: `/companies/${company.slug}` },
                        href: `/companies/${company.slug}`,
                    }),
                ])
                await Promise.all(people.map((p) => sendCompanyRequestEmail(p.email, { kind: "live", companyName: name, url })))
                told = people.length
            }
        }

        await logAdminAudit({
            adminId: access.adminAccess.id,
            action: "CREATE",
            module: "hiring",
            resourceType: "Company",
            resourceId: company.id,
            description: `Published ${name} (${draft.domain}) as an unclaimed company${told ? `; ${told} requester(s) notified` : ""}`,
            metadata: { draftId: id, requestId: draft.requestId },
        })
        revalidatePath("/hiring/companies")
        revalidatePath("/hiring/companies/drafts")
        return { success: true, data: { companyId: company.id, slug: company.slug } }
    } catch (error: unknown) {
        console.error("publishCompanyDraft:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not publish the company" }
    }
}
