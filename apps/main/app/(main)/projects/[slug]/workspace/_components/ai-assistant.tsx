'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Check, ListPlus, Sparkles, SplitSquareVertical, Wand2, X } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { InlineLoader } from '@repo/ui/components/ui/inline-loader'
import toast from '@repo/ui/components/ui/sonner'
import { cn } from '@repo/ui/lib/utils'
import { isSetupSprint, sprintLabel } from '@/lib/projects/sprints'
import { awaitBackgroundJob } from '@/hooks/use-background-job'
import {
    applyAiProposal, discardAiProposal, getAiMessage, listAiMessages, sendAiMessage,
    type AiMessage, type AiProposal,
} from '@/actions/(main)/projects/project-ai.action'
import { PAGE_COLUMN } from './sprint-pages'
import type { WorkspaceSprint } from './workspace-client'

/*
 * The Project AI, the first pinned tab (plan/project-workspace WS-15).
 *
 * Ask about the code, ask for a task or a sprint, or have the current task
 * broken into steps. A proposed task or sprint shows as a card; only Add writes
 * it, for 5 credits. Replies are written on the worker; a reload while one is
 * still being written picks it up again.
 */

const WRITE_PRICE = 5 // lib/credits/pricing.ts `project_ai_write`, shown on the button

interface AiAssistantProps {
    projectId: string
    sprints: WorkspaceSprint[]
    currentTaskId: string | null
    onPlanChanged: (plan: WorkspaceSprint[]) => void
}

export function AiAssistant({ projectId, sprints, currentTaskId, onPlanChanged }: AiAssistantProps) {
    // Setup takes no new tasks (plan/project-repos RP-3).
    const buildSprints = sprints.filter((sp) => !isSetupSprint(sp.number))
    const [messages, setMessages] = useState<AiMessage[] | null>(null)
    const [draft, setDraft] = useState('')
    const [thinking, setThinking] = useState<string | null>(null)
    const [busyProposal, setBusyProposal] = useState<string | null>(null)
    const endRef = useRef<HTMLDivElement | null>(null)
    const inputRef = useRef<HTMLTextAreaElement | null>(null)

    const scrollToEnd = () => requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'end' }))

    /* Waits for a reply the worker is writing, then shows it. */
    const followReply = useCallback(async (jobId: string) => {
        setThinking('Thinking')
        const outcome = await awaitBackgroundJob<{ messageId?: string }>(jobId, (_p, phase) => { if (phase) setThinking(phase) })
        if (outcome.ok && outcome.result?.messageId) {
            const reply = await getAiMessage(projectId, outcome.result.messageId)
            if (reply.success) setMessages((m) => [...(m ?? []), reply.data])
        } else if (!outcome.ok) {
            toast.error(outcome.error || 'The AI could not answer. Try again.')
        }
        setThinking(null)
        scrollToEnd()
    }, [projectId])

    useEffect(() => {
        let live = true
        void listAiMessages(projectId).then((r) => {
            if (!live) return
            if (!r.success) { setMessages([]); return }
            setMessages(r.data.messages)
            scrollToEnd()
            if (r.data.pendingJobId) void followReply(r.data.pendingJobId)
        })
        return () => { live = false }
    }, [projectId, followReply])

    const send = async (text: string) => {
        const content = text.trim()
        if (!content || thinking) return
        setDraft('')
        const result = await sendAiMessage(projectId, content, currentTaskId)
        if (!result.success) { toast.error(result.error); setDraft(content); return }
        setMessages((m) => [...(m ?? []), result.data.message])
        scrollToEnd()
        await followReply(result.data.jobId)
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
        <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className={cn(PAGE_COLUMN, 'pb-6 pt-4')}>
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                            <Sparkles className="h-4 w-4" />
                        </span>
                        <div>
                            <h1 className="text-base font-semibold text-neutral-900 dark:text-white">Project AI</h1>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Knows this project&apos;s {buildSprints.length} sprints and the notes you leave on finished tasks. It can&apos;t see your code, so paste the part you mean. Asking is free; adding a task or a sprint it proposes costs {WRITE_PRICE} credits.
                            </p>
                        </div>
                    </div>

                    {messages === null ? (
                        <div className="flex justify-center py-10"><InlineLoader size="md" label="Loading the conversation" /></div>
                    ) : messages.length === 0 ? (
                        <section className="mt-6 rounded-xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">How it goes</p>
                            <div className="mt-3 space-y-3 text-sm">
                                <Bubble who="you">Add a task for a dark mode toggle.</Bubble>
                                <Bubble who="ai">Which sprint should it go in? {buildSprints.slice(0, 2).map((sp) => `Sprint ${sp.number} (${sp.name})`).join(', ')}{buildSprints.length > 2 ? ', or another' : ''}?</Bubble>
                                <Bubble who="you">Sprint 2.</Bubble>
                                <Bubble who="ai">Here is the task. Add it, change your message, or discard it.</Bubble>
                            </div>
                        </section>
                    ) : (
                        <div className="mt-6 space-y-4 text-sm">
                            {messages.map((m) => (
                                <div key={m.id} className="space-y-2">
                                    <Bubble who={m.role === 'user' ? 'you' : 'ai'}>{m.content}</Bubble>
                                    {m.proposal && (
                                        <ProposalCard
                                            proposal={m.proposal}
                                            status={m.proposalStatus}
                                            busy={busyProposal === m.id}
                                            onAdd={() => decide(m, true)}
                                            onDiscard={() => decide(m, false)}
                                        />
                                    )}
                                </div>
                            ))}
                            {thinking && (
                                <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-900"><Sparkles className="h-3.5 w-3.5" /></span>
                                    <InlineLoader size="sm" /> {thinking}
                                </div>
                            )}
                        </div>
                    )}
                    <div ref={endRef} />
                </div>
            </div>

            <div className="shrink-0 border-t border-neutral-200 py-3 dark:border-neutral-800">
                <div className={PAGE_COLUMN}>
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

function ProposalCard({ proposal, status, busy, onAdd, onDiscard }: {
    proposal: AiProposal
    status: AiMessage['proposalStatus']
    busy: boolean
    onAdd: () => void
    onDiscard: () => void
}) {
    return (
        <div className="ml-8 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {proposal.kind === 'task' ? `Proposed task · Sprint ${proposal.sprintNumber}` : 'Proposed sprint'}
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
                        <Button size="sm" variant="outline" onClick={onDiscard} disabled={busy} className="gap-1.5"><X className="h-4 w-4" /> Discard</Button>
                    </>
                ) : (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{status === 'added' ? 'Added to the plan.' : 'Discarded.'}</span>
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
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-900">
                <Sparkles className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
            </span>
            <p className="max-w-[85%] whitespace-pre-wrap leading-relaxed text-neutral-700 dark:text-neutral-300">{children}</p>
        </div>
    )
}
