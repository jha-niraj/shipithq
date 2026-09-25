'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Check, ListPlus, SplitSquareVertical, Wand2, X } from 'lucide-react'
import { AIGlyph, AIMark } from '@repo/ui/components/ui/ai-mark'
import { Button } from '@repo/ui/components/ui/button'
import { InlineLoader } from '@repo/ui/components/ui/inline-loader'
import toast from '@repo/ui/components/ui/sonner'
import { cn } from '@repo/ui/lib/utils'
import { isSetupSprint } from '@/lib/projects/sprints'
import {
    applyAiProposal, discardAiProposal, listAiMessages, sendAiMessage,
    type AiMessage, type AiProposal,
} from '@/actions/(main)/projects/project-ai.action'
import { Shimmer, ShimmerStyles } from '@repo/ui/components/skeleton-kit'
import type { WorkspaceSprint } from './workspace-client'

/*
 * The Project AI, the first pinned tab (plan/project-workspace WS-15).
 *
 * Ask about building it, ask for a task or a sprint, or have the current task
 * broken into steps. A proposed task or sprint shows as a card; only Add writes
 * it, for 5 credits, and Cancel drops it. Replies are written inline by the
 * server action (WS-22), so one request brings the answer back.
 */

const WRITE_PRICE = 5 // lib/credits/pricing.ts `project_ai_write`, shown on the button

interface AiAssistantProps {
    projectId: string
    sprints: WorkspaceSprint[]
    currentTaskId: string | null
    onPlanChanged: (plan: WorkspaceSprint[]) => void
    /** Closes the docked panel (WS-20). */
    onClose: () => void
}

/*
 * Docked on the right of the workspace since 2026-09-24 (WS-20), beside
 * whatever tab is open: a narrow column with its own header and close button,
 * not a page-width tab.
 */
const COLUMN = 'px-4'

