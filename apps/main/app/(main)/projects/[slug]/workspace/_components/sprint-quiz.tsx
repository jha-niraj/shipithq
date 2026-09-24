'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Brain, Check, Circle, GraduationCap, History, ListChecks, Lock, RotateCcw, Target, Trophy, X } from 'lucide-react'
import toast from '@repo/ui/components/ui/sonner'
import { Button } from '@repo/ui/components/ui/button'
import { InlineLoader } from '@repo/ui/components/ui/inline-loader'
import { StatBand } from '@repo/ui/components/ui/stat-band'
import { Shimmer, ShimmerStyles } from '@repo/ui/components/skeleton-kit'
import { cn } from '@repo/ui/lib/utils'
import { useBackgroundJob } from '@/hooks/use-background-job'
import {
    checkSprintQuizAnswer, getFinalQuiz, getSprintQuiz, reviewSprintQuizAttempt, startFinalQuiz, startSprintQuiz, submitSprintQuizAttempt,
    type SprintQuizAttemptView, type SprintQuizState,
} from '@/actions/(main)/projects/sprint-quiz.action'
import { PAGE_COLUMN } from './sprint-pages'
import type { WorkspaceSprint } from './workspace-client'

/*
 * A sprint's quiz, in its tab (plan/project-workspace WS-12).
 *
 * Locked until every task in the sprint is done; then generated once (25
 * credits, a worker job the tab waits on and a reload resumes); then taken one
 * question at a time with the answer and its explanation after each, checked on
 * the server. Every attempt is kept and a retake costs nothing.
 */

type Mode =
    | { kind: 'overview' }
    | { kind: 'taking'; index: number; answers: number[]; checked: { correct: boolean; correctAnswer: number; explanation: string } | null }
    | { kind: 'result'; attempt: SprintQuizAttemptView }
    | { kind: 'review'; questions: { prompt: string; options: string[]; correctAnswer: number; explanation: string; picked: number }[] }

/** One sprint, or the whole project (the final quiz, plan/project-workspace WS-14). */
export type QuizScope =
    | { kind: 'sprint'; sprint: WorkspaceSprint }
    | { kind: 'final'; projectId: string; title: string; sprints: WorkspaceSprint[] }

export const SprintQuizTab = ({ sprint }: { sprint: WorkspaceSprint }) => <QuizTab scope={{ kind: 'sprint', sprint }} />

export const FinalQuizTab = ({ projectId, title, sprints }: { projectId: string; title: string; sprints: WorkspaceSprint[] }) =>
    <QuizTab scope={{ kind: 'final', projectId, title, sprints }} />

