import {
    FolderKanban, Sparkles, User, User2,
    Briefcase, Video, Brain, LayoutDashboard, Heading,
    Home, FileText, Code2,
    Network, Globe, Server, Compass, Telescope, IdCard, BarChart3,
    Upload, History, Wallet,
    ArrowLeft, Search, Send, Bookmark, Bell, Building2, Zap,
} from "lucide-react"

export type LucideIcon = typeof LayoutDashboard

export interface NavigationItem {
    name: string
    path: string
    icon: LucideIcon
    children?: NavigationItem[]
    requiredPermission?: string
    status?: string | "active" | "coming"
    comingSoon?: boolean
}

export interface NavigationConfig {
    primary: NavigationItem[]
    secondary: NavigationItem[]
}

// Focused nav: Build (Projects) -> Interview-ready (Practice, Mock, AI) -> Get Hired (Jobs)
// -> KnowMe (your public, queryable persona).
//
// KnowMe was parked here and hidden from nav, while the home page went on linking to it from
// `feature-discovery.tsx` - so it was unreachable from the sidebar and advertised on the first
// screen. Unparked on 2026-08-27 at Niraj's request; the two now agree.
//
// EVERY `path` HERE MUST RESOLVE TO A REAL ROUTE. Two did not, for long enough that Niraj
// found them by clicking: 'ai/jobinterviewassistant' (the route has no "job" prefix) and
// 'ai/resume/cover-letter' (the route is 'ai/coverletter'). The second was the nastier one -
// it matched the dynamic `ai/resume/[username]` segment with username="cover-letter", so it
// rendered that page's not-found and read as a broken profile rather than a broken link.
//
// A wrong path here has no symptom until someone clicks it, which is why there is now a test:
// `lib/navigation.test.ts` walks this tree and fails on any path with no page. Route groups
// are resolved, so `jobs` living in `app/(jobs)/jobs` is correctly accepted.
//
// EVERY group whose parent is itself a page opens with an entry pointing AT that
// parent. Without it the group's own landing page is the one page in the module
// the sidebar cannot represent: you arrive from a header link or a card, the
// group expands, and nothing inside it is marked current - so the sidebar says
// you are nowhere. The label is "Overview" everywhere except Pathfinder, where
// the parent page is a list of the user's goals and "My Goals" says what is
// actually on it.
//
// Pathfinder has exactly two static pages, `/pathfinder` and
// `/pathfinder/explore`; everything else under it is `[slug]`. So those two ARE
// the complete set - there is no third link being withheld.
export const mainNavigation: NavigationConfig = {
    primary: [
        {
            name: "Home",
            path: "home",
            icon: Home,
            status: "active"
        },
        {
            name: "Practice",
            path: "practice",
            icon: Code2,
            status: "active",
            children: [
                { name: 'Overview', path: 'practice', icon: LayoutDashboard },
                { name: 'DSA', path: 'practice/dsa', icon: Code2 },
                { name: 'System Design', path: 'practice/system-design', icon: Network },
                { name: 'Web Frontend', path: 'practice/web-frontend', icon: Globe },
                { name: 'Web Backend', path: 'practice/web-backend', icon: Server }
            ]
        },
        {
            name: "Projects",
            path: "projects",
            icon: FolderKanban,
            status: "active",
            children: [
                { name: 'Overview', path: 'projects', icon: LayoutDashboard },
                // One Explore page with tabs replaced Ideas, My Projects and All
                // Projects (plan/projects, PJ-4). The sidebar links to the tabs.
                { name: 'Explore', path: 'projects/explore?tab=browse', icon: Heading },
                { name: 'My Projects', path: 'projects/explore?tab=mine', icon: User },
                { name: 'Community', path: 'projects/explore?tab=browse&made=community', icon: User2 }
            ]
        },
        {
            name: "Mock Interview",
            path: "mock",
            icon: Video,
            status: "active",
            children: [
                { name: 'Overview', path: 'mock', icon: LayoutDashboard },
                { name: 'Voice Mock', path: 'mock/voice', icon: Brain }
            ]
        },
        {
            name: "Pathfinder",
            path: "pathfinder",
            icon: Compass,
            status: "active",
            children: [
                { name: 'My Goals', path: 'pathfinder', icon: LayoutDashboard },
                { name: 'Explore', path: 'pathfinder/explore', icon: Telescope }
            ]
        },
        {
            name: "AI Tools",
            path: "ai",
            icon: Sparkles,
            status: "active",
            children: [
                { name: 'Overview', path: 'ai', icon: LayoutDashboard },
                { name: 'Resume', path: 'ai/resume', icon: FileText },
                { name: 'Import Resume', path: 'ai/resume/import', icon: Upload },
                { name: 'Cover Letter', path: 'ai/coverletter', icon: FileText },
            ]
        },
        {
            // NO CHILDREN, deliberately - and this reverses an earlier decision, so
            // the reasoning for both is here rather than one silently replacing the
            // other.
            //
            // The children were ADDED because "Jobs had SIX real sub-pages and no
            // children at all, so every one of them was reachable only from inside
            // the module's own page chrome". True at the time, and the right call
            // then.
            //
            // What changed: `app/(jobs)/_components/jobs-shell.tsx` mounts the shared sidebar with
            // `jobsNavigation` (JB-8), so entering
            // this module REPLACES the sidebar wholesale with the jobs one, which
            // lists the same six items. `app/(jobs)/jobs/layout.tsx` then renders them
            // a third time as a tab row. Expanding Jobs here showed a user seven links
            // that vanish the instant they click any of them.
            //
            // Niraj, 2026-08-29: "as we are changing the content of the sidebar when
            // clicking on Job so just add this icon here, not these children". See
            // JB-2. If the jobs shell ever loses its own sidebar, put these back.
            name: "Jobs",
            path: "jobs",
            icon: Briefcase,
            status: "active",
        },
        {
            // KnowMe is the OUTWARD-facing half of the product: a queryable public
            // persona that other people (and API clients) ask questions of. That is
            // why it sits at the end, after everything the user does for themselves -
            // and why it is not merged into the AI rail, which is the inward-facing
            // assistant that acts on the user's behalf. See the note in
            // plan/knowme/overview.md.
            name: "KnowMe",
            path: "knowme",
            icon: IdCard,
            status: "active",
            children: [
                { name: 'Overview', path: 'knowme', icon: LayoutDashboard },
                { name: 'Analytics', path: 'knowme/analytics', icon: BarChart3 },
                { name: 'Settings', path: 'knowme/settings', icon: Server },
            ]
        },
        {
            // Buying sits BELOW KnowMe, at the end. `Credits` near the top is the
            // wallet - balance, purchases, history - and is the page somebody
            // opens often. This is the checkout, which they open rarely, so it
            // does not compete with the modules they actually work in.
            name: "Purchase",
            path: "purchase",
            icon: Wallet,
            status: "active"
        }
    ],
    secondary: []
}

