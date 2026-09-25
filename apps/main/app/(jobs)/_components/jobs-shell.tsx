'use client'

import React from 'react'
import Script from 'next/script'
import Sidebar from '@/components/common/mainsidebar'
import { jobsNavigation } from '@/lib/navigation'
import { SidebarProvider } from '@/components/common/sidebarprovider'
import { ShellFrame } from '@repo/ui/components/shell/shell-frame'
import { 
    WifiOff, RotateCcw 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { AiRail } from '@/components/ai/ai-rail'

interface LayoutProps {
    children: React.ReactNode
    /** Server-read from the sidebar cookie by `../layout.tsx`, so the first frame is right. */
    unpinned: boolean
}

const JobsContent = ({ children }: { children: React.ReactNode }) => {
    return (
        <>
            {/* The SAME sidebar the rest of the app uses, with a different set of
                links (JB-8), in the SAME frame as the main shell and apps/hiring
                (plan/hiring-app HA-1). The page surface is opaque here: the jobs
                pages were designed on white, not over the backdrop. */}
            <ShellFrame
                sidebar={<Sidebar primary={jobsNavigation} />}
                rail={<AiRail />}
                surfaceClassName="bg-white dark:bg-neutral-950"
            >
                {children}
            </ShellFrame>
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

