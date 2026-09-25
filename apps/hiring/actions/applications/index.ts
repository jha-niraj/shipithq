"use server"

import { db, companyMembers, jobs, jobApplications, users } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { eq, and, desc, inArray, gte, lte, isNotNull, isNull, count } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type {
    ApplicationStatus
} from "@/types"

// ============================================
// TYPES
// ============================================

export interface ApplicationStats {
    total: number
    new: number
    underReview: number
    shortlisted: number
    interviewing: number
    offered: number
    hired: number
    rejected: number
    thisWeek: number
}

export interface JobApplicationStats {
    jobId: string
    jobTitle: string
    jobSlug: string
    total: number
    new: number
    underReview: number
    shortlisted: number
    interviewing: number
    offered: number
    hired: number
    rejected: number
}

export interface ApplicationListItem {
    id: string
    jobId: string
    jobTitle: string
    jobSlug: string
    userId: string
    candidateName: string
    candidateEmail: string
    candidateImage: string | null
    candidatePhone: string | null
    status: ApplicationStatus
    appliedAt: Date | null
    matchScore: number | null
    currentStage: number | null
    resumeUrl: string | null
    coverLetter: string | null
    reviewedAt: Date | null
    reviewedBy: {
        id: string
        displayName: string | null
    } | null
}

export interface ApplicationDetail {
    id: string
    jobId: string
    userId: string
    status: ApplicationStatus
    currentStage: number | null
    candidate: {
        id: string
        name: string | null
        email: string
        image: string | null
        phone: string | null
        location: string | null
        bio: string | null
        headline: string | null
        linkedinUrl: string | null
        githubUrl: string | null
        portfolioUrl: string | null
        skills: string[]
    }
    job: {
        id: string
        title: string
        slug: string
        skillsRequired: string[]
        skillsPreferred: string[]
        experienceMin: number | null
        experienceMax: number | null
    }
    coverLetter: string | null
    resumeUrl: string | null
    matchScore: number | null
    appliedAt: Date | null
    assignmentProjectCloneId: string | null
    assignmentStartedAt: Date | null
    assignmentSubmittedAt: Date | null
    assignmentScore: number | null
    assignmentFeedback: string | null
    interviewId: string | null
    interviewScheduledAt: Date | null
    interviewCompletedAt: Date | null
    interviewFeedback: unknown
    reviewedById: string | null
    reviewedAt: Date | null
    rejectionReason: string | null
    hrNotes: string | null
    reviewedBy: {
        id: string
        displayName: string | null
        user: {
            name: string | null
            email: string
        }
    } | null
    createdAt: Date
    updatedAt: Date
}

