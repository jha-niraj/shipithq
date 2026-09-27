import "server-only"
import { and, asc, desc, eq, isNull } from "drizzle-orm"
import { companies, companyMembers, db, jobs } from "@repo/db"
import type { CompanySocialLinks, MediaItem } from "@/types"

/*
 * The company page, /c/<slug> (plan/hiring-ui HU-11): the header, and the About,
 * Jobs, People and Life tabs. Any signed-in hiring member can open any company's
 * page. People shows the whole team to its own members and, to everyone else, the
 * members who left "show on People" on (HU-14, on by default). Only the company's
 * editors (edit_company) get the edit controls.
 */

export const COMPANY_TABS = ["about", "jobs", "people", "life"] as const
export type CompanyTab = (typeof COMPANY_TABS)[number]

const TITLE_LABEL: Record<string, string> = {
    CEO: "CEO", CTO: "CTO", COFOUNDER: "Co-founder", VP_ENGINEERING: "VP Engineering", ENGINEERING_MANAGER: "Engineering manager",
    HR_HEAD: "HR head", HR_MANAGER: "HR manager", TALENT_ACQUISITION: "Talent acquisition", RECRUITER: "Recruiter",
    HIRING_MANAGER: "Hiring manager", TECH_LEAD: "Tech lead", INTERVIEWER: "Interviewer", OTHER: "Team member",
}

export interface CompanyPageData {
    id: string
    slug: string
    name: string
    tagline: string | null
    description: string | null
    logoUrl: string | null
    coverUrl: string | null
    website: string | null
    industry: string | null
    companySize: string | null
    foundedYear: number | null
    headquarters: string | null
    culture: string | null
    techStack: string[]
    benefits: string[]
    socialLinks: CompanySocialLinks
    verified: boolean
    life: { id: string; url: string; caption: string | null }[]
    jobs: { id: string; slug: string; title: string; department: string | null; location: string | null; locationType: string; employmentType: string; createdAt: string }[]
    people: { id: string; name: string; title: string; image: string | null; linkedinUrl: string | null; portfolioUrl: string | null; hidden: boolean }[]
    memberCount: number
    /** The viewer is a member of this company and holds edit_company. */
    canEdit: boolean
    /** The viewer is a member of this company. */
    isOwn: boolean
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [])

export async function loadCompanyPage(slug: string, viewer: { companyId: string; canEdit: boolean }): Promise<CompanyPageData | null> {
    const company = await db.query.companies.findFirst({ where: eq(companies.slug, slug) })
    if (!company) return null
    const isOwn = company.id === viewer.companyId

    const [jobRows, memberRows] = await Promise.all([
        db.query.jobs.findMany({
            where: and(eq(jobs.companyId, company.id), eq(jobs.status, "ACTIVE"), isNull(jobs.adminHiddenAt)),
            columns: { id: true, slug: true, title: true, department: true, location: true, locationType: true, employmentType: true, createdAt: true },
            orderBy: [desc(jobs.createdAt)],
            limit: 50,
        }),
        db.query.companyMembers.findMany({
            where: and(eq(companyMembers.companyId, company.id), eq(companyMembers.isActive, true), eq(companyMembers.inviteStatus, "ACCEPTED")),
            columns: { id: true, displayName: true, jobTitle: true, jobTitleCustom: true, linkedinUrl: true, portfolioUrl: true, showOnPeople: true },
            with: { user: { columns: { name: true, image: true } } },
            orderBy: [asc(companyMembers.createdAt)],
            limit: 100,
        }),
    ])

    const gallery = (company.mediaGallery as MediaItem[] | null) ?? []
    return {
        id: company.id,
        slug: company.slug,
        name: company.name,
        tagline: company.tagline,
        description: company.description,
        logoUrl: company.logoUrl,
        coverUrl: company.coverUrl,
        website: company.website,
        industry: company.industry,
        companySize: company.companySize,
        foundedYear: company.foundedYear,
        headquarters: company.headquarters,
        culture: company.culture,
        techStack: strings(company.techStack),
        benefits: strings(company.benefits),
        socialLinks: (company.socialLinks as CompanySocialLinks | null) ?? {},
        verified: company.verificationStatus === "VERIFIED",
        life: gallery
            .filter((m) => m.type === "image" && typeof m.url === "string")
            .map((m, i) => ({ id: m.id ?? `m${i}`, url: m.url, caption: m.caption ?? m.title ?? null })),
        jobs: jobRows.map((j) => ({ ...j, createdAt: j.createdAt.toISOString() })),
        people: memberRows
            .filter((m) => isOwn || m.showOnPeople)
            .map((m) => ({
                id: m.id,
                name: m.displayName || m.user?.name || "Team member",
                title: m.jobTitle === "OTHER" && m.jobTitleCustom ? m.jobTitleCustom : TITLE_LABEL[m.jobTitle] ?? "Team member",
                image: m.user?.image ?? null,
                linkedinUrl: m.linkedinUrl,
                portfolioUrl: m.portfolioUrl,
                hidden: !m.showOnPeople,
            })),
        memberCount: memberRows.length,
        canEdit: isOwn && viewer.canEdit,
        isOwn,
    }
}
