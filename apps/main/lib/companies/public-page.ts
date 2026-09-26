import "server-only"
import { and, asc, count, countDistinct, desc, eq, inArray, sql } from "drizzle-orm"
import { db, companies, companyFollowers, companyProfileDrafts, hiringRuns, hiringSends, interviewProcesses, interviewRounds, jobs, type CompanyDraftFields, jobListed } from "@repo/db"
import { roundFunnels } from "@repo/db/hiring-stats"
import { isBlocked } from "@repo/db/moderation"
import { companyTrust, type CompanyTrust } from "@/lib/company-trust"

/*
 * The public company page (plan/hiring-rounds HR-23, DoD 1 and 22): the header,
 * open roles with their pipelines, the profile with its sources on an unclaimed
 * page, and stats that stay hidden below a minimum count so a small number
 * never points to a person.
 */

/** Minimums from plan/hiring-rounds/overview.md, "Public company stats". */
export const MIN_PRACTISING = 10
export const MIN_SENDS = 5
export const MIN_ROUND_STUDENTS = 10

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [])

/** A number, or null when it's under its minimum ("Too few to show"). */
export type Gated<T> = { value: T } | null

export interface PageRound {
    id: string
    number: number
    type: string
    title: string
    minutes: number
    gateMode: "HARD" | "ADVISORY"
    passMark: number
    /** Share of students whose best score reached this round's pass mark, 0 to 100. */
    passRate: Gated<number>
}

export interface PageRole {
    id: string
    title: string
    slug: string
    locationType: string
    employmentType: string
    location: string | null
    rounds: PageRound[]
    minutes: number
    /** The signed-in student's standing on this role. */
    mine: "none" | "started" | "sent"
}

export interface PracticePipeline {
    id: string
    name: string
    rounds: { number: number; type: string; title: string; minutes: number }[]
    minutes: number
}

export interface CompanyPage {
    company: {
        id: string
        name: string
        slug: string
        logoUrl: string | null
        website: string | null
        domain: string | null
        industry: string | null
        size: string | null
        headquarters: string | null
        foundedYear: number | null
        description: string | null
        culture: string | null
        techStack: string[]
        benefits: string[]
        linkedIn: string | null
    }
    trust: Pick<CompanyTrust, "kind" | "label" | "canReceiveResults" | "showLogo"> & { explain: string }
    /** Unclaimed pages: the page on the company's own site each profile field came from. */
    sources: Partial<Record<"description" | "industry" | "size" | "locations" | "techStack" | "culture" | "benefits", string>>
    roles: PageRole[]
    /** ShipItHQ's generic pipelines, when the company has none of its own. */
    practice: PracticePipeline[]
    stats: { practising: Gated<number>; sends: Gated<number>; answersInDays: Gated<number> }
    following: boolean
    signedIn: boolean
    /** Suspended by an admin (HR-24): the page says so and nothing can be taken. */
    suspended: boolean
    /** The signed-in student has blocked this company. */
    blocked: boolean
    /** For the trust badge, which reads the raw statuses. */
    claimStatus: string
    verificationStatus: string
}

const minutesOf = (r: { timeLimitMinutes: number | null; durationMinutes: number | null }) => r.timeLimitMinutes ?? r.durationMinutes ?? 30