function QuizTab({ scope }: { scope: QuizScope }) {
    const scopeKey = scope.kind === 'sprint' ? scope.sprint.id : `final:${scope.projectId}`
    const [state, setState] = useState<SprintQuizState | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [jobId, setJobId] = useState<string | null>(null)
    const [starting, setStarting] = useState(false)
    const [mode, setMode] = useState<Mode>({ kind: 'overview' })
    const [busy, setBusy] = useState(false)
    const scopeTasks = scope.kind === 'sprint' ? scope.sprint.tasks : scope.sprints.flatMap((sp) => sp.tasks)
    const doneCount = scopeTasks.filter((t) => t.status === 'COMPLETED').length

    const load = useCallback(async () => {
        const result = scope.kind === 'sprint' ? await getSprintQuiz(scope.sprint.id) : await getFinalQuiz(scope.projectId)
        if (!result.success) { setError(result.error); return }
        setError(null)
        setState(result.data)
        if (result.data.pendingJobId) setJobId(result.data.pendingJobId)
    }, [scopeKey]) // eslint-disable-line react-hooks/exhaustive-deps -- the key names the scope

    // Reload when the sprint changes, and when its tasks do (the gate may open).
    useEffect(() => {
        setState(null)
        setMode({ kind: 'overview' })
        setJobId(null)
        void load()
    }, [load, doneCount])

    const job = useBackgroundJob(jobId, {
        onCompleted: () => { setJobId(null); toast.success('Your quiz is ready.'); void load() },
        onFailed: (message) => { setJobId(null); toast.error(message || 'The quiz could not be generated. You were not charged.'); void load() },
    })

    const generate = async () => {
        setStarting(true)
        const result = scope.kind === 'sprint' ? await startSprintQuiz(scope.sprint.id) : await startFinalQuiz(scope.projectId)
        setStarting(false)
        if (!result.success) { toast.error(result.error); return }
        setJobId(result.data.jobId)
    }

    const pick = async (choice: number) => {
        if (mode.kind !== 'taking' || mode.checked || !state?.quiz || busy) return
        setBusy(true)
        const result = await checkSprintQuizAnswer(state.quiz.id, mode.index, choice)
        setBusy(false)
        if (!result.success) { toast.error(result.error); return }
        const answers = [...mode.answers]
        answers[mode.index] = choice
        setMode({ ...mode, answers, checked: result.data })
    }

    const next = async () => {
        if (mode.kind !== 'taking' || !state?.quiz) return
        const last = mode.index + 1 >= state.quiz.questions.length
        if (!last) { setMode({ kind: 'taking', index: mode.index + 1, answers: mode.answers, checked: null }); return }
        setBusy(true)
        const result = await submitSprintQuizAttempt(state.quiz.id, mode.answers)
        setBusy(false)
        if (!result.success) { toast.error(result.error); return }
        setMode({ kind: 'result', attempt: result.data })
        setState((s) => (s ? { ...s, attempts: [result.data, ...s.attempts] } : s))
    }

    const review = async (attemptId: string) => {
        setBusy(true)
        const result = await reviewSprintQuizAttempt(attemptId)
        setBusy(false)
        if (!result.success) { toast.error(result.error); return }
        setMode({ kind: 'review', questions: result.data.questions })
    }

    const start = () => state?.quiz && setMode({ kind: 'taking', index: 0, answers: Array(state.quiz.questions.length).fill(-1), checked: null })

    return (
        <article className={cn(PAGE_COLUMN, 'pb-10 pt-4')}>
            <header>
                <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{scope.kind === 'sprint' ? `Sprint ${scope.sprint.number} · Quiz` : 'Final quiz'}</p>
                <h1 className="mt-1.5 flex items-center gap-2.5 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                    {scope.kind === 'sprint' ? <Brain className="h-5 w-5 shrink-0 text-neutral-500" /> : <GraduationCap className="h-5 w-5 shrink-0 text-neutral-500" />}
                    {scope.kind === 'sprint' ? scope.sprint.name : scope.title}
                </h1>
            </header>

            {error ? (
                <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400">{error}</p>
            ) : !state ? (
                <QuizSkeleton />
            ) : mode.kind === 'taking' && state.quiz ? (
                <Question
                    index={mode.index}
                    total={state.quiz.questions.length}
                    question={state.quiz.questions[mode.index]!}
                    picked={mode.answers[mode.index] ?? -1}
                    checked={mode.checked}
                    busy={busy}
                    onPick={pick}
                    onNext={next}
                />
            ) : mode.kind === 'result' ? (
                <Result attempt={mode.attempt} busy={busy} onRetake={start} onReview={() => review(mode.attempt.id)} onBack={() => setMode({ kind: 'overview' })} />
            ) : mode.kind === 'review' ? (
                <Review questions={mode.questions} onBack={() => setMode({ kind: 'overview' })} />
            ) : state.quiz ? (
                <Overview state={state} busy={busy} onStart={start} onReview={review} />
            ) : (
                <NotYet
                    scope={scope}
                    gate={state.gate}
                    tasksLeft={state.tasksLeft}
                    price={state.price}
                    generating={!!jobId}
                    progress={job.progress}
                    phase={job.phaseLabel}
                    starting={starting}
                    onGenerate={generate}
                />
            )}
        </article>
    )
}

function QuizSkeleton() {
    return (
        <div className="mt-6 space-y-4">
            <ShimmerStyles />
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-24 w-full rounded-xl" delay={0.05} />
        </div>
    )
}

