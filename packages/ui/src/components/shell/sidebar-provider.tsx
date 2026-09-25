"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { SIDEBAR_UNPINNED_COOKIE } from "../../lib/sidebar-pin-cookie"

/**
 * Sidebar state for the shell, ported from gurukulhq (plan/practice-ui, UI-7).
 *
 * TWO STATES OF INTENT, not widths. The sidebar is always the full labelled list; the
 * only question is whether it is in the layout or floating over it.
 *
 * | State | Layout | Saved |
 * |---|---|---|
 * | **pinned** | in the flow, the page starts where it ends | yes, cookie |
 * | **unpinned** | out of the layout; the left edge reveals it as an OVERLAY | yes, cookie |
 *
 * The peek NEVER changes the layout. If brushing the left edge reflowed the page,
 * reading anything near the left margin would become a hazard.
 *
 * A docked panel (the AI rail) unpins, it does not collapse, and it must not write the
 * person's choice: `isPinned = userPinned && !panelUnpinned`, and only `userPinned`
 * reaches the cookie.
 */
interface SidebarContextType {
    /** Effective: the person's choice, unless a panel is currently forcing the sidebar out. */
    isPinned: boolean
    /** A deliberate user action. Saved, and it overrides any panel force. */
    setPinned: (pinned: boolean) => void
    /** Transient, panel-driven. NEVER saved. */
    setPanelUnpinned: (unpinned: boolean) => void

    /** The sidebar is floating over the page because the pointer is at the left edge. */
    isPeeking: boolean
    /** Open the peek. Meaningless while pinned. */
    peek: () => void
    /** Close it, after a grace period so a diagonal pointer path does not snap it shut. */
    unpeek: () => void
    /** Cancel a pending close - the pointer came back, or focus moved into the sidebar. */
    holdPeek: () => void
    /** Hold the peek open for a while because something inside it is about to disturb the
     *  page. A pending close is DEFERRED past the lock, not cancelled, so it cannot stick. */
    lockPeek: (ms?: number) => void

    isMobileOpen: boolean
    setIsMobileOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

const ONE_YEAR = 60 * 60 * 24 * 365

/** A pointer crossing from the sidebar to the page travels diagonally; at 0ms the sidebar
 *  vanishes under it mid-move. 180ms survives that path and nobody waits for it. */
const PEEK_CLOSE_MS = 180

/** How long a click INSIDE the sidebar postpones the close. The theme toggle runs a View
 *  Transition that covers the document and moves focus, so the sidebar gets a pointerleave
 *  and a blur it did not earn; 900ms outlives the wipe. It postpones, never cancels. */
const PEEK_LOCK_MS = 900

export function SidebarProvider({
    children,
    initialUnpinned = false,
}: {
    children: React.ReactNode
    /** Read from the cookie by the server layout, so the first frame is already right. */
    initialUnpinned?: boolean
}) {
    const [userPinned, setUserPinned] = useState(!initialUnpinned)
    const [panelUnpinned, setPanelUnpinned] = useState(false)
    const [isPeeking, setIsPeeking] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const clearClose = useCallback(() => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
    }, [])
    useEffect(() => clearClose, [clearClose])

    const setPinned = useCallback((pinned: boolean) => {
        setUserPinned(pinned)
        // Pinning ends the peek; a stale `isPeeking` would leave overlay styling on an
        // element that is no longer an overlay.
        setIsPeeking(false)
        // An explicit click wins over a panel force, or the button looks broken while the
        // AI panel is open.
        setPanelUnpinned(false)
        try {
            document.cookie = `${SIDEBAR_UNPINNED_COOKIE}=${pinned ? "0" : "1"}; path=/; max-age=${ONE_YEAR}; samesite=lax`
        } catch { /* cookies may be blocked */ }
    }, [])

    const lockUntil = useRef(0)

    const peek = useCallback(() => { clearClose(); setIsPeeking(true) }, [clearClose])
    const holdPeek = useCallback(() => { clearClose() }, [clearClose])
    const lockPeek = useCallback((ms: number = PEEK_LOCK_MS) => {
        lockUntil.current = Math.max(lockUntil.current, Date.now() + ms)
        clearClose()
    }, [clearClose])
    // DEFER, never cancel: a pointer that left during a theme wipe still closes the sidebar
    // once the wipe is over, and one that came back clears this timer via `holdPeek`.
    const unpeek = useCallback(() => {
        clearClose()
        const wait = Math.max(PEEK_CLOSE_MS, lockUntil.current - Date.now())
        closeTimer.current = setTimeout(() => setIsPeeking(false), wait)
    }, [clearClose])

    const isPinned = userPinned && !panelUnpinned

    const value = useMemo<SidebarContextType>(() => ({
        isPinned,
        setPinned,
        setPanelUnpinned,
        // A peek reported while pinned would let a hover apply overlay styling to a
        // sidebar that is in the flow.
        isPeeking: isPeeking && !isPinned,
        peek,
        unpeek,
        holdPeek,
        lockPeek,
        isMobileOpen,
        setIsMobileOpen,
    }), [isPinned, setPinned, isPeeking, peek, unpeek, holdPeek, lockPeek, isMobileOpen])

    return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
    const context = useContext(SidebarContext)
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider")
    }
    return context
}
