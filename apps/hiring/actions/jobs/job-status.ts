"use server"

import { db, companyMembers, jobs, withTransaction } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { canPublishJob } from "@/lib/plan"
import { createJobCopy, pipelineReadiness } from "@/lib/pipelines"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

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
// JOB STATUS MANAGEMENT
// ============================================

export async function publishJob(jobId: string) {
    try {
        const auth = await requirePermission("manage_jobs")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // A live job needs a ready pipeline: candidates take its rounds (HR-12).
        const job = await db.query.jobs.findFirst({ where: and(eq(jobs.id, jobId), eq(jobs.companyId, member.companyId)), columns: { interviewProcessId: true, adminHiddenAt: true } })
        if (!job) return { success: false, error: "Job not found" }
        // Hidden by ShipItHQ after a report (HR-24): only an admin can bring it back.
        if (job.adminHiddenAt) return { success: false, error: "ShipItHQ has hidden this job after a report, so it can't be published. Write to support@shipithq.com." }
        // The plan's live-job limit (plan/hiring-app HA-20).
        const room = await canPublishJob(member.companyId, jobId)
        if (!room.ok) return { success: false, error: room.error }
        if (!job.interviewProcessId) return { success: false, error: "Pick a pipeline for this job before publishing it." }
        const problems = await pipelineReadiness(job.interviewProcessId)
        if (problems.length) return { success: false, error: `The pipeline isn't ready: ${problems[0]}` }

        await db.update(jobs)
            .set({
                status: "ACTIVE",
                publishedAt: new Date()
            })
            .where(and(eq(jobs.id, jobId), eq(jobs.companyId, member.companyId)))

        revalidatePath("/jobs")
        return { success: true }
    } catch (error: unknown) {
        console.error("Error publishing job:", error)
        return { success: false, error: "Failed to publish job" }
    }
}

export async function pauseJob(jobId: string) {
    try {
        const auth = await requirePermission("manage_jobs")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        await db.update(jobs)
            .set({ status: "PAUSED" })
            .where(and(eq(jobs.id, jobId), eq(jobs.companyId, member.companyId)))

        revalidatePath("/jobs")
        return { success: true }
    } catch (error: unknown) {
        console.error("Error pausing job:", error)
        return { success: false, error: "Failed to pause job" }
    }
}

export async function closeJob(jobId: string) {
    try {
        const auth = await requirePermission("manage_jobs")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        await db.update(jobs)
            .set({ status: "CLOSED" })
            .where(and(eq(jobs.id, jobId), eq(jobs.companyId, member.companyId)))

        revalidatePath("/jobs")
        return { success: true }
    } catch (error: unknown) {
        console.error("Error closing job:", error)
        return { success: false, error: "Failed to close job" }
    }
}

export async function duplicateJob(jobId: string) {
    try {
        const auth = await requirePermission("manage_jobs")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const originalJob = await db.query.jobs.findFirst({
            where: and(eq(jobs.id, jobId), eq(jobs.companyId, member.companyId))
        })

        if (!originalJob) {
            return { success: false, error: "Job not found" }
        }

        const newSlug = generateSlug(originalJob.title + " Copy")

        const newJob = await withTransaction(async (tx) => {
            const [created] = await tx.insert(jobs).values({
                companyId: member.companyId,
                postedById: member.id,
                title: originalJob.title + " (Copy)",
                slug: newSlug,
                description: originalJob.description,
                requirements: originalJob.requirements as string[],
                responsibilities: originalJob.responsibilities as string[],
                benefits: originalJob.benefits as string[],
                location: originalJob.location,
                locationType: originalJob.locationType,
                employmentType: originalJob.employmentType,
                experienceMin: originalJob.experienceMin,
                experienceMax: originalJob.experienceMax,
                salaryMin: originalJob.salaryMin,
                salaryMax: originalJob.salaryMax,
                salaryCurrency: originalJob.salaryCurrency,
                salaryDisclosed: originalJob.salaryDisclosed,
                skillsRequired: originalJob.skillsRequired as string[],
                skillsPreferred: originalJob.skillsPreferred as string[],
                hasAssignment: originalJob.hasAssignment,
                assignmentDetails: originalJob.assignmentDetails ?? undefined,
                assignmentDeadlineDays: originalJob.assignmentDeadlineDays,
                // Its own copy of the original's pipeline, never a shared one (HR-12).
                interviewProcessId: null,
                visibility: originalJob.visibility,
                status: "DRAFT"
            }).returning()
            if (!created) throw new Error("Failed to duplicate job")
            if (originalJob.interviewProcessId) {
                const copyId = await createJobCopy(tx, { sourceId: originalJob.interviewProcessId, companyId: member.companyId, jobId: created.id })
                await tx.update(jobs).set({ interviewProcessId: copyId }).where(eq(jobs.id, created.id))
                return { ...created, interviewProcessId: copyId }
            }
            return created
        })

        revalidatePath("/jobs")
        return { success: true, data: newJob }
    } catch (error: unknown) {
        console.error("Error duplicating job:", error)
        return { success: false, error: "Failed to duplicate job" }
    }
}
