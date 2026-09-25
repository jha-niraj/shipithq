"use server"

import { db, companyMembers, jobs } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
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

        await db.update(jobs)
            .set({
                status: "ACTIVE",
                publishedAt: new Date()
            })
            .where(and(eq(jobs.id, jobId), eq(jobs.companyId, member.companyId)))

        revalidatePath("/jobs")
        return { success: true }
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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

        const [newJob] = await db.insert(jobs).values({
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
            interviewProcessId: originalJob.interviewProcessId,
            visibility: originalJob.visibility,
            status: "DRAFT"
        }).returning()

        revalidatePath("/jobs")
        return { success: true, data: newJob }
    } catch (error) {
        console.error("Error duplicating job:", error)
        return { success: false, error: "Failed to duplicate job" }
    }
}
