"use client"

import * as React from "react"

import { Button } from "./button"

/**
 * KEEP-OPEN LISTS (Niraj, 2026-10-24, "same experience all the other places"). A list whose rows open the non-modal
 * right Sheet marks every row `data-sheet-keep-open`, so pressing another row while the sheet is open SWAPS it to that
 * item instead of closing it (reference: `apps/main/app/(main)/settings/staffcredits`). Pressing empty space, the X or
 * Esc still closes.
 *
 * `useSheetSwap` is the swap with a guard: when the open item has unsaved edits, the swap waits behind a small
 * "Discard changes?" bar at the top of the sheet (`<SheetDiscardBar {...discard} />`) instead of dropping them.
 *
 *   const swap = useSheetSwap(isDirty, (row: Row | null) => setDraft(row ? toDraft(row) : null))
 *   <button data-sheet-keep-open="" onClick={() => swap.request(row)} ...>
 *   <SheetContent> ... {swap.discard && <SheetDiscardBar {...swap.discard} />} ...
 *
 * The sheet's form must re-key on the item id (`key={draft.id}`) or set its state from the row on swap, so the
 * swapped item shows its own values.
 */
export interface SheetDiscardBarProps {
	onKeep: () => void
	onDiscard: () => void
	/** Default "Discard changes?". */
	title?: string
	/** Default "This item has edits that are not saved." */
	description?: string
}

export function useSheetSwap<T>(isDirty: boolean, apply: (next: T) => void) {
	const [pending, setPending] = React.useState<{ next: T } | null>(null)
	const applyRef = React.useRef(apply)
	applyRef.current = apply
	const dirtyRef = React.useRef(isDirty)
	dirtyRef.current = isDirty
	const request = React.useCallback((next: T) => {
		if (dirtyRef.current) { setPending({ next }); return }
		setPending(null)
		applyRef.current(next)
	}, [])
	const clear = React.useCallback(() => setPending(null), [])
	const discard: SheetDiscardBarProps | null = pending
		? {
			onKeep: () => setPending(null),
			onDiscard: () => { const { next } = pending; setPending(null); applyRef.current(next) },
		}
		: null
	return { request, discard, clear }
}

export function SheetDiscardBar({ onKeep, onDiscard, title = "Discard changes?", description = "This item has edits that are not saved." }: SheetDiscardBarProps) {
	return (
		<div role="alert" className="shrink-0 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
			<p className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</p>
			<p className="mt-0.5 text-xs text-neutral-700 dark:text-neutral-300">{description}</p>
			<div className="mt-2 flex justify-end gap-2">
				<Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={onKeep}>Keep editing</Button>
				<Button type="button" size="sm" className="rounded-xl bg-rose-700 text-white hover:bg-rose-800" onClick={onDiscard}>Discard changes</Button>
			</div>
		</div>
	)
}
