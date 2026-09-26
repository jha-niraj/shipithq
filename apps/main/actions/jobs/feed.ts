"use server"

import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import {
    db,
    jobs,
    jobApplications,
    savedJobs,
    companies,
    companyFollowers,
    interviewProcesses,
    skills,
    projectsV2,
    jobListed,
} from "@repo/db"
import { eq, and, inArray, desc, count, ilike } from "drizzle-orm"
import { catalogueWhere } from '@/lib/projects/catalogue'

// Types for the feed
export interface FeedJobResult {
    id: string
    title: string
    slug: string
    description: string | null
    company: {
        id: string
        name: string
        logoUrl: string | null
        industry: string | null
        hasTransparentProcess: boolean
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
    skillsPreferred: string[]
    hasAssignment: boolean
    applicationsCount: number
    publishedAt: Date | null
    interviewProcess: {
        id: string
        name: string
        estimatedDurationWeeks: number | null
        rounds: Array<{
            id: string
            roundNumber: number
            title: string
            roundType: string
            hasMockInterview: boolean
        }>
    } | null
    // Match & recommendation data
    matchScore: number
    matchReasons: {
        skillMatch: number
        experienceMatch: number
        locationMatch: number
        industryMatch: number
    }
    matchedSkills: string[]
    missingSkills: string[]
    isSaved: boolean
    hasApplied: boolean
    isFollowingCompany: boolean
}

export interface ShouldApplyScore {
    score: number // 0-100
    recommendation: "HIGHLY_RECOMMENDED" | "RECOMMENDED" | "CONSIDER" | "NOT_RECOMMENDED"
    reasons: string[]
    competition: {
        applicantsCount: number
        level: "LOW" | "MEDIUM" | "HIGH"
    }
    responseRate: number | null
    averageResponseDays: number | null
}

export interface CompanyHiringStats {
    responseRate: number
    averageResponseDays: number
    totalHires: number
    openRoles: number
    hasTransparentProcess: boolean
    recentActivity: Array<{
        type: string
        description: string
        date: Date
    }>
}

export interface SkillGapAnalysis {
    matchedSkills: string[]
    missingRequired: string[]
    missingPreferred: string[]
    learningRecommendations: Array<{
        skill: string
        projectId: string
        projectTitle: string
        projectSlug: string
        estimatedHours: number
    }>
    potentialMatchAfterLearning: number
}

// Helper: Get user's skills
async function getUserSkills(userId: string): Promise<string[]> {
    const skillRows = await db.query.skills.findMany({
        where: eq(skills.userId, userId),
        columns: { name: true },
    })
    return skillRows.map(s => s.name.toLowerCase())
}

// Helper: Get user's followed company IDs
async function getUserFollowedCompanyIds(userId: string): Promise<string[]> {
    const follows = await db.query.companyFollowers.findMany({
        where: eq(companyFollowers.userId, userId),
        columns: { companyId: true },
    })
    return follows.map(f => f.companyId)
}

// Helper: Get user's saved job IDs
async function getUserSavedJobIds(userId: string): Promise<string[]> {
    const saved = await db.query.savedJobs.findMany({
        where: eq(savedJobs.userId, userId),
        columns: { jobId: true },
    })
    return saved.map(s => s.jobId)
}

// Helper: Get user's applied job IDs
async function getUserAppliedJobIds(userId: string): Promise<string[]> {
    const applications = await db.query.jobApplications.findMany({
        where: eq(jobApplications.userId, userId),
        columns: { jobId: true },
    })
    return applications.map(a => a.jobId)
}

// Helper: Calculate skill match score
function calculateSkillMatch(userSkills: string[], requiredSkills: string[], preferredSkills: string[] = []): {
    score: number
    matchedSkills: string[]
    missingSkills: string[]
} {
    const normalizedUserSkills = userSkills.map(s => s.toLowerCase().trim())
    const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim())
    const normalizedPreferred = preferredSkills.map(s => s.toLowerCase().trim())

    const matchedRequired = normalizedRequired.filter(skill =>
        normalizedUserSkills.some(us => us.includes(skill) || skill.includes(us))
    )
    const matchedPreferred = normalizedPreferred.filter(skill =>
        normalizedUserSkills.some(us => us.includes(skill) || skill.includes(us))
    )