/**
 * The sidebar for `app/(jobs)`.
 *
 * ── Why this is a nav list and not a second sidebar ──────────────────────────
 * `components/common/jobssidebar.tsx` was a 319-line reimplementation of
 * the app sidebar with its own brand block, its own collapse control, its own
 * theme toggle and its own user footer - all of which looked subtly unlike the
 * real one, because a copy always does. Niraj, 2026-08-29: *"the sidebar ui is
 * totally different from the main sidebar ... the content only needs to change
 * not the full side."*
 *
 * The jobs shell now renders the SAME `Sidebar` component with this list passed
 * in. One sidebar, two sets of links.
 *
 * `Back to ShipItHQ` is first and deliberate: entering jobs replaces the whole
 * nav, so without it the way out is the browser's back button.
 */
export const jobsNavigation: NavigationItem[] = [
    { name: "Back to ShipItHQ", path: "home", icon: ArrowLeft, status: "active" },
    { name: "Discover", path: "jobs", icon: Zap, status: "active" },
    { name: "Browse All", path: "jobs/browse", icon: Search, status: "active" },
    { name: "Applications", path: "jobs/applications", icon: Send, status: "active" },
    { name: "Saved", path: "jobs/saved", icon: Bookmark, status: "active" },
    { name: "Following", path: "jobs/following", icon: Bell, status: "active" },
    { name: "Companies", path: "companies", icon: Building2, status: "active" },
]

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
export const SIDEBAR_LOCKED_PATHS: string[] = ["/home"]

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

export const SIDEBAR_PRESETS: SidebarPreset[] = [
    { key: "default", label: "Everything", description: "Every module", paths: null },
    { key: "prep", label: "Interview prep", description: "Practice, mock, jobs", paths: ["/home", "/practice", "/practice/dsa", "/mock", "/jobs", "/ai/resume"] },
    { key: "build", label: "Building", description: "Projects and goals", paths: ["/home", "/projects", "/projects/explore", "/pathfinder", "/knowme"] },
    { key: "minimal", label: "Minimal", description: "Just the essentials", paths: ["/home", "/practice", "/projects"] },
]
