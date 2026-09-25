"use client"

import { useSession, signOut } from "@repo/auth/client"
import { ShellSidebar } from "@repo/ui/components/shell/shell-sidebar"
import type { NavigationItem } from "@/lib/navigation"
import { NotificationsPanel } from "./notifications-panel"

// ─────────────────────────────────────────────────────────────────────────────
// The hiring sidebar: the shared `ShellSidebar` (packages/ui, plan/hiring-app
// HA-1) - the same rows, pin/unpin, hover reveal, Cmd+K and customize as
// apps/main - with the hiring links this member may see (filtered by their
// permissions in the shell, HA-6) and HIRING notifications.
//
// No AI button yet: the company AI panel arrives with HA-11, and a button that
// opens nothing is worse than no button. HA-11 adds it to `tools` and `ai`.
// ─────────────────────────────────────────────────────────────────────────────

export function HiringSidebar({ navigation }: { navigation: NavigationItem[] }) {
    const { data: session, isPending } = useSession()

    return (
        <ShellSidebar
            navigation={navigation}
            customizable
            pinsKey="shipithq.hiring.sidebar"
            brand={{ title: "ShipItHQ", subtitle: "Hiring", href: "/home" }}
            notifications={<NotificationsPanel enabled={Boolean(session?.user?.id)} />}
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