    const missingRequired = normalizedRequired.filter(skill =>
        !normalizedUserSkills.some(us => us.includes(skill) || skill.includes(us))
    )

    const requiredScore = normalizedRequired.length > 0
        ? (matchedRequired.length / normalizedRequired.length) * 80
        : 80
    const preferredScore = normalizedPreferred.length > 0
        ? (matchedPreferred.length / normalizedPreferred.length) * 20
        : 20

    return {
        score: Math.round(requiredScore + preferredScore),
        matchedSkills: [...matchedRequired, ...matchedPreferred],
        missingSkills: missingRequired
    }
}

// Helper: Format job with match data
function formatJobWithMatch(
    job: any,
    userSkills: string[],
    savedJobIds: string[],
    appliedJobIds: string[],
    followedCompanyIds: string[]
): FeedJobResult {
    const skillsRequired = (job.skillsRequired as string[]) || []
    const skillsPreferred = (job.skillsPreferred as string[]) || []

    const skillMatch = calculateSkillMatch(userSkills, skillsRequired, skillsPreferred)

    return {
        id: job.id,
        title: job.title,
        slug: job.slug,
        description: job.description,
        company: {
            id: job.company.id,
            name: job.company.name,
            logoUrl: job.company.logoUrl,
            industry: job.company.industry,
            hasTransparentProcess: job.company.hasInterviewProcess || !!job.interviewProcess
        },
        location: job.location,
        locationType: job.locationType,
        employmentType: job.employmentType,
        experienceMin: job.experienceMin,
        experienceMax: job.experienceMax,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        salaryDisclosed: job.salaryDisclosed,
        skillsRequired,
        skillsPreferred,
        hasAssignment: job.hasAssignment,
        applicationsCount: job.applicationsCount,
        publishedAt: job.publishedAt,
        interviewProcess: job.interviewProcess ?? null,
        matchScore: skillMatch.score,
        matchReasons: {
            skillMatch: skillMatch.score,
            experienceMatch: 80,
            locationMatch: 90,
            industryMatch: 85
        },
        matchedSkills: skillMatch.matchedSkills,
        missingSkills: skillMatch.missingSkills,
        isSaved: savedJobIds.includes(job.id),
        hasApplied: appliedJobIds.includes(job.id),
        isFollowingCompany: followedCompanyIds.includes(job.companyId)
    }
}

// Helper: load interview processes for a list of jobs
async function loadInterviewProcesses(jobRows: any[]) {
    const processIds = jobRows
        .map(j => j.interviewProcessId)
        .filter(Boolean) as string[]

    if (processIds.length === 0) return new Map<string, any>()

    const processes = await db.query.interviewProcesses.findMany({
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
                orderBy: (r, { asc }) => [asc(r.roundNumber)],
            },
        },
    })

    return new Map(processes.map(p => [p.id, p]))
}

// ============================================
// MAIN FEED FUNCTIONS
// ============================================

/**
 * Get jobs from followed companies, filtered by user's skills
 * This is the "Following" tab feed
 */
