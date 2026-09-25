/**
 * What a company member may do in apps/hiring (plan/hiring-app HA-6, decided by
 * Niraj 2026-09-25). Shared by the app's permission helper, the roles editor and
 * the backfill script, so the list exists once.
 *
 * Roles are the company's own: every company has a fixed Owner role (all
 * permissions, cannot be edited or removed) and three editable presets. The
 * Owner can edit those and add more by ticking permissions from this list.
 */

export const HIRING_PERMISSIONS = [
    "view_candidates",
    "message_candidates",
    "invite_decline",
    "manage_jobs",
    "manage_pipelines",
    "manage_team",
    "manage_roles",
    "edit_company",
    "view_analytics",
    "use_ai",
    "billing",
    "delete_company",
] as const

export type HiringPermission = (typeof HIRING_PERMISSIONS)[number]

/** Belongs to the Owner role only; it can never be ticked on another role. */
export const OWNER_ONLY_PERMISSIONS: readonly HiringPermission[] = ["delete_company"]

/** For the roles editor: what each permission lets a member do. */
export const HIRING_PERMISSION_LABELS: Record<HiringPermission, { label: string; description: string }> = {
    view_candidates: { label: "View candidates", description: "See who applied or sent results, and their scores" },
    message_candidates: { label: "Message candidates", description: "Write to candidates who sent results" },
    invite_decline: { label: "Invite or decline", description: "Decide on candidates, and send or score assignments" },
    manage_jobs: { label: "Manage jobs", description: "Create, edit, publish and close jobs" },
    manage_pipelines: { label: "Manage pipelines", description: "Build interview processes and their rounds" },
    manage_team: { label: "Manage team", description: "Invite, remove and change members' roles" },
    manage_roles: { label: "Manage roles", description: "Create roles and choose their permissions" },
    edit_company: { label: "Edit company profile", description: "Change the public company page" },
    view_analytics: { label: "View analytics", description: "See hiring numbers and reports" },
    use_ai: { label: "Use AI", description: "Ask the company AI and let it draft" },
    billing: { label: "Billing", description: "Plans, payments and invoices" },
    delete_company: { label: "Delete company", description: "Owner only" },
}

export type RolePresetKey = "OWNER" | "ADMIN" | "RECRUITER" | "INTERVIEWER"

/** The four roles every company starts with. Only OWNER is fixed. */
export const ROLE_PRESETS: Record<RolePresetKey, { name: string; permissions: HiringPermission[] }> = {
    OWNER: { name: "Owner", permissions: [...HIRING_PERMISSIONS] },
    ADMIN: {
        name: "Admin",
        permissions: HIRING_PERMISSIONS.filter((p) => p !== "billing" && p !== "delete_company"),
    },
    RECRUITER: {
        name: "Recruiter",
        permissions: ["view_candidates", "message_candidates", "invite_decline", "manage_jobs", "manage_pipelines", "view_analytics", "use_ai"],
    },
    INTERVIEWER: { name: "Interviewer", permissions: ["view_candidates", "use_ai"] },
}

/** The old fixed roles, mapped onto the presets by the backfill. */
export const LEGACY_ROLE_TO_PRESET: Record<string, RolePresetKey> = {
    FOUNDER: "OWNER",
    ADMIN: "ADMIN",
    HIRING_MANAGER: "RECRUITER",
    RECRUITER: "RECRUITER",
    INTERVIEWER: "INTERVIEWER",
}

/** Keeps only real permissions, drops owner-only ones unless the role is the Owner. */
export function sanitizePermissions(input: unknown, isOwner: boolean): HiringPermission[] {
    if (isOwner) return [...HIRING_PERMISSIONS]
    const list = Array.isArray(input) ? input : []
    const known = new Set<string>(HIRING_PERMISSIONS)
    return [...new Set(list.filter((p): p is HiringPermission => typeof p === "string" && known.has(p)))]
        .filter((p) => !OWNER_ONLY_PERMISSIONS.includes(p))
}
