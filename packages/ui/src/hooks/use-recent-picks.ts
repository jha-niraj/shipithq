"use client"

import * as React from "react"

/**
 * A short most-recent-first list of things a person picked, kept in this browser's localStorage.
 *
 * Built for the Cmd+K palette's "Recent" section (plan/repo/ui/reui-components-2026-10-23.md 2.4).
 * Per-viewer convenience only: it can come back empty (private window, cleared site data, blocked
 * storage), so every read and write is wrapped and a failure simply means "no recents".
 *
 * `storageKey` undefined = disabled (no signed-in user yet): nothing is read or written, so one
 * person's recents never land under another's key on a shared machine.
 */
export type RecentPick = {
	/** Stable identity - the palette item's id, else its href. */
	key: string
	label: string
	href: string
	section?: string
	meta?: string
	/** True for a search hit (a person), which is not in the static page list and is shown from this copy. */
	remote?: boolean
}

const DEFAULT_MAX = 6

function isRecentPick(v: unknown): v is RecentPick {
	if (!v || typeof v !== "object") return false
	const o = v as Record<string, unknown>
	return typeof o.key === "string" && typeof o.label === "string" && typeof o.href === "string"
}

function read(storageKey: string): RecentPick[] {
	try {
		const raw = window.localStorage.getItem(storageKey)
		if (!raw) return []
		const parsed: unknown = JSON.parse(raw)
		return Array.isArray(parsed) ? parsed.filter(isRecentPick) : []
	} catch {
		return []
	}
}

function write(storageKey: string, picks: RecentPick[]) {
	try {
		window.localStorage.setItem(storageKey, JSON.stringify(picks))
	} catch {
		// Storage full or blocked - recents are a convenience, so losing one is fine.
	}
}

export function useRecentPicks(storageKey: string | undefined, max: number = DEFAULT_MAX) {
	const [picks, setPicks] = React.useState<RecentPick[]>([])

	// Read after mount (never during render: the server has no localStorage and the first client
	// render must match it).
	React.useEffect(() => {
		setPicks(storageKey ? read(storageKey).slice(0, max) : [])
	}, [storageKey, max])

	const add = React.useCallback((pick: RecentPick) => {
		if (!storageKey) return
		const next = [pick, ...read(storageKey).filter((p) => p.key !== pick.key)].slice(0, max)
		write(storageKey, next)
		setPicks(next)
	}, [storageKey, max])

	const remove = React.useCallback((key: string) => {
		if (!storageKey) return
		const next = read(storageKey).filter((p) => p.key !== key)
		write(storageKey, next)
		setPicks(next)
	}, [storageKey])

	/** Re-read, for when another tab changed the list while the palette was closed. */
	const refresh = React.useCallback(() => {
		setPicks(storageKey ? read(storageKey).slice(0, max) : [])
	}, [storageKey, max])

	return { picks, add, remove, refresh }
}
