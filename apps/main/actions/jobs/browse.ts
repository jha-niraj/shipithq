"use server"

import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import {
    db,
    jobs,
    jobApplications,
    savedJobs,
    jobRecommendations,
    interviewProcesses,
    jobListed,
    jobVisible,
} from "@repo/db"
import { eq, and, or, ilike, inArray, desc, count, sql, type SQL } from "drizzle-orm"

export interface JobFilters {
    search?: string
    locationType?: string[]
    employmentType?: string[]
    experienceLevel?: string
    companyId?: string
    skills?: string[]
    salaryMin?: number
    salaryMax?: number
}

export interface JobListResult {
    id: string
    title: string
    slug: string
    company: {
        id: string
        name: string
        logoUrl: string | null
        industry: string | null
    }
    location: string | null
    locationType: string
    employmentType: string
    experienceMin: number | null
    experienceMax: number | null
    salaryMin: number | null
    salaryMax: number | null
    salaryCurrency: string
    salaryDisclosed: boolean
    skillsRequired: string[]
    hasAssignment: boolean
    applicationsCount: number
    publishedAt: Date | null
    interviewProcess: {
        id: string
        name: string
        rounds: Array<{
            id: string
            roundNumber: number
            title: string
            roundType: string
            hasMockInterview: boolean
        }>
    } | null
}

// Browse all active jobs with filters
export async function browseJobs(filters: JobFilters = {}, page = 1, limit = 20) {
    try {
        const skip = (page - 1) * limit

        const conditions: (SQL | undefined)[] = [
            jobListed,
            eq(jobs.visibility, "PUBLIC"),
        ]

        if (filters.search) {
            conditions.push(
                or(
                    ilike(jobs.title, `%${filters.search}%`),
                    ilike(jobs.description, `%${filters.search}%`)
                )
            )
        }

        if (filters.locationType && filters.locationType.length > 0) {
            conditions.push(inArray(jobs.locationType, filters.locationType as any[]))
        }

        if (filters.employmentType && filters.employmentType.length > 0) {
            conditions.push(inArray(jobs.employmentType, filters.employmentType as any[]))
        }

        if (filters.companyId) {
            conditions.push(eq(jobs.companyId, filters.companyId))
        }

        const whereClause = and(...conditions)

        const [jobRows, totalRows] = await Promise.all([
            db.query.jobs.findMany({
                where: whereClause,
                with: {
                    company: {
                        columns: { id: true, name: true, logoUrl: true, industry: true },
                    },
                },
                orderBy: [desc(jobs.featured), desc(jobs.publishedAt)],
                offset: skip,
                limit,
            }),
            db.select({ total: count() }).from(jobs).where(whereClause),
        ])

        // Load interviewProcesses separately for these jobs
        const processIds = jobRows
            .map(j => (j as any).interviewProcessId)
            .filter(Boolean) as string[]

        const processRows = processIds.length > 0
            ? await db.query.interviewProcesses.findMany({
                where: inArray(interviewProcesses.id, processIds),
                with: {
                    rounds: {
                        columns: {
                            id: true,
                            roundNumber: true,
                            title: true,
                            roundType: true,
                            hasMockInterview: true,
                        },
                        orderBy: (r: any, { asc: a }: any) => [a(r.roundNumber)],
                    },
                },
            })
            : []

        const processMap = new Map(processRows.map(p => [p.id, p]))

        const formattedJobs: JobListResult[] = jobRows.map(job => ({
            id: job.id,
            title: job.title,
            slug: job.slug,
            company: job.company,
            location: job.location,
            locationType: job.locationType,
            employmentType: job.employmentType,
            experienceMin: job.experienceMin,
            experienceMax: job.experienceMax,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            salaryDisclosed: job.salaryDisclosed,
            skillsRequired: (job.skillsRequired as string[]) || [],
            hasAssignment: job.hasAssignment,
            applicationsCount: job.applicationsCount,
            publishedAt: job.publishedAt,
            interviewProcess: processMap.get((job as any).interviewProcessId ?? '') ?? null,
        }))
        const total = totalRows[0]?.total ?? 0

        return {
            success: true,
            data: {
                jobs: formattedJobs,
                pagination: {
                    page,
                    limit,
                    total: Number(total),
                    totalPages: Math.ceil(Number(total) / limit)
                }
            }
        }
    } catch (error) {
        console.error("Error browsing jobs:", error)
        return { success: false, error: "Failed to fetch jobs" }
    }
}

