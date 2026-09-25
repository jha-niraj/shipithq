"use server"

import { db, companyMembers, interviewProcesses, interviewRounds } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { InterviewRoundInput } from "@/types"

// Re-export types for backwards compatibility
export type { InterviewRoundInput } from "@/types"

// ============================================
// INTERVIEW ROUND MANAGEMENT
// ============================================

// Add a round to an interview process
export async function addInterviewRound(processId: string, round: InterviewRoundInput) {
    try {
        const auth = await requirePermission("manage_pipelines")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // Verify the process belongs to this company
        const existingProcess = await db.query.interviewProcesses.findFirst({
            where: and(
                eq(interviewProcesses.id, processId),
                eq(interviewProcesses.companyId, member.companyId)
            )
        })

        if (!existingProcess) {
            return { success: false, error: "Interview process not found" }
        }

        const [newRound] = await db.insert(interviewRounds).values({
            processId,
            roundNumber: round.roundNumber,
            roundType: round.roundType,
            title: round.title,
            durationMinutes: round.durationMinutes,
            format: round.format ?? "VIDEO",
            description: round.description,
            whatToExpect: round.whatToExpect ?? [],
            sampleQuestions: round.sampleQuestions ?? [],
            evaluationCriteria: round.evaluationCriteria ?? [],
            topicsCovered: round.topicsCovered ?? [],
            tipsForCandidates: round.tipsForCandidates ?? [],
            passRatePercent: round.passRatePercent,
            daysToNextRound: round.daysToNextRound,
            hasMockInterview: round.hasMockInterview ?? true,
            mockKnowledgeBase: round.mockKnowledgeBase
        }).returning()

        revalidatePath("/interview-config")
        return { success: true, data: newRound }
    } catch (error) {
        console.error("Error adding interview round:", error)
        return { success: false, error: "Failed to add interview round" }
    }
}

// Update an interview round
export async function updateInterviewRound(roundId: string, input: Partial<InterviewRoundInput>) {
    try {
        const auth = await requirePermission("manage_pipelines")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // Verify the round belongs to this company
        const existingRound = await db.query.interviewRounds.findFirst({
            where: eq(interviewRounds.id, roundId),
            with: {
                process: {
                    columns: { companyId: true }
                }
            }
        })

        if (!existingRound || existingRound.process.companyId !== member.companyId) {
            return { success: false, error: "Interview round not found" }
        }

        const updateData: Record<string, unknown> = {}
        if (input.roundNumber !== undefined) updateData.roundNumber = input.roundNumber
        if (input.roundType !== undefined) updateData.roundType = input.roundType
        if (input.title !== undefined) updateData.title = input.title
        if (input.durationMinutes !== undefined) updateData.durationMinutes = input.durationMinutes
        if (input.format !== undefined) updateData.format = input.format
        if (input.description !== undefined) updateData.description = input.description
        if (input.whatToExpect !== undefined) updateData.whatToExpect = input.whatToExpect
        if (input.sampleQuestions !== undefined) updateData.sampleQuestions = input.sampleQuestions
        if (input.evaluationCriteria !== undefined) updateData.evaluationCriteria = input.evaluationCriteria
        if (input.topicsCovered !== undefined) updateData.topicsCovered = input.topicsCovered
        if (input.tipsForCandidates !== undefined) updateData.tipsForCandidates = input.tipsForCandidates
        if (input.passRatePercent !== undefined) updateData.passRatePercent = input.passRatePercent
        if (input.daysToNextRound !== undefined) updateData.daysToNextRound = input.daysToNextRound
        if (input.hasMockInterview !== undefined) updateData.hasMockInterview = input.hasMockInterview
        if (input.mockKnowledgeBase !== undefined) updateData.mockKnowledgeBase = input.mockKnowledgeBase

        const [round] = await db.update(interviewRounds)
            .set(updateData)
            .where(eq(interviewRounds.id, roundId))
            .returning()

        revalidatePath("/interview-config")
        return { success: true, data: round }
    } catch (error) {
        console.error("Error updating interview round:", error)
        return { success: false, error: "Failed to update interview round" }
    }
}

// Delete an interview round
export async function deleteInterviewRound(roundId: string) {
    try {
        const auth = await requirePermission("manage_pipelines")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // Verify the round belongs to this company
        const existingRound = await db.query.interviewRounds.findFirst({
            where: eq(interviewRounds.id, roundId),
            with: {
                process: {
                    columns: { companyId: true }
                }
            }
        })

        if (!existingRound || existingRound.process.companyId !== member.companyId) {
            return { success: false, error: "Interview round not found" }
        }

        await db.delete(interviewRounds).where(eq(interviewRounds.id, roundId))

        revalidatePath("/interview-config")
        return { success: true }
    } catch (error) {
        console.error("Error deleting interview round:", error)
        return { success: false, error: "Failed to delete interview round" }
    }
}

// Reorder interview rounds
export async function reorderInterviewRounds(processId: string, roundIds: string[]) {
    try {
        const auth = await requirePermission("manage_pipelines")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // Verify the process belongs to this company
        const existingProcess = await db.query.interviewProcesses.findFirst({
            where: and(
                eq(interviewProcesses.id, processId),
                eq(interviewProcesses.companyId, member.companyId)
            )
        })

        if (!existingProcess) {
            return { success: false, error: "Interview process not found" }
        }

        // Update each round with new order
        await Promise.all(
            roundIds.map((roundId, index) =>
                db.update(interviewRounds)
                    .set({ roundNumber: index + 1 })
                    .where(eq(interviewRounds.id, roundId))
            )
        )

        revalidatePath("/interview-config")
        return { success: true }
    } catch (error) {
        console.error("Error reordering interview rounds:", error)
        return { success: false, error: "Failed to reorder rounds" }
    }
}