export async function getFollowingFeedJobs(page = 1, limit = 10) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return {
                success: false,
                error: "Please sign in to see jobs from companies you follow",
                requiresAuth: true
            }
        }

        const userId = session.user.id
        const skip = (page - 1) * limit

        const [userSkillsList, followedCompanyIds, savedJobIds, appliedJobIds] = await Promise.all([
            getUserSkills(userId),
            getUserFollowedCompanyIds(userId),
            getUserSavedJobIds(userId),
            getUserAppliedJobIds(userId)
        ])

        if (followedCompanyIds.length === 0) {
            return {
                success: true,
                data: {
                    jobs: [],
                    pagination: { page, limit, total: 0, totalPages: 0 },
                    followedCompaniesCount: 0,
                    isEmpty: true
                }
            }
        }

        const whereClause = and(
            inArray(jobs.companyId, followedCompanyIds),
            jobListed,
            eq(jobs.visibility, "PUBLIC")
        )

        const [jobRows, totalRowsFollowing] = await Promise.all([
            db.query.jobs.findMany({
                where: whereClause,
                with: {
                    company: {
                        columns: { id: true, name: true, logoUrl: true, industry: true, hasInterviewProcess: true },
                    },
                },
                orderBy: desc(jobs.publishedAt),
                offset: skip,
                limit,
            }),
            db.select({ total: count() }).from(jobs).where(whereClause),
        ])
        const totalFollowing = totalRowsFollowing[0]?.total ?? 0

        const processMap = await loadInterviewProcesses(jobRows)

        const enriched = jobRows.map(job => ({ ...job, interviewProcess: processMap.get(job.interviewProcessId ?? '') ?? null }))

        const formattedJobs = enriched.map(job =>
            formatJobWithMatch(job, userSkillsList, savedJobIds, appliedJobIds, followedCompanyIds)
        )

        formattedJobs.sort((a, b) => b.matchScore - a.matchScore)

        const perfectMatch = formattedJobs.filter(j => j.matchScore >= 90)
        const goodMatch = formattedJobs.filter(j => j.matchScore >= 70 && j.matchScore < 90)
        const explore = formattedJobs.filter(j => j.matchScore < 70)

        return {
            success: true,
            data: {
                jobs: formattedJobs,
                grouped: { perfectMatch, goodMatch, explore },
                pagination: {
                    page,
                    limit,
                    total: Number(totalFollowing),
                    totalPages: Math.ceil(Number(totalFollowing) / limit)
                },
                followedCompaniesCount: followedCompanyIds.length,
                isEmpty: false
            }
        }
    } catch (error) {
        console.error("Error fetching following feed:", error)
        return { success: false, error: "Failed to fetch jobs from followed companies" }
    }
}

/**
 * Get AI-curated "For You" job feed
 */
export async function getForYouFeedJobs(page = 1, limit = 10) {
    try {
        const session = await getSession(headers())
        const skip = (page - 1) * limit

        const baseWhere = and(jobListed, eq(jobs.visibility, "PUBLIC"))

        // For unauthenticated users, return featured jobs
        if (!session?.user?.id) {
            const [jobRows, totalRowsAnon] = await Promise.all([
                db.query.jobs.findMany({
                    where: baseWhere,
                    with: {
                        company: {
                            columns: { id: true, name: true, logoUrl: true, industry: true, hasInterviewProcess: true },
                        },
                    },
                    orderBy: [desc(jobs.featured), desc(jobs.publishedAt)],
                    offset: skip,
                    limit,
                }),
                db.select({ total: count() }).from(jobs).where(baseWhere),
            ])
            const totalAnon = totalRowsAnon[0]?.total ?? 0

            const processMap = await loadInterviewProcesses(jobRows)
            const enriched = jobRows.map(job => ({ ...job, interviewProcess: processMap.get(job.interviewProcessId ?? '') ?? null }))
            const formattedJobs = enriched.map(job => formatJobWithMatch(job, [], [], [], []))

            return {
                success: true,
                data: {
                    jobs: formattedJobs,
                    pagination: {
                        page,
                        limit,
                        total: Number(totalAnon),
                        totalPages: Math.ceil(Number(totalAnon) / limit)
                    },
                    isAuthenticated: false
                }
            }
        }

        const userId = session.user.id

        const [userSkillsList, followedCompanyIds, savedJobIds, appliedJobIds] = await Promise.all([
            getUserSkills(userId),
            getUserFollowedCompanyIds(userId),
            getUserSavedJobIds(userId),
            getUserAppliedJobIds(userId)
        ])

        const [jobRows, totalRowsAuth] = await Promise.all([
            db.query.jobs.findMany({
                where: baseWhere,
                with: {
                    company: {
                        columns: { id: true, name: true, logoUrl: true, industry: true, hasInterviewProcess: true },
                    },
                },
                orderBy: desc(jobs.publishedAt),
            }),
            db.select({ total: count() }).from(jobs).where(baseWhere),
        ])
        const totalAuth = totalRowsAuth[0]?.total ?? 0

        const processMap = await loadInterviewProcesses(jobRows)
        const enriched = jobRows.map(job => ({ ...job, interviewProcess: processMap.get(job.interviewProcessId ?? '') ?? null }))

        const formattedJobs = enriched.map(job =>
            formatJobWithMatch(job, userSkillsList, savedJobIds, appliedJobIds, followedCompanyIds)
        )

        formattedJobs.sort((a, b) => {
            const aBoost = a.isFollowingCompany ? 5 : 0
            const bBoost = b.isFollowingCompany ? 5 : 0
            return (b.matchScore + bBoost) - (a.matchScore + aBoost)
        })

        const paginatedJobs = formattedJobs.slice(skip, skip + limit)

        return {
            success: true,
            data: {
                jobs: paginatedJobs,
                pagination: {
                    page,
                    limit,
                    total: Number(totalAuth),
                    totalPages: Math.ceil(Number(totalAuth) / limit)
                },
                isAuthenticated: true,
                userSkillsCount: userSkillsList.length,
            }
        }
    } catch (error) {
        console.error("Error fetching for you feed:", error)
        return { success: false, error: "Failed to fetch recommended jobs" }
    }
}