function NotYet({ scope, gate, tasksLeft, price, generating, progress, phase, starting, onGenerate }: {
    scope: QuizScope; gate?: SprintQuizState['gate']; tasksLeft: number; price: number; generating: boolean; progress: number; phase?: string; starting: boolean; onGenerate: () => void
}) {
    const open = scope.kind === 'sprint' ? scope.sprint.tasks.filter((t) => t.status !== 'COMPLETED') : []
    return (
        <>
            <p className="mt-4 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                {scope.kind === 'sprint'
                    ? 'Ten questions on what this sprint asked you to build and why, written from its tasks and the notes you left when you finished them.'
                    : 'The whole project in one quiz: every sprint, and the decisions that carried from one to the next, written from your tasks and your notes.'}
            </p>
            <section className="mt-6 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
                {gate && !gate.open ? (
                    <>
                        <p className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white">
                            <Lock className="h-4 w-4 text-neutral-500" /> Opens at {gate.unlockAt}% of the project&apos;s tasks
                        </p>
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">You are at {gate.progress}%.</p>
                    </>
                ) : tasksLeft > 0 ? (
                    <>
                        <p className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white">
                            <Lock className="h-4 w-4 text-neutral-500" /> Opens when the sprint is done
                        </p>
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{tasksLeft} task{tasksLeft === 1 ? '' : 's'} left:</p>
                        <ul className="mt-3 space-y-1.5">
                            {open.map((t) => (
                                <li key={t.id} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                    <Circle className="h-3.5 w-3.5 shrink-0 text-neutral-400" /> {t.title}
                                </li>
                            ))}
                        </ul>
                    </>
                ) : generating ? (
                    <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white">
                            <InlineLoader size="md" /> {phase || 'Writing your quiz'}
                        </div>
                        <div className="mt-3 h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                            <div className="h-full bg-neutral-900 transition-all dark:bg-white" style={{ width: `${Math.max(5, progress)}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Usually under a minute. You can leave this tab; it picks up where it was.</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">{scope.kind === 'sprint' ? 'Every task is done. Your quiz is ready to write.' : 'Open. Your final quiz is ready to write.'}</p>
                            <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">Generated once for {scope.kind === 'sprint' ? 'this sprint' : 'this project'}; retakes are free.</p>
                        </div>
                        <Button onClick={onGenerate} disabled={starting}>
                            {starting ? <><InlineLoader size="sm" /> Starting</> : <>Generate quiz · {price} credits</>}
                        </Button>
                    </div>
                )}
            </section>
        </>
    )
}

