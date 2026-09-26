import type { LucideIcon as LucideIconType } from "lucide-react"

/*
 * The shell's navigation model (plan/hiring-app HA-1): shared by apps/main and
 * apps/hiring so both sidebars, command palettes and customize sheets read the
 * same shapes. Each app keeps its own link lists and presets; only the types
 * and the pin logic live here.
 */

export type LucideIcon = LucideIconType

export interface NavigationItem {
    name: string
    path: string
    icon: LucideIcon
    children?: NavigationItem[]
    requiredPermission?: string
    status?: string | "active" | "coming"
    comingSoon?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar destinations and pins (ported from gurukulhq's navigation, 2026-09-22).
//
// The sidebar shows a PINNED list of destinations the user can customize, the
// module they are currently in opens under its own row, and everything else is
// one keystroke away in the command palette (Cmd+K). These helpers turn the nav
// config above into that flat list. Paths in the config have no leading slash;
// everything below works in real hrefs.
// ─────────────────────────────────────────────────────────────────────────────

/** A config path as a real href: "practice/dsa" -> "/practice/dsa". */
export const toHref = (path: string) => (path.startsWith("/") ? path : `/${path}`)

export interface FlatDestination {
    name: string
    path: string
    icon: LucideIcon
    /** The module it belongs to, shown in the palette and the customize sheet. */
    section: string
}

/**
 * Every navigable page: each top-level item, then each child that is not just
 * the parent again. Children called "Overview" are named after their module in
 * the palette so "Overview" does not appear seven times.
 */
export function flattenNavigation(items: NavigationItem[]): FlatDestination[] {
    const out: FlatDestination[] = []
    const seen = new Set<string>()
    for (const item of items) {
        const href = toHref(item.path)
        if (!seen.has(href)) {
            seen.add(href)
            out.push({ name: item.name, path: href, icon: item.icon, section: "" })
        }
        for (const child of item.children ?? []) {
            const ch = toHref(child.path)
            if (seen.has(ch)) continue
            seen.add(ch)
            out.push({ name: child.name, path: ch, icon: child.icon, section: item.name })
        }
    }
    return out
}

/** Always pinned, always first. */
/** Always in the sidebar, whatever is pinned: Home, and the Inbox with its count (plan/inbox IN-4). */
export const SIDEBAR_LOCKED_PATHS: string[] = ["/home", "/inbox"]

/** The most rows the pinned list holds. */
export const SIDEBAR_PRIMARY_CAP = 10

/** No saved pins: every top-level item, in config order. */
export function computeDefaultPrimary(permitted: FlatDestination[]): string[] {
    return permitted.filter((d) => d.section === "").map((d) => d.path)
}

/** The pinned rows to render: locked first, then the saved order (or the default). */
export function resolveSidebarPrimary(
    permitted: FlatDestination[],
    pinnedPaths: string[] | null | undefined,
): FlatDestination[] {
    const byPath = new Map<string, FlatDestination>(permitted.map((d) => [d.path, d]))
    const paths = pinnedPaths && pinnedPaths.length > 0 ? pinnedPaths : computeDefaultPrimary(permitted)
    const seen = new Set<string>()
    const ordered: FlatDestination[] = []
    for (const locked of SIDEBAR_LOCKED_PATHS) {
        const d = byPath.get(locked)
        if (d) { ordered.push(d); seen.add(locked) }
    }
    for (const p of paths) {
        if (seen.has(p)) continue
        const d = byPath.get(p)
        if (!d) continue
        seen.add(p)
        ordered.push(d)
    }
    return ordered.slice(0, SIDEBAR_PRIMARY_CAP)
}

export interface SidebarPreset {
    key: string
    label: string
    description: string
    /** null = the default (every module). */
    paths: string[] | null
}