export interface PaginatedApplications {
    applications: ApplicationListItem[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

export interface ApplicationFilters {
    search?: string
    status?: ApplicationStatus[]
    jobId?: string
    dateFrom?: Date
    dateTo?: Date
    minMatchScore?: number
    hasResume?: boolean
}

// ============================================
// GET APPLICATION STATS
// ============================================

export async function getApplicationStats(): Promise<{
    success: boolean
    data?: ApplicationStats
    error?: string
}> {
    try {
        const auth = await requirePermission("view_candidates")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const companyJobIds = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        const jobIds = companyJobIds.map(j => j.id)

        if (jobIds.length === 0) {
            return {
                success: true,
                data: {
                    total: 0, new: 0, underReview: 0, shortlisted: 0,
                    interviewing: 0, offered: 0, hired: 0, rejected: 0, thisWeek: 0
                }
            }
        }

        const [
            totalRows,
            newAppsRows,
            underReviewRows,
            shortlistedRows,
            interviewScheduledRows,
            interviewedRows,
            offeredRows,
            hiredRows,
            rejectedRows,
            thisWeekRows
        ] = await Promise.all([
            db.select({ count: count() }).from(jobApplications).where(inArray(jobApplications.jobId, jobIds)),
            db.select({ count: count() }).from(jobApplications).where(and(inArray(jobApplications.jobId, jobIds), eq(jobApplications.status, "APPLIED"))),
            db.select({ count: count() }).from(jobApplications).where(and(inArray(jobApplications.jobId, jobIds), eq(jobApplications.status, "UNDER_REVIEW"))),
            db.select({ count: count() }).from(jobApplications).where(and(inArray(jobApplications.jobId, jobIds), eq(jobApplications.status, "SHORTLISTED"))),
            db.select({ count: count() }).from(jobApplications).where(and(inArray(jobApplications.jobId, jobIds), eq(jobApplications.status, "INTERVIEW_SCHEDULED"))),
            db.select({ count: count() }).from(jobApplications).where(and(inArray(jobApplications.jobId, jobIds), eq(jobApplications.status, "INTERVIEWED"))),
            db.select({ count: count() }).from(jobApplications).where(and(inArray(jobApplications.jobId, jobIds), eq(jobApplications.status, "OFFER_EXTENDED"))),
            db.select({ count: count() }).from(jobApplications).where(and(inArray(jobApplications.jobId, jobIds), eq(jobApplications.status, "HIRED"))),
            db.select({ count: count() }).from(jobApplications).where(and(inArray(jobApplications.jobId, jobIds), eq(jobApplications.status, "REJECTED"))),
            db.select({ count: count() }).from(jobApplications).where(and(
                inArray(jobApplications.jobId, jobIds),
                gte(jobApplications.appliedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
            ))
        ])

        return {
            success: true,
            data: {
                total: totalRows[0]?.count ?? 0,
                new: newAppsRows[0]?.count ?? 0,
                underReview: underReviewRows[0]?.count ?? 0,
                shortlisted: shortlistedRows[0]?.count ?? 0,
                interviewing: (interviewScheduledRows[0]?.count ?? 0) + (interviewedRows[0]?.count ?? 0),
                offered: offeredRows[0]?.count ?? 0,
                hired: hiredRows[0]?.count ?? 0,
                rejected: rejectedRows[0]?.count ?? 0,
                thisWeek: thisWeekRows[0]?.count ?? 0
            }
        }
    } catch (error) {
        console.error("Get application stats error:", error)
        return { success: false, error: "Failed to fetch application stats" }
    }
}

// ============================================
// GET APPLICATIONS BY JOB (STATS)
// ============================================

export async function getJobApplicationStats(): Promise<{
    success: boolean
    data?: JobApplicationStats[]
    error?: string
}> {
    try {
        const auth = await requirePermission("view_candidates")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const jobList = await db.query.jobs.findMany({
            where: eq(jobs.companyId, member.companyId),
            columns: { id: true, title: true, slug: true },
            with: {
                applications: {
                    columns: { status: true }
                }
            },
            orderBy: [desc(jobs.createdAt)]
        })

        const stats: JobApplicationStats[] = jobList.map(job => {
            const statuses = job.applications.map(a => a.status)
            return {
                jobId: job.id,
                jobTitle: job.title,
                jobSlug: job.slug,
                total: job.applications.length,
                new: statuses.filter(s => s === "APPLIED").length,
                underReview: statuses.filter(s => s === "UNDER_REVIEW").length,
                shortlisted: statuses.filter(s => s === "SHORTLISTED").length,
                interviewing: statuses.filter(s => s === "INTERVIEW_SCHEDULED" || s === "INTERVIEWED").length,
                offered: statuses.filter(s => s === "OFFER_EXTENDED").length,
                hired: statuses.filter(s => s === "HIRED").length,
                rejected: statuses.filter(s => s === "REJECTED").length
            }
        })

        return { success: true, data: stats }
    } catch (error) {
        console.error("Get job application stats error:", error)
        return { success: false, error: "Failed to fetch job application stats" }
    }
}

// ============================================
// GET APPLICATIONS (PAGINATED)
// ============================================

export async function getApplications(
    jobSlug?: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: ApplicationFilters
): Promise<{
    success: boolean
    data?: PaginatedApplications
    error?: string
}> {
    try {
        const auth = await requirePermission("view_candidates")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // Get company job IDs
        const companyJobsQuery = db
            .select({ id: jobs.id })
            .from(jobs)
            .where(
                jobSlug
                    ? and(eq(jobs.companyId, member.companyId), eq(jobs.slug, jobSlug))
                    : eq(jobs.companyId, member.companyId)
            )
        const companyJobs = await companyJobsQuery
        const jobIds = companyJobs.map(j => j.id)

        if (jobIds.length === 0) {
            return {
                success: true,
                data: { applications: [], total: 0, page, pageSize, totalPages: 0 }
            }
        }

        const conditions = [inArray(jobApplications.jobId, jobIds)]

        if (filters?.status && filters.status.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            conditions.push(inArray(jobApplications.status, filters.status as any[]) as any)
        }
        if (filters?.jobId) {
            conditions.push(eq(jobApplications.jobId, filters.jobId))
        }
        if (filters?.dateFrom) {
            conditions.push(gte(jobApplications.appliedAt, filters.dateFrom))
        }
        if (filters?.dateTo) {
            conditions.push(lte(jobApplications.appliedAt, filters.dateTo))
        }
        if (filters?.minMatchScore) {
            conditions.push(gte(jobApplications.matchScore, filters.minMatchScore))
        }
        if (filters?.hasResume === true) {
            conditions.push(isNotNull(jobApplications.resumeUrl))
        } else if (filters?.hasResume === false) {
            conditions.push(isNull(jobApplications.resumeUrl))
        }

        const totalRows = await db
            .select({ count: count() })
            .from(jobApplications)
            .where(and(...conditions))

        const total = totalRows[0]?.count ?? 0

        const applicationList = await db.query.jobApplications.findMany({
            where: and(...conditions),
            with: {
                job: { columns: { id: true, title: true, slug: true } },
            },
            orderBy: [desc(jobApplications.appliedAt)],
            offset: (page - 1) * pageSize,
            limit: pageSize
        })

        // Fetch users separately for search and profile data
        const userIds = [...new Set(applicationList.map(app => app.userId))]

        const userList = await db
            .select({ id: users.id, name: users.name, email: users.email, image: users.image, phone: users.phone })
            .from(users)
            .where(inArray(users.id, userIds))

        // If search filter, filter applicationList by matching user
        let filteredApplications = applicationList
        if (filters?.search) {
            const searchLower = filters.search.toLowerCase()
            const matchingUserIds = new Set(
                userList
                    .filter(u => u.name?.toLowerCase().includes(searchLower) || u.email.toLowerCase().includes(searchLower))
                    .map(u => u.id)
            )
            filteredApplications = applicationList.filter(app => matchingUserIds.has(app.userId))
        }

        const userMap = new Map(userList.map(u => [u.id, u]))

        const formattedApplications: ApplicationListItem[] = filteredApplications.map(app => {
            const user = userMap.get(app.userId)
            return {
                id: app.id,
                jobId: app.jobId,
                jobTitle: app.job.title,
                jobSlug: app.job.slug,
                userId: app.userId,
                candidateName: user?.name || "Unknown",
                candidateEmail: user?.email || "",
                candidateImage: user?.image ?? null,
                candidatePhone: user?.phone ?? null,
                status: app.status as ApplicationStatus,
                appliedAt: app.appliedAt,
                matchScore: app.matchScore,
                currentStage: app.currentStage,
                resumeUrl: app.resumeUrl,
                coverLetter: app.coverLetter,
                reviewedAt: app.reviewedAt,
                reviewedBy: null
            }
        })

        return {
            success: true,
            data: {
                applications: formattedApplications,
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        }
    } catch (error) {
        console.error("Get applications error:", error)
        return { success: false, error: "Failed to fetch applications" }
    }
}

// ============================================
// GET APPLICATION DETAIL
// ============================================

export async function getApplicationDetail(applicationId: string): Promise<{
    success: boolean
    data?: ApplicationDetail
    error?: string
}> {
    try {
        const auth = await requirePermission("view_candidates")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // Get company job IDs first
        const companyJobIds = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        const jobIds = companyJobIds.map(j => j.id)

        const application = await db.query.jobApplications.findFirst({
            where: and(
                eq(jobApplications.id, applicationId),
                inArray(jobApplications.jobId, jobIds.length > 0 ? jobIds : ["__none__"])
            ),
            with: {
                job: {
                    columns: {
                        id: true, title: true, slug: true,
                        skillsRequired: true, skillsPreferred: true,
                        experienceMin: true, experienceMax: true
                    }
                },
            }
        })

        if (!application) {
            return { success: false, error: "Application not found" }
        }

        // Fetch user with profile fields
        const user = await db.query.users.findFirst({
            where: eq(users.id, application.userId),
            columns: {
                id: true,
                name: true,
                email: true,
                image: true,
                phone: true,
                bio: true,
                location: true,
                website: true,
                linkedinUrl: true,
                githubUrl: true,
                websiteUrl: true
            },
            with: {
                userSkills: {
                    columns: { name: true }
                }
            }
        })

        if (!user) {
            return { success: false, error: "User not found" }
        }

        const detail: ApplicationDetail = {
            id: application.id,
            jobId: application.jobId,
            userId: application.userId,
            status: application.status as ApplicationStatus,
            currentStage: application.currentStage,
            candidate: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image ?? null,
                phone: user.phone ?? null,
                location: user.location || null,
                bio: user.bio || null,
                headline: null,
                linkedinUrl: user.linkedinUrl || null,
                githubUrl: user.githubUrl || null,
                portfolioUrl: user.websiteUrl || user.website || null,
                skills: user.userSkills?.map(s => s.name) || []
            },
            job: {
                id: application.job.id,
                title: application.job.title,
                slug: application.job.slug,
                skillsRequired: (application.job.skillsRequired as string[]) || [],
                skillsPreferred: (application.job.skillsPreferred as string[]) || [],
                experienceMin: application.job.experienceMin,
                experienceMax: application.job.experienceMax
            },
            coverLetter: application.coverLetter,
            resumeUrl: application.resumeUrl,
            matchScore: application.matchScore,
            appliedAt: application.appliedAt,
            assignmentProjectCloneId: application.assignmentProjectCloneId,
            assignmentStartedAt: application.assignmentStartedAt,
            assignmentSubmittedAt: application.assignmentSubmittedAt,
            assignmentScore: application.assignmentScore,
            assignmentFeedback: application.assignmentFeedback,
            interviewId: application.interviewId,
            interviewScheduledAt: application.interviewScheduledAt,
            interviewCompletedAt: application.interviewCompletedAt,
            interviewFeedback: application.interviewFeedback,
            reviewedById: application.reviewedById,
            reviewedAt: application.reviewedAt,
            rejectionReason: application.rejectionReason,
            hrNotes: application.hrNotes,
            reviewedBy: null,
            createdAt: application.createdAt,
            updatedAt: application.updatedAt
        }

        return { success: true, data: detail }
    } catch (error) {
        console.error("Get application detail error:", error)
        return { success: false, error: "Failed to fetch application detail" }
    }
}

// ============================================
// UPDATE APPLICATION STATUS
// ============================================

export async function updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus,
    rejectionReason?: string,
    hrNotes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const auth = await requirePermission("invite_decline")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const companyJobIds = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        const jobIds = companyJobIds.map(j => j.id)

        const application = await db.query.jobApplications.findFirst({
            where: and(
                eq(jobApplications.id, applicationId),
                inArray(jobApplications.jobId, jobIds.length > 0 ? jobIds : ["__none__"])
            )
        })

        if (!application) {
            return { success: false, error: "Application not found" }
        }

        await db.update(jobApplications)
            .set({
                status,
                rejectionReason: status === "REJECTED" ? rejectionReason : null,
                hrNotes: hrNotes || application.hrNotes,
                reviewedById: member.id,
                reviewedAt: new Date()
            })
            .where(eq(jobApplications.id, applicationId))

        revalidatePath("/applications")
        return { success: true }
    } catch (error) {
        console.error("Update application status error:", error)
        return { success: false, error: "Failed to update application status" }
    }
}

// ============================================
// REJECT APPLICATION
// ============================================

export async function rejectApplication(
    applicationId: string,
    rejectionReason: string
): Promise<{ success: boolean; error?: string }> {
    const auth = await requirePermission("invite_decline")
    if (!auth.ok) return { success: false, error: auth.error }
    return updateApplicationStatus(applicationId, "REJECTED", rejectionReason)
}

// ============================================
// SHORTLIST APPLICATION
// ============================================

export async function shortlistApplication(
    applicationId: string,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    const auth = await requirePermission("invite_decline")
    if (!auth.ok) return { success: false, error: auth.error }
    return updateApplicationStatus(applicationId, "SHORTLISTED", undefined, notes)
}

// ============================================
// SCHEDULE INTERVIEW
// ============================================

export async function scheduleInterview(
    applicationId: string,
    scheduledAt: Date,
    notes?: string
): Promise<{ success: boolean; interviewLink?: string; error?: string }> {
    try {
        const auth = await requirePermission("invite_decline")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const companyJobIds = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        const jobIds = companyJobIds.map(j => j.id)

        const application = await db.query.jobApplications.findFirst({
            where: and(
                eq(jobApplications.id, applicationId),
                inArray(jobApplications.jobId, jobIds.length > 0 ? jobIds : ["__none__"])
            ),
            with: { job: true }
        })

        if (!application) {
            return { success: false, error: "Application not found" }
        }

        const interviewId = `interview_${applicationId}_${Date.now()}`
        const interviewLink = `/interview/${interviewId}`

        await db.update(jobApplications)
            .set({
                status: "INTERVIEW_SCHEDULED",
                interviewId,
                interviewScheduledAt: scheduledAt,
                hrNotes: notes || application.hrNotes,
                reviewedById: member.id,
                reviewedAt: new Date()
            })
            .where(eq(jobApplications.id, applicationId))

        revalidatePath("/applications")
        return { success: true, interviewLink }
    } catch (error) {
        console.error("Schedule interview error:", error)
        return { success: false, error: "Failed to schedule interview" }
    }
}

// ============================================
// ADD HR NOTE
// ============================================

export async function addApplicationNote(
    applicationId: string,
    note: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const auth = await requirePermission("view_candidates")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const companyJobIds = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        const jobIds = companyJobIds.map(j => j.id)

        const application = await db.query.jobApplications.findFirst({
            where: and(
                eq(jobApplications.id, applicationId),
                inArray(jobApplications.jobId, jobIds.length > 0 ? jobIds : ["__none__"])
            )
        })

        if (!application) {
            return { success: false, error: "Application not found" }
        }

        const timestamp = new Date().toISOString()
        const existingNotes = application.hrNotes || ""
        const newNote = `[${timestamp}] ${note}\n\n${existingNotes}`

        await db.update(jobApplications)
            .set({
                hrNotes: newNote,
                reviewedById: member.id,
                reviewedAt: new Date()
            })
            .where(eq(jobApplications.id, applicationId))

        revalidatePath("/applications")
        return { success: true }
    } catch (error) {
        console.error("Add application note error:", error)
        return { success: false, error: "Failed to add note" }
    }
}

