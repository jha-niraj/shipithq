'use client'

import React from 'react';
import Script from 'next/script';
import { usePathname } from "next/navigation";
import Sidebar from '@/components/common/mainsidebar';
import { SidebarProvider } from '@/components/common/sidebarprovider';
import { ShellFrame } from '@repo/ui/components/shell/shell-frame';
import {
    WifiOff, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { AiRail } from '@/components/ai/ai-rail';
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
    return (
        <>
            {/* The frame is shared with the jobs shell and apps/hiring (plan/hiring-app HA-1). */}
            <ShellFrame sidebar={<Sidebar />} rail={<AiRail />}>
                {children}
            </ShellFrame>

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

