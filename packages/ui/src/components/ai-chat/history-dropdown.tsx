"use client"

import { useEffect, useRef } from "react"
import { format, isToday, subDays } from "date-fns"
import { Check, Trash2 } from "lucide-react"
import { ScrollArea } from "../ui/scroll-area"
import { cn } from "../../lib/utils"
import type { AIChatSummary } from "./types"

// Past conversations, as a dropdown under the panel title (gurukulhq's pattern,
// plan/ai-chat AC-5). It replaced a dialog: history is something you glance at on
// the way to a chat, and a modal over the whole app was more ceremony than that.

interface Section { label: string; items: AIChatSummary[] }

function group(sessions: AIChatSummary[]): Section[] {
    const now = Date.now()
    const week = subDays(now, 7).getTime()
    const month = subDays(now, 30).getTime()
    const out: Section[] = [
        { label: "Today", items: [] },
        { label: "Previous 7 days", items: [] },
        { label: "Previous 30 days", items: [] },
        { label: "Older", items: [] },
    ]
    for (const s of sessions) {
        const t = s.updatedAt
        const i = isToday(t) ? 0 : t >= week ? 1 : t >= month ? 2 : 3
        out[i]!.items.push(s)
    }
    return out.filter((s) => s.items.length > 0)
}

const rowStamp = (ms: number) => (isToday(ms) ? format(ms, "h:mm a") : format(ms, "MMM d"))

export function HistoryDropdown({
    open,
    onClose,
    anchorRef,
    sessions,
    loaded,
    activeId,
    onSelect,
    onDelete,
}: {
    open: boolean
    onClose: () => void
    /** The title button; a click on it is not an "outside" click. */
    anchorRef: React.RefObject<HTMLElement | null>
    sessions: AIChatSummary[]
    /** False until the first list has arrived. */
    loaded: boolean
    activeId: string | null
    onSelect: (id: string) => void
    onDelete: (id: string) => void
}) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const onDown = (e: MouseEvent) => {
            const target = e.target as Node
            if (ref.current?.contains(target) || anchorRef.current?.contains(target)) return
            onClose()
        }
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
        document.addEventListener("mousedown", onDown)
        document.addEventListener("keydown", onKey)
        return () => {
            document.removeEventListener("mousedown", onDown)
            document.removeEventListener("keydown", onKey)
        }
    }, [open, onClose, anchorRef])

    if (!open) return null
    const sections = group(sessions)

    return (
        <div
            ref={ref}
            role="dialog"
            aria-label="Chat history"
            className="absolute left-2 top-full z-50 mt-1 w-72 max-w-[calc(100%-1rem)] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
        >
            <ScrollArea className="w-full" viewportClassName="max-h-80" reflow>
                {!loaded ? (
                    // Rows shaped like the real ones, rather than a spinner (CLAUDE.md).
                    <div className="space-y-2 p-3" aria-label="Loading chats">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" style={{ width: `${85 - i * 12}%` }} />
                        ))}
                    </div>
                ) : sections.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-neutral-600 dark:text-neutral-400">No past conversations yet</p>
                ) : (
                    sections.map((section) => (
                        <div key={section.label} className="pb-1">
                            <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                                {section.label}
                            </p>
                            {section.items.map((s) => {
                                const active = s.id === activeId
                                return (
                                    // A div, not a button, so the delete button can nest validly.
                                    <div
                                        key={s.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => onSelect(s.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(s.id) }
                                        }}
                                        className={cn(
                                            "group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800",
                                            active && "bg-neutral-50 dark:bg-neutral-800/60",
                                        )}
                                    >
                                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
                                            {s.title || "New conversation"}
                                        </span>
                                        <span className="shrink-0 text-xs tabular-nums text-neutral-500 group-hover:hidden group-focus-within:hidden dark:text-neutral-400">
                                            {rowStamp(s.updatedAt)}
                                        </span>
                                        {active && <Check className="h-3 w-3 shrink-0 text-neutral-700 dark:text-neutral-300" aria-label="Open" />}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onDelete(s.id) }}
                                            aria-label={`Delete ${s.title || "conversation"}`}
                                            title="Delete"
                                            className="hidden h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:flex group-hover:flex group-focus-within:flex dark:text-neutral-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    ))
                )}
            </ScrollArea>
        </div>
    )
}

export default HistoryDropdown
