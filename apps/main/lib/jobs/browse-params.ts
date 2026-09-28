/*
 * Browse all jobs, as a URL (plan/jobs-polish JP-21): every filter, the sort and the page
 * live in the search params, so a filtered page can be shared and the back button works.
 * One parser for the server (the query) and the client (the filter row), so both read the
 * same values; anything unknown is dropped rather than trusted.
 */

export const BROWSE_PAGE_SIZE = 10

export const WORK_TYPES = ["REMOTE", "HYBRID", "ONSITE"] as const
export const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"] as const
/** Experience bands, matched by overlap with a job's min and max years. */
export const EXP_BANDS = { "0-1": [0, 1], "1-3": [1, 3], "3-5": [3, 5], "5+": [5, 99] } as const
/** Minimum yearly salary, in rupees; jobs that don't disclose drop out once set. */
export const PAY_FLOORS = { "5l": 500_000, "10l": 1_000_000, "20l": 2_000_000, "30l": 3_000_000 } as const
export const POSTED_DAYS = { "1": 1, "7": 7, "30": 30 } as const
export const SORTS = ["match", "newest", "salary"] as const

export type WorkType = (typeof WORK_TYPES)[number]
export type JobType = (typeof JOB_TYPES)[number]
export type ExpBand = keyof typeof EXP_BANDS
export type PayFloor = keyof typeof PAY_FLOORS
export type Posted = keyof typeof POSTED_DAYS
export type BrowseSort = (typeof SORTS)[number]

export interface BrowseParams {
    q: string
    where: WorkType[]
    type: JobType[]
    exp: ExpBand[]
    pay: PayFloor | null
    posted: Posted | null
    rounds: boolean
    skill: string[]
    company: string[]
    sort: BrowseSort
    page: number
}

export const LABEL = {
    where: { REMOTE: "Remote", HYBRID: "Hybrid", ONSITE: "On-site" } satisfies Record<WorkType, string>,
    type: { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", INTERNSHIP: "Internship", FREELANCE: "Freelance" } satisfies Record<JobType, string>,
    exp: { "0-1": "0 to 1 year", "1-3": "1 to 3 years", "3-5": "3 to 5 years", "5+": "5+ years" } satisfies Record<ExpBand, string>,
    pay: { "5l": "5 LPA+", "10l": "10 LPA+", "20l": "20 LPA+", "30l": "30 LPA+" } satisfies Record<PayFloor, string>,
    posted: { "1": "Last 24 hours", "7": "Last 7 days", "30": "Last 30 days" } satisfies Record<Posted, string>,
    sort: { match: "Best match", newest: "Newest", salary: "Highest salary" } satisfies Record<BrowseSort, string>,
}

type Raw = Record<string, string | string[] | undefined>

const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(",") : []).map((s) => s.trim()).filter(Boolean)
const pick = <T extends string>(v: string | string[] | undefined, allowed: readonly T[]) => [...new Set(list(v).filter((x): x is T => (allowed as readonly string[]).includes(x)))]
const one = <T extends string>(v: string | string[] | undefined, allowed: readonly T[]) => pick(v, allowed)[0] ?? null

/** Search params (server `searchParams`, or `Object.fromEntries` of the client's) to filters. */
export function parseBrowseParams(raw: Raw, signedIn: boolean): BrowseParams {
    const sort = one(raw.sort, SORTS) ?? (signedIn ? "match" : "newest")
    const page = Number.parseInt(String(raw.page ?? "1"), 10)
    return {
        q: String(Array.isArray(raw.q) ? raw.q[0] : raw.q ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
        where: pick(raw.where, WORK_TYPES),
        type: pick(raw.type, JOB_TYPES),
        exp: pick(raw.exp, Object.keys(EXP_BANDS) as ExpBand[]),
        pay: one(raw.pay, Object.keys(PAY_FLOORS) as PayFloor[]),
        posted: one(raw.posted, Object.keys(POSTED_DAYS) as Posted[]),
        rounds: raw.rounds === "1",
        skill: [...new Set(list(raw.skill).map((s) => s.toLowerCase().slice(0, 40)))].slice(0, 10),
        company: [...new Set(list(raw.company).map((s) => s.slice(0, 40)))].slice(0, 10),
        // "Best match" needs a profile; signed out it falls back to newest.
        sort: sort === "match" && !signedIn ? "newest" : sort,
        page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
    }
}

/** Filters back to a query string; defaults are left out so URLs stay short. */
export function browseQuery(p: Partial<BrowseParams>, signedIn: boolean): string {
    const u = new URLSearchParams()
    if (p.q) u.set("q", p.q)
    if (p.where?.length) u.set("where", p.where.join(","))
    if (p.type?.length) u.set("type", p.type.join(","))
    if (p.exp?.length) u.set("exp", p.exp.join(","))
    if (p.pay) u.set("pay", p.pay)
    if (p.posted) u.set("posted", p.posted)
    if (p.rounds) u.set("rounds", "1")
    if (p.skill?.length) u.set("skill", p.skill.join(","))
    if (p.company?.length) u.set("company", p.company.join(","))
    if (p.sort && p.sort !== (signedIn ? "match" : "newest")) u.set("sort", p.sort)
    if (p.page && p.page > 1) u.set("page", String(p.page))
    const s = u.toString()
    return s ? `?${s}` : ""
}

/** How many filters are set (the search and the sort aren't filters). */
export function activeFilterCount(p: BrowseParams): number {
    return p.where.length + p.type.length + p.exp.length + (p.pay ? 1 : 0) + (p.posted ? 1 : 0) + (p.rounds ? 1 : 0) + p.skill.length + p.company.length
}

/** The fields of a listed job the filters read (a `FeedJobResult` has them all). */
export interface FilterableJob {
    title: string
    company: { id: string; name: string }
    locationType: string
    employmentType: string
    experienceMin: number | null
    experienceMax: number | null
    salaryMin: number | null
    salaryMax: number | null
    salaryDisclosed: boolean
    publishedAt: Date | string | null
    interviewProcess: unknown
    skillsRequired: string[]
}

/**
 * The same rules as the server query, for the jobs already on screen (JP-26): a filter
 * applies the moment it's clicked, and the server's answer (the right count, the next
 * page) replaces it when it lands.
 */
export function jobMatches(j: FilterableJob, p: BrowseParams, now = Date.now()): boolean {
    if (p.q) {
        const q = p.q.toLowerCase()
        const hay = `${j.title} ${j.company.name} ${j.skillsRequired.join(" ")}`.toLowerCase()
        if (!hay.includes(q)) return false
    }
    if (p.where.length && !p.where.includes(j.locationType as WorkType)) return false
    if (p.type.length && !p.type.includes(j.employmentType as JobType)) return false
    if (p.exp.length && !p.exp.some((b) => { const [lo, hi] = EXP_BANDS[b]; return (j.experienceMin ?? 0) <= hi && (j.experienceMax ?? 99) >= lo })) return false
    if (p.pay && !(j.salaryDisclosed && (j.salaryMax ?? j.salaryMin ?? 0) >= PAY_FLOORS[p.pay])) return false
    if (p.posted) {
        const at = j.publishedAt ? new Date(j.publishedAt).getTime() : 0
        if (at < now - POSTED_DAYS[p.posted] * 86_400_000) return false
    }
    if (p.rounds && !j.interviewProcess) return false
    if (p.skill.length && !j.skillsRequired.some((s) => p.skill.includes(s.toLowerCase()))) return false
    if (p.company.length && !p.company.includes(j.company.id)) return false
    return true
}
