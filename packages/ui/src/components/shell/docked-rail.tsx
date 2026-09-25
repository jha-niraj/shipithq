'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sheet, SheetContent, SheetTitle } from '../ui/sheet'
import { useSidebar } from './sidebar-provider'

/*
 * The docked AI rail (plan/ui-pass UI-14, shared by plan/hiring-app HA-1):
 * docked beside the page on lg+, a Sheet below it. Generic: each app passes
 * its own open state, width and panel (apps/main's ShipItHQ AI, apps/hiring's
 * company AI), so both apps dock, resize and unpin the sidebar the same way.
 *
 * Render it as the LAST child of the flex row that holds the page: the docked
 * aside is a real column and the page narrows to make room. The Sheet is
 * portalled, so where it sits in the tree does not matter.
 */
export interface DockedRailProps {
    open: boolean
    onClose: () => void
    /** Current width in px (ignored while maximized). */
    width: number
    /** Receives the new width; the caller clamps and stores it. */
    onWidthChange: (width: number) => void
    minWidth: number
    maxWidth: number
    /** A reading mode: the rail takes most of the window. */
    maximized?: boolean
    /** For screen readers: the Sheet's title below lg. */
    title: string
    children: React.ReactNode
}

export function DockedRail({
    open: aiOpen, onClose: closeAI, width: aiWidth, onWidthChange: setAIWidth,
    minWidth, maxWidth, maximized: aiMaximized = false, title, children,
}: DockedRailProps) {
    const clampPanelWidth = useCallback((w: number) => Math.min(Math.max(w, minWidth), maxWidth), [minWidth, maxWidth]);
    const [isMobile, setIsMobile] = useState(false);

    // Below lg the rail would leave no page worth assisting with, so it becomes a
    // Sheet instead. On lg+ it is a real docked column - never a Sheet.
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 1023px)');
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);


    const isDocked = aiOpen && !isMobile;

    // The docked AI rail takes width, so it unpins the sidebar while it is open, as in
    // gurukulhq. It goes through `setPanelUnpinned`, which is never saved: closing the
    // rail restores whatever the person chose, and a pin click while it is open wins.
    const { setPanelUnpinned } = useSidebar();
    useEffect(() => { setPanelUnpinned(isDocked); }, [isDocked, setPanelUnpinned]);

    // ── Drag to resize ────────────────────────────────────────────────────────
    // Width is committed to the store on every move (a cheap set, and the store
    // is the single source of truth for the rail width), and the listeners live
    // on `window` so the drag survives the cursor leaving the handle.
    // ── Why the drag needs its own flag ──
    //
    // The rail's width is a framer `animate` prop with a spring on it. That is right when
    // the rail opens and closes, and wrong during a drag: every mousemove set a new target
    // and started a NEW spring toward it, so the panel chased the cursor, overshot, and
    // sprang back on its own. That is the "it goes to the side and comes again
    // automatically" - nothing was repositioning it, the spring was still settling.
    //
    // The inner content div is pinned to the target width while the aside is mid-spring, so
    // during that lag the chat was laid out wider than its own container and spilled left
    // under the page card, which is the other half of what Niraj saw.
    //
    // While `isResizing`, width is applied with no transition at all - the drag IS the
    // animation. The spring comes back the moment the pointer is released.
    const [isResizing, setIsResizing] = useState(false);

    const handleResizeStart = useCallback((startX: number, startWidth: number) => {
        setIsResizing(true);
        // The rail is docked RIGHT, so dragging left (smaller clientX) widens it.
        const onMove = (clientX: number) => setAIWidth(clampPanelWidth(startWidth + (startX - clientX)));
        const onMouseMove = (e: MouseEvent) => { e.preventDefault(); onMove(e.clientX); };
        const onTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0];
            if (touch) onMove(touch.clientX);
        };
        const stop = () => {
            setIsResizing(false);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', stop);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', stop);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', stop);
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', stop);
        // Without these the drag selects page text and the cursor flickers back
        // to the default whenever it crosses a child element.
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [setAIWidth, clampPanelWidth]);

    // Maximized is a reading mode, not a different layout: the rail takes most of
    // the window and the page keeps a sliver, rather than disappearing.
    const railWidth = aiMaximized ? 'min(1100px, 72vw)' : `${aiWidth}px`;

    return (
        <>
        {/* AI rail - a real column, not an overlay. The page narrows to make
            room for it, so nothing the user was reading gets covered. */}
        <AnimatePresence initial={false}>
            {isDocked && (
                <motion.aside
                    key="ai-rail"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: railWidth, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={isResizing ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 34 }}
                    // Rounded on ALL four corners, and separated from the page by
                    // `ml-3`. It used to be `rounded-r-2xl` with a `border-l`, on
                    // the reasoning that the page and the rail should read as one
                    // card split in two - but a hard square edge butted against
                    // the page looked like a seam rather than a join, and the AI
                    // panel is its own surface, not half of the page's.
                    className="relative h-full shrink-0 overflow-hidden border-l border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-950"
                >
                    {/* Resize handle. Keyboard-operable too - a drag handle
                        that only works with a mouse is not a control everyone
                        can reach. Pointless while maximized. */}
                    {!aiMaximized && (
                        <div
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Resize AI panel"
                            aria-valuenow={aiWidth}
                            aria-valuemin={minWidth}
                            aria-valuemax={maxWidth}
                            tabIndex={0}
                            onMouseDown={(e) => { e.preventDefault(); handleResizeStart(e.clientX, aiWidth); }}
                            onTouchStart={(e) => {
                                const touch = e.touches[0];
                                if (touch) handleResizeStart(touch.clientX, aiWidth);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'ArrowLeft') { e.preventDefault(); setAIWidth(aiWidth + 24); }
                                if (e.key === 'ArrowRight') { e.preventDefault(); setAIWidth(aiWidth - 24); }
                            }}
                            className="group absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize transition-colors hover:bg-neutral-900/50 focus:bg-neutral-900/50 focus:outline-none dark:hover:bg-white/40 dark:focus:bg-white/40"
                        >
                            <span className="absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-neutral-600" />
                        </div>
                    )}
                    {/* The animated width runs to 0 on exit, so the chat is
                        pinned to its full width here and clipped by the
                        parent - otherwise the composer and messages would
                        reflow through every intermediate width on the way out. */}
                    <div className="h-full" style={{ width: railWidth }}>
                        {children}
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>

        {/* Below lg, the same panel in a Sheet. */}
        <Sheet open={aiOpen && isMobile} onOpenChange={(v) => { if (!v) closeAI() }}>
            <SheetContent
                side="right"
                className="w-full max-w-full border-0 p-0 [&>button]:hidden"
            >
                <SheetTitle className="sr-only">{title}</SheetTitle>
                {children}
            </SheetContent>
        </Sheet>
        </>
    )
}
