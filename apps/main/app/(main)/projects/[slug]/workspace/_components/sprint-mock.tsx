'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Circle, Lightbulb, Lock, Mic, MonitorPlay, Presentation, Send, Square, Target, ThumbsUp, TriangleAlert } from 'lucide-react'
import toast from '@repo/ui/components/ui/sonner'
import { Button } from '@repo/ui/components/ui/button'
import { InlineLoader } from '@repo/ui/components/ui/inline-loader'
import { StatBand } from '@repo/ui/components/ui/stat-band'
import { Shimmer, ShimmerStyles } from '@repo/ui/components/skeleton-kit'
import { cn } from '@repo/ui/lib/utils'
import { useBackgroundJob } from '@/hooks/use-background-job'
import { useDictation } from '@/hooks/useDictation'
import {
    answerSprintMock, endSprintMock, getFinalMock, getSprintMock, retrySprintMockTurn, startFinalMock, startSprintMock,
    type MockSessionView, type SprintMockState,
} from '@/actions/(main)/projects/sprint-mock.action'
import { PAGE_COLUMN } from './sprint-pages'
import type { WorkspaceSprint } from './workspace-client'

/*
 * A sprint's mock interview, in its tab (plan/project-workspace WS-13).
 *
 * Locked until every task in the sprint is done. A session costs 30 credits,
 * held on the job that asks the first question (so a session that never
 * starts is refunded). The interviewer's lines and the feedback are written by
 * the worker; answers are typed or dictated (the practice page's Sarvam hook,
 * reused). The transcript is saved line by line, so leaving loses nothing, and
 * every past session stays readable.
 */

/** One sprint, or the whole project (the final interview, plan/project-workspace WS-14). */
export type MockScope =
    | { kind: 'sprint'; sprint: WorkspaceSprint }
    | { kind: 'final'; projectId: string; title: string; sprints: WorkspaceSprint[] }

export const SprintMockTab = ({ sprint }: { sprint: WorkspaceSprint }) => <MockTab scope={{ kind: 'sprint', sprint }} />

export const FinalMockTab = ({ projectId, title, sprints }: { projectId: string; title: string; sprints: WorkspaceSprint[] }) =>
    <MockTab scope={{ kind: 'final', projectId, title, sprints }} />

