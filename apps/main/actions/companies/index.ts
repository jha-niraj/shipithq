"use server"

import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import {
    db,
    companies,
    companyFollowers,
    jobs,
    interviewProcesses,
} from "@repo/db"
import { eq, and, or, ilike, inArray, desc, asc, count, type SQL } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export interface CompanyFilters {
    search?: string
    industry?: string[]
    companySize?: string[]
    hasTransparentProcess?: boolean
}

export interface CompanyListResult {
    id: string
    name: string
    slug: string
    logoUrl: string | null
    website: string | null
    industry: string | null
    companySize: string | null
    description: string | null
    verificationStatus: string
    headquarters: string | null
    activeJobsCount: number
    hasTransparentProcess: boolean
}

// Browse all companies with filters
export async function browseCompanies(filters: CompanyFilters = {}, page = 1, limit = 20) {
    try {
        const skip = (page - 1) * limit

        const conditions: (SQL | undefined)[] = []

        if (filters.search) {
            conditions.push(
                or(
                    ilike(companies.name, `%${filters.search}%`),
                    ilike(companies.description, `%${filters.search}%`)
                )
            )
        }

        if (filters.industry && filters.industry.length > 0) {
            conditions.push(inArray(companies.industry, filters.industry))
        }

        if (filters.companySize && filters.companySize.length > 0) {
            conditions.push(inArray(companies.companySize, filters.companySize))
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined

        const [companyRows, totalRows] = await Promise.all([
            db.query.companies.findMany({
                where: whereClause,
                orderBy: [asc(companies.verificationStatus), asc(companies.name)],
                offset: skip,
                limit,
            }),
            db.select({ total: count() }).from(companies).where(whereClause),
        ])
        const total = totalRows[0]?.total ?? 0

        const companyIds = companyRows.map(c => c.id)

        // Load active job counts and interview processes separately
        const [activeJobRows, processRows] = await Promise.all([
            companyIds.length > 0
                ? db.query.jobs.findMany({
                    where: and(inArray(jobs.companyId, companyIds), eq(jobs.status, "ACTIVE")),
                    columns: { id: true, companyId: true },
                })
                : [],
            companyIds.length > 0
                ? db.query.interviewProcesses.findMany({
                    where: and(inArray(interviewProcesses.companyId, companyIds), eq(interviewProcesses.isActive, true)),
                    columns: { id: true, companyId: true },
                })
                : [],
        ])

        const jobCountByCompany = new Map<string, number>()
        for (const job of activeJobRows) {
            jobCountByCompany.set(job.companyId, (jobCountByCompany.get(job.companyId) || 0) + 1)
        }

        const processCountByCompany = new Map<string, number>()
        for (const proc of processRows) {
            // ShipItHQ's platform pipelines have no company (plan/hiring-rounds HR-1).
            if (!proc.companyId) continue
            processCountByCompany.set(proc.companyId, (processCountByCompany.get(proc.companyId) || 0) + 1)
        }

        const formattedCompanies: CompanyListResult[] = companyRows.map(company => ({
            id: company.id,
            name: company.name,
            slug: company.slug,
            logoUrl: company.logoUrl,
            website: company.website,
            industry: company.industry,
            companySize: company.companySize,
            description: company.description,
            verificationStatus: company.verificationStatus,
            headquarters: company.headquarters,
            activeJobsCount: jobCountByCompany.get(company.id) || 0,
            hasTransparentProcess: (processCountByCompany.get(company.id) || 0) > 0,
        }))

        return {
            success: true,
            data: {
                companies: formattedCompanies,
                pagination: {
                    page,
                    limit,
                    total: Number(total),
                    totalPages: Math.ceil(Number(total) / limit)
                }
            }
        }
    } catch (error) {
        console.error("Error browsing companies:", error)
        return { success: false, error: "Failed to fetch companies" }
    }
}

// Get a single company by slug
export async function getCompanyBySlug(slug: string) {
    try {
        const company = await db.query.companies.findFirst({
            where: eq(companies.slug, slug),
        })

        if (!company) {
            return { success: false, error: "Company not found" }
        }

        const socialLinks = (company.socialLinks as Record<string, string> | null) || {}

        return {
            success: true,
            data: {
                id: company.id,
                name: company.name,
                slug: company.slug,
                logoUrl: company.logoUrl,
                website: company.website,
                industry: company.industry,
                companySize: company.companySize,
                description: company.description,
                verificationStatus: company.verificationStatus,
                headquarters: company.headquarters,
                foundedYear: company.foundedYear,
                linkedIn: socialLinks.linkedin || null,
                twitter: socialLinks.twitter || null,
                techStack: [],
                benefits: []
            }
        }
    } catch (error) {
        console.error("Error fetching company:", error)
        return { success: false, error: "Failed to fetch company" }
    }
}

// Get company interview processes
export async function getCompanyInterviewProcesses(slug: string) {
    try {
        const company = await db.query.companies.findFirst({
            where: eq(companies.slug, slug),
            columns: { id: true },
        })

        if (!company) {
            return { success: false, error: "Company not found" }
        }

        const processes = await db.query.interviewProcesses.findMany({
            where: and(
                eq(interviewProcesses.companyId, company.id),
                eq(interviewProcesses.isActive, true)
            ),
            with: {
                rounds: {
                    orderBy: (r: any, { asc: a }: any) => [a(r.roundNumber)],
                },
            },
            orderBy: [desc(interviewProcesses.isDefault), asc(interviewProcesses.createdAt)],
        })

        return {
            success: true,
            data: processes.map(process => ({
                id: process.id,
                name: process.name,
                description: process.description,
                estimatedDurationWeeks: process.estimatedDurationWeeks,
                isDefault: process.isDefault,
                rounds: process.rounds.map(round => ({
                    id: round.id,
                    roundNumber: round.roundNumber,
                    title: round.title,
                    roundType: round.roundType,
                    description: round.description,
                    duration: round.durationMinutes,
                    format: round.format,
                    hasMockInterview: round.hasMockInterview,
                    tipsForCandidates: round.tipsForCandidates
                }))
            }))
        }
    } catch (error) {
        console.error("Error fetching company interview processes:", error)
        return { success: false, error: "Failed to fetch interview processes" }
    }
}

// Get featured companies
export async function getFeaturedCompanies(limit = 6) {
    try {
        const companyRows = await db.query.companies.findMany({
            where: eq(companies.verificationStatus, "VERIFIED"),
            orderBy: desc(companies.createdAt),
            limit,
        })

        const companyIds = companyRows.map(c => c.id)

        const [activeJobRows, processRows] = await Promise.all([
            companyIds.length > 0
                ? db.query.jobs.findMany({
                    where: and(inArray(jobs.companyId, companyIds), eq(jobs.status, "ACTIVE")),
                    columns: { id: true, companyId: true },
                })
                : [],
            companyIds.length > 0
                ? db.query.interviewProcesses.findMany({
                    where: and(inArray(interviewProcesses.companyId, companyIds), eq(interviewProcesses.isActive, true)),
                    columns: { id: true, companyId: true },
                })
                : [],
        ])

        const jobCountByCompany = new Map<string, number>()
        for (const job of activeJobRows) {
            jobCountByCompany.set(job.companyId, (jobCountByCompany.get(job.companyId) || 0) + 1)
        }

        const processCountByCompany = new Map<string, number>()
        for (const proc of processRows) {
            // ShipItHQ's platform pipelines have no company (plan/hiring-rounds HR-1).
            if (!proc.companyId) continue
            processCountByCompany.set(proc.companyId, (processCountByCompany.get(proc.companyId) || 0) + 1)
        }

        return {
            success: true,
            data: companyRows.map(company => ({
                id: company.id,
                name: company.name,
                slug: company.slug,
                logoUrl: company.logoUrl,
                website: company.website,
                industry: company.industry,
                companySize: company.companySize,
                description: company.description,
                verificationStatus: company.verificationStatus,
                headquarters: company.headquarters,
                activeJobsCount: jobCountByCompany.get(company.id) || 0,
                hasTransparentProcess: (processCountByCompany.get(company.id) || 0) > 0,
            }))
        }
    } catch (error) {
        console.error("Error fetching featured companies:", error)
        return { success: false, error: "Failed to fetch featured companies" }
    }
}

// Get company jobs
export async function getCompanyJobs(slug: string) {
    try {
        const company = await db.query.companies.findFirst({
            where: eq(companies.slug, slug),
            columns: { id: true },
        })

        if (!company) {
            return { success: false, error: "Company not found" }
        }

        const jobRows = await db.query.jobs.findMany({
            where: and(
                eq(jobs.companyId, company.id),
                eq(jobs.status, "ACTIVE"),
                eq(jobs.visibility, "PUBLIC")
            ),
            columns: {
                id: true,
                title: true,
                slug: true,
                location: true,
                locationType: true,
                employmentType: true,
                experienceMin: true,
                experienceMax: true,
                salaryMin: true,
                salaryMax: true,
                salaryCurrency: true,
                salaryDisclosed: true,
                skillsRequired: true,
                applicationsCount: true,
                publishedAt: true,
            },
            orderBy: [desc(jobs.featured), desc(jobs.publishedAt)],
        })

        return {
            success: true,
            data: jobRows.map(job => ({
                ...job,
                skillsRequired: job.skillsRequired as string[]
            }))
        }
    } catch (error) {
        console.error("Error fetching company jobs:", error)
        return { success: false, error: "Failed to fetch company jobs" }
    }
}

// Follow a company
export async function followCompany(companyId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: "Please sign in to follow companies" }
        }

        const existing = await db.query.companyFollowers.findFirst({
            where: and(
                eq(companyFollowers.userId, session.user.id),
                eq(companyFollowers.companyId, companyId)
            ),
        })

        if (existing) {
            return { success: true, data: existing }
        }

        const [follow] = await db.insert(companyFollowers).values({
            userId: session.user.id,
            companyId,
        }).returning()

        revalidatePath("/companies")
        return { success: true, data: follow }
    } catch (error) {
        console.error("Error following company:", error)
        return { success: false, error: "Failed to follow company" }
    }
}