/**
 * Get "Should Apply" recommendation for a specific job
 */
export async function getShouldApplyScore(jobId: string): Promise<{
    success: boolean
    data?: ShouldApplyScore
    error?: string
}> {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: "Please sign in to get recommendations" }
        }

        const userId = session.user.id

        const [job, userSkillsList, applicationRows] = await Promise.all([
            db.query.jobs.findFirst({
                where: eq(jobs.id, jobId),
                with: { company: true },
            }),
            getUserSkills(userId),
            db.query.jobApplications.findMany({
                where: eq(jobApplications.jobId, jobId),
                columns: { status: true, createdAt: true, updatedAt: true },
            }),
        ])

        if (!job) {
            return { success: false, error: "Job not found" }
        }

        const skillsRequired = (job.skillsRequired as string[]) || []
        const skillMatch = calculateSkillMatch(userSkillsList, skillsRequired)

        const applicantsCount = applicationRows.length
        let competitionLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW"
        if (applicantsCount > 100) competitionLevel = "HIGH"
        else if (applicantsCount > 30) competitionLevel = "MEDIUM"

        const reviewedApps = applicationRows.filter(a =>
            a.status !== "INTERESTED" && a.status !== "PREPARING" && a.status !== "APPLIED"
        )
        const responseRate = applicationRows.length > 0
            ? Math.round((reviewedApps.length / applicationRows.length) * 100)
            : null

        const reasons: string[] = []

        if (skillMatch.score >= 90) {
            reasons.push(`Excellent match! You have ${skillMatch.matchedSkills.length} of ${skillsRequired.length} required skills`)
        } else if (skillMatch.score >= 70) {
            reasons.push(`Good match with ${skillMatch.matchedSkills.length} of ${skillsRequired.length} required skills`)
        } else {
            reasons.push(`You're missing ${skillMatch.missingSkills.length} key skills for this role`)
        }

        if (competitionLevel === "LOW") {
            reasons.push("Low competition - fewer applicants means better visibility")
        } else if (competitionLevel === "HIGH") {
            reasons.push("High competition - make sure your application stands out")
        }

        if (job.company.hasInterviewProcess) {
            reasons.push("Company has a transparent interview process")
        }

        let score = skillMatch.score
        if (competitionLevel === "LOW") score += 10
        else if (competitionLevel === "HIGH") score -= 10
        if (job.company.hasInterviewProcess) score += 5
        score = Math.min(100, Math.max(0, score))

        let recommendation: ShouldApplyScore["recommendation"] = "CONSIDER"
        if (score >= 85) recommendation = "HIGHLY_RECOMMENDED"
        else if (score >= 70) recommendation = "RECOMMENDED"
        else if (score < 50) recommendation = "NOT_RECOMMENDED"

        return {
            success: true,
            data: {
                score,
                recommendation,
                reasons,
                competition: { applicantsCount, level: competitionLevel },
                responseRate,
                averageResponseDays: 5
            }
        }
    } catch (error) {
        console.error("Error calculating should apply score:", error)
        return { success: false, error: "Failed to calculate recommendation" }
    }
}

/**
 * Get company hiring stats
 */
