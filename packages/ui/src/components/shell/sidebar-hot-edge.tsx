"use client"

import { useSidebar } from "./sidebar-provider"

/**
 * The strip of screen that reveals an unpinned sidebar. Ported from gurukulhq.
 *
 * A dedicated element, not `onPointerEnter` on the sidebar: an unpinned sidebar sits
 * off-screen, and an element that is not under the pointer cannot receive the event.
 * 12px is wide enough to hit without aiming and narrow enough never to take a click
 * meant for the page.
 *
 * It must not exist while pinned: the sidebar already occupies this space, and an
 * invisible strip on top would swallow clicks on the first 12px of its rows.
 *
 * Pointer events, so pen input works and touch does nothing (a phone has no hover and
 * uses the mobile sheet). `lg:` keeps it off small screens entirely.
 */
export function SidebarHotEdge() {
    const { isPinned, peek, unpeek } = useSidebar()
    if (isPinned) return null
    return (
        <div
            aria-hidden
            onPointerEnter={peek}
            onPointerLeave={unpeek}
            className="fixed inset-y-0 left-0 z-40 hidden w-3 lg:block print:hidden"
        />
    )
}
