"use client"

import * as React from "react"

/**
 * A draft that outlives its sheet. Niraj, 2026-10-24: every sheet closes on an outside click, and what was typed is
 * NOT lost by closing - it stays until it is saved (call `clear()` after a successful save / submit) or the page is
 * hard-refreshed. Reopening the same sheet (same item key, or "new") brings the draft back.
 *
 * `clear()` forgets the kept draft AND puts the value back to `initial()`, so the next opening starts fresh.
 *
 * Backed by a module-level Map, so it survives unmount and client navigation and is gone on a hard refresh. A `null`
 * key behaves like plain `useState` (nothing kept). Keys are global across the app - prefix them with the module
 * (`"add-student:new"`, `"monitor:" + id`).
 */
const drafts = new Map<string, unknown>()

type SetDraft<T> = (next: T | ((prev: T) => T)) => void

export function useKeptDraft<T>(key: string | null, initial: () => T): [T, SetDraft<T>, () => void] {
	// `initial` is read only when a key has no draft yet, always the latest one passed.
	const initialRef = React.useRef(initial)
	initialRef.current = initial
	const read = (k: string | null): T => {
		if (k != null && drafts.has(k)) return drafts.get(k) as T
		return initialRef.current()
	}
	const [state, setState] = React.useState<{ key: string | null; value: T }>(() => ({ key, value: read(key) }))

	// The key changed (another item, or "new"): show that key's draft, or a fresh value.
	let current = state
	if (state.key !== key) {
		current = { key, value: read(key) }
		setState(current)
	}

	const set = React.useCallback<SetDraft<T>>((next) => {
		setState((prev) => {
			const value = typeof next === "function" ? (next as (p: T) => T)(prev.value) : next
			if (prev.key != null) drafts.set(prev.key, value)
			return { key: prev.key, value }
		})
	}, [])

	const clear = React.useCallback(() => {
		setState((prev) => {
			if (prev.key != null) drafts.delete(prev.key)
			return { key: prev.key, value: initialRef.current() }
		})
	}, [])

	return [current.value, set, clear]
}

/** Drop a kept draft from outside the component that holds it (e.g. after a save made elsewhere). */
export function clearKeptDraft(key: string) {
	drafts.delete(key)
}

/** Drop every kept draft whose key starts with `prefix` (a wizard that keeps one draft per field). */
export function clearKeptDrafts(prefix: string) {
	for (const k of [...drafts.keys()]) if (k.startsWith(prefix)) drafts.delete(k)
}

/** Whether a draft is kept under `key` (e.g. to skip a reset that would wipe a restored draft). */
export function hasKeptDraft(key: string) {
	return drafts.has(key)
}