export async function getCompanyHiringStats(companyId: string): Promise<{
    success: boolean
    data?: CompanyHiringStats
    error?: string
}> {
    try {
        const company = await db.query.companies.findFirst({
            where: eq(companies.id, companyId),
        })

        if (!company) {
            return { success: false, error: "Company not found" }
        }

        // Get active jobs for this company
        const companyJobs = await db.query.jobs.findMany({
            where: and(eq(jobs.companyId, companyId), jobListed),
            columns: { id: true },
        })

        const jobIds = companyJobs.map(j => j.id)

        const applicationRows = jobIds.length > 0
            ? await db.query.jobApplications.findMany({
                where: inArray(jobApplications.jobId, jobIds),
                columns: { status: true, createdAt: true, updatedAt: true },
            })
            : []

        const reviewedApps = applicationRows.filter(a =>
            a.status !== "INTERESTED" && a.status !== "PREPARING" && a.status !== "APPLIED"
        )
        const responseRate = applicationRows.length > 0
            ? Math.round((reviewedApps.length / applicationRows.length) * 100)
            : 85

        const hiredApps = applicationRows.filter(a => a.status === "HIRED")

        return {
            success: true,
            data: {
                responseRate,
                averageResponseDays: 5,
                totalHires: hiredApps.length,
                openRoles: companyJobs.length,
                hasTransparentProcess: company.hasInterviewProcess || false,
                recentActivity: []
            }
        }
    } catch (error) {
        console.error("Error fetching company hiring stats:", error)
        return { success: false, error: "Failed to fetch company stats" }
    }
}

/**
 * Get skill gap analysis for a specific job
 */
export async function getSkillGapForJob(jobId: string): Promise<{
    success: boolean
    data?: SkillGapAnalysis
    error?: string
}> {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: "Please sign in to see skill analysis" }
        }

        const userId = session.user.id

        const [job, userSkillsList] = await Promise.all([
            db.query.jobs.findFirst({ where: eq(jobs.id, jobId) }),
            getUserSkills(userId),
        ])

        if (!job) {
            return { success: false, error: "Job not found" }
        }

        const skillsRequired = (job.skillsRequired as string[]) || []
        const skillsPreferred = (job.skillsPreferred as string[]) || []

        const normalizedUserSkills = userSkillsList.map(s => s.toLowerCase())

        const matchedSkills = skillsRequired.filter(skill =>
            normalizedUserSkills.some(us => us.includes(skill.toLowerCase()) || skill.toLowerCase().includes(us))
        )

        const missingRequired = skillsRequired.filter(skill =>
            !normalizedUserSkills.some(us => us.includes(skill.toLowerCase()) || skill.toLowerCase().includes(us))
        )

        const missingPreferred = skillsPreferred.filter(skill =>
            !normalizedUserSkills.some(us => us.includes(skill.toLowerCase()) || skill.toLowerCase().includes(us))
        )

        // Find learning projects for missing skills
        const learningRecommendations: SkillGapAnalysis["learningRecommendations"] = []

        for (const skill of missingRequired.slice(0, 3)) {
            const project = await db.query.projectsV2.findFirst({
                where: and(
                    catalogueWhere(),
                    ilike(projectsV2.title, `%${skill}%`)
                ),
                columns: {
                    id: true,
                    title: true,
                    slug: true,
                    estimatedHours: true,
                },
            })

            if (project) {
                learningRecommendations.push({
                    skill,
                    projectId: project.id,
                    projectTitle: project.title,
                    projectSlug: project.slug,
                    estimatedHours: project.estimatedHours || 10
                })
            }
        }

        const currentScore = skillsRequired.length > 0
            ? (matchedSkills.length / skillsRequired.length) * 100
            : 100
        const potentialMatch = Math.min(100, currentScore + (learningRecommendations.length * 15))

        return {
            success: true,
            data: {
                matchedSkills,
                missingRequired,
                missingPreferred,
                learningRecommendations,
                potentialMatchAfterLearning: Math.round(potentialMatch)
            }
        }
    } catch (error) {
        console.error("Error analyzing skill gap:", error)
        return { success: false, error: "Failed to analyze skills" }
    }
}

/**
 * Get saved jobs for feed
 */
