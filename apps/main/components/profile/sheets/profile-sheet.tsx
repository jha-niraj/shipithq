"use client"

/**
 * The shell every profile sheet is built on (plan/profile PRF-9).
 *
 * Header, scrolling body, pinned footer - UI-9's pattern, written once. Before this,
 * each of the four sheets drew its own footer, and they disagreed: one left-aligned
 * button with no Cancel, one full-width hand-styled `bg-neutral-900` button with a
 * Plus icon on "Save Changes", footers at `pt-0` so the button sat on the border.
 *
 * It also owns the two confirmations a form sheet needs, so no sheet forgets them:
 * deleting (not undoable) and closing with unsaved changes.
 */

import * as React from "react"
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@repo/ui/components/ui/sheet"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@repo/ui/components/ui/alert-dialog"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Label } from "@repo/ui/components/ui/label"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { cn } from "@repo/ui/lib/utils"

export interface ProfileSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    /** `sm:max-w-lg` for most; the project sheet has three-column rows and wants more. */
    width?: "md" | "lg"
    children: React.ReactNode

    /** Primary action. The sheet does not close itself; the caller closes on success. */
    onSubmit?: () => void | Promise<void>
    submitLabel?: string
    /** Verb shown beside the loader while submitting: "Saving", "Adding". */
    busyLabel?: string
    busy?: boolean
    canSubmit?: boolean

    /** Present only in edit mode. Confirmed before it runs. */
    onDelete?: () => void | Promise<void>
    deleteLabel?: string
    deleteWhat?: string

    /** When true, closing asks before throwing the typing away. */
    dirty?: boolean
    /** "Cancel" by default; "Done" for a sheet that saves as you go. */
    closeLabel?: string
    /**
     * Right side of the header: the Edit Profile sheet's tabs (Niraj, 2026-09-25:
     * "put the tabs on the right side"). Below sm it drops under the title and
     * scrolls sideways rather than squeezing four labels into a phone's width.
     */
    headerAside?: React.ReactNode
}

