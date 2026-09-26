"use server"

import { and, asc, eq, or } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db, withTransaction, interviewProcesses, jobs } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { createJobCopy, isUsableTemplate, pipelineReadiness, runsUsing } from "@/lib/pipelines"

/*
 * A job's pipeline (plan/hiring-rounds HR-12, "copy when chosen", Niraj
 * 2026-09-25). Picking a template copies it into the job's own pipeline, so a
 * template edit never reaches a live job. The job's copy is edited in the same
 * builder, at /jobs/[slug]/pipeline.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

export interface PipelineChoice {
    id: string
    name: string
    byShipItHQ: boolean
    rounds: { title: string; roundType: string; gateMode: string; passMark: number }[]
}

export interface JobPipeline {
    id: string
    name: string
    sourceId: string | null
    sourceName: string | null
    rounds: { title: string; roundType: string; gateMode: string; passMark: number }[]
    /** Why a published job can't use it yet; empty means ready. */
    problems: string[]
    runs: number
}

/** The templates a job can start from: the company's own first, then ShipItHQ's. */
export async function getPipelineChoices(): Promise<Result<PipelineChoice[]>> {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    try {
        const rows = await db.query.interviewProcesses.findMany({
            where: and(
                eq(interviewProcesses.isTemplate, true),
                eq(interviewProcesses.isActive, true),
                or(eq(interviewProcesses.companyId, auth.ctx.companyId), eq(interviewProcesses.ownerKind, "PLATFORM")),
            ),
            with: { rounds: { columns: { title: true, roundType: true, gateMode: true, passMark: true, roundNumber: true } } },
            orderBy: [asc(interviewProcesses.name)],
        })
        const choices = rows.map((p) => ({
            id: p.id,
            name: p.name,
            byShipItHQ: p.ownerKind === "PLATFORM",
            rounds: [...p.rounds].sort((a, b) => a.roundNumber - b.roundNumber).map(({ roundNumber: _n, ...r }) => r),
        }))
        return { success: true, data: [...choices.filter((c) => !c.byShipItHQ), ...choices.filter((c) => c.byShipItHQ)] }
    } catch (error: unknown) {
        console.error("getPipelineChoices:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the pipelines" }
    }
}

/**
 * Give a job its own copy of `templateId`, replacing any pipeline it had. The
 * old copy is deleted only if no candidate has started it; otherwise it stays
 * for their runs.
 */
export async function assignJobPipeline(jobId: string, templateId: string): Promise<Result<{ pipelineId: string }>> {
    const auth = await requirePermission("manage_jobs")
    if (!auth.ok) return { success: false, error: auth.error }
    const { companyId } = auth.ctx
    try {
        const job = await db.query.jobs.findFirst({ where: and(eq(jobs.id, jobId), eq(jobs.companyId, companyId)), columns: { id: true, slug: true, interviewProcessId: true } })
        if (!job) return { success: false, error: "Job not found" }
        if (!(await isUsableTemplate(companyId, templateId))) return { success: false, error: "That pipeline isn't available." }
        const old = job.interviewProcessId
            ? await db.query.interviewProcesses.findFirst({ where: eq(interviewProcesses.id, job.interviewProcessId), columns: { id: true, isTemplate: true, jobId: true } })
            : null
        const dropOld = Boolean(old && !old.isTemplate && old.jobId === jobId && (await runsUsing(db, old.id)) === 0)

        const pipelineId = await withTransaction(async (tx) => {
            const copyId = await createJobCopy(tx, { sourceId: templateId, companyId, jobId })
            await tx.update(jobs).set({ interviewProcessId: copyId }).where(eq(jobs.id, jobId))
            if (dropOld && old) await tx.delete(interviewProcesses).where(eq(interviewProcesses.id, old.id))
            return copyId
        })
        revalidatePath("/jobs")
        revalidatePath(`/jobs/${job.slug}/edit`)
        return { success: true, data: { pipelineId } }
    } catch (error: unknown) {
        console.error("assignJobPipeline:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not set the job's pipeline" }
    }
}

/** A job's own pipeline with its rounds and whether it's ready to publish. */
export async function getJobPipeline(jobId: string): Promise<Result<JobPipeline | null>> {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    try {
        const job = await db.query.jobs.findFirst({ where: and(eq(jobs.id, jobId), eq(jobs.companyId, auth.ctx.companyId)), columns: { interviewProcessId: true } })
        if (!job) return { success: false, error: "Job not found" }
        if (!job.interviewProcessId) return { success: true, data: null }
        const p = await db.query.interviewProcesses.findFirst({
            where: eq(interviewProcesses.id, job.interviewProcessId),
            with: { rounds: { columns: { title: true, roundType: true, gateMode: true, passMark: true, roundNumber: true } } },
        })
        if (!p) return { success: true, data: null }
        const source = p.sourceTemplateId ? await db.query.interviewProcesses.findFirst({ where: eq(interviewProcesses.id, p.sourceTemplateId), columns: { name: true } }) : null
        return {
            success: true,
            data: {
                id: p.id,
                name: p.name,
                sourceId: p.sourceTemplateId,
                sourceName: source?.name ?? null,
                rounds: [...p.rounds].sort((a, b) => a.roundNumber - b.roundNumber).map(({ roundNumber: _n, ...r }) => r),
                problems: await pipelineReadiness(p.id),
                runs: await runsUsing(db, p.id),
            },
        }
    } catch (error: unknown) {
        console.error("getJobPipeline:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the job's pipeline" }
    }
}
