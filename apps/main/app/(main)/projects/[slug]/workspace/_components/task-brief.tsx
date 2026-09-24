'use client'

import { useState } from 'react'
import { Check, ChevronRight, FlaskConical, Lightbulb, NotebookPen } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { InlineLoader } from '@repo/ui/components/ui/inline-loader'
import { cn } from '@repo/ui/lib/utils'
import { isSetupSprint, sprintLabel } from '@/lib/projects/sprints'
import { PAGE_COLUMN } from './sprint-pages'
import { BriefParagraphs, BriefText } from './brief-text'
import { TASK_NOTE_MAX, taskNoteProblem } from '@/lib/projects/task-notes'
import type { WorkspaceSprint, WorkspaceTask, TaskStatus } from './workspace-client'

interface TaskBriefProps {
    sprint: WorkspaceSprint
    task: WorkspaceTask
    testPath: string | null
    onOpenFile: (path: string) => void
    /** Resolves true when saved. A note goes with "Done" on a sprint task (RP-6). */
    onStatus: (status: TaskStatus, note?: string) => Promise<boolean>
    onSaveNote: (note: string) => Promise<boolean>
    /** Runs the task's tests (WS-5); absent when the project cannot run here. */
    onCheck?: () => void
    checking?: boolean
}

const STATUSES: { value: TaskStatus; label: string }[] = [
    { value: 'TO_DO', label: 'To do' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'COMPLETED', label: 'Done' },
]

/*
 * The Task tab: the brief for the task in hand, rendered as a document in its own
 * editor tab (plan/project-workspace, overview point 2).
 *
 * It is built from the task's fields rather than stored as a file, so it can
 * never drift from what the board shows. Hints are folded away: they are
 * nudges for when you are stuck, not part of the brief.
 */
