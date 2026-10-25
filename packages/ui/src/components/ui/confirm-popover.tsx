"use client"

import * as React from "react"
import { Spinner } from "./spinner"

import { cn } from "../../lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { DropdownMenuItem } from "./dropdown-menu"

/**
 * CONFIRM IN PLACE (Niraj, 2026-10-20, R4-14): a small popover on the button that asked, for a one-item action with no
 * cascade - delete this field, this room, this term. The centred dialog stays for deletes that remove many things or
 * can't be undone.
 *
 * The trigger is the caller's own button (passed as `children`, rendered with `asChild`). Focus starts on Cancel so a
 * stray Enter never deletes; Esc closes; while `onConfirm` runs the confirm button spins and both buttons are disabled.
 * The popover closes itself when `onConfirm` resolves; if it throws, it stays open so the caller's toast is seen
 * against the thing that failed.
 */
export interface ConfirmPopoverProps {
	/** The button that opens it. */
	children: React.ReactElement
	/** "Delete this field?" */
	title: string
	/** One line on what happens, e.g. "Files already uploaded stay." */
	description?: string
	/** Confirm button text. Default "Delete". */
	confirmLabel?: string
	cancelLabel?: string
	/** Rose confirm button (the default) for removals; false = neutral. */
	destructive?: boolean
	onConfirm: () => void | Promise<void>
	align?: "start" | "center" | "end"
	side?: "top" | "right" | "bottom" | "left"
	disabled?: boolean
}

export function ConfirmPopover({
	children,
	title,
	description,
	confirmLabel = "Delete",
	cancelLabel = "Cancel",
	destructive = true,
	onConfirm,
	align = "end",
	side = "bottom",
	disabled,
}: ConfirmPopoverProps) {
	const [open, setOpen] = React.useState(false)
	const [pending, setPending] = React.useState(false)
	const cancelRef = React.useRef<HTMLButtonElement>(null)

	const run = async () => {
		setPending(true)
		try {
			await onConfirm()
			setOpen(false)
		} catch {
			// The caller reports the failure; keep the popover open beside the thing that failed.
		} finally {
			setPending(false)
		}
	}

	return (
		<Popover open={open} onOpenChange={(v) => { if (!pending) setOpen(v) }}>
			<PopoverTrigger asChild disabled={disabled}>
				{children}
			</PopoverTrigger>
			<PopoverContent
				align={align}
				side={side}
				className="w-64 p-3"
				onOpenAutoFocus={(e) => {
					e.preventDefault()
					cancelRef.current?.focus()
				}}
			>
				<p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
				{description && (
					<p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{description}</p>
				)}
				<div className="mt-3 flex justify-end gap-2">
					<button
						ref={cancelRef}
						type="button"
						disabled={pending}
						onClick={() => setOpen(false)}
						className="inline-flex h-8 items-center rounded-lg border border-neutral-200 px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						disabled={pending}
						onClick={run}
						className={cn(
							"inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60",
							destructive
								? "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-400"
								: "bg-neutral-900 text-white hover:bg-neutral-800 focus-visible:ring-neutral-400 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
						)}
					>
						{pending && <Spinner className="size-3.5" aria-hidden />}
						{confirmLabel}
					</button>
				</div>
			</PopoverContent>
		</Popover>
	)
}

/**
 * The same confirm, inside a dropdown menu (Niraj: "when I click on delete it could have come on the dropdown there
 * only"). First press turns the item into "Delete? Press again" and keeps the menu open; the second press runs it.
 * Moving away (pointer leaves the item or the menu closes) resets it.
 */
export function ConfirmMenuItem({
	children,
	confirmText,
	onConfirm,
	disabled,
	className,
}: {
	/** The item's normal content, e.g. <><Trash2 /> Delete</>. */
	children: React.ReactNode
	/** Shown after the first press. Default "Press again to delete". */
	confirmText?: string
	onConfirm: () => void
	disabled?: boolean
	className?: string
}) {
	const [armed, setArmed] = React.useState(false)
	return (
		<DropdownMenuItem
			disabled={disabled}
			onPointerLeave={() => setArmed(false)}
			onSelect={(e) => {
				if (!armed) {
					e.preventDefault()
					setArmed(true)
					return
				}
				onConfirm()
			}}
			className={cn(
				"text-rose-600 focus:text-rose-700 dark:text-rose-400 dark:focus:text-rose-300",
				armed && "bg-rose-50 font-semibold dark:bg-rose-500/10",
				className
			)}
		>
			{armed ? (confirmText ?? "Press again to delete") : children}
		</DropdownMenuItem>
	)
}
