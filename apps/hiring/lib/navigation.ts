import {
    Home, Briefcase, Users, FileText, ClipboardList, UserPlus, BarChart3,
    Building2, CreditCard, Settings, HelpCircle, ListChecks, Plus, GraduationCap,
    Receipt, ArrowLeftRight, ShieldCheck,
} from "lucide-react"
import type { NavigationItem } from "@repo/ui/lib/shell-navigation"

export type { NavigationItem } from "@repo/ui/lib/shell-navigation"

// ─────────────────────────────────────────────────────────────────────────────
// The hiring app's links (plan/hiring-app HA-2), rendered by the shared
// `ShellSidebar` exactly as apps/main renders its own. Paths have no leading
// slash, as in apps/main.
//
// Only pages that exist. The old list linked to /interviews, /assignments/new,
// /analytics/pipeline and /analytics/activity, none of which were ever built,
// and to "?status=" filters that no page reads, so "Active jobs" and "Drafts"
// showed the same list as "All jobs". `scripts/check-nav.mjs` walks this file
// against app/ so a dead link fails loudly.
// ─────────────────────────────────────────────────────────────────────────────

export const hiringNavigation: NavigationItem[] = [
    { name: "Home", path: "home", icon: Home },
    {
        name: "Jobs",
        path: "jobs",
        icon: Briefcase,
        children: [
            { name: "All jobs", path: "jobs", icon: Briefcase },
            { name: "Create a job", path: "jobs/new", icon: Plus },
        ],
    },
    { name: "Applications", path: "applications", icon: FileText, requiredPermission: "view_candidates" },
    {
        name: "Candidates",
        path: "candidates",
        icon: Users,
        requiredPermission: "view_candidates",
        children: [
            { name: "All candidates", path: "candidates", icon: Users },
            { name: "Universities", path: "candidates/universities", icon: GraduationCap },
        ],
    },
    { name: "Interview process", path: "interview-config", icon: ListChecks },
    { name: "Assignments", path: "assignments", icon: ClipboardList, requiredPermission: "view_candidates" },
    { name: "Analytics", path: "analytics", icon: BarChart3, requiredPermission: "view_analytics" },
    {
        name: "Company",
        path: "company",
        icon: Building2,
        children: [
            { name: "Company profile", path: "company", icon: Building2 },
            { name: "Team members", path: "team", icon: UserPlus },
            { name: "Roles", path: "team/roles", icon: ShieldCheck },
        ],
    },
    {
        name: "Settings",
        path: "settings",
        icon: Settings,
        children: [
            { name: "Account", path: "settings", icon: Settings },
            { name: "Billing", path: "billing", icon: CreditCard, requiredPermission: "billing" },
            { name: "Transactions", path: "transactions", icon: ArrowLeftRight, requiredPermission: "billing" },
            { name: "Invoices", path: "invoices", icon: Receipt, requiredPermission: "billing" },
            { name: "Help", path: "help", icon: HelpCircle },
        ],
    },
]

/**
 * The links this member may see (plan/hiring-app HA-6): an item or child with a
 * `requiredPermission` the member lacks is dropped. Courtesy only - every
 * action checks on the server.
 */
export function navigationFor(permissions: readonly string[]): NavigationItem[] {
    const has = (item: NavigationItem) => !item.requiredPermission || permissions.includes(item.requiredPermission)
    return hiringNavigation
        .filter(has)
        .map((item) => (item.children ? { ...item, children: item.children.filter(has) } : item))
}

/** The permission a path needs, from the most specific nav entry that covers it; null when none. */
export function permissionForPath(pathname: string): string | null {
    let best: { len: number; permission: string } | null = null
    const visit = (item: NavigationItem, inherited?: string) => {
        const permission = item.requiredPermission ?? inherited
        const href = `/${item.path.split("?")[0]}`
        if (permission && (pathname === href || pathname.startsWith(`${href}/`)) && (!best || href.length > best.len)) {
            best = { len: href.length, permission }
        }
        for (const child of item.children ?? []) visit(child, permission)
    }
    for (const item of hiringNavigation) visit(item)
    return (best as { len: number; permission: string } | null)?.permission ?? null
}
