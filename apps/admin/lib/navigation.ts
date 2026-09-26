import {
    FileSearch,
    LayoutDashboard, Users, CreditCard, MessageCircle, BarChart3, Settings,
    Shield, FileText, type LucideIcon, Coins, Receipt, UserCheck, Activity,
    Lock, Building2, GraduationCap, Briefcase, School, Mail, Flag, ClipboardList,
} from "lucide-react"
import { isSuperAdminRole } from "./role-labels"

export interface NavigationItem {
    name: string
    /** Always without a leading slash - `AppSidebar` adds one if missing. */
    path: string
    icon: LucideIcon
    children?: NavigationItem[]
    requiredPermission?: string
}

export interface NavigationConfig {
    primary: NavigationItem[]
    secondary: NavigationItem[]
}

/**
 * The one nav config for the console. Every route below resolves under
 * `app/(console)/` - see plan/admin/tasks.md ADM-3. A path here that does not
 * correspond to a real page.tsx is a bug; there is no longer a second copy of
 * this list anywhere else in the app.
 */
export const adminNavigation: NavigationConfig = {
    primary: [
        { name: "Dashboard", path: "dashboard", icon: LayoutDashboard },
        {
            name: "Users",
            path: "users",
            icon: Users,
            requiredPermission: "users",
        },
        {
            name: "Credits",
            path: "credits",
            icon: CreditCard,
            requiredPermission: "credits",
            children: [
                { name: "Overview", path: "credits", icon: CreditCard },
                { name: "Transactions", path: "credits/transactions", icon: Receipt },
                { name: "Requests", path: "credits/requests", icon: FileText },
                { name: "Payments", path: "credits/payments", icon: Coins },
            ],
        },
        {
            name: "Feedback",
            path: "feedback",
            icon: MessageCircle,
            requiredPermission: "feedback",
        },
        {
            name: "Analytics",
            path: "analytics",
            icon: BarChart3,
            requiredPermission: "analytics",
        },
        {
            name: "Hiring",
            path: "hiring",
            icon: Briefcase,
            requiredPermission: "hiring",
            // No `children` here (2026-08-24, ADM-21) - the Hiring sub-nav used
            // to nest three more indented rows into this already-busy tree
            // every time it opened, which is what read as "really bad" in
            // Niraj's screenshot. Clicking this link now lands on `/hiring`
            // and the WHOLE sidebar swaps to `hiringModuleNav` below (see
            // components/navigation/hiring-sidebar.tsx), the same takeover
            // apps/main does for `/jobs/*` via its own JobsSidebar.
        },
        {
            name: "University",
            path: "uni",
            icon: School,
            requiredPermission: "university",
            // Same as Hiring above - see uni-sidebar.tsx.
        },
    ],
    secondary: [
        {
            name: "Admin Management",
            path: "admins",
            icon: Shield,
            requiredPermission: "admin_management",
            children: [
                { name: "Team", path: "admins", icon: UserCheck },
                { name: "Invitations", path: "admins/invitations", icon: Mail },
                { name: "Access Control", path: "admins/access", icon: Lock },
                { name: "Audit Logs", path: "admins/audit", icon: Activity },
                // "My Profile" removed from the tree (2026-08-24, approved by
                // Niraj) - it duplicated the profile row the shared AppSidebar
                // already puts at the bottom of every screen. The page itself
                // (admins/profile) stays reachable from there.
            ],
        },
        // A LEAF, not a parent. There is no `app/(console)/system/page.tsx` - only
        // `system/settings` - and `AppSidebar` renders a parent as a real `<Link>`
        // to its own path as well as an expander (app-sidebar.tsx:327 and :306), so
        // "System" was a clickable 404 in the sidebar. Found by `pnpm check-nav`,
        // 2026-08-27.
        //
        // Pointed at its one child rather than given a `system/page.tsx`, because
        // "Database" was removed from the tree on 2026-08-24 and its page deleted
        // afterwards on request - which left this parent with a single child, and a
        // one-child expander is a click that buys nothing. If a second System page
        // is ever added, this goes back to a parent AND gets a real `system` page.
        { name: "System", path: "system/settings", icon: Settings, requiredPermission: "system" },
    ],
}

/**
 * Sub-navigation for the Hiring and University module sidebars (ADM-21).
 * Each is the FULL nav for that module - not a fragment merged into
 * `adminNavigation` - because the module sidebar replaces the console
 * sidebar entirely while the admin is inside it, the same takeover
 * `apps/main`'s JobsSidebar does for `/jobs/*`.
 */
