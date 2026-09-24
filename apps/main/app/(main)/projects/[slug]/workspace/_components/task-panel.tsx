'use client'

import { useState } from 'react'
import { Brain, Check, ChevronRight, Circle, CircleDot, MonitorPlay } from 'lucide-react'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { cn } from '@repo/ui/lib/utils'
import { isSetupSprint, sprintLabel } from '@/lib/projects/sprints'
import type { WorkspaceSprint } from './workspace-client'

export type SprintPage = 'quiz' | 'mock'

interface TaskPanelProps {
    sprints: WorkspaceSprint[]
    activeTaskId: string | null
    /** The sprint page open in the editor, if one is: which kind, for which sprint. */
    activeSprintPage: { kind: SprintPage; sprintId: string } | null
    onSelect: (taskId: string) => void
    onOpenSprintPage: (kind: SprintPage, sprintId: string) => void
}

/*
 * Sprints and their tasks, compact like an explorer: one line a row, the
 * current task marked. Each sprint ends with its Quiz and Mock interview
 * (Niraj, 2026-09-24), which open as tabs the way the task brief does.
 * A sprint is open if it holds the current item or has work left.
 */
export function TaskPanel({ sprints, activeTaskId, activeSprintPage, onSelect, onOpenSprintPage }: TaskPanelProps) {
    const [open, setOpen] = useState<Record<string, boolean>>({})

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-9 shrink-0 items-center border-b border-neutral-200 px-3 dark:border-neutral-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Tasks</span>
            </div>
            <ScrollArea reflow className="min-h-0 flex-1">
                <div className="py-1">
                    {sprints.length === 0 && (
                        <p className="px-3 py-4 text-xs text-neutral-500 dark:text-neutral-400">This project has no sprints yet.</p>
                    )}
                    {sprints.map((sp) => {
                        const done = sp.tasks.filter((t) => t.status === 'COMPLETED').length
                        const holdsActive = sp.tasks.some((t) => t.id === activeTaskId) || activeSprintPage?.sprintId === sp.id
                        const isOpen = open[sp.id] ?? (holdsActive || done < sp.tasks.length)
                        return (
                            <div key={sp.id}>
                                <button
                                    type="button"
                                    onClick={() => setOpen((o) => ({ ...o, [sp.id]: !isOpen }))}
                                    className="flex w-full cursor-pointer items-center gap-1 px-2 py-1 text-left hover:bg-neutral-100 dark:hover:bg-neutral-900"
                                >
                                    <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-neutral-500 transition-transform', isOpen && 'rotate-90')} />
                                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-neutral-900 dark:text-white" title={sp.name}>
                                        {isSetupSprint(sp.number) ? 'Setup' : `${sp.number}. ${sp.name}`}
                                    </span>
                                    <span className="shrink-0 text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">{done}/{sp.tasks.length}</span>
                                </button>
                                {isOpen && (
                                    <ul className="pb-1">
                                        {sp.tasks.map((t) => {
                                            const active = t.id === activeTaskId && !activeSprintPage
                                            const Icon = t.status === 'COMPLETED' ? Check : t.status === 'IN_PROGRESS' ? CircleDot : Circle
                                            return (
                                                <Row key={t.id} active={active} onClick={() => onSelect(t.id)} title={t.title}>
                                                    <Icon className={cn('h-3.5 w-3.5 shrink-0', t.status === 'COMPLETED' ? 'text-neutral-900 dark:text-white' : 'text-neutral-400')} />
                                                    <span className={cn('min-w-0 truncate', t.status === 'COMPLETED' && !active && 'text-neutral-500 line-through dark:text-neutral-500')}>
                                                        {t.title}
                                                    </span>
                                                </Row>
                                            )
                                        })}
                                        {/* Setup has no quiz or mock interview (plan/project-repos RP-3). */}
                                        {!isSetupSprint(sp.number) && ([['quiz', 'Quiz', Brain], ['mock', 'Mock interview', MonitorPlay]] as const).map(([kind, label, Icon]) => (
                                            <Row
                                                key={kind}
                                                active={activeSprintPage?.kind === kind && activeSprintPage.sprintId === sp.id}
                                                onClick={() => onOpenSprintPage(kind, sp.id)}
                                                title={`Sprint ${sp.number} ${label.toLowerCase()}`}
                                            >
                                                <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                                                <span className="min-w-0 truncate">{label}</span>
                                            </Row>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )
}

function Row({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
    return (
        <li>
            <button
                type="button"
                onClick={onClick}
                title={title}
                aria-current={active ? 'true' : undefined}
                className={cn(
                    'flex h-[26px] w-full cursor-pointer items-center gap-2 pl-6 pr-2 text-left text-[12.5px] transition-colors',
                    active
                        ? 'bg-neutral-200/70 text-neutral-900 dark:bg-neutral-800 dark:text-white'
                        : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900'
                )}
            >
                {children}
            </button>
        </li>
    )
}
