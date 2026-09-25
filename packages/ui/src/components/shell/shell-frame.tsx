"use client"

import React from "react"
import { cn } from "../../lib/utils"
import { ScrollArea } from "../ui/scroll-area"
import { useSidebar } from "./sidebar-provider"
import { SidebarHotEdge } from "./sidebar-hot-edge"

// ─────────────────────────────────────────────────────────────────────────────
// The shell's frame (plan/hiring-app HA-1), shared by apps/main's (main) and
// (jobs) shells and by apps/hiring: the hover strip, the sidebar, and the page
// column, which holds the page surface and the docked AI rail side by side.
//
// Three columns edge to edge with borders between them: the sidebar, the page,
// and the AI rail. The sidebar is pinned (in the layout, `lg:ml-60` on the page)
// or unpinned (out of the layout, floated back over the page from the left edge).
// See sidebar-provider.tsx and plan/practice-ui, UI-7.
// ─────────────────────────────────────────────────────────────────────────────

export interface ShellFrameProps {
    /** The app's sidebar (a `ShellSidebar` with its own links). */
    sidebar: React.ReactNode
    /** The docked rail (a `DockedRail` with the app's AI panel); last in the row. */
    rail?: React.ReactNode
    /** Extra classes for the page surface, which is transparent by default. */
    surfaceClassName?: string
    children: React.ReactNode
}

export function ShellFrame({ sidebar, rail, surfaceClassName, children }: ShellFrameProps) {
    const { isPinned } = useSidebar()

    return (
        <>
            {/* The strip that reveals an unpinned sidebar. It renders nothing while pinned. */}
            <SidebarHotEdge />
            {sidebar}

            <div
                className={cn(
                    // `relative` is load-bearing, not cosmetic: the shell's backdrop is
                    // an absolutely positioned sibling, and a positioned element paints
                    // above a STATIC one whatever the DOM order. Without this the
                    // photograph covers the cards instead of sitting behind them.
                    "relative min-w-0 flex-1 transition-all duration-300 ease-in-out",
                    // Pinned, the sidebar is a fixed 15rem column (w-60) flush to the left edge
                    // and the page starts exactly where it ends. Unpinned it is not in the
                    // layout at all: it floats over the page on peek, and reflowing on hover
                    // would make reading anything near the left margin a hazard.
                    isPinned ? "lg:ml-60" : "lg:ml-0",
                )}
            >
                {/* Flush layout (2026-09-22, matching gurukulhq): sidebar, page and AI rail
                    meet edge to edge with borders between them, no gutters, no rounded
                    cards. `--app-bottom-nav-h` is 4rem plus the safe-area inset below lg
                    and 0px above it, so this one height is right at every width and the
                    fixed bottom bar never covers a page's last row. */}
                <main className="flex h-[calc(100dvh-var(--app-bottom-nav-h))] overflow-hidden">
                    {/* Page surface */}
                    <div
                        data-app-page
                        className={cn(
                            // min-w-0 so a wide child (a table, a chart) shrinks with the
                            // column instead of pushing the row past the viewport.
                            //
                            // TRANSPARENT, on purpose: the photographic backdrop is meant
                            // to read through the page, not just around it.
                            //
                            // This was briefly opaque, on contrast grounds - bare text
                            // sitting directly on the photo measured badly in the darker
                            // regions. Niraj's call, twice asked for, is that seeing the
                            // image matters more, and the reason it is safe in practice is
                            // that page CONTENT lives in cards which carry their own opaque
                            // surface (`bg-white dark:bg-neutral-900`), so the photo shows in
                            // the margins around them rather than behind any paragraph.
                            //
                            // The thing to watch when building a new page under (main):
                            // do not put small grey text directly on this surface. Put it in
                            // a card. `text-neutral-500 dark:text-neutral-400` on the bare backdrop measures around
                            // 1.3:1 over the photo's darker regions, which is unreadable.
                            //
                            // NO RING. There was a `ring-1 ring-inset ring-neutral-200/70
                            // dark:ring-white/10` here, from when this card had its own opaque
                            // surface and the outline said where the surface ended.
                            //
                            // The surface is gone, so the outline delineates nothing - and
                            // worse, a 1px hairline at 10% white sitting directly on a
                            // photograph is only visible over the photo's darker regions. It
                            // read as a line down the right of the page that stopped halfway,
                            // which is exactly how Niraj described it. A border that is present
                            // for part of its length looks like a bug, because it is one.
                            //
                            // The sidebar and the AI rail keep theirs: both are opaque, so
                            // their outlines still mark a real edge.
                            "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300",
                            // An app may give the page an opaque surface (the jobs shell does).
                            surfaceClassName,
                        )}
                        // "Full height" inside the page is the viewport minus the bottom
                        // bar (0 on desktop). `--page-h` is the single source of truth; a rule
                        // in globals.css retargets `h-screen` / `min-h-screen` inside
                        // [data-app-page] at it, so full-height pages need no change.
                        style={{ ["--page-h" as string]: "calc(100dvh - var(--app-bottom-nav-h))" }}
                    >
                        {/* ScrollArea, not native overflow. The native scrollbar is an
                            OS control: it paints outside the card's rounded corner on
                            Windows, reserves gutter width on some platforms and not
                            others, and cannot be styled to match a surface that is now
                            transparent. `min-w-0` on the viewport keeps a wide child
                            (a table, a chart) shrinking with the column. */}
                        {/* `reflow` is load-bearing, not tidiness. Without it Radix's content
                            box is `display: table` and sizes to its own content, so opening the
                            AI rail narrowed this card but left the page inside it at full width,
                            sliding under the panel. See the prop's note in scroll-area.tsx. */}
                        <ScrollArea className="min-h-0 min-w-0 flex-1" reflow>
                            {children}
                        </ScrollArea>
                    </div>

                    {rail}
                </main>
            </div>
        </>
    )
}
