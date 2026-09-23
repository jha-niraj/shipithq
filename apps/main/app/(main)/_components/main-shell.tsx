'use client'

import React, { useCallback, useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname } from "next/navigation";
import Sidebar from '@/components/common/mainsidebar';
import { SidebarProvider, useSidebar } from '@/components/common/sidebarprovider';
import { SidebarHotEdge } from '@/components/navigation/sidebar-hot-edge';
import {
    WifiOff, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { cn } from '@repo/ui/lib/utils';
import { Sheet, SheetContent, SheetTitle } from '@repo/ui/components/ui/sheet';
import { AIPanel } from '@/components/ai/ai-panel';
import {
    useAIPanelStore, AI_MIN_WIDTH, AI_MAX_WIDTH, clampPanelWidth,
} from '@/app/store/aiPanelStore';
import { ScrollArea } from '@repo/ui/components/ui/scroll-area';

interface LayoutProps {
    children: React.ReactNode
    /** Server-read from the sidebar cookie by `../layout.tsx`, so the first frame is right. */
    unpinned: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Shell geometry.
//
// Three columns edge to edge with borders between them: the sidebar, the page,
// and the AI rail. The sidebar is pinned (in the layout, `lg:ml-60` on the page)
// or unpinned (out of the layout, floated back over the page from the left edge).
// See components/common/sidebarprovider.tsx and plan/practice-ui, UI-7.
//
// This is the client half; `../layout.tsx` is a server component that reads the
// pin cookie and renders it.
// ─────────────────────────────────────────────────────────────────────────────

const MainContent = ({ children }: { children: React.ReactNode }) => {
    const {
        isOpen: aiOpen, close: closeAI, width: aiWidth, setWidth: setAIWidth,
        isMaximized: aiMaximized,
    } = useAIPanelStore();
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
    const { isPinned, setPanelUnpinned } = useSidebar();
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
    }, [setAIWidth]);

    // Maximized is a reading mode, not a different layout: the rail takes most of
    // the window and the page keeps a sliver, rather than disappearing.
    const railWidth = aiMaximized ? 'min(1100px, 72vw)' : `${aiWidth}px`;

    return (
        <>
            {/* The strip that reveals an unpinned sidebar. It renders nothing while pinned. */}
            <SidebarHotEdge />
            <Sidebar />

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
                                        aria-valuemin={AI_MIN_WIDTH}
                                        aria-valuemax={AI_MAX_WIDTH}
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
                                    <AIPanel />
                                </div>
                            </motion.aside>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            {/* Below lg, the same panel in a Sheet. */}
            <Sheet open={aiOpen && isMobile} onOpenChange={(v) => { if (!v) closeAI() }}>
                <SheetContent
                    side="right"
                    className="w-full max-w-full border-0 p-0 [&>button]:hidden"
                >
                    <SheetTitle className="sr-only">ShipItHQ AI</SheetTitle>
                    <AIPanel />
                </SheetContent>
            </Sheet>

            <Script
                src="https://checkout.razorpay.com/v1/checkout.js"
                strategy="afterInteractive"
            />
        </>
    );
};

export const MainShell = ({ children, unpinned }: LayoutProps) => {
    const pathname = usePathname();

    // Routes that render OUTSIDE the shell - no sidebar, no page card, no AI rail.
    // All of them are full-window working surfaces (a code editor, a problem
    // workspace) where a 15rem nav column costs more than it gives.
    //
    // These are matched against real directories under app/(main). Two entries
    // here used to point at routes that do not exist:
    //   - '/ai/jobinterviewassistant/...' - the real route has no "job" prefix,
    //     so the coding-questions editor was silently rendering inside the card
    //     with the sidebar beside it. (Written out here deliberately: this is the
    //     WRONG path, kept as the example. A sweep that rewrites the string
    //     everywhere will corrupt this comment into nonsense - it did once.)
    //   - '/learn/[subcategorySlug]/[learnSlug]' - there is no learn module in
    //     this app at all
    // A stale path here fails silently, so it is worth checking against the
    // filesystem when adding one.
    const fullScreenPaths = [
        '/practice/dsa/[slug]',
        '/practice/system-design/[slug]',
        '/practice/web-frontend/[slug]',
        '/practice/web-backend/[slug]',
    ];

    // Check if current path should be in full-screen mode
    const isFullScreenMode = fullScreenPaths.some(path => {
        // Convert dynamic route patterns to regex
        const pattern = path.replace(/\[.*?\]/g, '[^/]+');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(pathname);
    });

    const isOnline = useNetworkStatus();

    if (!isOnline) return <OfflineFallback />;

    // If in full-screen mode, render children without sidebar and navbar
    if (isFullScreenMode) {
        return (
            // Outside the shell, so it does not inherit the height above - but the bottom
            // bar is fixed to the viewport and covers this too.
            <ScrollArea className="w-screen bg-neutral-950 h-[calc(100dvh-var(--app-bottom-nav-h))]" reflow>
                {children}
            </ScrollArea>
        );
    }

    return (
        <SidebarProvider initialUnpinned={unpinned}>
            {/* A plain backdrop by theme: near-white in light (pure white would
                swallow the white cards floating on it), black in dark. No
                photograph behind the app; the photo lives on the auth panel only
                (plan/practice-ui, UI-1). Page text therefore always lands on a
                known flat colour, so its contrast is decided by the palette. */}
            <div className="relative flex h-dvh w-full overflow-hidden bg-neutral-50 dark:bg-black">
                <MainContent>{children}</MainContent>
            </div>
        </SidebarProvider>
    );
};

const OfflineFallback = () => {
    const handleRefresh = () => window.location.reload();

    return (
        <div className="h-dvh flex items-center justify-center bg-background px-4 overflow-hidden">
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 100 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 100 }}
                    transition={{ duration: 0.6, ease: 'easeOut', type: 'spring', stiffness: 100 }}
                    className="bg-gradient-to-br from-primary/10 via-primary/5 to-background backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-sm w-full text-center border border-border"
                >
                    <motion.div
                        animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                        className="flex justify-center mb-6"
                    >
                        <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                            <WifiOff className="w-8 h-8 text-primary" />
                        </div>
                    </motion.div>
                    <h2 className="text-2xl font-bold mb-3 text-foreground">
                        Connection Lost
                    </h2>
                    <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                        Your internet connection seems to have wandered off. Check your connection and let&apos;s get back to building amazing portfolios.
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleRefresh}
                        className="w-full px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Try Again
                    </motion.button>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

