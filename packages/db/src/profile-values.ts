/**
 * The stored values for a portfolio project's free-text columns (plan/profile PRF-7).
 *
 * These columns are `text`, not pgEnums, and three generations of writers put three
 * spellings into them: the Add Project sheet wrote "PUBLIC" / "IN_PROGRESS" /
 * "LIVE SITE", the column defaults were "Public" / "In Progress", and the resume
 * readers looked for "LIVE_SITE". The public profile filtered on "Public", so every
 * project added from the sheet was invisible to everyone but its owner.
 *
 * One spelling now: upper snake case. Labels for people live in the app
 * (`apps/main/lib/profile/labels.ts`); nothing here is shown to a user.
 *
 * `normalize*` maps every legacy spelling seen in the data onto the stored value and
 * returns null for anything it does not recognise - the backfill script leaves those
 * rows alone rather than guessing.
 */

export const PROJECT_STATUSES = ["IN_PROGRESS", "COMPLETED", "ARCHIVED"] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PROJECT_VISIBILITIES = ["PUBLIC", "PRIVATE"] as const
export type ProjectVisibility = (typeof PROJECT_VISIBILITIES)[number]

/** `projectType` also accepts custom text; these are the presets. */
export const PROJECT_TYPES = ["PERSONAL", "PROFESSIONAL", "OPEN_SOURCE", "ACADEMIC"] as const
export type ProjectType = (typeof PROJECT_TYPES)[number]

export const PROJECT_LINK_TYPES = [
    "GITHUB", "LIVE_SITE", "DEMO", "DOCUMENTATION", "GITLAB", "BITBUCKET", "DOWNLOAD", "BLOG_POST",
] as const
export type ProjectLinkType = (typeof PROJECT_LINK_TYPES)[number]

export const PROJECT_MEDIA_TYPES = ["IMAGE", "VIDEO"] as const
export type ProjectMediaType = (typeof PROJECT_MEDIA_TYPES)[number]

/** "In Progress", "in-progress", "IN PROGRESS" -> "IN_PROGRESS". */
function canon(value: string): string {
    return value.trim().toUpperCase().replace(/[\s-]+/g, "_")
}

function pick<T extends string>(list: readonly T[], value: string | null | undefined): T | null {
    if (!value) return null
    const c = canon(value)
    return (list as readonly string[]).includes(c) ? (c as T) : null
}

export const normalizeProjectStatus = (v: string | null | undefined) => pick(PROJECT_STATUSES, v)
export const normalizeProjectVisibility = (v: string | null | undefined) => pick(PROJECT_VISIBILITIES, v)
export const normalizeProjectType = (v: string | null | undefined) => pick(PROJECT_TYPES, v)
export const normalizeProjectLinkType = (v: string | null | undefined) => pick(PROJECT_LINK_TYPES, v)
export const normalizeProjectMediaType = (v: string | null | undefined) => pick(PROJECT_MEDIA_TYPES, v)
