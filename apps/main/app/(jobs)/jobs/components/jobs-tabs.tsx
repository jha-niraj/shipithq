"use client"

import { usePathname } from "next/navigation"
import {
    Sparkles, UserCheck, Bookmark, FileText, LayoutList,
} from "lucide-react"
import { TabsNav } from "@repo/ui/components/ui/tabs"

export interface TabCounts {
    spark: number
    following: number
    saved: number
    rounds: number
    browse: number
}

interface JobsTabsProps {
    counts: TabCounts
    isAuthenticated: boolean
}

interface TabConfig {
    id: string
    label: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    countKey: keyof TabCounts
    requiresAuth: boolean
}

// NO `color` field, deliberately.
//
// Every tab carried `color: "text-neutral-900"` with no `dark:` pair, applied to
// the icon ONLY when the tab was active. So in dark mode the active tab's icon
// became near-black on a `neutral-800` pill and vanished - while its label stayed
// white, because the label inherits the link's own colour, which IS paired. That
// is the screenshot: "Saved" readable, its bookmark invisible.
//
// This is the same defect as the pathfinder stat tiles: a colour written in a
// DATA ARRAY rather than in a `className`, so every repo-wide contrast sweep
// that greps `className=` walks straight past it. A colour is a colour wherever
// it is written down.
//
// The icon now inherits from the link, which already handles active, inactive,
// light and dark correctly - and it was the only thing `color` was ever used for.

const tabs: TabConfig[] = [
    {
        id: "spark",
        label: "Spark",
        href: "/jobs",
        icon: Sparkles,
        countKey: "spark",
        requiresAuth: false
    },
    {
        id: "following",
        label: "Following",
        href: "/jobs/following",
        icon: UserCheck,
        countKey: "following",
        requiresAuth: true
    },
    {
        id: "saved",
        label: "Saved",
        href: "/jobs/saved",
        icon: Bookmark,
        countKey: "saved",
        requiresAuth: true
    },
    {
        id: "rounds",
        label: "My rounds",
        href: "/jobs/rounds",
        icon: FileText,
        countKey: "rounds",
        requiresAuth: true
    },
    {
        id: "browse",
        label: "Browse All",
        href: "/jobs/browse",
        icon: LayoutList,
        countKey: "browse",
        requiresAuth: false
    }
]

export function JobsTabs({ counts, isAuthenticated }: JobsTabsProps) {
    const pathname = usePathname()

    // Determine active tab from pathname
    const getActiveTab = () => {
        if (pathname === "/jobs" || pathname === "/jobs/spark") return "spark"
        if (pathname.startsWith("/jobs/following")) return "following"
        if (pathname.startsWith("/jobs/saved")) return "saved"
        if (pathname.startsWith("/jobs/rounds")) return "rounds"
        if (pathname.startsWith("/jobs/browse")) return "browse"
        return "spark"
    }

    const activeTab = getActiveTab()

    // The shared `TabsNav` (plan/ui-pass UI-2), not a hand-built copy of it. The copy
    // used `layoutId="activeTab"`, a global string, so two strips on one screen would
    // animate into each other; `TabsNav` scopes its own. Below md it scrolls sideways,
    // which is what every other section does, so the dropdown that stood in for it
    // on phones is gone.
    return (
        <TabsNav
            aria-label="Jobs sections"
            items={tabs.map((tab) => {
                const Icon = tab.icon
                const count = counts[tab.countKey]
                const showCount = count > 0 && (isAuthenticated || !tab.requiresAuth)
                return {
                    href: tab.href,
                    active: activeTab === tab.id,
                    icon: <Icon className="h-3.5 w-3.5" />,
                    label: (
                        <>
                            {tab.label}
                            {/* A muted number, not a pill: a pill per tab doubled the strip's ink. */}
                            {showCount && (
                                <span className="ml-1.5 text-xs tabular-nums opacity-60">{count > 99 ? "99+" : count}</span>
                            )}
                        </>
                    ),
                }
            })}
        />
    )
}