function MockTab({ scope }: { scope: MockScope }) {
    const scopeKey = scope.kind === 'sprint' ? scope.sprint.id : `final:${scope.projectId}`
    const [state, setState] = useState<SprintMockState | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [jobId, setJobId] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [input, setInput] = useState('')
    // A finished session being read; null shows the live one or the start screen.
    const [reading, setReading] = useState<string | null>(null)
    const endRef = useRef<HTMLDivElement>(null)
    const doneCount = (scope.kind === 'sprint' ? scope.sprint.tasks : scope.sprints.flatMap((sp) => sp.tasks)).filter((t) => t.status === 'COMPLETED').length

    const load = useCallback(async () => {
        const result = scope.kind === 'sprint' ? await getSprintMock(scope.sprint.id) : await getFinalMock(scope.projectId)
        if (!result.success) { setError(result.error); return }
        setError(null)
        setState(result.data)
        setJobId(result.data.pendingJobId)
    }, [scopeKey]) // eslint-disable-line react-hooks/exhaustive-deps -- the key names the scope

    useEffect(() => {
        setState(null)
        setReading(null)
        setJobId(null)
        void load()
    }, [load, doneCount])

    const job = useBackgroundJob(jobId, {
        onCompleted: () => { setJobId(null); void load() },
        onFailed: (message) => { setJobId(null); toast.error(message || 'The interviewer could not answer.'); void load() },
    })

    const dictation = useDictation({ onText: setInput })

    const live = state?.sessions.find((s) => s.status === 'opening' || s.status === 'active') ?? null
    const shown = reading ? state?.sessions.find((s) => s.id === reading) ?? null : live
    const lastRole = live?.transcript.at(-1)?.role
    const waitingForMe = !!live && live.status === 'active' && lastRole === 'interviewer' && !jobId
    const stalled = !!live && live.status === 'active' && lastRole === 'learner' && !jobId

    useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [shown?.transcript.length, jobId])

    const start = async () => {
        setBusy(true)
        const result = scope.kind === 'sprint' ? await startSprintMock(scope.sprint.id) : await startFinalMock(scope.projectId)
        setBusy(false)
        if (!result.success) { toast.error(result.error); return }
        setReading(null)
        setJobId(result.data.jobId)
        void load()
    }

    const send = async () => {
        if (!live || !waitingForMe || busy) return
        if (dictation.isListening) await dictation.stop()
        const text = input.trim()
        if (!text) { toast.error('Type or say an answer first.'); return }
        setBusy(true)
        // Shown straight away; the server's copy replaces it on the next load.
        setState((s) => s && ({ ...s, sessions: s.sessions.map((x) => (x.id === live.id ? { ...x, transcript: [...x.transcript, { role: 'learner' as const, text, at: new Date().toISOString() }] } : x)) }))
        const result = await answerSprintMock(live.id, text)
        setBusy(false)
        if (!result.success) { toast.error(result.error); void load(); return }
        setInput('')
        setJobId(result.data.jobId)
    }

    const end = async () => {
        if (!live) return
        setBusy(true)
        const result = await endSprintMock(live.id)
        setBusy(false)
        if (!result.success) { toast.error(result.error); return }
        if (result.data.jobId) setJobId(result.data.jobId)
        else void load()
    }

    const retry = async () => {
        if (!live) return
        setBusy(true)
        const result = await retrySprintMockTurn(live.id)
        setBusy(false)
        if (!result.success) { toast.error(result.error); return }
        setJobId(result.data.jobId)
    }

    const header = (
        <header>
            <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{scope.kind === 'sprint' ? `Sprint ${scope.sprint.number} · Mock interview` : 'Final mock interview'}</p>
            <div className="mt-1.5 flex items-center gap-3">
                <h1 className="flex min-w-0 items-center gap-2.5 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                    {scope.kind === 'sprint' ? <MonitorPlay className="h-5 w-5 shrink-0 text-neutral-500" /> : <Presentation className="h-5 w-5 shrink-0 text-neutral-500" />}
                    <span className="truncate">{scope.kind === 'sprint' ? scope.sprint.name : scope.title}</span>
                </h1>
                {live && !reading && live.status === 'active' && (
                    <Button variant="outline" size="sm" className="ml-auto shrink-0 gap-1.5" onClick={end} disabled={busy || !!jobId}>
                        <Square className="h-3.5 w-3.5" /> End interview
                    </Button>
                )}
            </div>
        </header>
    )

    const inSession = !!live && !reading
    return (
        <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
                <article className={cn(PAGE_COLUMN, 'pb-8 pt-4')}>
                    {header}
                    {error ? (
                        <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400">{error}</p>
                    ) : !state ? (
                        <div className="mt-6 space-y-3"><ShimmerStyles /><Shimmer className="h-4 w-3/4" /><Shimmer className="h-28 w-full rounded-xl" delay={0.05} /></div>
                    ) : inSession ? (
                        <Transcript session={live} thinking={!!jobId} phase={job.phaseLabel} stalled={stalled} busy={busy} onRetry={retry} />
                    ) : shown && shown.status === 'ended' ? (
                        <Report session={shown} onBack={() => setReading(null)} />
                    ) : state.gate && !state.gate.open ? (
                        <>
                            <Intro final />
                            <section className="mt-6 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
                                <p className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white"><Lock className="h-4 w-4 text-neutral-500" /> Opens at {state.gate.unlockAt}% of the project&apos;s tasks</p>
                                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">You are at {state.gate.progress}%.</p>
                            </section>
                        </>
                    ) : scope.kind === 'sprint' && state.tasksLeft > 0 ? (
                        <Locked sprint={scope.sprint} left={state.tasksLeft} />
                    ) : (
                        <StartScreen state={state} final={scope.kind === 'final'} busy={busy} onStart={start} onRead={setReading} />
                    )}
                    <div ref={endRef} />
                </article>
            </div>
            {inSession && (
                <div className="shrink-0 border-t border-neutral-200 py-3 dark:border-neutral-800">
                    <div className={cn(PAGE_COLUMN, 'flex items-end gap-2')}>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
                            disabled={!waitingForMe || busy}
                            rows={2}
                            placeholder={dictation.isListening ? 'Listening. Speak, then check the words.' : waitingForMe ? 'Type your answer, or use the mic. Enter sends.' : 'The interviewer is speaking...'}
                            className="min-h-[40px] min-w-0 flex-1 resize-none rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400 disabled:cursor-not-allowed dark:border-neutral-800 dark:text-white dark:focus:border-neutral-600"
                        />
                        <Button
                            variant={dictation.isListening ? 'default' : 'outline'}
                            size="icon"
                            onClick={dictation.toggle}
                            disabled={!waitingForMe || dictation.unavailable || dictation.status === 'transcribing'}
                            title={dictation.unavailable ? 'Voice is not available right now - type instead' : dictation.isListening ? 'Stop' : 'Speak your answer'}
                            aria-label={dictation.isListening ? 'Stop dictation' : 'Speak your answer'}
                        >
                            {dictation.status === 'transcribing' ? <InlineLoader size="sm" /> : <Mic className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" onClick={() => void send()} disabled={!waitingForMe || busy || !input.trim()} aria-label="Send answer">
                            {busy ? <InlineLoader size="sm" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                    {dictation.error && <p className={cn(PAGE_COLUMN, 'mt-1 text-xs text-neutral-500')}>{dictation.error}</p>}
                </div>
            )}
        </div>
    )
}

function Locked({ sprint, left }: { sprint: WorkspaceSprint; left: number }) {
    return (
        <>
            <Intro />
            <section className="mt-6 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
                <p className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white"><Lock className="h-4 w-4 text-neutral-500" /> Opens when the sprint is done</p>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{left} task{left === 1 ? '' : 's'} left:</p>
                <ul className="mt-3 space-y-1.5">
                    {sprint.tasks.filter((t) => t.status !== 'COMPLETED').map((t) => (
                        <li key={t.id} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300"><Circle className="h-3.5 w-3.5 shrink-0 text-neutral-400" /> {t.title}</li>
                    ))}
                </ul>
            </section>
        </>
    )
}

function Intro({ final = false }: { final?: boolean }) {
    return (
        <p className="mt-4 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
            {final
                ? 'A full interview about the project, start to finish: the architecture, a decision that shaped later sprints, what you would redesign, and how you would pitch it to a hiring manager. It has read your task notes. Answer by typing or by voice.'
                : 'An interviewer asks about this sprint the way a real one asks about a project on your CV: why you built it that way, what breaks, what you would change. It has read your task notes. Answer by typing or by voice; about ten minutes.'}
        </p>
    )
}

function StartScreen({ state, final, busy, onStart, onRead }: { state: SprintMockState; final: boolean; busy: boolean; onStart: () => void; onRead: (id: string) => void }) {
    const ended = state.sessions.filter((s) => s.status === 'ended')
    return (
        <>
            <Intro final={final} />
            <div className="mt-6 flex items-center gap-3">
                <Button onClick={onStart} disabled={busy} className="gap-2">
                    {busy ? <><InlineLoader size="sm" /> Starting</> : <>Start interview · {state.price} credits</>}
                </Button>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Five questions and follow-ups, then feedback. Not charged if it fails to start.</span>
            </div>
            {ended.length > 0 && (
                <section className="mt-8">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Past interviews</h2>
                    <ul className="mt-3 divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                        {ended.map((s) => (
                            <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                                <span className="w-12 font-semibold tabular-nums text-neutral-900 dark:text-white">{s.feedback ? `${s.feedback.score}` : '-'}</span>
                                <span className="min-w-0 truncate text-neutral-600 dark:text-neutral-400">{s.feedback?.summary ?? 'No feedback'}</span>
                                <span className="ml-auto shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{new Date(s.createdAt).toLocaleDateString()}</span>
                                <button type="button" onClick={() => onRead(s.id)} className="shrink-0 cursor-pointer text-xs font-medium text-neutral-700 underline-offset-4 hover:underline dark:text-neutral-300">Read</button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    )
}

function Transcript({ session, thinking, phase, stalled, busy, onRetry }: { session: MockSessionView; thinking: boolean; phase?: string; stalled: boolean; busy: boolean; onRetry: () => void }) {
    return (
        <ol className="mt-6 space-y-4">
            {session.transcript.map((t, i) => (
                <li key={i} className={cn('flex', t.role === 'learner' && 'justify-end')}>
                    <div className={cn(
                        'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed',
                        t.role === 'interviewer'
                            ? 'rounded-tl-sm bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100'
                            : 'rounded-tr-sm bg-neutral-900 text-white dark:bg-white dark:text-neutral-900',
                    )}>
                        {t.text}
                    </div>
                </li>
            ))}
            {thinking && (
                <li className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                    <InlineLoader size="sm" /> {phase || (session.transcript.length ? 'The interviewer is thinking' : 'Preparing the first question')}
                </li>
            )}
            {stalled && (
                <li className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                    The interviewer did not answer.
                    <Button size="sm" variant="outline" onClick={onRetry} disabled={busy}>Ask again</Button>
                </li>
            )}
        </ol>
    )
}

function Report({ session, onBack }: { session: MockSessionView; onBack: () => void }) {
    const f = session.feedback
    return (
        <section className="mt-6">
            <Button variant="ghost" size="sm" className="-ml-2 gap-1.5" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
            {f ? (
                <>
                    <StatBand
                        className="mt-3"
                        cols={2}
                        items={[
                            { icon: Target, label: 'Score', value: f.score, hint: 'of 100', tone: f.score >= 70 ? 'emerald' : 'rose', progress: f.score },
                            { icon: MonitorPlay, label: 'Answers', value: session.transcript.filter((t) => t.role === 'learner').length },
                        ]}
                    />
                    <p className="mt-5 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">{f.summary}</p>
                    <FeedbackList icon={ThumbsUp} title="What went well" items={f.strengths} />
                    <FeedbackList icon={TriangleAlert} title="What to work on" items={f.gaps} />
                    <FeedbackList icon={Lightbulb} title="Before the next sprint" items={f.nextSteps} />
                </>
            ) : (
                <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">No feedback was written for this interview.</p>
            )}
            <details className="group mt-8">
                <summary className="cursor-pointer text-sm font-medium text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">The transcript</summary>
                <Transcript session={session} thinking={false} stalled={false} busy={false} onRetry={() => undefined} />
            </details>
        </section>
    )
}

function FeedbackList({ icon: Icon, title, items }: { icon: typeof ThumbsUp; title: string; items: string[] }) {
    if (items.length === 0) return null
    return (
        <div className="mt-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white"><Icon className="h-4 w-4 text-neutral-500" /> {title}</h3>
            <ul className="mt-2 space-y-1.5 pl-6">
                {items.map((x, i) => <li key={i} className="list-disc text-sm text-neutral-700 dark:text-neutral-300">{x}</li>)}
            </ul>
        </div>
    )
}
