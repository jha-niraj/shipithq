"use server"

import { and, count, eq, gte } from "drizzle-orm"
import { db, companyAiUsage, hiringSends, jobs, users } from "@repo/db"
import type { SendSnapshot, SentProfile } from "@repo/db/hiring-send-types"
import { HIRING_AI_LIMITS } from "@repo/pricing"
import { requirePermission } from "@/lib/permissions"
import { lockedSendIds } from "@/lib/plan"
import { LOCKED_SEND } from "@/lib/sends"
import { decide, draftFeedback, setCompanyOutcome, type Decision, type Outcome } from "@/lib/decisions"

/*
 * Invite, decline and outcomes from the candidate workspace (plan/hiring-rounds
 * HR-19), gated on "invite or decline". Drafting uses AI, so it also needs
 * "use AI" and counts against the company's daily limit.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }
const DAY_MS = 86_400_000

export async function draftFeedbackAction(sendId: string, decision: Decision, teamNote: string): Promise<Result<{ message: string }>> {
    const auth = await requirePermission("invite_decline")
    if (!auth.ok) return { success: false, error: auth.error }
    if (!auth.ctx.can("use_ai")) return { success: false, error: "Your role can't use AI drafting. Write the message yourself, or ask your company's owner." }
    if (decision !== "INVITE" && decision !== "DECLINE") return { success: false, error: "Choose invite or decline." }
    try {
        const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(companyAiUsage)
            .where(and(eq(companyAiUsage.companyId, auth.ctx.companyId), eq(companyAiUsage.kind, "feedback_draft"), gte(companyAiUsage.createdAt, new Date(Date.now() - DAY_MS))))
        if (n >= HIRING_AI_LIMITS.feedbackDraftsPerDay) return { success: false, error: `Your company has used today's ${HIRING_AI_LIMITS.feedbackDraftsPerDay} feedback drafts. Write this one yourself, or try tomorrow.` }
        const send = await db.query.hiringSends.findFirst({ where: and(eq(hiringSends.id, sendId), eq(hiringSends.companyId, auth.ctx.companyId)), columns: { snapshot: true, profile: true, jobId: true, status: true } })
        if (!send || send.status === "WITHDRAWN") return { success: false, error: "That candidate is no longer available." }
        if ((await lockedSendIds(auth.ctx.companyId)).has(sendId)) return { success: false, error: LOCKED_SEND }
        const job = await db.query.jobs.findFirst({ where: eq(jobs.id, send.jobId), columns: { title: true } })
        const message = await draftFeedback({
            decision, teamNote: typeof teamNote === "string" ? teamNote.slice(0, 1000) : "",
            companyName: auth.ctx.member.company.name, jobTitle: job?.title ?? "the role",
            profile: send.profile as SentProfile, snapshot: send.snapshot as SendSnapshot,
        })
        await db.insert(companyAiUsage).values({ companyId: auth.ctx.companyId, userId: auth.ctx.userId, kind: "feedback_draft" })
        return { success: true, data: { message } }
    } catch (error: unknown) {
        console.error("draftFeedbackAction:", error instanceof Error ? error.message : error)
        return { success: false, error: "The draft didn't come back. Try again, or write it yourself." }
    }
}

export async function decideAction(sendId: string, decision: Decision, message: string, teamNote: string): Promise<Result<null>> {
    const auth = await requirePermission("invite_decline")
    if (!auth.ok) return { success: false, error: auth.error }
    if (decision !== "INVITE" && decision !== "DECLINE") return { success: false, error: "Choose invite or decline." }
    try {
        const [u] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, auth.ctx.userId))
        const r = await decide({
            companyId: auth.ctx.companyId,
            companyName: auth.ctx.member.company.name,
            member: { userId: auth.ctx.userId, name: u?.name ?? "The hiring team", email: u?.email ?? auth.ctx.member.email },
            sendId, decision,
            message: typeof message === "string" ? message : "",
            teamNote: typeof teamNote === "string" ? teamNote : "",
        })
        return r.ok ? { success: true, data: null } : { success: false, error: r.error }
    } catch (error: unknown) {
        console.error("decideAction:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not send the decision" }
    }
}

export async function setOutcomeAction(sendId: string, outcome: Outcome): Promise<Result<null>> {
    const auth = await requirePermission("invite_decline")
    if (!auth.ok) return { success: false, error: auth.error }
    try {
        const r = await setCompanyOutcome({ companyId: auth.ctx.companyId, companyName: auth.ctx.member.company.name, sendId, outcome })
        return r.ok ? { success: true, data: null } : { success: false, error: r.error }
    } catch (error: unknown) {
        console.error("setOutcomeAction:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not save the outcome" }
    }
}
