"use server"

import { requirePermission } from "@/lib/permissions"
import { LOCKED_SEND, candidatesFor, jobSendsFor, rolesFor, sendFor, type CandidateRow, type JobSends, type RoleSends, type SendDetail } from "@/lib/sends"

/*
 * A company's received results (plan/hiring-rounds HR-18), gated on "view
 * candidates" and scoped to the member's company. The queries live in
 * lib/sends.ts; withdrawn sends never appear, and opening one marks it VIEWED.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

export async function listJobSends(jobSlug: string): Promise<Result<JobSends>> {
    const auth = await requirePermission("view_candidates")
    if (!auth.ok) return { success: false, error: auth.error }
    try {
        const data = await jobSendsFor(auth.ctx.companyId, jobSlug)
        return data ? { success: true, data } : { success: false, error: "That role doesn't exist." }
    } catch (error: unknown) {
        console.error("listJobSends:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the candidates" }
    }
}

export async function getSend(sendId: string): Promise<Result<SendDetail>> {
    const auth = await requirePermission("view_candidates")
    if (!auth.ok) return { success: false, error: auth.error }
    try {
        const data = await sendFor(auth.ctx.companyId, auth.ctx.member.company.name, sendId)
        return data ? { success: true, data } : { success: false, error: "That candidate is no longer available." }
    } catch (error: unknown) {
        if (error instanceof Error && error.message === LOCKED_SEND) return { success: false, error: LOCKED_SEND }
        console.error("getSend:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the candidate" }
    }
}

/** Up to three sends in full, for the compare view. */
export async function getSendsForCompare(sendIds: string[]): Promise<Result<SendDetail[]>> {
    const out: SendDetail[] = []
    for (const id of [...new Set(sendIds)].slice(0, 3)) {
        const r = await getSend(id)
        if (!r.success) return r
        out.push(r.data)
    }
    return { success: true, data: out }
}

export async function listRolesWithSends(): Promise<Result<RoleSends[]>> {
    const auth = await requirePermission("view_candidates")
    if (!auth.ok) return { success: false, error: auth.error }
    try {
        return { success: true, data: await rolesFor(auth.ctx.companyId) }
    } catch (error: unknown) {
        console.error("listRolesWithSends:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load your roles" }
    }
}

export async function listCandidates(): Promise<Result<CandidateRow[]>> {
    const auth = await requirePermission("view_candidates")
    if (!auth.ok) return { success: false, error: auth.error }
    try {
        return { success: true, data: await candidatesFor(auth.ctx.companyId) }
    } catch (error: unknown) {
        console.error("listCandidates:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the candidates" }
    }
}
