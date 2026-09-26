"use server"

import { and, count, desc, eq, gte, inArray } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import {
    db, companies, companyLookups, companyProfileDrafts, companyRequests, companyRequestVotes,
} from "@repo/db"
import { SOCIAL_DOMAINS, domainOf, exaSearch, toCompanyDomain } from "@repo/exa"
import { startBackgroundJob } from "@/actions/(main)/workers/jobs.action"

/*
 * Students ask ShipItHQ to add a company (plan/hiring-rounds HR-7).
 *
 * A name is looked up with Exa ("find the official site"); a pasted website is
 * not. The student confirms the domain, and then:
 * - a company that already has it is linked
 * - a request that already exists gets their vote
 * - otherwise a request is made and its site is read into a draft by
 *   `company_scrape`, for an admin to review (HR-6)
 *
 * The limits are decisions in plan/hiring-rounds/overview.md ("Student company
 * requests, details"): 3 new requests and 10 name lookups a day per student,
 * and a rejected domain can be asked for again after 30 days.
 */

const NEW_REQUESTS_PER_DAY = 3
const LOOKUPS_PER_DAY = 10
const REJECTED_COOLDOWN_DAYS = 30
const DAY_MS = 86_400_000

type Result<T> = { success: true; data: T } | { success: false; error: string; code?: string }

export interface CompanyCandidate {
    name: string
    domain: string
    /** Already on ShipItHQ: link to it instead of requesting. */
    existing: { slug: string; name: string } | null
    /** Already requested: asking again adds a vote. */
    request: { votes: number; status: string; youVoted: boolean } | null
}

export interface MyCompanyRequest {
    id: string
    name: string
    domain: string
    /** Plain-language state for the student. */
    stage: "reading" | "in_review" | "live" | "not_added"
    votes: number
    companySlug: string | null
    rejectReason: string | null
    createdAt: Date
}

async function currentUserId(): Promise<string | null> {
    const session = await getSession(await headers())
    return session?.user?.id ?? null
}

const bare = (d: string) => d.trim().toLowerCase().replace(/^www\./, "")

function refused(domain: string): string | null {
    if (SOCIAL_DOMAINS.some((s) => domain === s || domain.endsWith(`.${s}`))) {
        return "That's a social profile. Use the company's own website instead."
    }
    if (!domain.includes(".") || /^\d+(\.\d+){3}$/.test(domain) || domain === "localhost" || domain.endsWith(".local")) {
        return "That isn't a public website."
    }
    return null
}

/**
 * Where a domain actually lands, so an acquired company's old domain dedupes
 * against its new one. A site that does not answer keeps the domain as typed.
 */
async function resolveDomain(domain: string): Promise<string> {
    try {
        const res = await fetch(`https://${domain}`, { redirect: "follow", signal: AbortSignal.timeout(6000), headers: { Accept: "text/html" } })
        await res.body?.cancel().catch(() => {})
        const landed = domainOf(res.url || "")
        return landed ? bare(landed) : domain
    } catch {
        return domain
    }
}

/** Title-case a domain's first label, as a fallback name ("acme.io" -> "Acme"). */
const nameFromDomain = (d: string) => d.split(".")[0]!.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

/** Mark each candidate that is already on ShipItHQ or already requested. */
async function annotate(userId: string, list: { name: string; domain: string }[]): Promise<CompanyCandidate[]> {
    if (!list.length) return []
    const domains = list.map((c) => c.domain)
    const [owned, requests] = await Promise.all([
        db.select({ domain: companies.websiteDomain, slug: companies.slug, name: companies.name }).from(companies).where(inArray(companies.websiteDomain, domains)),
        db.select({ id: companyRequests.id, domain: companyRequests.domain, status: companyRequests.status }).from(companyRequests).where(inArray(companyRequests.domain, domains)),
    ])
    const ids = requests.map((r) => r.id)
    const [votes, mine] = ids.length
        ? await Promise.all([
            db.select({ requestId: companyRequestVotes.requestId, n: count() }).from(companyRequestVotes).where(inArray(companyRequestVotes.requestId, ids)).groupBy(companyRequestVotes.requestId),
            db.select({ requestId: companyRequestVotes.requestId }).from(companyRequestVotes).where(and(inArray(companyRequestVotes.requestId, ids), eq(companyRequestVotes.userId, userId))),
        ])
        : [[], []]
    return list.map((c) => {
        const o = owned.find((x) => x.domain === c.domain)
        const r = requests.find((x) => x.domain === c.domain)
        return {
            name: c.name,
            domain: c.domain,
            existing: o ? { slug: o.slug, name: o.name } : null,
            request: r ? {
                votes: Number(votes.find((v) => v.requestId === r.id)?.n ?? 0),
                status: r.status,
                youVoted: mine.some((m) => m.requestId === r.id),
            } : null,
        }
    })
}