export async function loadCompanyPage(slug: string, userId: string | null): Promise<CompanyPage | null> {
    const c = await db.query.companies.findFirst({ where: eq(companies.slug, slug) })
    if (!c) return null
    const trust = companyTrust(c.claimStatus, c.verificationStatus)
    const social = (c.socialLinks as Record<string, string> | null) ?? {}

    const [roleRows, ownTemplates, draft, following] = await Promise.all([
        db.select({ id: jobs.id, title: jobs.title, slug: jobs.slug, locationType: jobs.locationType, employmentType: jobs.employmentType, location: jobs.location, processId: jobs.interviewProcessId })
            .from(jobs)
            .where(and(eq(jobs.companyId, c.id), jobListed, eq(jobs.visibility, "PUBLIC")))
            .orderBy(desc(jobs.featured), desc(jobs.publishedAt)),
        db.select({ n: count() }).from(interviewProcesses)
            .where(and(eq(interviewProcesses.companyId, c.id), eq(interviewProcesses.isActive, true), eq(interviewProcesses.isTemplate, true))),
        c.claimStatus === "CLAIMED" ? Promise.resolve(null) : db.query.companyProfileDrafts.findFirst({
            where: and(eq(companyProfileDrafts.companyId, c.id), eq(companyProfileDrafts.status, "PUBLISHED")),
            orderBy: (t, { desc: d }) => [d(t.updatedAt)],
            columns: { fields: true },
        }),
        userId ? db.query.companyFollowers.findFirst({ where: and(eq(companyFollowers.userId, userId), eq(companyFollowers.companyId, c.id)), columns: { id: true } }) : Promise.resolve(null),
    ])
    const blocked = userId ? await isBlocked(userId, c.id) : false

    // Open roles and their pipelines. A role without rounds can't be taken, so it isn't listed (DoD 24).
    const withRounds = roleRows.filter((r) => r.processId)
    const processIds = withRounds.map((r) => r.processId!)
    const roundRows = processIds.length
        ? await db.select().from(interviewRounds).where(inArray(interviewRounds.processId, processIds)).orderBy(asc(interviewRounds.roundNumber))
        : []

    // Pass rates: counted in SQL against each round's own pass mark; no student id leaves the query (HR-26).
    const funnels = await roundFunnels(roundRows.map((r) => r.id))
    const passRate = (roundId: string): Gated<number> => {
        const f = funnels.get(roundId)
        if (!f || f.scored < MIN_ROUND_STUDENTS) return null
        return { value: Math.round((f.passed / f.scored) * 100) }
    }

    // The student's own standing per role.
    const jobIds = withRounds.map((r) => r.id)
    const [myRuns, mySends] = userId && jobIds.length
        ? await Promise.all([
            db.select({ jobId: hiringRuns.jobId }).from(hiringRuns).where(and(eq(hiringRuns.userId, userId), inArray(hiringRuns.jobId, jobIds), inArray(hiringRuns.status, ["IN_PROGRESS", "COMPLETE"]))),
            db.select({ jobId: hiringSends.jobId }).from(hiringSends).where(and(eq(hiringSends.userId, userId), inArray(hiringSends.jobId, jobIds), inArray(hiringSends.status, ["SENT", "VIEWED", "INVITED"]))),
        ])
        : [[], []]

    const roles: PageRole[] = withRounds.map((j) => {
        const rounds = roundRows.filter((r) => r.processId === j.processId).map((r) => ({
            id: r.id, number: r.roundNumber, type: r.roundType, title: r.title, minutes: minutesOf(r),
            gateMode: r.gateMode, passMark: r.passMark, passRate: passRate(r.id),
        }))
        return {
            id: j.id, title: j.title, slug: j.slug, locationType: j.locationType, employmentType: j.employmentType, location: j.location,
            rounds, minutes: rounds.reduce((t, r) => t + r.minutes, 0),
            mine: mySends.some((s) => s.jobId === j.id) ? "sent" : myRuns.some((r) => r.jobId === j.id) ? "started" : "none",
        }
    })

    // No pipelines of its own, neither templates nor a role with rounds (every
    // unclaimed page): ShipItHQ's, for practice (HR-4, HR-9).
    let practice: PracticePipeline[] = []
    if (!c.suspendedAt && (ownTemplates[0]?.n ?? 0) === 0 && roles.length === 0) {
        const platform = await db.query.interviewProcesses.findMany({
            where: and(eq(interviewProcesses.ownerKind, "PLATFORM"), eq(interviewProcesses.isActive, true), eq(interviewProcesses.isTemplate, true)),
            with: { rounds: { orderBy: (r, { asc: a }) => [a(r.roundNumber)] } },
            orderBy: [asc(interviewProcesses.name)],
        })
        practice = platform.map((p) => {
            const rounds = p.rounds.map((r) => ({ number: r.roundNumber, type: r.roundType, title: r.title, minutes: minutesOf(r) }))
            return { id: p.id, name: p.name, rounds, minutes: rounds.reduce((t, r) => t + r.minutes, 0) }
        })
    }

    // Stats, each behind its minimum.
    const [[practising], [sends], [answers]] = await Promise.all([
        db.select({ n: countDistinct(hiringRuns.userId) }).from(hiringRuns).where(eq(hiringRuns.companyId, c.id)),
        db.select({ n: count() }).from(hiringSends).where(eq(hiringSends.companyId, c.id)),
        db.select({
            n: count(),
            median: sql<number | null>`percentile_cont(0.5) within group (order by extract(epoch from (${hiringSends.decidedAt} - ${hiringSends.createdAt})))`.mapWith((v) => (v === null ? null : Number(v))),
        }).from(hiringSends).where(and(eq(hiringSends.companyId, c.id), inArray(hiringSends.status, ["INVITED", "DECLINED"]), sql`${hiringSends.decidedAt} is not null`)),
    ])
    const stats: CompanyPage["stats"] = {
        practising: (practising?.n ?? 0) >= MIN_PRACTISING ? { value: practising!.n } : null,
        sends: (sends?.n ?? 0) >= MIN_SENDS ? { value: sends!.n } : null,
        answersInDays: (answers?.n ?? 0) >= MIN_SENDS && answers!.median !== null ? { value: Math.max(0, answers!.median / 86_400) } : null,
    }

    const fields = (draft?.fields ?? {}) as CompanyDraftFields
    const sources: CompanyPage["sources"] = {}
    if (draft) {
        if (fields.description) sources.description = fields.description.sourceUrl
        if (fields.industry) sources.industry = fields.industry.sourceUrl
        if (fields.size) sources.size = fields.size.sourceUrl
        if (fields.locations) sources.locations = fields.locations.sourceUrl
        if (fields.techStack) sources.techStack = fields.techStack.sourceUrl
        if (fields.culture) sources.culture = fields.culture.sourceUrl
        if (fields.benefits) sources.benefits = fields.benefits.sourceUrl
    }

    return {
        company: {
            id: c.id, name: c.name, slug: c.slug,
            // Never a logo on a page the company hasn't claimed.
            logoUrl: trust.showLogo ? c.logoUrl : null,
            website: c.website, domain: c.websiteDomain,
            industry: c.industry, size: c.companySize, headquarters: c.headquarters, foundedYear: c.foundedYear,
            description: c.description, culture: c.culture,
            techStack: asStrings(c.techStack), benefits: asStrings(c.benefits),
            linkedIn: social.linkedin ?? null,
        },
        trust: { kind: trust.kind, label: trust.label, canReceiveResults: trust.canReceiveResults, showLogo: trust.showLogo, explain: trust.explain(c.name) },
        sources,
        roles,
        practice,
        stats,
        following: Boolean(following),
        signedIn: Boolean(userId),
        suspended: Boolean(c.suspendedAt),
        blocked,
        claimStatus: c.claimStatus,
        verificationStatus: c.verificationStatus,
    }
}