// Get a single job by slug
export async function getJobBySlug(slug: string) {
    try {
        const session = await getSession(headers())
        const userId = session?.user?.id

        const job = await db.query.jobs.findFirst({
            // A job hidden by an admin, or a suspended company's, isn't found (HR-24).
            where: and(eq(jobs.slug, slug), jobVisible),
            with: {
                company: {
                    columns: {
                        id: true,
                        name: true,
                        slug: true,
                        logoUrl: true,
                        industry: true,
                        description: true,
                        website: true,
                        companySize: true,
                        headquarters: true,
                        verificationStatus: true,
                    },
                },
            },
        })

        if (!job || job.status !== "ACTIVE") {
            return { success: false, error: "Job not found" }
        }

        // Load interview process
        const interviewProcess = (job as any).interviewProcessId
            ? await db.query.interviewProcesses.findFirst({
                where: eq(interviewProcesses.id, (job as any).interviewProcessId),
                with: {
                    rounds: {
                        orderBy: (r: any, { asc: a }: any) => [a(r.roundNumber)],
                    },
                },
            })
            : null

        // Check if user has already applied / saved
        let application = null
        let isSaved = false
        if (userId) {
            const [app, savedJob] = await Promise.all([
                db.query.jobApplications.findFirst({
                    where: and(
                        eq(jobApplications.jobId, job.id),
                        eq(jobApplications.userId, userId)
                    ),
                }),
                db.query.savedJobs.findFirst({
                    where: and(
                        eq(savedJobs.userId, userId),
                        eq(savedJobs.jobId, job.id)
                    ),
                }),
            ])
            application = app
            isSaved = !!savedJob
        }

        // Increment view count
        await db.update(jobs)
            .set({ viewsCount: sql`${jobs.viewsCount} + 1` })
            .where(eq(jobs.id, job.id))

        // Parse JSON fields as arrays
        const parseJsonArray = (value: unknown): string[] => {
            if (!value) return []
            if (Array.isArray(value)) return value as string[]
            if (typeof value === "object") {
                const obj = value as Record<string, unknown>
                if (Array.isArray(obj.items)) return obj.items as string[]
            }
            return []
        }

        // Format interview process
        const formattedInterviewProcess = interviewProcess ? {
            id: interviewProcess.id,
            name: interviewProcess.name,
            description: interviewProcess.description,
            estimatedDurationWeeks: interviewProcess.estimatedDurationWeeks,
            rounds: interviewProcess.rounds.map(round => ({
                id: round.id,
                roundNumber: round.roundNumber,
                title: round.title,
                roundType: round.roundType as string,
                description: round.description,
                durationMinutes: round.durationMinutes,
                format: round.format as string,
                hasMockInterview: round.hasMockInterview,
                tipsForCandidates: round.tipsForCandidates as string[] | null
            }))
        } : null

        return {
            success: true,
            data: {
                id: job.id,
                title: job.title,
                slug: job.slug,
                description: job.description,
                responsibilities: parseJsonArray(job.responsibilities),
                requirements: parseJsonArray(job.requirements),
                niceToHave: [],
                benefits: parseJsonArray(job.benefits),
                company: job.company,
                location: job.location,
                locationType: job.locationType,
                employmentType: job.employmentType,
                experienceMin: job.experienceMin,
                experienceMax: job.experienceMax,
                salaryMin: job.salaryMin,
                salaryMax: job.salaryMax,
                salaryCurrency: job.salaryCurrency,
                salaryDisclosed: job.salaryDisclosed,
                skillsRequired: (job.skillsRequired as string[]) || [],
                hasAssignment: job.hasAssignment,
                applicationsCount: job.applicationsCount,
                publishedAt: job.publishedAt,
                interviewProcess: formattedInterviewProcess,
                isSaved,
                hasApplied: !!application,
                applicationStatus: application?.status || null
            }
        }
    } catch (error) {
        console.error("Error fetching job:", error)
        return { success: false, error: "Failed to fetch job" }
    }
}