export function TaskBrief({ sprint, task, testPath, onOpenFile, onStatus, onSaveNote, onCheck, checking }: TaskBriefProps) {
    const setup = isSetupSprint(sprint.number)
    // 'done': writing the note that marks it done; 'edit': changing a saved one.
    const [noteMode, setNoteMode] = useState<null | 'done' | 'edit'>(null)

    const choose = (status: TaskStatus) => {
        if (status === task.status) return
        // A sprint task needs a note to be done, unless it already has one.
        if (status === 'COMPLETED' && !setup && !task.note) { setNoteMode('done'); return }
        setNoteMode(null)
        void onStatus(status)
    }

    return (
        <article className={cn(PAGE_COLUMN, 'pb-8 pt-4 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300')}>
            <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                {sprintLabel(sprint.number)} · {isSetupSprint(sprint.number) ? 'Step' : 'Task'} {task.number}
                {task.estimatedTime && ` · ${task.estimatedTime}`}
            </p>
            <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">{task.title}</h1>

            <div className="mt-5 flex flex-wrap items-center gap-2">
                <div role="radiogroup" aria-label="Task status" className="inline-flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800">
                    {STATUSES.map((s) => (
                        <button
                            key={s.value}
                            type="button"
                            role="radio"
                            aria-checked={task.status === s.value}
                            onClick={() => choose(s.value)}
                            className={cn(
                                'cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors',
                                task.status === s.value
                                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                            )}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {noteMode ? (
                <NoteEditor
                    key={`${task.id}-${noteMode}`}
                    initial={noteMode === 'edit' ? task.note ?? '' : ''}
                    action={noteMode === 'done' ? 'Mark done' : 'Save note'}
                    onCancel={() => setNoteMode(null)}
                    onSave={async (note) => {
                        const ok = noteMode === 'done' ? await onStatus('COMPLETED', note) : await onSaveNote(note)
                        if (ok) setNoteMode(null)
                    }}
                />
            ) : task.note && (
                <section className="mt-5 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                    <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white">
                        <NotebookPen className="h-4 w-4 text-neutral-500" />
                        Your note
                        <button type="button" onClick={() => setNoteMode('edit')} className="ml-auto cursor-pointer text-xs font-medium text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-white">
                            Edit
                        </button>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">{task.note}</p>
                </section>
            )}

            <section className="mt-8 space-y-3">
                <BriefParagraphs paragraphs={task.description} />
            </section>

            {task.criteria.length > 0 && (
                <section className="mt-8">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Done when</h2>
                    <ul className="mt-3 space-y-2">
                        {task.criteria.map((c, i) => (
                            <li key={i} className="flex gap-2.5">
                                <Check className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />
                                <span><BriefText text={c} /></span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Only a task with tests gets this box; in V1 (code on the learner's
                machine) none do, and "no tests" on every task is noise. */}
            {testPath && (
            <section className="mt-8 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="flex items-start gap-3">
                    <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                    <div className="min-w-0 flex-1 text-sm">
                        {testPath ? (
                            <>
                                <p className="text-neutral-900 dark:text-white">Checked by tests</p>
                                <button
                                    type="button"
                                    onClick={() => onOpenFile(testPath)}
                                    className="mt-0.5 cursor-pointer font-mono text-xs text-neutral-600 underline-offset-4 hover:underline dark:text-neutral-400"
                                >
                                    {testPath.slice(1)}
                                </button>
                            </>
                        ) : (
                            <p className="text-neutral-600 dark:text-neutral-400">
                                No tests for this one. Check it against the list above and mark it done yourself.
                            </p>
                        )}
                    </div>
                    {testPath && (
                        <Button size="sm" onClick={onCheck} disabled={!onCheck || checking} title={onCheck ? 'Run this task\'s tests against your code' : 'This project does not run in the browser yet'}>
                            {checking ? <><InlineLoader size="sm" /> Checking</> : 'Check task'}
                        </Button>
                    )}
                </div>
            </section>
            )}

            {task.hints.length > 0 && (
                <details className="group mt-6">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                        <Lightbulb className="h-4 w-4" />
                        Stuck? {task.hints.length === 1 ? 'A hint' : `${task.hints.length} hints`}
                    </summary>
                    <ul className="mt-3 space-y-2 pl-6 text-sm">
                        {task.hints.map((h, i) => <li key={i} className="list-disc"><BriefText text={h} /></li>)}
                    </ul>
                </details>
            )}
        </article>
    )
}

/*
 * "What did you build or decide?" - a line or two, kept on the task. The sprint
 * quiz and mock interview ask about it, so it is the learner's own account of
 * the work, not a formality.
 */
function NoteEditor({ initial, action, onSave, onCancel }: { initial: string; action: string; onSave: (note: string) => Promise<void>; onCancel: () => void }) {
    const [text, setText] = useState(initial)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const save = async () => {
        const problem = taskNoteProblem(text)
        if (problem) { setError(problem); return }
        setBusy(true)
        await onSave(text.trim())
        setBusy(false)
    }
    return (
        <section className="mt-5 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
            <label htmlFor="task-note" className="text-sm font-medium text-neutral-900 dark:text-white">What did you build or decide?</label>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">A line or two. Your sprint quiz and mock interview will ask you about it.</p>
            <textarea
                id="task-note"
                autoFocus
                rows={3}
                maxLength={TASK_NOTE_MAX}
                value={text}
                onChange={(e) => { setText(e.target.value); setError(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save() } }}
                placeholder="e.g. Stored amounts as integer cents; the shares check lives in a database constraint, not the form."
                className="mt-3 w-full resize-y rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800 dark:text-white dark:focus:border-neutral-600"
            />
            <div className="mt-2 flex items-center gap-2">
                <span className={cn('text-xs tabular-nums', error ? 'text-red-600 dark:text-red-400' : 'text-neutral-500 dark:text-neutral-400')}>
                    {error ?? `${text.trim().length}/${TASK_NOTE_MAX}`}
                </span>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={onCancel} disabled={busy}>Cancel</Button>
                <Button size="sm" onClick={() => void save()} disabled={busy}>
                    {busy ? <><InlineLoader size="sm" /> Saving</> : action}
                </Button>
            </div>
        </section>
    )
}