// ============================================
// GET JOB BY SLUG
// ============================================

export async function getJobBySlug(slug: string): Promise<{
    success: boolean
    data?: {
        id: string
        title: string
        slug: string
        status: string
        applicationsCount: number
    }
    error?: string
}> {
    try {
        const auth = await requirePermission("view_candidates")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const job = await db.query.jobs.findFirst({
            where: and(eq(jobs.slug, slug), eq(jobs.companyId, member.companyId)),
            columns: { id: true, title: true, slug: true, status: true, applicationsCount: true }
        })

        if (!job) {
            return { success: false, error: "Job not found" }
        }

        return { success: true, data: job }
    } catch (error) {
        console.error("Get job by slug error:", error)
        return { success: false, error: "Failed to fetch job" }
    }
}

// ============================================
// MAKE MESSAGE PROFESSIONAL (AI)
// ============================================

export async function makeMessageProfessional(
    message: string
): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
        const auth = await requirePermission("use_ai")
        if (!auth.ok) return { success: false, error: auth.error }

        // For now, return a formatted version
        // TODO: Integrate with OpenAI
        const professional = `Dear Applicant,

Thank you for your interest in this position and for taking the time to apply.

${message}

We appreciate your understanding and wish you the best in your future endeavors.

Best regards,
The Hiring Team`

        return { success: true, data: professional }
    } catch (error) {
        console.error("Make message professional error:", error)
        return { success: false, error: "Failed to process message" }
    }
}
