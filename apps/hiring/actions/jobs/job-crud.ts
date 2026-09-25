"use server"

import { db, companyMembers, jobs, interviewProcesses, interviewRounds } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { eq, and, desc, inArray, ilike, or, asc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { CreateJobInput } from "@/types"

// ============================================
// HELPERS
// ============================================

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36)
}

// ============================================
// JOB CRUD
// ============================================

export async function createJob(input: CreateJobInput) {
    try {
        const auth = await requirePermission("manage_jobs")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const slug = generateSlug(input.title)

        const [job] = await db.insert(jobs).values({
            companyId: member.companyId,
            postedById: member.id,
            title: input.title,
            slug,
            description: input.description,
            requirements: input.requirements || [],
            responsibilities: input.responsibilities || [],
            benefits: input.benefits || [],
            location: input.location,
            locationType: input.locationType,
            employmentType: input.employmentType,
            experienceMin: input.experienceMin,
            experienceMax: input.experienceMax,
            salaryMin: input.salaryMin,
            salaryMax: input.salaryMax,
            salaryCurrency: input.salaryCurrency || "INR",
            salaryDisclosed: input.salaryDisclosed ?? true,
            skillsRequired: input.skillsRequired || [],
            skillsPreferred: input.skillsPreferred || [],
            hasAssignment: input.hasAssignment || false,
            assignmentDetails: input.assignmentDetails,
            assignmentDeadlineDays: input.assignmentDeadlineDays,
            interviewProcessId: input.interviewProcessId,
            customQuestions: JSON.parse(JSON.stringify(input.customQuestions || [])),
            visibility: input.visibility || "PUBLIC",
            status: input.status || "DRAFT"
        }).returning()

        revalidatePath("/jobs")
        return { success: true, data: job }
    } catch (error) {
        console.error("Error creating job:", error)
        return { success: false, error: "Failed to create job" }
    }
}

export async function updateJob(jobId: string, input: Partial<CreateJobInput>) {
    try {
        const auth = await requirePermission("manage_jobs")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // Verify job belongs to company
        const existingJob = await db.query.jobs.findFirst({
            where: and(eq(jobs.id, jobId), eq(jobs.companyId, member.companyId))
        })

        if (!existingJob) {
            return { success: false, error: "Job not found" }
        }

        const updateData: Record<string, unknown> = {}
        if (input.title !== undefined) updateData.title = input.title
        if (input.description !== undefined) updateData.description = input.description
        if (input.requirements !== undefined) updateData.requirements = input.requirements
        if (input.responsibilities !== undefined) updateData.responsibilities = input.responsibilities
        if (input.benefits !== undefined) updateData.benefits = input.benefits
        if (input.location !== undefined) updateData.location = input.location
        if (input.locationType !== undefined) updateData.locationType = input.locationType
        if (input.employmentType !== undefined) updateData.employmentType = input.employmentType
        if (input.experienceMin !== undefined) updateData.experienceMin = input.experienceMin
        if (input.experienceMax !== undefined) updateData.experienceMax = input.experienceMax
        if (input.salaryMin !== undefined) updateData.salaryMin = input.salaryMin
        if (input.salaryMax !== undefined) updateData.salaryMax = input.salaryMax
        if (input.salaryCurrency !== undefined) updateData.salaryCurrency = input.salaryCurrency
        if (input.salaryDisclosed !== undefined) updateData.salaryDisclosed = input.salaryDisclosed
        if (input.skillsRequired !== undefined) updateData.skillsRequired = input.skillsRequired
        if (input.skillsPreferred !== undefined) updateData.skillsPreferred = input.skillsPreferred
        if (input.hasAssignment !== undefined) updateData.hasAssignment = input.hasAssignment
        if (input.assignmentDetails !== undefined) updateData.assignmentDetails = input.assignmentDetails
        if (input.assignmentDeadlineDays !== undefined) updateData.assignmentDeadlineDays = input.assignmentDeadlineDays
        if (input.interviewProcessId !== undefined) updateData.interviewProcessId = input.interviewProcessId
        if (input.customQuestions !== undefined) updateData.customQuestions = JSON.parse(JSON.stringify(input.customQuestions))
        if (input.visibility !== undefined) updateData.visibility = input.visibility
        if (input.status !== undefined) updateData.status = input.status

        const updatedJobs = await db.update(jobs)
            .set(updateData)
            .where(eq(jobs.id, jobId))
            .returning()

        const job = updatedJobs[0]
        if (!job) return { success: false, error: "Failed to update job" }

        revalidatePath("/jobs")
        revalidatePath(`/jobs/${job.slug}`)
        return { success: true, data: job }
    } catch (error) {
        console.error("Error updating job:", error)
        return { success: false, error: "Failed to update job" }
    }
}

