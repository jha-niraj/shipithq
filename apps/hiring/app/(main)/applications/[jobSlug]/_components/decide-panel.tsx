"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, RotateCcw, Send, Sparkles, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { decideAction, draftFeedbackAction } from "@/actions/sends/decisions"

/*
 * Inviting or declining (plan/hiring-rounds HR-19): the team's private note,
 * a feedback draft per candidate (AI, editable, landing one by one) and a Send
 * per candidate. Nothing goes out until that candidate's own Send. Declines
 * are drafted by default and can be sent with no message; an invite needs one.
 */

export type DecideCandidate = { sendId: string; name: string; headline: string }
type Decision = "INVITE" | "DECLINE"
type Card = { text: string; drafting: boolean; sent: boolean; sending: boolean }

export function DecidePanel({ candidates, initial, canDraft, onDecided, onClose }: {
    candidates: DecideCandidate[]
    initial: Decision
    canDraft: boolean
    onDecided: (sendId: string, status: "INVITED" | "DECLINED") => void
    onClose: () => void
}) {
    const [decision, setDecision] = useState<Decision>(initial)
    const [note, setNote] = useState("")
    const [cards, setCards] = useState<Record<string, Card>>(() => Object.fromEntries(candidates.map((c) => [c.sendId, { text: "", drafting: false, sent: false, sending: false }])))
    const round = useRef(0)

    const patch = (id: string, p: Partial<Card>) => setCards((cs) => ({ ...cs, [id]: { ...cs[id]!, ...p } }))

    // One draft per candidate, in parallel; each lands as it's ready.
    const draftAll = useCallback(async (d: Decision, teamNote: string) => {
        if (!canDraft) return
        const mine = ++round.current
        await Promise.all(candidates.map(async (c) => {
            setCards((cs) => (cs[c.sendId]!.sent ? cs : { ...cs, [c.sendId]: { ...cs[c.sendId]!, drafting: true } }))
            const r = await draftFeedbackAction(c.sendId, d, teamNote)
            if (mine !== round.current) return
            setCards((cs) => {
                const cur = cs[c.sendId]!
                if (cur.sent) return cs
                if (!r.success) { toast.error(`${c.name}: ${r.error}`); return { ...cs, [c.sendId]: { ...cur, drafting: false } } }
                return { ...cs, [c.sendId]: { ...cur, drafting: false, text: r.data.message } }
            })
        }))
    }, [candidates, canDraft])

    // Drafted by default when the panel opens.
    useEffect(() => { void draftAll(initial, "") }, [draftAll, initial])

    const send = async (c: DecideCandidate) => {
        const card = cards[c.sendId]!
        if (decision === "INVITE" && !card.text.trim()) { toast.error("Write a message to go with the invite."); return }
        patch(c.sendId, { sending: true })
        const r = await decideAction(c.sendId, decision, card.text, note)
        if (!r.success) { patch(c.sendId, { sending: false }); toast.error(r.error); return }
        patch(c.sendId, { sending: false, sent: true })
        onDecided(c.sendId, decision === "INVITE" ? "INVITED" : "DECLINED")
        toast.success(decision === "INVITE" ? `Invited ${c.name}` : `Declined ${c.name}`)
    }

    const allSent = candidates.every((c) => cards[c.sendId]!.sent)

    return (
        <div className="mx-auto w-full max-w-3xl space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{candidates.length === 1 ? `Decide on ${candidates[0]!.name}` : `Decide on ${candidates.length} candidates`}</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">A decision is final for these results. Each one goes only when you press its Send.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5"><X className="h-4 w-4" /> {allSent ? "Done" : "Close"}</Button>
            </div>

            <div role="radiogroup" aria-label="Decision" className="inline-flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
                {(["INVITE", "DECLINE"] as const).map((d) => (
                    <button key={d} type="button" role="radio" aria-checked={decision === d}
                        onClick={() => { if (d !== decision) { setDecision(d); void draftAll(d, note) } }}
                        className={cn("rounded-md px-4 py-1.5 text-sm font-medium", decision === d ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 dark:text-neutral-300")}>
                        {d === "INVITE" ? "Invite" : "Decline"}
                    </button>
                ))}
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <label htmlFor="team-note" className="text-sm font-medium text-neutral-900 dark:text-white">Why (for the team)</label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Never shown to the candidate. The draft uses it for the reason, in kinder words.</p>
                <Textarea id="team-note" value={note} onChange={(e) => setNote(e.target.value.slice(0, 1000))} rows={2} placeholder="e.g. strong DSA, thin on design" className="mt-2 text-sm" />
                {canDraft ? (
                    <Button size="sm" variant="outline" className="mt-2 gap-1.5" onClick={() => void draftAll(decision, note)}>
                        <Sparkles className="h-4 w-4" /> {candidates.length > 1 ? `Redraft all ${candidates.length}` : "Redraft with this note"}
                    </Button>
                ) : (
                    <p className="mt-2 text-xs text-neutral-500">Your role can't use AI drafting, so write each message yourself.</p>
                )}
            </div>

            <ul className="space-y-3">
                {candidates.map((c) => {
                    const card = cards[c.sendId]!
                    return (
                        <li key={c.sendId} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                            <div className="flex items-baseline justify-between gap-3">
                                <p className="min-w-0 truncate font-medium text-neutral-900 dark:text-white">{c.name} <span className="font-normal text-neutral-500 dark:text-neutral-400">· {c.headline}</span></p>
                                {card.sent && <span className="inline-flex shrink-0 items-center gap-1 text-sm text-neutral-900 dark:text-white"><Check className="h-4 w-4" /> Sent</span>}
                            </div>
                            {card.drafting ? (
                                <p className="mt-3 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400"><InlineLoader size="sm" /> Drafting from {c.name.split(" ")[0]}&apos;s results</p>
                            ) : (
                                <Textarea
                                    value={card.text}
                                    onChange={(e) => patch(c.sendId, { text: e.target.value.slice(0, 3000) })}
                                    disabled={card.sent}
                                    rows={7}
                                    aria-label={`Message to ${c.name}`}
                                    placeholder={decision === "INVITE" ? `A message to ${c.name.split(" ")[0]}` : "Optional: feedback for the candidate. Leave empty to decline with no message."}
                                    className="mt-3 text-sm leading-relaxed"
                                />
                            )}
                            {!card.sent && (
                                <div className="mt-3 flex items-center justify-end gap-2">
                                    {canDraft && !card.drafting && (
                                        <Button size="sm" variant="ghost" className="gap-1.5" onClick={async () => {
                                            patch(c.sendId, { drafting: true })
                                            const r = await draftFeedbackAction(c.sendId, decision, note)
                                            if (!r.success) { toast.error(r.error); patch(c.sendId, { drafting: false }); return }
                                            patch(c.sendId, { drafting: false, text: r.data.message })
                                        }}><RotateCcw className="h-4 w-4" /> Redraft</Button>
                                    )}
                                    <Button size="sm" onClick={() => void send(c)} disabled={card.sending || card.drafting} className="gap-1.5">
                                        {card.sending ? <InlineLoader size="sm" /> : <Send className="h-4 w-4" />} {decision === "INVITE" ? "Send invite" : card.text.trim() ? "Send decline" : "Decline without a message"}
                                    </Button>
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
