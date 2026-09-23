'use client'

import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu'
import { cn } from '@repo/ui/lib/utils'

export interface HoverSelectOption<T extends string> {
    value: T
    label: string
    icon?: LucideIcon
    /** Shown at the end of the row. Omitted when zero. */
    count?: number
}

interface HoverSelectProps<T extends string> {
    value: T
    onValueChange: (value: T) => void
    options: HoverSelectOption<T>[]
    /** Names the control for screen readers; the trigger shows the current value. */
    ariaLabel: string
    className?: string
}

// How long the pointer may be off both trigger and menu before it closes. Long
// enough to cross the 4px gap between them, short enough to feel like hover.
const CLOSE_DELAY_MS = 150

/*
 * A filter dropdown that opens on HOVER (Niraj, 2026-09-23, PJ-16 item 3), used
 * by the Resources and Errors lists so the project page's sheets and the sprint
 * board's tabs share it.
 *
 * Built on DropdownMenu, not Select. Radix Select is modal: while open it sets
 * `pointer-events: none` on the page, so the pointer "leaves" the trigger the
 * moment the menu appears and a hover-opened Select flickers shut.
 *
 * Hover is for a mouse only. Touch and keyboard open it the usual way, and a
 * click on a menu that hover already opened does not toggle it closed again.
 */
export function HoverSelect<T extends string>({ value, onValueChange, options, ariaLabel, className }: HoverSelectProps<T>) {
    const [open, setOpen] = useState(false)
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const cancelClose = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current)
        closeTimer.current = null
    }
    const enter = (e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse') return
        cancelClose()
        setOpen(true)
    }
    const leave = (e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse') return
        cancelClose()
        closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
    }
    useEffect(() => cancelClose, [])

    const current = options.find((o) => o.value === value) ?? options[0]
    const CurrentIcon = current?.icon

    return (
        <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
            <DropdownMenuTrigger
                aria-label={ariaLabel}
                onPointerEnter={enter}
                onPointerLeave={leave}
                onPointerDown={(e) => {
                    // Radix skips its own toggle when the event is prevented.
                    if (open && e.pointerType === 'mouse') e.preventDefault()
                }}
                className={cn(
                    'flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition-colors',
                    'hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                    'data-[state=open]:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:data-[state=open]:border-neutral-500',
                    className
                )}
            >
                {CurrentIcon && <CurrentIcon className="h-4 w-4 shrink-0" />}
                <span className="min-w-0 flex-1 truncate text-left">{current?.label}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                onPointerEnter={enter}
                onPointerLeave={leave}
                className="max-h-80 overflow-y-auto"
            >
                <DropdownMenuRadioGroup value={value} onValueChange={(v) => onValueChange(v as T)}>
                    {
                        options.map(({ value: v, label, icon: Icon, count }) => (
                            <DropdownMenuRadioItem key={v} value={v} className="gap-2">
                                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                                <span className="flex-1">{label}</span>
                                {!!count && <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{count}</span>}
                            </DropdownMenuRadioItem>
                        ))
                    }
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