export async function getJobs(filters: {
    status?: string[]
    search?: string
} = {}) {
    try {
        const auth = await requirePermission()
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const conditions = [eq(jobs.companyId, member.companyId)]

        if (filters.status && filters.status.length > 0) {
            conditions.push(inArray(jobs.status, filters.status as ("DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED" | "FILLED")[]))
        }

        if (filters.search) {
            conditions.push(
                or(
                    ilike(jobs.title, `%${filters.search}%`),
                    ilike(jobs.description, `%${filters.search}%`)
                )!
            )
        }

        const jobList = await db.query.jobs.findMany({
            where: and(...conditions),
            with: {
                postedBy: {
                    columns: {
                        displayName: true,
                        email: true
                    }
                },
                applications: {
                    columns: { id: true }
                }
            },
            orderBy: [desc(jobs.createdAt)]
        })

        // Get interview process info separately since it's not in jobsRelations
        const processIds = [...new Set(jobList.map(j => j.interviewProcessId).filter(Boolean))] as string[]
        const processMap = new Map<string, { id: string; name: string; rounds: { id: string; roundNumber: number; roundType: string; title: string }[] }>()
        if (processIds.length > 0) {
            const processList = await db.query.interviewProcesses.findMany({
                where: inArray(interviewProcesses.id, processIds),
                with: {
                    rounds: {
                        orderBy: [asc(interviewRounds.roundNumber)],
                        columns: { id: true, roundNumber: true, roundType: true, title: true }
                    }
                },
                columns: { id: true, name: true }
            })
            for (const p of processList) {
                processMap.set(p.id, p)
            }
        }

        const jobsWithCount = jobList.map(job => ({
            ...job,
            interviewProcess: job.interviewProcessId ? processMap.get(job.interviewProcessId) ?? null : null,
            _count: { applications: job.applications.length }
        }))

        return { success: true, data: jobsWithCount }
    } catch (error) {
        console.error("Error fetching jobs:", error)
        return { success: false, error: "Failed to fetch jobs" }
    }
}

export async function getJobById(jobId: string) {
    try {
        const auth = await requirePermission()
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const job = await db.query.jobs.findFirst({
            where: and(eq(jobs.id, jobId), eq(jobs.companyId, member.companyId)),
            with: {
                postedBy: {
                    columns: {
                        displayName: true,
                        email: true
                    }
                },
                applications: {
                    columns: { id: true }
                }
            }
        })

        if (!job) {
            return { success: false, error: "Job not found" }
        }

        // Get interview process separately
        const interviewProcess = job.interviewProcessId
            ? await db.query.interviewProcesses.findFirst({
                where: eq(interviewProcesses.id, job.interviewProcessId),
                with: { rounds: { orderBy: [asc(interviewRounds.roundNumber)] } }
              })
            : null

        return { success: true, data: { ...job, interviewProcess, _count: { applications: job.applications.length } } }
    } catch (error) {
        console.error("Error fetching job:", error)
        return { success: false, error: "Failed to fetch job" }
    }
}

export async function getJobBySlug(slug: string) {
    try {
        const auth = await requirePermission()
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const job = await db.query.jobs.findFirst({
            where: and(eq(jobs.slug, slug), eq(jobs.companyId, member.companyId)),
            with: {
                postedBy: {
                    columns: {
                        displayName: true,
                        email: true
                    }
                },
                applications: {
                    columns: { id: true }
                }
            }
        })

        if (!job) {
            return { success: false, error: "Job not found" }
        }

        // Get interview process separately
        const interviewProcess = job.interviewProcessId
            ? await db.query.interviewProcesses.findFirst({
                where: eq(interviewProcesses.id, job.interviewProcessId),
                with: { rounds: { orderBy: [asc(interviewRounds.roundNumber)] } }
              })
            : null

        return { success: true, data: { ...job, interviewProcess, _count: { applications: job.applications.length } } }
    } catch (error) {
        console.error("Error fetching job:", error)
        return { success: false, error: "Failed to fetch job" }
    }
}

export async function deleteJob(jobId: string) {
    try {
        const auth = await requirePermission("manage_jobs")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        await db.delete(jobs).where(and(eq(jobs.id, jobId), eq(jobs.companyId, member.companyId)))

        revalidatePath("/jobs")
        return { success: true }
    } catch (error) {
        console.error("Error deleting job:", error)
        return { success: false, error: "Failed to delete job" }
    }
}
