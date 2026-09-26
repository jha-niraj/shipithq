"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db, importedJobs, interviewProcesses, withTransaction } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { canAddPipeline } from "@/lib/plan"
import { copyRounds, isUsableTemplate, pipelineReadiness } from "@/lib/pipelines"
import { loadImportedJobs, type ImportedJobsView } from "@/lib/imported-jobs"

/*
 * A verified company and the jobs students imported for it (plan/job-import
 * JI-9, Niraj 2026-09-26: "copy, then redirect"). Adopt copies the imported
 * pipeline into the company's own and points the import at the copy; Replace
 * points it at a pipeline the company already has; Undo points it back at the
 * one ShipItHQ built. Students practise whichever it points at from then on.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

const isVerified = (c: { claimStatus: string; verificationStatus: string }) => c.claimStatus === "CLAIMED" && c.verificationStatus === "VERIFIED"

export async function getImportedJobs(): Promise<Result<ImportedJobsView & { canManage: boolean }>> {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth
    try {
        const view = await loadImportedJobs(ctx.companyId, isVerified(ctx.member.company))
        return { success: true, data: { ...view, canManage: ctx.can("manage_pipelines") } }
    } catch (error: unknown) {
        console.error("getImportedJobs:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the imported jobs" }
    }
}

/** The import, if it's this company's, built, and the company is verified. */
async function ownImport(importId: string) {
    const auth = await requirePermission("manage_pipelines")
    if (!auth.ok) return { error: auth.error } as const
    const { ctx } = auth
    if (!isVerified(ctx.member.company)) return { error: "Verify your company to adopt imported jobs." } as const
    const row = await db.query.importedJobs.findFirst({ where: and(eq(importedJobs.id, importId), eq(importedJobs.companyId, ctx.companyId), eq(importedJobs.status, "READY")) })
    if (!row?.processId) return { error: "That imported job isn't yours to change." } as const
    return { ctx, row } as const
}

/** Copy the imported pipeline into the company's pipelines and send students to the copy. */
export async function adoptImport(importId: string): Promise<Result<{ pipelineId: string }>> {
    const found = await ownImport(importId)
    if ("error" in found) return { success: false, error: found.error! }
    const { ctx, row } = found
    try {
        // Already adopted: the copy it points at.
        if (row.companyProcessId) {
            const own = await db.query.interviewProcesses.findFirst({ where: and(eq(interviewProcesses.id, row.companyProcessId), eq(interviewProcesses.sourceTemplateId, row.processId!)), columns: { id: true } })
            if (own) return { success: true, data: { pipelineId: own.id } }
        }
        const room = await canAddPipeline(ctx.companyId)
        if (!room.ok) return { success: false, error: room.error }
        const title = row.extracted?.title ?? "Imported job"
        const pipelineId = await withTransaction(async (tx) => {
            const [created] = await tx.insert(interviewProcesses).values({
                companyId: ctx.companyId,
                ownerKind: "COMPANY",
                isTemplate: true,
                // Where it came from, so a second Adopt finds it.
                sourceTemplateId: row.processId,
                name: title.slice(0, 120),
                description: "Adopted from a job a student imported. Edit it like any of your pipelines.",
                isActive: true,
                updatedAt: new Date(),
            }).returning({ id: interviewProcesses.id })
            if (!created) throw new Error("Failed to create the pipeline")
            await copyRounds(tx, row.processId!, created.id)
            await tx.update(importedJobs).set({ companyProcessId: created.id, updatedAt: new Date() }).where(eq(importedJobs.id, row.id))
            return created.id
        })
        revalidatePath("/interview-config")
        return { success: true, data: { pipelineId } }
    } catch (error: unknown) {
        console.error("adoptImport:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not adopt the pipeline" }
    }
}

/** Send students of this import to one of the company's existing pipelines. It must be ready to use. */
export async function replaceImport(importId: string, pipelineId: string): Promise<Result<null>> {
    const found = await ownImport(importId)
    if ("error" in found) return { success: false, error: found.error! }
    const { ctx, row } = found
    try {
        const own = await db.query.interviewProcesses.findFirst({ where: and(eq(interviewProcesses.id, pipelineId), eq(interviewProcesses.companyId, ctx.companyId)), columns: { id: true } })
        if (!own || !(await isUsableTemplate(ctx.companyId, pipelineId))) return { success: false, error: "Choose one of your own pipelines." }
        const problems = await pipelineReadiness(pipelineId)
        if (problems.length) return { success: false, error: `That pipeline isn't ready yet. ${problems[0]}` }
        await db.update(importedJobs).set({ companyProcessId: pipelineId, updatedAt: new Date() }).where(eq(importedJobs.id, row.id))
        revalidatePath("/interview-config")
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("replaceImport:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not replace the pipeline" }
    }
}

/** Students go back to the pipeline ShipItHQ built. An adopted copy stays among the company's pipelines. */
export async function revertImport(importId: string): Promise<Result<null>> {
    const found = await ownImport(importId)
    if ("error" in found) return { success: false, error: found.error! }
    try {
        await db.update(importedJobs).set({ companyProcessId: null, updatedAt: new Date() }).where(eq(importedJobs.id, found.row.id))
        revalidatePath("/interview-config")
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("revertImport:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not undo that" }
    }
}