// Unfollow a company
export async function unfollowCompany(companyId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        await db.delete(companyFollowers).where(
            and(
                eq(companyFollowers.userId, session.user.id),
                eq(companyFollowers.companyId, companyId)
            )
        )

        revalidatePath("/companies")
        return { success: true }
    } catch (error) {
        console.error("Error unfollowing company:", error)
        return { success: false, error: "Failed to unfollow company" }
    }
}

// Get followed companies for current user
export async function getFollowedCompanies() {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        const follows = await db.query.companyFollowers.findMany({
            where: eq(companyFollowers.userId, session.user.id),
            with: { company: true },
            orderBy: desc(companyFollowers.createdAt),
        })

        const followedCompanyIds = follows.map(f => f.company.id)

        const [activeJobRows, processRows] = await Promise.all([
            followedCompanyIds.length > 0
                ? db.query.jobs.findMany({
                    where: and(inArray(jobs.companyId, followedCompanyIds), eq(jobs.status, "ACTIVE")),
                    columns: { id: true, companyId: true },
                })
                : [],
            followedCompanyIds.length > 0
                ? db.query.interviewProcesses.findMany({
                    where: and(inArray(interviewProcesses.companyId, followedCompanyIds), eq(interviewProcesses.isActive, true)),
                    columns: { id: true, companyId: true },
                })
                : [],
        ])

        const jobCountByCompany = new Map<string, number>()
        for (const job of activeJobRows) {
            jobCountByCompany.set(job.companyId, (jobCountByCompany.get(job.companyId) || 0) + 1)
        }

        const processCountByCompany = new Map<string, number>()
        for (const proc of processRows) {
            // ShipItHQ's platform pipelines have no company (plan/hiring-rounds HR-1).
            if (!proc.companyId) continue
            processCountByCompany.set(proc.companyId, (processCountByCompany.get(proc.companyId) || 0) + 1)
        }

        return {
            success: true,
            data: follows.map(f => ({
                id: f.company.id,
                name: f.company.name,
                slug: f.company.slug,
                logoUrl: f.company.logoUrl,
                website: f.company.website,
                industry: f.company.industry,
                companySize: f.company.companySize,
                description: f.company.description,
                verificationStatus: f.company.verificationStatus,
                headquarters: f.company.headquarters,
                activeJobsCount: jobCountByCompany.get(f.company.id) || 0,
                hasTransparentProcess: (processCountByCompany.get(f.company.id) || 0) > 0,
                followedAt: f.createdAt,
            }))
        }
    } catch (error) {
        console.error("Error fetching followed companies:", error)
        return { success: false, error: "Failed to fetch followed companies" }
    }
}

// Check if user follows a company
export async function checkFollowStatus(companyId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: true, data: { isFollowing: false } }
        }

        const follow = await db.query.companyFollowers.findFirst({
            where: and(
                eq(companyFollowers.userId, session.user.id),
                eq(companyFollowers.companyId, companyId)
            ),
        })

        return { success: true, data: { isFollowing: !!follow } }
    } catch (error) {
        console.error("Error checking follow status:", error)
        return { success: false, error: "Failed to check follow status" }
    }
}

// Get followed company IDs for current user (for bulk checking)
export async function getFollowedCompanyIds() {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: true, data: [] }
        }

        const follows = await db.query.companyFollowers.findMany({
            where: eq(companyFollowers.userId, session.user.id),
            columns: { companyId: true },
        })

        return { success: true, data: follows.map(f => f.companyId) }
    } catch (error) {
        console.error("Error fetching followed company IDs:", error)
        return { success: false, error: "Failed to fetch followed company IDs" }
    }
}
