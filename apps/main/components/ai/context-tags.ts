"use client"

import { useEffect, useSyncExternalStore } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Context tags shared between the AI panel and any page.
//
// Ported from the Orbital chat's meeting tags in synchq and generalised: this app
// has no meetings, but it has projects, goals, resumes and practice problems, and
// they all want the same behaviour.
//
// Two tiers, and the split is the whole design:
//
//   pinned  tags the user added by hand. They PERSIST until removed, so a user
//           can pin their resume once and ask five questions about it.
//   auto    whatever the current page is about. Added on mount, removed on
//           leave, and marked so the UI can say "(this page)" - without that
//           marker a user cannot tell why a tag they never added is present.
//
// A tiny external store rather than context: the panel reads and sends these, and
// pages hundreds of components away set the auto tag. Threading that through
// props would touch every route; a context provider would re-render the whole
// tree on every page change. `useSyncExternalStore` gives both sides a
// subscription and nothing in between.
// ─────────────────────────────────────────────────────────────────────────────

export type ContextTagKind = "project" | "goal" | "resume" | "problem" | "mock" | "incident"

export interface ContextTag {
    id: string
    kind: ContextTagKind
    /** What the user sees on the chip. */
    title: string
}

interface State {
    pinned: ContextTag[]
    auto: ContextTag | null
}

let state: State = { pinned: [], auto: null }
const listeners = new Set<() => void>()

function emit() {
    // Replace the object so useSyncExternalStore sees a new reference. Mutating
    // in place is the classic bug here: every subscriber keeps the old snapshot
    // and nothing re-renders.
    state = { pinned: state.pinned, auto: state.auto }
    listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => listeners.delete(cb)
}

function getSnapshot(): State {
    return state
}

/** Server render has no tags. A stable object, or React loops on the mismatch. */
const SERVER_SNAPSHOT: State = { pinned: [], auto: null }
function getServerSnapshot(): State {
    return SERVER_SNAPSHOT
}

export function addPinnedTag(tag: ContextTag): void {
    if (state.pinned.some((t) => t.id === tag.id && t.kind === tag.kind)) return
    state = { ...state, pinned: [...state.pinned, tag] }
    emit()
}

export function removePinnedTag(id: string): void {
    if (!state.pinned.some((t) => t.id === id)) return
    state = { ...state, pinned: state.pinned.filter((t) => t.id !== id) }
    emit()
}

export function setAutoTag(tag: ContextTag | null): void {
    if (state.auto?.id === tag?.id && state.auto?.kind === tag?.kind) return
    state = { ...state, auto: tag }
    emit()
}

export function clearPinnedTags(): void {
    if (state.pinned.length === 0) return
    state = { ...state, pinned: [] }
    emit()
}

export function useContextTags(): State {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * The tags to actually send with a message: the auto tag first, then pins.
 *
 * De-duplicated, because pinning the thing you are looking at is the most natural
 * action in the world and must not send it twice.
 */
export function activeContextTags(s: State): ContextTag[] {
    const out = s.auto ? [s.auto] : []
    for (const t of s.pinned) {
        if (!out.some((x) => x.id === t.id && x.kind === t.kind)) out.push(t)
    }
    return out
}

/**
 * Set the auto tag for as long as a page is mounted.
 *
 * Call it from a page component. The cleanup is what makes the "(this page)" tier
 * honest - leave the page and the tag goes with it.
 */
export function usePageContextTag(tag: ContextTag | null): void {
    // Keyed on the VALUE, not the object. Callers build the tag inline
    // (`usePageContextTag({ id, kind, title })`), so a reference-identity dep
    // would re-run this on every render and thrash the store.
    const key = tag ? `${tag.kind}:${tag.id}:${tag.title}` : ""
    useEffect(() => {
        setAutoTag(tag)
        return () => setAutoTag(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
}
