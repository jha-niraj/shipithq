"use server"

import { db, companyMembers, jobs, jobApplications } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { eq, and, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// ============================================
// CANDIDATE STATUS MANAGEMENT
// ============================================

// Update candidate status
export async function updateCandidateStatus(
    applicationId: string,
    newStatus: "INTERESTED" | "PREPARING" | "APPLIED" | "UNDER_REVIEW" | "SHORTLISTED" | "ASSIGNMENT_SENT" | "ASSIGNMENT_SUBMITTED" | "INTERVIEW_SCHEDULED" | "INTERVIEWED" | "OFFER_EXTENDED" | "HIRED" | "REJECTED" | "WITHDRAWN",
    notes?: string
) {
    try {
        const auth = await requirePermission("invite_decline")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // Verify this application belongs to our company
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

        // Update application status
        const [updated] = await db.update(jobApplications)
            .set({
                status: newStatus,
                reviewedById: member.id,
                reviewedAt: new Date(),
                ...(notes ? { hrNotes: notes } : {})
            })
            .where(eq(jobApplications.id, applicationId))
            .returning()

        revalidatePath("/candidates")
        revalidatePath("/applications")

        return { success: true, data: updated }
    } catch (error) {
        console.error("Error updating candidate status:", error)
        return { success: false, error: "Failed to update status" }
    }
}

// Add note to candidate
export async function addCandidateNote(applicationId: string, note: string) {
    try {
        const auth = await requirePermission("view_candidates")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // Verify this application belongs to our company
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

        // Add note to hrNotes field, appending to existing notes
        const existingNotes = application.hrNotes || ""
        const timestamp = new Date().toISOString()
        const newNoteEntry = `[${timestamp}] ${note}`
        const updatedNotes = existingNotes
            ? `${existingNotes}\n${newNoteEntry}`
            : newNoteEntry

        await db.update(jobApplications)
            .set({ hrNotes: updatedNotes })
            .where(eq(jobApplications.id, applicationId))

        revalidatePath("/candidates")

        return { success: true }
    } catch (error) {
        console.error("Error adding note:", error)
        return { success: false, error: "Failed to add note" }
    }
}

// Reject candidate with mandatory feedback
export async function rejectCandidate(applicationId: string, feedback: string, reason: string) {
    try {
        const auth = await requirePermission("invite_decline")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        if (!feedback || feedback.trim().length < 20) {
            return { success: false, error: "Feedback must be at least 20 characters" }
        }

        // Verify this application belongs to our company
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

        // Update application with rejection
        const existingNotes = application.hrNotes || ""
        const timestamp = new Date().toISOString()
        const rejectionNote = `[${timestamp}] REJECTED - Reason: ${reason}\nFeedback: ${feedback}`
        const updatedNotes = existingNotes
            ? `${existingNotes}\n${rejectionNote}`
            : rejectionNote

        const [updated] = await db.update(jobApplications)
            .set({
                status: "REJECTED",
                rejectionReason: reason,
                hrNotes: updatedNotes,
                reviewedById: member.id,
                reviewedAt: new Date()
            })
            .where(eq(jobApplications.id, applicationId))
            .returning()

        revalidatePath("/candidates")
        revalidatePath("/applications")

        return { success: true, data: updated }
    } catch (error) {
        console.error("Error rejecting candidate:", error)
        return { success: false, error: "Failed to reject candidate" }
    }
}
