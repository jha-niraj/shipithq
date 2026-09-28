"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./alert-dialog"
import { buttonVariants } from "./button"
import { InlineLoader } from "./inline-loader"

/*
 * The one way to ask "are you sure?" (plan/jobs-polish JP-2). A dialog is easy to notice;
 * an inline "Keep going / Submit" row that replaces a button is not, and the browser's
 * `confirm()` is unstyled and blocks the page. `tone="danger"` for deleting or leaving
 * something that can't be undone.
 *
 * The confirm button stays pressed (with a loader) while `onConfirm` runs, and the dialog
 * closes when it resolves; if it throws, the dialog stays open so the person can retry.
 */

export interface ConfirmDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	/** A sentence or two: what happens, and whether it can be undone. */
	description?: React.ReactNode
	confirmLabel?: string
	cancelLabel?: string
	tone?: "default" | "danger"
	onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	tone = "default",
	onConfirm,
}: ConfirmDialogProps) {
	const [busy, setBusy] = React.useState(false)

	const confirm = async (e: React.MouseEvent) => {
		e.preventDefault()
		setBusy(true)
		try {
			await onConfirm()
			onOpenChange(false)
		} catch {
			// The caller reports its own error (a toast); the dialog stays for a retry.
		} finally {
			setBusy(false)
		}
	}

	return (
		<AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					{description && <AlertDialogDescription>{description}</AlertDialogDescription>}
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
					<button
						type="button"
						onClick={(e) => void confirm(e)}
						disabled={busy}
						className={cn(
							buttonVariants({ variant: tone === "danger" ? "destructive" : "default" }),
							"gap-2",
						)}
					>
						{busy && <InlineLoader size="sm" />}
						{confirmLabel}
					</button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