export const hiringModuleNav: NavigationItem[] = [
    { name: "Overview", path: "hiring", icon: Briefcase },
    { name: "Companies", path: "hiring/companies", icon: Building2 },
    // Unclaimed pages read from a company's own site (plan/hiring-rounds HR-6).
    { name: "Company drafts", path: "hiring/companies/drafts", icon: FileSearch },
    { name: "Verification", path: "hiring/companies/verification", icon: Shield },
    // Reports on companies, jobs, messages and students (plan/hiring-rounds HR-24).
    { name: "Reports", path: "hiring/reports", icon: Flag },
    // Students' reports of real interviews (plan/competition/skillmeet CMP-1).
    { name: "Interview reports", path: "hiring/interview-reports", icon: ClipboardList },
]

export const universityModuleNav: NavigationItem[] = [
    { name: "Overview", path: "uni", icon: School },
    { name: "Universities", path: "uni/universities", icon: GraduationCap },
    { name: "Verification", path: "uni/universities/verification", icon: Shield },
]

// ── Permissions ─────────────────────────────────────────────────────────────
// Two-role model, decided 2026-08-24 (plan/admin/overview.md). SUPER_ADMIN
// bypasses every check; a TEAM_MEMBER's access is exactly their per-module
// grants below, one flat record - not nested by platform. A previous version
// of this app exported an incompatible *nested* `AdminPermissions` from
// types/admin.ts under the same name; that type no longer exists (ADM-7).

export type AdminPermission =
    | "users"
    | "credits"
    | "feedback"
    | "analytics"
    | "hiring"
    | "university"
    | "admin_management"
    | "system"

export type PermissionLevel = "read" | "write" | "delete" | "full"

export type AdminPermissions = Partial<Record<AdminPermission, PermissionLevel[]>>

const ALL_MODULES: AdminPermission[] = [
    "users", "credits", "feedback", "analytics", "hiring", "university",
    "admin_management", "system",
]

const SUPER_ADMIN_PERMISSIONS: AdminPermissions = Object.fromEntries(
    ALL_MODULES.map((m) => [m, ["read", "write", "delete", "full"] as PermissionLevel[]]),
)

/** A SUPER_ADMIN's effective permissions are always the full set, regardless of
 *  what (if anything) is stored in their `permissions` jsonb column. A team
 *  member's effective permissions are exactly what was granted. */
export function getEffectivePermissions(
    adminRole: string,
    permissions: AdminPermissions,
): AdminPermissions {
    if (isSuperAdminRole(adminRole)) return SUPER_ADMIN_PERMISSIONS
    return permissions ?? {}
}

export function hasPermission(
    permissions: AdminPermissions,
    module: AdminPermission,
    level: PermissionLevel,
): boolean {
    const granted = permissions[module]
    if (!granted) return false
    return granted.includes(level) || granted.includes("full")
}

/** Server-action guard. Returns null when allowed, a standard denial when not -
 *  mirrors the shape every action in this app already returns on failure. */
export function requirePermission(
    adminRole: string,
    permissions: AdminPermissions,
    module: AdminPermission,
    level: PermissionLevel = "read",
): { success: false; error: string } | null {
    const effective = getEffectivePermissions(adminRole, permissions)
    if (hasPermission(effective, module, level)) return null
    return { success: false, error: `You do not have ${level} access to the ${module} module` }
}

/** Drop nav items (and their whole subtree) the admin cannot read. A parent
 *  whose children all fail the check is dropped too, rather than left as a
 *  clickable link to nothing. */
export function getNavigationForPermissions(
    permissions: AdminPermissions,
    adminRole: string,
): NavigationConfig {
    const effective = getEffectivePermissions(adminRole, permissions)

    const filterItems = (items: NavigationItem[]): NavigationItem[] =>
        items
            .filter((item) => {
                if (!item.requiredPermission) return true
                return hasPermission(effective, item.requiredPermission as AdminPermission, "read")
            })
            .map((item) => ({
                ...item,
                children: item.children ? filterItems(item.children) : undefined,
            }))
            .filter((item) => !item.children || item.children.length > 0)

    return {
        primary: filterItems(adminNavigation.primary),
        secondary: filterItems(adminNavigation.secondary),
    }
}