function Overview({ state, busy, onStart, onReview }: { state: SprintQuizState; busy: boolean; onStart: () => void; onReview: (id: string) => void }) {
    const best = state.attempts.reduce<number | null>((b, a) => (b === null || a.score > b ? a.score : b), null)
    const last = state.attempts[0]
    return (
        <>
            <StatBand
                className="mt-6"
                size="sm"
                cols={3}
                items={[
                    { icon: ListChecks, label: 'Questions', value: state.quiz!.questions.length },
                    { icon: Trophy, label: 'Best', value: best === null ? '-' : `${best}%`, tone: best === null ? 'neutral' : best >= 70 ? 'emerald' : 'rose' },
                    { icon: History, label: 'Attempts', value: state.attempts.length },
                ]}
            />
            <div className="mt-6 flex items-center gap-3">
                <Button onClick={onStart} disabled={busy} className="gap-2">
                    {last ? <><RotateCcw className="h-4 w-4" /> Retake</> : <>Start the quiz <ArrowRight className="h-4 w-4" /></>}
                </Button>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">One question at a time; you see the answer after each.</span>
            </div>
            {state.attempts.length > 0 && (
                <section className="mt-8">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Your attempts</h2>
                    <ul className="mt-3 divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                        {state.attempts.map((a) => (
                            <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                                <span className="w-12 font-semibold tabular-nums text-neutral-900 dark:text-white">{a.score}%</span>
                                <span className="text-neutral-600 dark:text-neutral-400">{a.correct} of {a.total}</span>
                                <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">{new Date(a.createdAt).toLocaleString()}</span>
                                <button type="button" onClick={() => onReview(a.id)} disabled={busy} className="cursor-pointer text-xs font-medium text-neutral-700 underline-offset-4 hover:underline disabled:opacity-50 dark:text-neutral-300">Review</button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    )
}

function Question({ index, total, question, picked, checked, busy, onPick, onNext }: {
    index: number; total: number; question: { prompt: string; options: string[] }; picked: number
    checked: { correct: boolean; correctAnswer: number; explanation: string } | null; busy: boolean; onPick: (i: number) => void; onNext: () => void
}) {
    return (
        <section className="mt-6">
            <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="tabular-nums">Question {index + 1} of {total}</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div className="h-full bg-neutral-900 dark:bg-white" style={{ width: `${((index + (checked ? 1 : 0)) / total) * 100}%` }} />
                </div>
            </div>
            <p className="mt-5 text-lg font-medium leading-snug text-neutral-900 dark:text-white">{question.prompt}</p>
            <ol className="mt-5 space-y-2">
                {question.options.map((o, i) => {
                    const isRight = checked && i === checked.correctAnswer
                    const isWrongPick = checked && i === picked && !checked.correct
                    return (
                        <li key={i}>
                            <button
                                type="button"
                                disabled={!!checked || busy}
                                onClick={() => onPick(i)}
                                className={cn(
                                    'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors',
                                    !checked && 'cursor-pointer border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600',
                                    isRight && 'border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40',
                                    isWrongPick && 'border-rose-600 bg-rose-50 dark:border-rose-500 dark:bg-rose-950/40',
                                    checked && !isRight && !isWrongPick && 'border-neutral-200 opacity-60 dark:border-neutral-800',
                                )}
                            >
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[11px] font-semibold text-neutral-500">
                                    {isRight ? <Check className="h-3 w-3 text-emerald-700 dark:text-emerald-400" /> : isWrongPick ? <X className="h-3 w-3 text-rose-700 dark:text-rose-400" /> : String.fromCharCode(65 + i)}
                                </span>
                                <span className="text-neutral-800 dark:text-neutral-200">{o}</span>
                            </button>
                        </li>
                    )
                })}
            </ol>
            {busy && !checked && <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500"><InlineLoader size="sm" /> Checking</div>}
            {checked && (
                <div className="mt-5 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                    <p className={cn('text-sm font-semibold', checked.correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}>
                        {checked.correct ? 'Right.' : 'Not quite.'}
                    </p>
                    <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{checked.explanation}</p>
                    <div className="mt-4 flex justify-end">
                        <Button onClick={onNext} disabled={busy} className="gap-2">
                            {busy ? <><InlineLoader size="sm" /> Saving</> : index + 1 >= total ? 'See your score' : <>Next question <ArrowRight className="h-4 w-4" /></>}
                        </Button>
                    </div>
                </div>
            )}
        </section>
    )
}

function Result({ attempt, busy, onRetake, onReview, onBack }: { attempt: SprintQuizAttemptView; busy: boolean; onRetake: () => void; onReview: () => void; onBack: () => void }) {
    return (
        <section className="mt-6">
            <StatBand
                size="md"
                cols={2}
                items={[
                    { icon: Target, label: 'Score', value: `${attempt.score}%`, tone: attempt.score >= 70 ? 'emerald' : 'rose', progress: attempt.score },
                    { icon: Check, label: 'Correct', value: attempt.correct, hint: `of ${attempt.total}` },
                ]}
            />
            <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
                {attempt.score >= 70 ? 'Solid. The questions you missed are worth a second look before the next sprint.' : 'Worth a second pass: review the answers, reread the tasks you missed, and retake it - retakes are free.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={onReview} disabled={busy} variant="outline">Review answers</Button>
                <Button onClick={onRetake} disabled={busy} variant="outline" className="gap-2"><RotateCcw className="h-4 w-4" /> Retake</Button>
                <Button onClick={onBack} variant="ghost">Done</Button>
            </div>
        </section>
    )
}

function Review({ questions, onBack }: { questions: { prompt: string; options: string[]; correctAnswer: number; explanation: string; picked: number }[]; onBack: () => void }) {
    return (
        <section className="mt-6">
            <Button onClick={onBack} variant="ghost" size="sm" className="-ml-2">Back</Button>
            <ol className="mt-3 space-y-6">
                {questions.map((q, i) => {
                    const right = q.picked === q.correctAnswer
                    return (
                        <li key={i}>
                            <p className="flex gap-2 text-[15px] font-medium text-neutral-900 dark:text-white">
                                {right ? <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" /> : <X className="mt-1 h-4 w-4 shrink-0 text-rose-700 dark:text-rose-400" />}
                                {i + 1}. {q.prompt}
                            </p>
                            <p className="mt-1.5 pl-6 text-sm text-neutral-700 dark:text-neutral-300">
                                Answer: {q.options[q.correctAnswer]}
                                {!right && <span className="block text-neutral-500 dark:text-neutral-400">You chose: {q.picked >= 0 ? q.options[q.picked] : 'nothing'}</span>}
                            </p>
                            <p className="mt-1 pl-6 text-sm text-neutral-600 dark:text-neutral-400">{q.explanation}</p>
                        </li>
                    )
                })}
            </ol>
        </section>
    )
}