export function AiAssistant({ projectId, sprints, currentTaskId, onPlanChanged, onClose }: AiAssistantProps) {
    // Setup takes no new tasks (plan/project-repos RP-3).
    const buildSprints = sprints.filter((sp) => !isSetupSprint(sp.number))
    const [messages, setMessages] = useState<AiMessage[] | null>(null)
    const [draft, setDraft] = useState('')
    const [thinking, setThinking] = useState<string | null>(null)
    const [busyProposal, setBusyProposal] = useState<string | null>(null)
    const endRef = useRef<HTMLDivElement | null>(null)
    const inputRef = useRef<HTMLTextAreaElement | null>(null)

    const scrollToEnd = () => requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'end' }))

    useEffect(() => {
        let live = true
        void listAiMessages(projectId).then((r) => {
            if (!live) return
            setMessages(r.success ? r.data.messages : [])
            scrollToEnd()
        })
        return () => { live = false }
    }, [projectId])

    const send = async (text: string) => {
        const content = text.trim()
        if (!content || thinking) return
        setDraft('')
        // The question shows at once; the server stores it with the reply.
        const pendingId = `pending-${Date.now()}`
        setMessages((m) => [...(m ?? []), { id: pendingId, role: 'user', content, proposal: null, proposalStatus: null, createdAt: new Date().toISOString() }])
        setThinking('Thinking')
        scrollToEnd()
        const result = await sendAiMessage(projectId, content, currentTaskId)
        setThinking(null)
        if (!result.success) {
            setMessages((m) => (m ?? []).filter((x) => x.id !== pendingId))
            toast.error(result.error)
            setDraft(content)
            return
        }
        setMessages((m) => [...(m ?? []).filter((x) => x.id !== pendingId), result.data.question, result.data.reply])
        scrollToEnd()
    }

    const decide = async (message: AiMessage, add: boolean) => {
        setBusyProposal(message.id)
        try {
            if (add) {
                const r = await applyAiProposal(projectId, message.id)
                if (!r.success) { toast.error(r.error); return }
                onPlanChanged(r.data.plan)
                toast.success(`Added ${r.data.added}.`)
            } else {
                const r = await discardAiProposal(projectId, message.id)
                if (!r.success) { toast.error(r.error); return }
            }
            setMessages((ms) => (ms ?? []).map((x) => (x.id === message.id ? { ...x, proposalStatus: add ? 'added' : 'discarded' } : x)))
        } finally {
            setBusyProposal(null)
        }
    }

    const suggestions = [
        { icon: ListPlus, text: 'Add a task', fill: 'Add a task: ' },
        { icon: Wand2, text: 'Plan a new sprint', fill: 'Plan a new sprint on ' },
        { icon: SplitSquareVertical, text: 'Break the current task into steps', send: 'Break the current task into steps.' },
    ] as const

    return (
        <div className="flex h-full min-w-0 flex-col">
            {/* The panel's header, the height of the tab strip beside it. */}
            <div className="flex h-9 shrink-0 items-center gap-2 border-b border-neutral-200 pl-3 pr-1.5 dark:border-neutral-800">
                <span className="text-[13px] font-medium text-neutral-900 dark:text-white">Project AI</span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close Project AI"
                    title="Close Project AI"
                    className="ml-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className={cn(COLUMN, 'flex min-h-full flex-col pb-6 pt-3')}>
                    {messages === null ? (
                        // A block, so a skeleton of the conversation, not a loader (CLAUDE.md, loading).
                        <div className="mt-2 space-y-3" aria-busy aria-label="Loading the conversation">
                            <ShimmerStyles />
                            <Shimmer className="ml-auto h-8 w-3/5 rounded-2xl" />
                            <Shimmer className="h-12 w-4/5 rounded-2xl" delay={0.05} />
                            <Shimmer className="ml-auto h-8 w-2/5 rounded-2xl" delay={0.1} />
                        </div>
                    ) : messages.length === 0 ? (
                        // Only the mark: the suggestions under the input say what it can do.
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
                            <AIMark size={48} />
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">Ask about this project.</p>
                        </div>
                    ) : (
                        <div className="mt-2 space-y-4 text-sm">
                            {messages.map((m) => (
                                <div key={m.id} className="space-y-2">
                                    <Bubble who={m.role === 'user' ? 'you' : 'ai'}>{m.content}</Bubble>
                                    {m.proposal && (
                                        <ProposalCard
                                            proposal={m.proposal}
                                            status={m.proposalStatus}
                                            busy={busyProposal === m.id}
                                            lastSprint={buildSprints.at(-1)?.number ?? 0}
                                            onAdd={() => decide(m, true)}
                                            onCancel={() => decide(m, false)}
                                        />
                                    )}
                                </div>
                            ))}
                            {thinking && (
                                <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center"><AIGlyph size={16} /></span>
                                    <InlineLoader size="sm" /> {thinking}
                                </div>
                            )}
                        </div>
                    )}
                    <div ref={endRef} />
                </div>
            </div>

            <div className="shrink-0 border-t border-neutral-200 py-3 dark:border-neutral-800">
                <div className={COLUMN}>
                    <div className="mb-2 flex flex-wrap gap-2">
                        {suggestions.map((sg) => (
                            <button
                                key={sg.text}
                                type="button"
                                disabled={!!thinking}
                                onClick={() => {
                                    if ('send' in sg) void send(sg.send)
                                    else { setDraft(sg.fill); inputRef.current?.focus() }
                                }}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-700 transition-colors hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600"
                            >
                                <sg.icon className="h-3.5 w-3.5" />
                                {sg.text}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-end gap-2 rounded-xl border border-neutral-200 p-2 focus-within:border-neutral-400 dark:border-neutral-800 dark:focus-within:border-neutral-600">
                        <textarea
                            ref={inputRef}
                            value={draft}
                            rows={1}
                            maxLength={2000}
                            onChange={(e) => {
                                setDraft(e.target.value)
                                e.currentTarget.style.height = 'auto'
                                e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 160)}px`
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(draft) }
                            }}
                            placeholder="Ask for a task, a sprint, or help with this one"
                            className="min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-white"
                        />
                        <Button size="icon" onClick={() => void send(draft)} disabled={!draft.trim() || !!thinking} aria-label="Send">
                            {thinking ? <InlineLoader size="sm" /> : <ArrowUp className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ProposalCard({ proposal, status, busy, lastSprint, onAdd, onCancel }: {
    proposal: AiProposal
    /** The last sprint's number: a new sprint is always added after it. */
    lastSprint: number
    status: AiMessage['proposalStatus']
    busy: boolean
    onAdd: () => void
    onCancel: () => void
}) {
    return (
        <div className="ml-8 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {proposal.kind === 'task' ? `Proposed task · Sprint ${proposal.sprintNumber}` : status === 'pending' ? `Proposed sprint · after Sprint ${lastSprint}` : 'Proposed sprint'}
            </p>
            {proposal.kind === 'task' ? (
                <>
                    <p className="mt-1 font-semibold text-neutral-900 dark:text-white">{proposal.title}</p>
                    {proposal.description.map((d, i) => <p key={i} className="mt-1.5 text-neutral-700 dark:text-neutral-300">{d}</p>)}
                    <ul className="mt-2 space-y-1">
                        {proposal.criteria.map((c, i) => (
                            <li key={i} className="flex gap-2 text-neutral-700 dark:text-neutral-300"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />{c}</li>
                        ))}
                    </ul>
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">About {proposal.estimatedTime}</p>
                </>
            ) : (
                <>
                    <p className="mt-1 font-semibold text-neutral-900 dark:text-white">{proposal.name}</p>
                    <p className="mt-1 text-neutral-700 dark:text-neutral-300">{proposal.goal}</p>
                    <ol className="mt-2 space-y-1">
                        {proposal.tasks.map((t, i) => (
                            <li key={i} className="flex gap-2 text-neutral-700 dark:text-neutral-300">
                                <span className="w-4 shrink-0 text-right tabular-nums text-neutral-400">{i + 1}.</span>{t.title}
                            </li>
                        ))}
                    </ol>
                </>
            )}
            <div className="mt-3 flex items-center gap-2">
                {status === 'pending' ? (
                    <>
                        <Button size="sm" onClick={onAdd} disabled={busy} className="gap-1.5">
                            {busy ? <InlineLoader size="sm" /> : <ListPlus className="h-4 w-4" />} Add · {WRITE_PRICE} credits
                        </Button>
                        <Button size="sm" variant="outline" onClick={onCancel} disabled={busy} className="gap-1.5"><X className="h-4 w-4" /> Cancel</Button>
                    </>
                ) : (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{status === 'added' ? 'Added to the plan.' : 'Cancelled.'}</span>
                )}
            </div>
        </div>
    )
}

function Bubble({ who, children }: { who: 'you' | 'ai'; children: React.ReactNode }) {
    return who === 'you' ? (
        <div className="flex justify-end">
            <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-neutral-900 px-3.5 py-2 text-white dark:bg-white dark:text-neutral-900">{children}</p>
        </div>
    ) : (
        <div className="flex gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-neutral-700 dark:text-neutral-300">
                <AIGlyph size={16} />
            </span>
            <p className="max-w-[85%] whitespace-pre-wrap leading-relaxed text-neutral-700 dark:text-neutral-300">{children}</p>
        </div>
    )
}
