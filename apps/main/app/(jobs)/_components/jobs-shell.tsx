'use client'

import React from 'react'
import Script from 'next/script'
import Sidebar from '@/components/common/mainsidebar'
import { jobsNavigation } from '@/lib/navigation'
import { SidebarProvider, useSidebar } from '@/components/common/sidebarprovider'
import { SidebarHotEdge } from '@/components/navigation/sidebar-hot-edge'
import { 
    WifiOff, RotateCcw 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { cn } from '@repo/ui/lib/utils'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'

interface LayoutProps {
    children: React.ReactNode
    /** Server-read from the sidebar cookie by `../layout.tsx`, so the first frame is right. */
    unpinned: boolean
}

const JobsContent = ({ children }: { children: React.ReactNode }) => {
    const { isPinned } = useSidebar()

    return (
        <>
            {/* The SAME sidebar the rest of the app uses, with a different set of
                links. What stood here was `jobssidebar.tsx`, a 319-line copy with its
                own brand block, collapse control, theme toggle and user footer - all
                of which looked subtly unlike the real one, because a copy always
                does. Niraj: "the content only needs to change not the full side."
                See JB-8. */}
            <SidebarHotEdge />
            <Sidebar primary={jobsNavigation} />
            {/* The offset MATCHES `app/(main)/_components/main-shell.tsx`: pinned, the
                sidebar is a fixed 15rem column (`lg:w-60`), so both shells use `lg:ml-60`;
                unpinned it floats over the page and the offset is 0. Any change to the
                sidebar's width has to change both shells. */}
            <div className="flex h-dvh flex-1 flex-col overflow-hidden bg-neutral-50 transition-colors duration-300 dark:bg-black">
                <main className={cn(
                    "relative h-full transition-all duration-300 ease-in-out",
                    "ml-0",
                    // Matches the (main) shell.
                    isPinned ? "lg:ml-60" : "lg:ml-0",
                )}>
                    <div className="relative h-full w-full bg-white dark:bg-neutral-950">
                        {/* `reflow` pins this to vertical-only, same as the (main) shell's
                            ScrollArea - without it Radix's shrink-to-fit content box sizes
                            to a wide descendant (a table, a chart) and the page silently
                            scrolls sideways under this card's rounded corner instead of the
                            descendant scrolling on its own. See docs/responsiveness.md
                            section 2. */}
                        <ScrollArea className="h-full min-w-0 w-full" reflow>
                            {children}
                        </ScrollArea>
                    </div>
                </main>
            </div>
            <Script
                src="https://checkout.razorpay.com/v1/checkout.js"
                strategy="afterInteractive"
            />
        </>
    )
}

export const JobsShell = ({ children, unpinned }: LayoutProps) => {
    const isOnline = useNetworkStatus()

    if (!isOnline) return <OfflineFallback />

    return (
        <SidebarProvider initialUnpinned={unpinned}>
            <div className="flex h-dvh bg-neutral-100 dark:bg-black overflow-hidden">
                <JobsContent>{children}</JobsContent>
            </div>
        </SidebarProvider>
    )
}

const OfflineFallback = () => {
    const handleRefresh = () => window.location.reload()

    return (
        <div className="h-dvh flex items-center justify-center bg-background px-4 overflow-hidden">
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex flex-col items-center text-center max-w-md"
                >
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="mb-6"
                    >
                        <WifiOff className="w-16 h-16 text-muted-foreground" />
                    </motion.div>
                    <h2 className="text-2xl font-semibold mb-2 text-foreground">You&apos;re Offline</h2>
                    <p className="text-muted-foreground mb-6">
                        It looks like you&apos;ve lost your internet connection. Please check your network settings and try again.
                    </p>
                    <motion.button
                        onClick={handleRefresh}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-medium shadow-md hover:shadow-lg transition-shadow"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Retry
                    </motion.button>
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

