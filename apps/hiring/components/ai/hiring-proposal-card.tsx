"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Layers, Send, X } from "lucide-react"
import type { AIChatProposal } from "@repo/ui/components/ai-chat/types"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { toast } from "@repo/ui/components/ui/sonner"
import { answerHiringProposal } from "@/actions/ai/hiring-ai.action"

/*
 * A proposal from the company AI (plan/hiring-app HA-12): a message to exactly
 * the candidates listed, or a pipeline's rounds. Send / Add acts on the copy the
 * server saved with this reply, so what's shown here is what happens.
 */

type MessageData = { text: string; recipients: { sendId: string; name: string; role: string }[]; skipped: { name: string; reason: string }[] }
type PipelineData = { name: string; description: string; rounds: { roundType: string; title: string; gateMode: string; passMark: number; timeLimitMinutes: number }[] }

export function HiringProposalCard({ messageId, proposal, saved, update }: { messageId: string; proposal: AIChatProposal; saved: boolean; update: (p: AIChatProposal) => void }) {
    const [busy, setBusy] = useState<"confirm" | "cancel" | null>(null)
    const answer = async (decision: "confirm" | "cancel") => {
        setBusy(decision)
        const r = await answerHiringProposal(messageId, decision)
        setBusy(null)
        if (!r.success) { toast.error(r.error); return }
        update(r.proposal)
    }
    const isMessage = proposal.kind === "message"
    const m = proposal.data as unknown as MessageData
    const p = proposal.data as unknown as PipelineData
    return (
        <div className="my-2 ml-9 rounded-xl border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {isMessage ? <Send className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
                {isMessage ? `Message to ${m.recipients.length} ${m.recipients.length === 1 ? "candidate" : "candidates"}` : "New pipeline"}
            </p>
            {isMessage ? (
                <>
                    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Recipients">
                        {m.recipients.map((r) => <li key={r.sendId} className="rounded-md border border-neutral-200 px-2 py-0.5 text-xs text-neutral-800 dark:border-neutral-700 dark:text-neutral-200">{r.name} <span className="text-neutral-500">· {r.role}</span></li>)}
                    </ul>
                    {m.skipped.length > 0 && <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">Left out: {m.skipped.map((x) => `${x.name} (${x.reason})`).join(", ")}</p>}
                    <p className="mt-2 whitespace-pre-line rounded-lg bg-neutral-50 p-2.5 text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">{m.text}</p>
                    <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">Each candidate gets it in their own conversation; no one sees the others.</p>
                </>
            ) : (
                <>
                    <p className="mt-2 font-medium text-neutral-900 dark:text-white">{p.name}</p>
                    {p.description && <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">{p.description}</p>}
                    <ol className="mt-2 space-y-1">
                        {p.rounds.map((r, i) => (
                            <li key={i} className="flex justify-between gap-2 rounded-md bg-neutral-50 px-2.5 py-1.5 dark:bg-neutral-950">
                                <span className="min-w-0 truncate text-neutral-800 dark:text-neutral-200">{i + 1}. {r.title}</span>
                                <span className="shrink-0 text-xs text-neutral-500">{r.gateMode === "HARD" ? `pass ${r.passMark}` : "advisory"} · {r.timeLimitMinutes} min</span>
                            </li>
                        ))}
                    </ol>
                </>
            )}
            <div className="mt-3 flex items-center justify-end gap-2">
                {proposal.status === "pending" ? (
                    <>
                        <Button size="sm" variant="ghost" onClick={() => void answer("cancel")} disabled={!saved || busy !== null} className="gap-1.5">
                            {busy === "cancel" ? <InlineLoader size="sm" /> : <X className="h-4 w-4" />} Cancel
                        </Button>
                        <Button size="sm" onClick={() => void answer("confirm")} disabled={!saved || busy !== null} className="gap-1.5">
                            {busy === "confirm" ? <InlineLoader size="sm" /> : isMessage ? <Send className="h-4 w-4" /> : <Check className="h-4 w-4" />} {isMessage ? "Send" : "Add"}
                        </Button>
                    </>
                ) : proposal.status === "cancelled" ? (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Cancelled. Nothing was {isMessage ? "sent" : "added"}.</span>
                ) : (
                    <span className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
                        <Check className="h-3.5 w-3.5" /> {proposal.result?.summary ?? "Done."}
                        {proposal.result?.href && <Link href={proposal.result.href} className="underline underline-offset-2">Open</Link>}
                    </span>
                )}
            </div>
        </div>
    )
}
