"use client"

/**
 * The building blocks of the profile editor (plan/profile PRF-11), drawn in the
 * project workspace's language (`projects/[slug]/workspace`): hairline borders instead
 * of cards, 11px uppercase strip headers, dense rows, the selected state inverted,
 * and an empty state that is one line and one button.
 */

import * as React from "react"
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@repo/ui/components/ui/alert-dialog"
import { cn } from "@repo/ui/lib/utils"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "Jan 2024 - Present". A plain hyphen, never a dash character. */
export function formatRange(start?: Date | string | null, end?: Date | string | null, current?: boolean): string {
    const fmt = (d?: Date | string | null) => {
        if (!d) return ""
        const x = typeof d === "string" ? new Date(d) : d
        return Number.isNaN(x.getTime()) ? "" : `${MONTHS[x.getMonth()]} ${x.getFullYear()}`
    }
    const a = fmt(start)
    const b = current || !end ? "Present" : fmt(end)
    return a ? `${a} - ${b}` : b
}

/** The pane's own strip: title, a count, and its primary action. `h-11` to line up with the nav's header. */
export function PaneHeader({ title, count, action }: { title: string; count?: number; action?: React.ReactNode }) {
    return (
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-neutral-200 px-6 dark:border-neutral-800">
            <h2 className="text-[13px] font-semibold text-neutral-900 dark:text-white">{title}</h2>
            {count !== undefined && <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{count}</span>}
            <div className="ml-auto flex items-center gap-1">{action}</div>
        </div>
    )
}

export function AddButton({ onClick, children = "Add" }: { onClick: () => void; children?: React.ReactNode }) {
    return (
        <Button type="button" size="sm" variant="ghost" onClick={onClick} className="h-7 cursor-pointer gap-1 px-2 text-xs">
            <Plus className="size-3.5" /> {children}
        </Button>
    )
}

/** The pane body. The page frame (max-w-5xl) already sets the width. */
export function PaneBody({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn("w-full px-6 py-6", className)}>{children}</div>
}

/** One line and one button, centred in the pane. */
export function EmptyPane({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">{title}</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{body}</p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    )
}

/** A list of rows separated by hairlines, no card around it. */
export function Rows({ children }: { children: React.ReactNode }) {
    return <ul className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">{children}</ul>
}

/**
 * One entry: title and subtitle on the left, a right-aligned meta (dates), then a
 * `...` menu. Clicking the row edits it, which is the common case; the menu holds
 * Edit and Delete for anyone who looks for them there.
 */
export function Row({
    title, subtitle, meta, badges, detail, onEdit, onDelete, deleteWhat,
}: {
    title: string
    subtitle?: React.ReactNode
    meta?: React.ReactNode
    badges?: React.ReactNode
    detail?: React.ReactNode
    onEdit: () => void
    onDelete: () => void | Promise<void>
    deleteWhat: string
}) {
    const [confirm, setConfirm] = React.useState(false)
    return (
        <li className="group relative">
            <div
                role="button"
                tabIndex={0}
                onClick={onEdit}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onEdit()
                    }
                }}
                className="flex cursor-pointer items-start gap-3 px-2 py-3 transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none dark:hover:bg-neutral-900/60 dark:focus-visible:bg-neutral-900/60"
            >
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{title}</p>
                        {badges}
                    </div>
                    {subtitle && <p className="mt-0.5 truncate text-[13px] text-neutral-600 dark:text-neutral-400">{subtitle}</p>}
                    {detail && <div className="mt-1.5">{detail}</div>}
                </div>
                {meta && <p className="shrink-0 pt-0.5 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{meta}</p>}
                <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Actions for ${title}`}
                                className="size-7 cursor-pointer text-neutral-400 opacity-60 hover:text-neutral-900 group-hover:opacity-100 data-[state=open]:opacity-100 dark:hover:text-white"
                            >
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onSelect={onEdit} className="cursor-pointer">
                                <Pencil className="mr-2 size-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setConfirm(true)} className="cursor-pointer text-red-600 focus:text-red-700 dark:text-red-400">
                                <Trash2 className="mr-2 size-3.5" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <AlertDialog open={confirm} onOpenChange={setConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deleteWhat}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            &ldquo;{title}&rdquo; is removed from your profile. Resumes you have already built keep their own copy. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">Keep it</AlertDialogCancel>
                        <AlertDialogAction className="cursor-pointer" onClick={() => void onDelete()}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </li>
    )
}

/** A quiet bordered marker: "Private", "In progress". */
export function Tag({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-md border border-neutral-200 px-1.5 py-px text-[11px] font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
            {children}
        </span>
    )
}

/** A label/value line for the read-only summaries (Identity, Career goals). */
export function Detail({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-4 py-2.5 text-[13px]">
            <dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
            <dd className={cn("min-w-0 break-words", value ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400 dark:text-neutral-500")}>
                {value || "Not set"}
            </dd>
        </div>
    )
}