/**
 * Turn what the student typed into candidate companies. A website is used as
 * is; a name costs one Exa search (10 a day). Returns up to 4 distinct domains,
 * best first.
 */
export async function lookupCompany(query: string): Promise<Result<{ candidates: CompanyCandidate[]; lookupsLeft: number | null }>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to request a company.", code: "UNAUTHORIZED" }
    const q = query.trim().slice(0, 120)
    if (q.length < 2) return { success: false, error: "Type a company name or paste its website." }

    try {
        const asDomain = toCompanyDomain(q)
        if (asDomain) {
            const domain = bare(asDomain)
            const why = refused(domain)
            if (why) return { success: false, error: why }
            return { success: true, data: { candidates: await annotate(userId, [{ name: nameFromDomain(domain), domain }]), lookupsLeft: null } }
        }

        const [{ used } = { used: 0 }] = await db.select({ used: count() }).from(companyLookups)
            .where(and(eq(companyLookups.userId, userId), gte(companyLookups.createdAt, new Date(Date.now() - DAY_MS))))
        if (Number(used) >= LOOKUPS_PER_DAY) {
            return { success: false, error: `You've used today's ${LOOKUPS_PER_DAY} name searches. Paste the company's website instead; that always works.`, code: "LOOKUP_LIMIT" }
        }
        await db.insert(companyLookups).values({ userId, query: q })

        const results = await exaSearch(process.env.EXA_API_KEY ?? "", `${q} company official website`, 8, {
            category: "company",
            excludeDomains: SOCIAL_DOMAINS,
            maxChars: 200,
        })
        const seen = new Set<string>()
        const list: { name: string; domain: string }[] = []
        for (const r of results) {
            const d = domainOf(r.url)
            if (!d) continue
            const domain = bare(d)
            if (seen.has(domain) || refused(domain)) continue
            seen.add(domain)
            // A result's title is a page title ("Acme | Payroll for startups"); its first part is the name.
            const name = (r.title || "").split(/\s[|:·-]\s/)[0]!.trim().slice(0, 80) || nameFromDomain(domain)
            list.push({ name, domain })
            if (list.length === 4) break
        }
        return { success: true, data: { candidates: await annotate(userId, list), lookupsLeft: LOOKUPS_PER_DAY - Number(used) - 1 } }
    } catch (error: unknown) {
        console.error("lookupCompany:", error instanceof Error ? error.message : error)
        return { success: false, error: "The company search isn't working right now. Paste the company's website instead." }
    }
}

export type RequestOutcome =
    | { kind: "existing"; slug: string; name: string }
    | { kind: "voted"; votes: number; alreadyVoted: boolean }
    | { kind: "requested" }

/** Ask for a confirmed domain. Dedupes against companies and requests after following redirects. */
export async function requestCompany(input: { domain: string; name: string }): Promise<Result<RequestOutcome>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to request a company.", code: "UNAUTHORIZED" }

    const typed = toCompanyDomain(input.domain)
    if (!typed) return { success: false, error: "That doesn't look like a website." }
    let domain = bare(typed)
    const why = refused(domain)
    if (why) return { success: false, error: why }
    const name = input.name.trim().replace(/\s+/g, " ").slice(0, 80) || nameFromDomain(domain)

    try {
        const landed = await resolveDomain(domain)
        if (!refused(landed)) domain = landed

        const owner = await db.query.companies.findFirst({ where: eq(companies.websiteDomain, domain), columns: { slug: true, name: true } })
        if (owner) return { success: true, data: { kind: "existing", slug: owner.slug, name: owner.name } }

        const existing = await db.query.companyRequests.findFirst({ where: eq(companyRequests.domain, domain) })
        if (existing && existing.status !== "REJECTED") return vote(existing.id, userId)
        if (existing?.status === "REJECTED" && existing.rejectedAt && Date.now() - existing.rejectedAt.getTime() < REJECTED_COOLDOWN_DAYS * DAY_MS) {
            const until = new Date(existing.rejectedAt.getTime() + REJECTED_COOLDOWN_DAYS * DAY_MS)
            return {
                success: false,
                error: `We looked at ${domain} recently and didn't add it${existing.rejectReason ? `: ${existing.rejectReason}` : ""}. It can be requested again from ${until.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`,
                code: "REJECTED_RECENTLY",
            }
        }

        // A new request (or a rejected one reopened after the cool-down) counts toward the cap.
        const [{ made } = { made: 0 }] = await db.select({ made: count() }).from(companyRequests)
            .where(and(eq(companyRequests.createdByUserId, userId), gte(companyRequests.createdAt, new Date(Date.now() - DAY_MS))))
        if (Number(made) >= NEW_REQUESTS_PER_DAY) {
            return { success: false, error: `You can ask for ${NEW_REQUESTS_PER_DAY} new companies a day. Voting for ones already requested doesn't count.`, code: "REQUEST_LIMIT" }
        }

        let requestId: string
        if (existing) {
            // Reopened: the old askers were told it was not added; the new ask starts fresh.
            await db.batch([
                db.delete(companyRequestVotes).where(eq(companyRequestVotes.requestId, existing.id)),
                db.update(companyRequests).set({
                    name, status: "PENDING", rejectReason: null, rejectedAt: null, createdByUserId: userId, createdAt: new Date(),
                }).where(eq(companyRequests.id, existing.id)),
            ])
            requestId = existing.id
        } else {
            const [row] = await db.insert(companyRequests).values({ domain, name, createdByUserId: userId }).onConflictDoNothing().returning({ id: companyRequests.id })
            if (!row) {
                // Someone asked for it a moment ago: vote on theirs.
                const theirs = await db.query.companyRequests.findFirst({ where: eq(companyRequests.domain, domain), columns: { id: true } })
                return theirs ? vote(theirs.id, userId) : { success: false, error: "Could not make the request. Try again." }
            }
            requestId = row.id
        }
        await db.insert(companyRequestVotes).values({ requestId, userId }).onConflictDoNothing()

        await scrapeFor(requestId, domain, userId)
        return { success: true, data: { kind: "requested" } }
    } catch (error: unknown) {
        console.error("requestCompany:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not make the request" }
    }
}