// Get recommended jobs for the user
export async function getRecommendedJobs(limit = 10) {
    try {
        const session = await getSession(headers())

        if (!session?.user?.id) {
            // Return general featured jobs for unauthenticated users
            const jobRows = await db.query.jobs.findMany({
                where: and(
                    jobListed,
                    eq(jobs.visibility, "PUBLIC"),
                    eq(jobs.featured, true)
                ),
                with: {
                    company: {
                        columns: { id: true, name: true, logoUrl: true, industry: true },
                    },
                },
                limit,
            })
            return { success: true, data: jobRows }
        }

        // Get user's recommendations
        const recommendations = await db.query.jobRecommendations.findMany({
            where: and(
                eq(jobRecommendations.userId, session.user.id),
                eq(jobRecommendations.isDismissed, false)
            ),
            with: {
                job: {
                    with: {
                        company: {
                            columns: { id: true, name: true, logoUrl: true, industry: true },
                        },
                    },
                },
            },
            orderBy: desc(jobRecommendations.matchScore),
            limit,
        })

        const jobList = recommendations.map(r => ({
            ...r.job,
            matchScore: r.matchScore,
            matchReasons: r.matchReasons
        }))

        return { success: true, data: jobList }
    } catch (error) {
        console.error("Error fetching recommendations:", error)
        return { success: false, error: "Failed to fetch recommendations" }
    }
}

// Get jobs by company
export async function getJobsByCompany(companyId: string) {
    try {
        const jobRows = await db.query.jobs.findMany({
            where: and(
                eq(jobs.companyId, companyId),
                jobListed,
                eq(jobs.visibility, "PUBLIC")
            ),
            orderBy: desc(jobs.publishedAt),
        })

        return { success: true, data: jobRows }
    } catch (error) {
        console.error("Error fetching company jobs:", error)
        return { success: false, error: "Failed to fetch jobs" }
    }
}

// Save/unsave a job
export async function toggleSaveJob(jobId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        const existingSave = await db.query.savedJobs.findFirst({
            where: and(
                eq(savedJobs.userId, session.user.id),
                eq(savedJobs.jobId, jobId)
            ),
        })

        if (existingSave) {
            await db.delete(savedJobs).where(eq(savedJobs.id, existingSave.id))
            return { success: true, saved: false }
        } else {
            await db.insert(savedJobs).values({
                userId: session.user.id,
                jobId,
            })
            return { success: true, saved: true }
        }
    } catch (error) {
        console.error("Error toggling save:", error)
        return { success: false, error: "Failed to save job" }
    }
}

// Get saved jobs
export async function getSavedJobs() {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        const savedEntries = await db.query.savedJobs.findMany({
            where: eq(savedJobs.userId, session.user.id),
            orderBy: desc(savedJobs.createdAt),
        })

        if (savedEntries.length === 0) {
            return { success: true, data: [] }
        }

        const jobIds = savedEntries.map(s => s.jobId)
        const jobRows = await db.query.jobs.findMany({
            where: and(
                inArray(jobs.id, jobIds),
                jobListed
            ),
            with: {
                company: {
                    columns: { id: true, name: true, logoUrl: true, industry: true },
                },
            },
        })

        // Match jobs with saved data
        const result = savedEntries
            .map(saved => {
                const job = jobRows.find(j => j.id === saved.jobId)
                if (!job) return null
                return {
                    ...job,
                    savedAt: saved.createdAt,
                    notes: saved.notes
                }
            })
            .filter((job): job is NonNullable<typeof job> => job !== null)

        return { success: true, data: result }
    } catch (error) {
        console.error("Error fetching saved jobs:", error)
        return { success: false, error: "Failed to fetch saved jobs" }
    }
}

// Save a job
export async function saveJob(jobId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        const existingSave = await db.query.savedJobs.findFirst({
            where: and(
                eq(savedJobs.userId, session.user.id),
                eq(savedJobs.jobId, jobId)
            ),
        })

        if (existingSave) {
            return { success: true, message: "Already saved" }
        }

        await db.insert(savedJobs).values({
            userId: session.user.id,
            jobId,
        })

        return { success: true }
    } catch (error) {
        console.error("Error saving job:", error)
        return { success: false, error: "Failed to save job" }
    }
}

// Unsave a job
export async function unsaveJob(jobId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        await db.delete(savedJobs).where(
            and(
                eq(savedJobs.userId, session.user.id),
                eq(savedJobs.jobId, jobId)
            )
        )

        return { success: true }
    } catch (error) {
        console.error("Error unsaving job:", error)
        return { success: false, error: "Failed to unsave job" }
    }
}