export async function getSavedFeedJobs(page = 1, limit = 10) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return {
                success: false,
                error: "Please sign in to see saved jobs",
                requiresAuth: true
            }
        }

        const userId = session.user.id
        const skip = (page - 1) * limit

        const savedJobEntries = await db.query.savedJobs.findMany({
            where: eq(savedJobs.userId, userId),
            orderBy: desc(savedJobs.createdAt),
            offset: skip,
            limit,
        })

        if (savedJobEntries.length === 0) {
            return {
                success: true,
                data: {
                    jobs: [],
                    pagination: { page, limit, total: 0, totalPages: 0 }
                }
            }
        }

        const jobIds = savedJobEntries.map(s => s.jobId)
        const [userSkillsList, followedCompanyIds, appliedJobIds, jobRows, totalRowsSaved] = await Promise.all([
            getUserSkills(userId),
            getUserFollowedCompanyIds(userId),
            getUserAppliedJobIds(userId),
            db.query.jobs.findMany({
                where: and(
                    inArray(jobs.id, jobIds),
                    jobListed
                ),
                with: {
                    company: {
                        columns: { id: true, name: true, logoUrl: true, industry: true, hasInterviewProcess: true },
                    },
                },
            }),
            db.select({ total: count() }).from(savedJobs).where(eq(savedJobs.userId, userId)),
        ])
        const totalSaved = totalRowsSaved[0]?.total ?? 0

        const processMap = await loadInterviewProcesses(jobRows)
        const enriched = jobRows.map(job => ({ ...job, interviewProcess: processMap.get(job.interviewProcessId ?? '') ?? null }))

        const savedJobIdSet = new Set(savedJobEntries.map(s => s.jobId))

        const formattedJobs = savedJobEntries
            .map(savedEntry => {
                const job = enriched.find(j => j.id === savedEntry.jobId)
                if (!job) return null
                return {
                    ...formatJobWithMatch(
                        job,
                        userSkillsList,
                        Array.from(savedJobIdSet),
                        appliedJobIds,
                        followedCompanyIds
                    ),
                    savedAt: savedEntry.createdAt,
                    notes: savedEntry.notes
                }
            })
            .filter((j): j is NonNullable<typeof j> => j !== null)

        return {
            success: true,
            data: {
                jobs: formattedJobs,
                pagination: {
                    page,
                    limit,
                    total: Number(totalSaved),
                    totalPages: Math.ceil(Number(totalSaved) / limit)
                }
            }
        }
    } catch (error) {
        console.error("Error fetching saved jobs:", error)
        return { success: false, error: "Failed to fetch saved jobs" }
    }
}

/**
 * Get feed stats for the user
 */
export async function getFeedStats() {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: true, data: null }
        }

        const userId = session.user.id

        const [
            followedCompaniesRows,
            savedJobsRows,
            appliedJobsRows,
            userSkillsRows,
        ] = await Promise.all([
            db.select({ cnt: count() }).from(companyFollowers).where(eq(companyFollowers.userId, userId)),
            db.select({ cnt: count() }).from(savedJobs).where(eq(savedJobs.userId, userId)),
            db.select({ cnt: count() }).from(jobApplications).where(eq(jobApplications.userId, userId)),
            db.select({ cnt: count() }).from(skills).where(eq(skills.userId, userId)),
        ])

        const followedCompaniesCount = followedCompaniesRows[0]?.cnt ?? 0
        const savedJobsCount = savedJobsRows[0]?.cnt ?? 0
        const appliedJobsCount = appliedJobsRows[0]?.cnt ?? 0
        const userSkillsCount = userSkillsRows[0]?.cnt ?? 0

        const followedCompanyIds = await getUserFollowedCompanyIds(userId)
        const followingJobsRows = await db
            .select({ cnt: count() })
            .from(jobs)
            .where(
                followedCompanyIds.length > 0
                    ? and(
                        inArray(jobs.companyId, followedCompanyIds),
                        jobListed,
                        eq(jobs.visibility, "PUBLIC")
                    )
                    : and(jobListed, eq(jobs.visibility, "PUBLIC"))
            )
        const followingJobsCount = followingJobsRows[0]?.cnt ?? 0

        return {
            success: true,
            data: {
                followedCompaniesCount: Number(followedCompaniesCount),
                followingJobsCount: followedCompanyIds.length > 0 ? Number(followingJobsCount) : 0,
                savedJobsCount: Number(savedJobsCount),
                appliedJobsCount: Number(appliedJobsCount),
                userSkillsCount: Number(userSkillsCount)
            }
        }
    } catch (error) {
        console.error("Error fetching feed stats:", error)
        return { success: false, error: "Failed to fetch stats" }
    }
}