async function vote(requestId: string, userId: string): Promise<Result<RequestOutcome>> {
    const [added] = await db.insert(companyRequestVotes).values({ requestId, userId }).onConflictDoNothing().returning({ id: companyRequestVotes.id })
    const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(companyRequestVotes).where(eq(companyRequestVotes.requestId, requestId))
    return { success: true, data: { kind: "voted", votes: Number(n), alreadyVoted: !added } }
}

/**
 * Read the requested site into a draft (HR-5). Free to the student: the cost is
 * ShipItHQ's. If a scrape of the domain is already running (an admin started
 * one), the request is attached to that draft instead.
 */
async function scrapeFor(requestId: string, domain: string, userId: string) {
    const [draft] = await db.insert(companyProfileDrafts).values({ domain, requestId, createdByUserId: userId })
        .onConflictDoNothing().returning({ id: companyProfileDrafts.id })
    if (!draft) {
        await db.update(companyProfileDrafts).set({ requestId })
            .where(and(eq(companyProfileDrafts.domain, domain), eq(companyProfileDrafts.status, "SCRAPING")))
        await db.update(companyRequests).set({ status: "SCRAPING" }).where(eq(companyRequests.id, requestId))
        return
    }
    const job = await startBackgroundJob("company_scrape", { draftId: draft.id })
    if (!job.success || !job.jobId) {
        // The request stands; the admin queue shows the failed draft and can retry it.
        await db.update(companyProfileDrafts).set({ status: "FAILED", error: (job.error ?? "The scrape could not be started").slice(0, 500) })
            .where(eq(companyProfileDrafts.id, draft.id))
        return
    }
    await db.batch([
        db.update(companyProfileDrafts).set({ workerJobId: job.jobId }).where(eq(companyProfileDrafts.id, draft.id)),
        db.update(companyRequests).set({ status: "SCRAPING" }).where(eq(companyRequests.id, requestId)),
    ])
}

/** The requests this student asked for or voted on, newest first. */
export async function getMyCompanyRequests(): Promise<Result<MyCompanyRequest[]>> {
    const userId = await currentUserId()
    if (!userId) return { success: true, data: [] }
    try {
        const mine = await db.select({ requestId: companyRequestVotes.requestId }).from(companyRequestVotes).where(eq(companyRequestVotes.userId, userId))
        if (!mine.length) return { success: true, data: [] }
        const ids = mine.map((m) => m.requestId)
        const [rows, votes] = await Promise.all([
            db.query.companyRequests.findMany({
                where: inArray(companyRequests.id, ids),
                orderBy: [desc(companyRequests.createdAt)],
                with: { company: { columns: { slug: true } } },
            }),
            db.select({ requestId: companyRequestVotes.requestId, n: count() }).from(companyRequestVotes).where(inArray(companyRequestVotes.requestId, ids)).groupBy(companyRequestVotes.requestId),
        ])
        return {
            success: true,
            data: rows.map((r) => ({
                id: r.id,
                name: r.name,
                domain: r.domain,
                stage: r.status === "PUBLISHED" ? "live" : r.status === "REJECTED" ? "not_added" : r.status === "DRAFTED" ? "in_review" : "reading",
                votes: Number(votes.find((v) => v.requestId === r.id)?.n ?? 0),
                companySlug: r.company?.slug ?? null,
                rejectReason: r.rejectReason,
                createdAt: r.createdAt,
            })),
        }
    } catch (error: unknown) {
        console.error("getMyCompanyRequests:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load your requests" }
    }
}
