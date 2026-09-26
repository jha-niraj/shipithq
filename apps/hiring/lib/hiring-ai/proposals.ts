import "server-only"
import { and, eq } from "drizzle-orm"
import { db, interviewProcesses, type HiringPermission } from "@repo/db"
import type { AssistantChatProposal } from "@repo/db/assistant"
import { getOwnedMessage, setProposalResult, settleProposal } from "@repo/db/assistant-store"
import { startThread } from "@repo/db/inbox"
import { sendNewMessageEmail } from "@/lib/inbox/email"
import type { MessageProposalData, PipelineProposalData } from "@/lib/hiring-ai/tools"

/*
 * Confirming or cancelling a company AI proposal (plan/hiring-app HA-12). Acts
 * only on the copy stored with the assistant's message: the recipients and text
 * the member saw, never anything the client sends. The proposal is claimed
 * once, so a double click can't send twice, and each recipient gets their own
 * thread (never a group one).
 */

export interface ProposalActor { userId: string; companyId: string; companyName: string; memberName: string; can: (p: HiringPermission) => boolean }

type Builder = {
    createPipeline: (input: { name: string }) => Promise<{ success: true; data: { id: string } } | { success: false; error: string }>
    savePipeline: (id: string, input: PipelineProposalData) => Promise<{ success: true; data: { id: string } } | { success: false; error: string }>
}

export async function answerProposal(actor: ProposalActor, messageId: string, decision: "confirm" | "cancel", builder: Builder): Promise<{ success: true; proposal: AssistantChatProposal } | { success: false; error: string }> {
    const scope = { userId: actor.userId, companyId: actor.companyId }
    const msg = await getOwnedMessage(scope, messageId)
    const proposal = msg?.metadata?.proposal
    if (!msg || !proposal) return { success: false, error: "That proposal is gone." }
    if (proposal.status !== "pending") return { success: true, proposal }

    if (decision === "cancel") {
        await settleProposal(scope, messageId, "cancelled")
        return { success: true, proposal: { ...proposal, status: "cancelled" } }
    }

    if (proposal.kind === "message") {
        if (!actor.can("message_candidates")) return { success: false, error: "Your role can't message candidates." }
        if (!(await settleProposal(scope, messageId, "done"))) return { success: false, error: "This was already answered." }
        const data = proposal.data as unknown as MessageProposalData
        const failed: string[] = []
        let sent = 0
        for (const r of data.recipients) {
            const posted = await startThread({ companyId: actor.companyId, sendId: r.sendId, author: { userId: actor.userId, name: actor.memberName }, body: data.text }).catch(() => null)
            if (!posted?.ok) { failed.push(r.name); continue }
            sent++
            if (posted.emailTo === "student") await sendNewMessageEmail({ threadId: posted.threadId, fromName: actor.companyName, body: data.text }).catch((e: unknown) => console.error("proposal email:", e))
        }
        const result = { summary: `Sent to ${sent} ${sent === 1 ? "candidate" : "candidates"}${failed.length ? `. Not sent to ${failed.join(", ")}.` : "."}`, href: "/inbox" }
        await setProposalResult(messageId, result)
        return { success: true, proposal: { ...proposal, status: "done", result } }
    }

    if (proposal.kind === "pipeline") {
        if (!actor.can("manage_pipelines")) return { success: false, error: "Your role can't manage pipelines." }
        if (!(await settleProposal(scope, messageId, "done"))) return { success: false, error: "This was already answered." }
        const data = proposal.data as unknown as PipelineProposalData
        const created = await builder.createPipeline({ name: data.name })
        let result: { summary: string; href?: string }
        if (!created.success) result = { summary: `Couldn't add it: ${created.error}` }
        else {
            const saved = await builder.savePipeline(created.data.id, data)
            if (saved.success) result = { summary: `Added "${data.name}" to your pipelines. Review it before using it on a role.`, href: `/interview-config/${created.data.id}` }
            else {
                // A pipeline the builder won't accept isn't left half-made.
                await db.delete(interviewProcesses).where(and(eq(interviewProcesses.id, created.data.id), eq(interviewProcesses.companyId, actor.companyId)))
                result = { summary: `Couldn't add it: ${saved.error}` }
            }
        }
        await setProposalResult(messageId, result)
        return { success: true, proposal: { ...proposal, status: "done", result } }
    }
    return { success: false, error: "Unknown proposal." }
}
