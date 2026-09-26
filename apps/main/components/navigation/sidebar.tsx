"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Zap } from "lucide-react"
import { useSession, signOut } from "@repo/auth/client"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@repo/ui/lib/utils"
import { AIGlyph } from "@repo/ui/components/ui/ai-mark"
import { useSidebar } from "@repo/ui/components/shell/sidebar-provider"
import { ShellSidebar } from "@repo/ui/components/shell/shell-sidebar"
import { mainNavigation, SIDEBAR_PRESETS, type NavigationItem } from "@/lib/navigation"
import { useUserStore } from "@/app/store/useUserStore"
import { useAIPanelStore } from "@/app/store/aiPanelStore"
import { inboxCountAction } from "@/actions/inbox.action"
import { INBOX_CHANGED_EVENT } from "@repo/ui/components/inbox/types"

// ─────────────────────────────────────────────────────────────────────────────
// The main app's sidebar: the shared `ShellSidebar` (packages/ui, plan/hiring-app
// HA-1) with ShipItHQ's links, presets, credits, AI toggle and notifications.
// The rows, states and motion live in the shared component, so apps/hiring's
// sidebar is the same one.
//
// `primary` swaps the whole nav list (the jobs shell passes its own). With it,
// every item is shown in order and the pins and customize controls are off.
// ─────────────────────────────────────────────────────────────────────────────

/** The desktop sidebar's width, from the shared shell; the page is offset by exactly this. */
export { SIDEBAR_WIDTH_CLASS } from "@repo/ui/components/shell/shell-sidebar"

export default function Sidebar({ primary }: { primary?: NavigationItem[] } = {}) {
    const { data: session, isPending } = useSession()
    const { setIsMobileOpen } = useSidebar()

    const credits = useUserStore((s) => s.credits)
    const fetchCreditsAndXp = useUserStore((s) => s.fetchCreditsAndXp)
    const isAIOpen = useAIPanelStore((s) => s.isOpen)
    const toggleAI = useAIPanelStore((s) => s.toggle)

    const userId = session?.user?.id
    useEffect(() => { if (userId) void fetchCreditsAndXp() }, [userId, fetchCreditsAndXp])

    // Public pages inside the shell (Incidents, plan/incidents INC-7) reach a signed-out
    // reader. The assistant needs a session: signed out, its button goes to sign-in and
    // back, and a rail left open from an earlier session is closed.
    const router = useRouter()
    const pathname = usePathname()
    const closeAI = useAIPanelStore((s) => s.close)
    const signedOut = !isPending && !userId
    useEffect(() => { if (signedOut && isAIOpen) closeAI() }, [signedOut, isAIOpen, closeAI])
    const onAI = () => signedOut
        ? router.push(`/signin?callbackUrl=${encodeURIComponent(pathname)}`)
        : toggleAI()

    // The Inbox's unread count (plan/inbox IN-4): on load, on focus, every minute,
    // and whenever the Inbox reads or sends something.
    const [inboxCount, setInboxCount] = useState(0)
    useEffect(() => {
        if (!userId) return
        const refresh = () => { void inboxCountAction().then(setInboxCount).catch(() => undefined) }
        refresh()
        window.addEventListener("focus", refresh)
        window.addEventListener(INBOX_CHANGED_EVENT, refresh)
        const t = window.setInterval(() => { if (document.visibilityState === "visible") refresh() }, 60_000)
        return () => { window.removeEventListener("focus", refresh); window.removeEventListener(INBOX_CHANGED_EVENT, refresh); window.clearInterval(t) }
    }, [userId])

    return (
        <ShellSidebar
            badges={{ "/inbox": inboxCount }}
            navigation={primary ?? mainNavigation.primary}
            customizable={!primary}
            presets={SIDEBAR_PRESETS}
            brand={{ title: "ShipItHQ", subtitle: "Developer Suite", href: "/home" }}
            tools={
                <>
                    <Link
                        href="/credits"
                        onClick={() => setIsMobileOpen(false)}
                        title="Credits - view or top up"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 text-xs font-semibold text-neutral-800 transition-all hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                        <Zap className="h-4 w-4 shrink-0 fill-neutral-900 text-neutral-900 dark:fill-neutral-100 dark:text-neutral-100" />
                        <span className="truncate">{typeof credits === "number" ? credits.toLocaleString() : "Credits"}</span>
                    </Link>
                    <button
                        type="button"
                        onClick={onAI}
                        aria-pressed={isAIOpen}
                        className={cn(
                            "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all",
                            isAIOpen
                                ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                                : "border-neutral-200 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800",
                        )}
                    >
                        <AIGlyph size={16} />
                        <span className="truncate">ShipItHQ AI</span>
                    </button>
                </>
            }
            ai={{ label: "Ask ShipItHQ AI", open: isAIOpen, onToggle: onAI }}
            user={session?.user ? {
                name: session.user.name,
                image: session.user.image ?? null,
                username: (session.user as { username?: string | null }).username,
            } : null}
            userPending={isPending}
            profileHref="/profile"
            signInHref="/signin"
            onSignOut={() => signOut()}
            signOutHref="/"
        />
    )
}