export function ProfileSheet({
    open, onOpenChange, title, description, width = "md", children,
    onSubmit, submitLabel = "Save", busyLabel = "Saving", busy = false, canSubmit = true,
    onDelete, deleteLabel = "Delete", deleteWhat = "this",
    dirty = false, closeLabel = "Cancel", headerAside,
}: ProfileSheetProps) {
    const [confirm, setConfirm] = React.useState<"delete" | "discard" | null>(null)

    const requestClose = (next: boolean) => {
        if (next) return onOpenChange(true)
        if (busy) return
        if (dirty) return setConfirm("discard")
        onOpenChange(false)
    }

    const submit = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!busy && canSubmit) void onSubmit?.()
    }

    return (
        <>
            <Sheet open={open} onOpenChange={requestClose}>
                <SheetContent
                    scroll={false}
                    side="right"
                    className={cn("flex w-full flex-col gap-0 p-0", width === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg")}
                >
                    {/* `pr-12` keeps everything clear of the sheet's own close button. */}
                    <SheetHeader className="shrink-0 space-y-0 border-b border-neutral-200 py-3.5 pl-6 pr-12 text-left dark:border-neutral-800">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div className="min-w-0">
                                <SheetTitle className="text-base font-semibold tracking-tight">{title}</SheetTitle>
                                {description && (
                                    <SheetDescription className="mt-0.5 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                                        {description}
                                    </SheetDescription>
                                )}
                            </div>
                            {headerAside && (
                                <div className="-mx-1 min-w-0 overflow-x-auto px-1 [scrollbar-width:none] sm:mx-0 sm:shrink-0 sm:overflow-visible sm:px-0">
                                    {headerAside}
                                </div>
                            )}
                        </div>
                    </SheetHeader>

                    {/* A form, so Enter in a single-line field submits. */}
                    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                        <ScrollArea className="min-h-0 flex-1" reflow>
                            <div className="space-y-6 px-6 py-6">{children}</div>
                        </ScrollArea>

                        <div className="flex shrink-0 items-center gap-2 border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
                            {onDelete && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={busy}
                                    onClick={() => setConfirm("delete")}
                                    className="cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                                >
                                    {deleteLabel}
                                </Button>
                            )}
                            <div className="ml-auto flex items-center gap-2">
                                <Button type="button" variant="ghost" disabled={busy} onClick={() => requestClose(false)} className="cursor-pointer">
                                    {closeLabel}
                                </Button>
                                {onSubmit && (
                                    <Button type="submit" disabled={busy || !canSubmit} className="min-w-24 cursor-pointer">
                                        {busy ? (
                                            <span className="inline-flex items-center gap-2">
                                                <InlineLoader size="sm" />
                                                {busyLabel}
                                            </span>
                                        ) : submitLabel}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>

            <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirm === "delete" ? `Delete ${deleteWhat}?` : "Discard your changes?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirm === "delete"
                                ? "It is removed from your profile. Resumes you have already built keep their own copy. This cannot be undone."
                                : "What you typed in this sheet has not been saved."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">
                            {confirm === "delete" ? "Keep it" : "Keep editing"}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="cursor-pointer"
                            onClick={() => {
                                const which = confirm
                                setConfirm(null)
                                if (which === "delete") void onDelete?.()
                                else onOpenChange(false)
                            }}
                        >
                            {confirm === "delete" ? "Delete" : "Discard"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

/** A label ABOVE its control, with an optional hint and error. The one field layout. */
export function Field({
    label, htmlFor, required, hint, error, className, children, aside,
}: {
    label: string
    htmlFor?: string
    required?: boolean
    hint?: string
    error?: string | null
    className?: string
    /** Right side of the label row: a counter, a small toggle. */
    aside?: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className={cn("space-y-1.5", className)}>
            <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={htmlFor} className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                    {label}
                    {required && <span className="ml-0.5 text-neutral-400">*</span>}
                </Label>
                {aside}
            </div>
            {children}
            {error ? (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            ) : hint ? (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
            ) : null}
        </div>
    )
}

/** A small uppercase divider between groups of fields, the workspace's section label. */
export function FieldGroup({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2 dark:border-neutral-800">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{title}</h3>
                {action}
            </div>
            {children}
        </section>
    )
}

// ── Values ───────────────────────────────────────────────────────────────────

/**
 * A stored Date -> the `YYYY-MM-01` a MonthPicker takes, from LOCAL parts.
 *
 * The sheets used `date.toISOString().split("T")[0]`. A first-of-month stored at
 * local midnight is the previous day in UTC for anyone east of Greenwich, so in
 * India "Aug 2026" reopened as "Jul 2026" and saving walked it back a month.
 */
export function toMonthValue(d: Date | string | null | undefined): string {
    if (!d) return ""
    const date = typeof d === "string" ? new Date(d) : d
    if (Number.isNaN(date.getTime())) return ""
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`
}

/** `YYYY-MM-01` -> a local Date on the first of that month. */
export function fromMonthValue(v: string): Date | null {
    const m = /^(\d{4})-(\d{2})/.exec(v)
    if (!m) return null
    return new Date(Number(m[1]), Number(m[2]) - 1, 1)
}

/**
 * A URL a person typed -> one we store, or an error. Adds `https://` when the scheme
 * is missing; refuses anything that is not http(s), so a `javascript:` link can never
 * reach a profile a stranger clicks on.
 */
export function normalizeUrl(raw: string): { url: string | null; error: string | null } {
    const v = raw.trim()
    if (!v) return { url: null, error: null }
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`
    try {
        const u = new URL(withScheme)
        if (u.protocol !== "https:" && u.protocol !== "http:") return { url: null, error: "Use an http or https link" }
        if (!u.hostname.includes(".")) return { url: null, error: "That does not look like a link" }
        return { url: u.toString(), error: null }
    } catch {
        return { url: null, error: "That does not look like a link" }
    }
}

/** Textarea lines -> bullet points: trimmed, leading bullet characters stripped, empties dropped. */
export function toBullets(text: string): string[] {
    return text.split("\n").map((l) => l.replace(/^\s*[-*•]\s*/, "").trim()).filter(Boolean)
}

/**
 * Two to four mutually exclusive values, as the project workspace draws its task
 * status (`projects/[slug]/workspace/_components/task-brief.tsx`): a bordered strip,
 * the chosen value inverted. For picking a VALUE in a form - `Tabs` is for switching
 * panels, and a dropdown hides three short options behind a click.
 */
export function Segmented<T extends string>({
    value, onChange, options, label, className,
}: {
    value: T
    onChange: (v: T) => void
    options: readonly { value: T; label: string }[]
    label: string
    className?: string
}) {
    return (
        <div role="radiogroup" aria-label={label} className={cn("inline-flex w-full rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800", className)}>
            {options.map((o) => {
                const selected = o.value === value
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(o.value)}
                        className={cn(
                            "min-h-8 flex-1 cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors",
                            selected
                                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white",
                        )}
                    >
                        {o.label}
                    </button>
                )
            })}
        </div>
    )
}
