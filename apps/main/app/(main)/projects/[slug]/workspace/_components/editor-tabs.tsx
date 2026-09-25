'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Book, BookOpen, Brain, GraduationCap, Lock, Mic, MonitorPlay, Presentation, X } from 'lucide-react'
import { AIIcon } from '@repo/ui/components/ui/ai-mark'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'
import { FileIcon } from './file-icon'
import { isPinned, isVirtual, tabLabel, type VirtualTab } from './workspace-model'

const VIRTUAL_ICONS: Record<VirtualTab, LucideIcon | typeof AIIcon> = {
    '@ai': AIIcon, '@task': BookOpen, '@quiz': Brain, '@mock': MonitorPlay, '@resources': Book, '@errors': AlertTriangle, '@standup': Mic,
    '@final-quiz': GraduationCap, '@final-mock': Presentation,
}

interface EditorTabsProps {
    tabs: string[]
    active: string | null
    dirty: ReadonlySet<string>
    readonly: ReadonlySet<string>
    onSelect: (tab: string) => void
    onClose: (tab: string) => void
    onReorder: (tabs: string[]) => void
    /** Controls pinned to the right end of the strip (editor settings, preview). */
    trailing?: React.ReactNode
}

/*
 * Editor tabs that behave like an editor's (plan/project-workspace WS-3).
 *
 * Click selects, the x or a middle-click closes, drag reorders. An unsaved file
 * shows a dot where the x would be, and the x on hover - the convention every
 * editor uses, so nobody has to learn it. The strip scrolls sideways when it
 * overflows, and the active tab is scrolled into view when it changes.
 */
export function EditorTabs({ tabs, active, dirty, readonly, onSelect, onClose, onReorder, trailing }: EditorTabsProps) {
    const [dragging, setDragging] = useState<string | null>(null)
    const activeRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [active])

    return (
        <div className="flex h-9 shrink-0 border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
        <div
            role="tablist"
            aria-label="Open files"
            className="flex min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
        >
            {tabs.map((tab) => {
                const isActive = tab === active
                const virtual = isVirtual(tab)
                const isDirty = dirty.has(tab)
                const VIcon = virtual ? VIRTUAL_ICONS[tab] : null
                const pinned = isPinned(tab)
                return (
                    <div
                        key={tab}
                        ref={isActive ? activeRef : undefined}
                        role="tab"
                        aria-selected={isActive}
                        tabIndex={0}
                        title={virtual ? tabLabel(tab) : tab.slice(1)}
                        draggable={!pinned}
                        onDragStart={() => setDragging(tab)}
                        onDragEnd={() => setDragging(null)}
                        onDragOver={(e) => {
                            e.preventDefault()
                            // Nothing lands among the pinned tabs.
                            if (!dragging || dragging === tab || pinned) return
                            // Take the dragged tab's place from the side it came from.
                            // It used to always land BEFORE the tab under the pointer,
                            // so dragging right onto the neighbour put it back where it
                            // was and the tab never moved (Niraj, 2026-09-24).
                            const from = tabs.indexOf(dragging)
                            const to = tabs.indexOf(tab)
                            const next = tabs.filter((t) => t !== dragging)
                            next.splice(from < to ? next.indexOf(tab) + 1 : next.indexOf(tab), 0, dragging)
                            onReorder(next)
                        }}
                        onClick={() => onSelect(tab)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(tab) }}
                        onAuxClick={(e) => { if (e.button === 1 && !pinned) { e.preventDefault(); onClose(tab) } }}
                        className={cn(
                            'group relative flex h-full shrink-0 cursor-pointer select-none items-center gap-1.5 border-r border-neutral-200 pl-3 pr-1.5 text-[13px] transition-colors dark:border-neutral-800',
                            isActive
                                ? 'bg-white text-neutral-900 dark:bg-black dark:text-white'
                                : 'text-neutral-500 hover:bg-white/60 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-200',
                            dragging === tab && 'opacity-50'
                        )}
                    >
                        {/* The active tab's top edge, the way editors mark it. */}
                        {isActive && <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-neutral-900 dark:bg-white" />}
                        {VIcon ? <VIcon className="h-3.5 w-3.5 shrink-0 opacity-70" /> : <FileIcon path={tab} className="h-3.5 w-3.5" />}
                        <span className={cn('max-w-[160px] truncate', virtual && 'font-medium')}>{tabLabel(tab)}</span>
                        {readonly.has(tab) && <Lock aria-label="Read-only" className="h-3 w-3 shrink-0 opacity-60" />}
                        {pinned ? <span aria-hidden className="w-1" /> : (
                        <button
                            type="button"
                            aria-label={`Close ${tabLabel(tab)}`}
                            onClick={(e) => { e.stopPropagation(); onClose(tab) }}
                            className="relative flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded hover:bg-neutral-200 dark:hover:bg-neutral-800"
                        >
                            {isDirty && <span aria-hidden className="h-2 w-2 rounded-full bg-current group-hover:hidden" />}
                            <X className={cn('h-3.5 w-3.5', isDirty ? 'hidden group-hover:block' : isActive ? 'block' : 'opacity-0 group-hover:opacity-100')} />
                        </button>
                        )}
                    </div>
                )
            })}
        </div>
        {trailing && <div className="flex shrink-0 items-center gap-0.5 border-l border-neutral-200 px-1.5 dark:border-neutral-800">{trailing}</div>}
        </div>
    )
}
