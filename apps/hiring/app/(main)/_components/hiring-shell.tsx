"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"
import { Lock } from "lucide-react"
import { SidebarProvider } from "@repo/ui/components/shell/sidebar-provider"
import { ShellFrame } from "@repo/ui/components/shell/shell-frame"
import { HiringSidebar } from "@/components/navigation/sidebar"
import { HiringAIRail } from "@/components/ai/hiring-ai-rail"
import { navigationFor, permissionForPath } from "@/lib/navigation"

// ─────────────────────────────────────────────────────────────────────────────
// The hiring shell (plan/hiring-app HA-2): the same frame as apps/main - the
// sidebar, the hover strip, the page column and the docked company AI rail
// (HA-11, for members with "use AI") - from packages/ui. The page surface is opaque white: the hiring pages
// were designed on it.
//
// Signed-out visitors and people without a company are sent away by the server
// (middleware.ts and ../layout.tsx). The member's permissions (HA-6) decide the
// sidebar's links, and a page they can't use shows why instead of failing to
// load.
// ─────────────────────────────────────────────────────────────────────────────

export function HiringShell({ children, unpinned, permissions, roleName }: {
    children: React.ReactNode
    unpinned: boolean
    permissions: string[]
    roleName: string
}) {
    const pathname = usePathname()
    const needed = permissionForPath(pathname)
    const allowed = !needed || permissions.includes(needed)
    // The company AI panel (HA-11) is there only for members with "use AI".
    const canUseAI = permissions.includes("use_ai")

    return (
        <SidebarProvider initialUnpinned={unpinned}>
            <div className="relative flex h-dvh w-full overflow-hidden bg-neutral-50 dark:bg-black">
                <ShellFrame sidebar={<HiringSidebar navigation={navigationFor(permissions)} canUseAI={canUseAI} />} rail={canUseAI ? <HiringAIRail /> : undefined} surfaceClassName="bg-white dark:bg-neutral-950">
                    {allowed ? children : <NoAccess roleName={roleName} />}
                </ShellFrame>
            </div>
            {/* Billing checkout (plans, top-ups). */}
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
        </SidebarProvider>
    )
}

function NoAccess({ roleName }: { roleName: string }) {
    return (
        <div className="page-frame flex min-h-[60vh] items-center justify-center px-page py-10">
            <div className="max-w-sm text-center">
                <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    <Lock className="h-5 w-5" />
                </span>
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">You don&apos;t have access to this page</h1>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                    Your role, {roleName}, doesn&apos;t include it. Your company&apos;s owner can change your role under Company, Roles.
                </p>
            </div>
        </div>
    )
}
