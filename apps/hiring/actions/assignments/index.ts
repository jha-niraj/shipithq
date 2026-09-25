// Assessments Actions - Server actions for assessment/assignment management
"use server"

import { db, companyMembers, jobs, jobApplications, users } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { eq, and, count, avg, isNull, inArray, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type {
    AssignmentStats,
    AssignmentDetails,
    ScoreAssignmentInput
} from "@/types"

// Re-export types for consumers
export type { AssignmentStats, AssignmentDetails, ScoreAssignmentInput }

// ============================================
// GET ASSESSMENT STATS
// ============================================

export async function getAssessmentStats() {
    try {
        const auth = await requirePermission("view_candidates")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // Jobs with assignments enabled
        const jobsWithAssessmentsRows = await db
            .select({ count: count() })
            .from(jobs)
            .where(and(
                eq(jobs.companyId, member.companyId),
                eq(jobs.hasAssignment, true)
            ))
        const jobsWithAssessmentsResult = jobsWithAssessmentsRows[0]

        // Get company job IDs
        const companyJobIds = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        const jobIds = companyJobIds.map(j => j.id)

        let assignmentsSent = 0
        let submissions = 0
        let pendingReview = 0
        let averageScore = 0

        if (jobIds.length > 0) {
            const assignmentsSentRows = await db
                .select({ count: count() })
                .from(jobApplications)
                .where(and(
                    inArray(jobApplications.jobId, jobIds),
                    inArray(jobApplications.status, ["ASSIGNMENT_SENT", "ASSIGNMENT_SUBMITTED"])
                ))

            const submissionsRows = await db
                .select({ count: count() })
                .from(jobApplications)
                .where(and(
                    inArray(jobApplications.jobId, jobIds),
                    eq(jobApplications.status, "ASSIGNMENT_SUBMITTED")
                ))

            const pendingReviewRows = await db
                .select({ count: count() })
                .from(jobApplications)
                .where(and(
                    inArray(jobApplications.jobId, jobIds),
                    eq(jobApplications.status, "ASSIGNMENT_SUBMITTED"),
                    isNull(jobApplications.assignmentScore)
                ))

            // Get avg of non-null scores
            const avgScoreResultFixed = await db
                .select({ avg: avg(jobApplications.assignmentScore) })
                .from(jobApplications)
                .where(inArray(jobApplications.jobId, jobIds))

            assignmentsSent = assignmentsSentRows[0]?.count ?? 0
            submissions = submissionsRows[0]?.count ?? 0
            pendingReview = pendingReviewRows[0]?.count ?? 0
            averageScore = Number(avgScoreResultFixed[0]?.avg) || 0
        }

        return {
            success: true,
            data: {
                totalJobsWithAssignments: jobsWithAssessmentsResult?.count ?? 0,
                totalAssignmentsSent: assignmentsSent,
                totalSubmissions: submissions,
                pendingReview,
                averageScore
            } as AssignmentStats
        }
    } catch (error) {
        console.error("Error fetching assignment stats:", error)
        return { success: false, error: "Failed to fetch assignment stats" }
    }
}

// ============================================
// GET JOBS WITH ASSESSMENTS
// ============================================

export async function getJobsWithAssessments() {
    try {
        const auth = await requirePermission("view_candidates")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const jobList = await db.query.jobs.findMany({
            where: and(
                eq(jobs.companyId, member.companyId),
                eq(jobs.hasAssignment, true)
            ),
            columns: {
                id: true,
                title: true,
                slug: true,
                status: true,
                assignmentDetails: true,
                assignmentDeadlineDays: true,
                assignmentInstructions: true
            },
            with: {
                applications: {
                    where: (apps, { inArray }) => inArray(apps.status, ["ASSIGNMENT_SENT", "ASSIGNMENT_SUBMITTED"]),
                    columns: { id: true, status: true }
                }
            },
            orderBy: [desc(jobs.createdAt)]
        })

        // Get submission stats for each job
        const jobsWithStats = await Promise.all(jobList.map(async (job) => {
            const sent = job.applications.length
            const submitted = job.applications.filter(a => a.status === "ASSIGNMENT_SUBMITTED").length
            const pending = job.applications.filter(a => a.status === "ASSIGNMENT_SENT").length

            return {
                ...job,
                assignmentsSent: sent,
                submissionsReceived: submitted,
                pendingSubmissions: pending
            }
        }))

        return { success: true, data: jobsWithStats }
    } catch (error) {
        console.error("Error fetching jobs with assessments:", error)
        return { success: false, error: "Failed to fetch jobs" }
    }
}

// ============================================
// GET JOB ASSESSMENT DETAILS
// ============================================

export async function getJobAssessmentDetails(jobSlug: string) {
    try {
        const auth = await requirePermission("view_candidates")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const job = await db.query.jobs.findFirst({
            where: and(
                eq(jobs.slug, jobSlug),
                eq(jobs.companyId, member.companyId)
            ),
            with: {
                applications: {
                    where: (apps, { inArray }) => inArray(apps.status, ["ASSIGNMENT_SENT", "ASSIGNMENT_SUBMITTED", "SHORTLISTED"]),
                    orderBy: [desc(jobApplications.createdAt)]
                }
            }
        })

        if (!job) {
            return { success: false, error: "Job not found" }
        }

        // Fetch user info for each application
        const userIds = job.applications.map(a => a.userId)
        const userList = userIds.length > 0
            ? await db
                .select({ id: users.id, name: users.name, email: users.email, image: users.image })
                .from(users)
                .where(inArray(users.id, userIds))
            : []
        const userMap = new Map(userList.map(u => [u.id, u]))

        const enrichedApplications = job.applications.map((app) => ({
            ...app,
            user: userMap.get(app.userId) ?? null
        }))

        return { success: true, data: { ...job, applications: enrichedApplications } }
    } catch (error) {
        console.error("Error fetching job assessment details:", error)
        return { success: false, error: "Failed to fetch job details" }
    }
}

// ============================================
// UPDATE JOB ASSIGNMENT
// ============================================

export async function updateJobAssignment(
    jobId: string,
    data: {
        assignmentDetails?: AssignmentDetails
        assignmentInstructions?: string
        assignmentDeadlineDays?: number
    }
) {
    try {
        const auth = await requirePermission("invite_decline")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // Verify job belongs to company
        const existingJob = await db.query.jobs.findFirst({
            where: and(eq(jobs.id, jobId), eq(jobs.companyId, member.companyId))
        })

        if (!existingJob) {
            return { success: false, error: "Job not found" }
        }

        const updatedJobs = await db.update(jobs)
            .set({
                hasAssignment: true,
                assignmentDetails: data.assignmentDetails as unknown as undefined,
                assignmentInstructions: data.assignmentInstructions,
                assignmentDeadlineDays: data.assignmentDeadlineDays
            })
            .where(eq(jobs.id, jobId))
            .returning()

        const job = updatedJobs[0]
        if (!job) {
            return { success: false, error: "Failed to update job" }
        }

        revalidatePath("/assignments")
        revalidatePath(`/assignments/${job.slug}`)
        return { success: true, data: job }
    } catch (error) {
        console.error("Error updating job assignment:", error)
        return { success: false, error: "Failed to update assignment" }
    }
}

// ============================================
// SEND ASSIGNMENT TO CANDIDATE
// ============================================

export async function sendAssignmentToCandidate(applicationId: string) {
    try {
        const auth = await requirePermission("invite_decline")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const companyJobIds = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        const jobIds = companyJobIds.map(j => j.id)

        // Verify application belongs to company's job
        const application = await db.query.jobApplications.findFirst({
            where: and(
                eq(jobApplications.id, applicationId),
                inArray(jobApplications.jobId, jobIds.length > 0 ? jobIds : ["__none__"])
            ),
            with: {
                job: { columns: { hasAssignment: true } }
            }
        })

        if (!application) {
            return { success: false, error: "Application not found" }
        }

        if (!application.job.hasAssignment) {
            return { success: false, error: "Job does not have an assignment" }
        }

        // Update application status
        const [updated] = await db.update(jobApplications)
            .set({
                status: "ASSIGNMENT_SENT",
                assignmentStartedAt: new Date()
            })
            .where(eq(jobApplications.id, applicationId))
            .returning()

        // TODO: Send email notification to candidate

        revalidatePath("/assignments")
        revalidatePath("/applications")
        return { success: true, data: updated }
    } catch (error) {
        console.error("Error sending assignment:", error)
        return { success: false, error: "Failed to send assignment" }
    }
}

// ============================================
// SCORE ASSIGNMENT SUBMISSION
// ============================================

export async function scoreAssignment(
    applicationId: string,
    data: {
        score: number
        feedback: string
    }
) {
    try {
        const auth = await requirePermission("invite_decline")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const companyJobIds = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        const jobIds = companyJobIds.map(j => j.id)

        // Verify application belongs to company's job
        const application = await db.query.jobApplications.findFirst({
            where: and(
                eq(jobApplications.id, applicationId),
                inArray(jobApplications.jobId, jobIds.length > 0 ? jobIds : ["__none__"]),
                eq(jobApplications.status, "ASSIGNMENT_SUBMITTED")
            )
        })

        if (!application) {
            return { success: false, error: "Application not found or not submitted" }
        }

        const [updated] = await db.update(jobApplications)
            .set({
                assignmentScore: data.score,
                assignmentFeedback: data.feedback
            })
            .where(eq(jobApplications.id, applicationId))
            .returning()

        // TODO: Send email notification to candidate with results

        revalidatePath("/assignments")
        revalidatePath("/applications")
        return { success: true, data: updated }
    } catch (error) {
        console.error("Error scoring assignment:", error)
        return { success: false, error: "Failed to score assignment" }
    }
}

// ============================================
// GET ASSIGNMENT SUBMISSIONS
// ============================================

export async function getAssignmentSubmissions(jobSlug?: string) {
    try {
        const auth = await requirePermission("view_candidates")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

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
            return { success: true, data: [] }
        }

        const submissions = await db.query.jobApplications.findMany({
            where: and(
                inArray(jobApplications.jobId, jobIds),
                eq(jobApplications.status, "ASSIGNMENT_SUBMITTED")
            ),
            with: {
                job: {
                    columns: {
                        id: true,
                        title: true,
                        slug: true,
                        assignmentDetails: true,
                        assignmentDeadlineDays: true
                    }
                }
            },
            orderBy: [desc(jobApplications.assignmentSubmittedAt)]
        })

        // Fetch user info for each submission
        const userIds = submissions.map(s => s.userId)
        const userList = userIds.length > 0
            ? await db
                .select({ id: users.id, name: users.name, email: users.email, image: users.image })
                .from(users)
                .where(inArray(users.id, userIds))
            : []
        const userMap = new Map(userList.map(u => [u.id, u]))

        const enriched = submissions.map(s => ({
            ...s,
            user: userMap.get(s.userId) || null
        }))

        return { success: true, data: enriched }
    } catch (error) {
        console.error("Error fetching submissions:", error)
        return { success: false, error: "Failed to fetch submissions" }
    }
}
