"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "@repo/auth/client"
import { INBOX_CHANGED_EVENT } from "@repo/ui/components/inbox/types"
import { inboxCountAction } from "@/actions/inbox"
import { ShellSidebar } from "@repo/ui/components/shell/shell-sidebar"
import { AIGlyph } from "@repo/ui/components/ui/ai-mark"
import { cn } from "@repo/ui/lib/utils"
import { useHiringAIStore } from "@/components/ai/hiring-ai-store"
import type { NavigationItem } from "@/lib/navigation"

// ─────────────────────────────────────────────────────────────────────────────
// The hiring sidebar: the shared `ShellSidebar` (packages/ui, plan/hiring-app
// HA-1) - the same rows, pin/unpin, hover reveal, Cmd+K and customize as
// apps/main - with the hiring links this member may see (filtered by their
// permissions in the shell, HA-6), with the Inbox count on its row (plan/inbox).
//
// The company AI panel's toggle (HA-11) sits in `tools` and the mobile bar's
// centre action, only for members with "use AI".
// ─────────────────────────────────────────────────────────────────────────────

export function HiringSidebar({ navigation, canUseAI = false }: { navigation: NavigationItem[]; canUseAI?: boolean }) {
    const { data: session, isPending } = useSession()
    const isAIOpen = useHiringAIStore((s) => s.isOpen)
    const toggleAI = useHiringAIStore((s) => s.toggle)
    const userId = session?.user?.id

    // The Inbox's unread count for this member (plan/inbox IN-4).
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
            navigation={navigation}
            customizable
            pinsKey="shipithq.hiring.sidebar"
            brand={{ title: "ShipItHQ", subtitle: "Hiring", href: "/home" }}
            tools={canUseAI ? (
                <button
                    type="button"
                    onClick={toggleAI}
                    aria-pressed={isAIOpen}
                    className={cn(
                        "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all",
                        isAIOpen
                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                            : "border-neutral-200 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800",
                    )}
                >
                    <AIGlyph size={16} />
                    <span className="truncate">Company AI</span>
                </button>
            ) : undefined}
            ai={canUseAI ? { label: "Ask the company AI", open: isAIOpen, onToggle: toggleAI } : undefined}
            user={session?.user ? { name: session.user.name, image: session.user.image ?? null } : null}
            userPending={isPending}
            profileHref="/profile"
            signInHref="/signin"
            onSignOut={() => signOut()}
            signOutHref="/signin"
        />
    )
}

export default HiringSidebar
