/**
 * What a person reads for every stored profile value (plan/profile PRF-7).
 *
 * The stored spellings live in `@repo/db/profile-values`; this file is the ONLY place
 * they are turned into words. Nothing else in the app formats a status, visibility,
 * type or category - that is how "IN_PROGRESS" and "FRAMEWORKS LIBRARIES" reached the
 * screen. Every `*Label` also accepts legacy spellings ("In Progress", "LIVE SITE"),
 * so rows written before the backfill still read correctly.
 */
import {
    PROJECT_LINK_TYPES, PROJECT_MEDIA_TYPES, PROJECT_STATUSES, PROJECT_TYPES, PROJECT_VISIBILITIES,
    normalizeProjectLinkType, normalizeProjectMediaType, normalizeProjectStatus,
    normalizeProjectType, normalizeProjectVisibility,
    type ProjectLinkType, type ProjectMediaType, type ProjectStatus, type ProjectType, type ProjectVisibility,
} from "@repo/db/profile-values"

export {
    PROJECT_LINK_TYPES, PROJECT_MEDIA_TYPES, PROJECT_STATUSES, PROJECT_TYPES, PROJECT_VISIBILITIES,
    normalizeProjectLinkType, normalizeProjectMediaType, normalizeProjectStatus,
    normalizeProjectType, normalizeProjectVisibility,
}
export type { ProjectLinkType, ProjectMediaType, ProjectStatus, ProjectType, ProjectVisibility }

const STATUS: Record<ProjectStatus, string> = {
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    ARCHIVED: "Archived",
}

const VISIBILITY: Record<ProjectVisibility, string> = {
    PUBLIC: "Public",
    PRIVATE: "Private",
}

const TYPE: Record<ProjectType, string> = {
    PERSONAL: "Personal",
    PROFESSIONAL: "Professional",
    OPEN_SOURCE: "Open source",
    ACADEMIC: "Academic",
}

const LINK: Record<ProjectLinkType, string> = {
    GITHUB: "GitHub",
    LIVE_SITE: "Live site",
    DEMO: "Demo",
    DOCUMENTATION: "Docs",
    GITLAB: "GitLab",
    BITBUCKET: "Bitbucket",
    DOWNLOAD: "Download",
    BLOG_POST: "Blog post",
}

const MEDIA: Record<ProjectMediaType, string> = {
    IMAGE: "Image",
    VIDEO: "Video",
}

/** The `skill_category` pgEnum. */
export const SKILL_CATEGORIES = [
    "LANGUAGES", "FRONTEND", "BACKEND", "FRAMEWORKS_LIBRARIES", "DATABASE", "API",
    "DEVOPS", "CLOUD", "TOOLS_DATABASES", "PLATFORMS", "AI_TOOLS",
] as const
export type SkillCategory = (typeof SKILL_CATEGORIES)[number]

const SKILL_CATEGORY: Record<SkillCategory, string> = {
    LANGUAGES: "Languages",
    FRONTEND: "Frontend",
    BACKEND: "Backend",
    FRAMEWORKS_LIBRARIES: "Frameworks & libraries",
    DATABASE: "Databases",
    API: "APIs",
    DEVOPS: "DevOps",
    CLOUD: "Cloud",
    TOOLS_DATABASES: "Tools",
    PLATFORMS: "Platforms",
    AI_TOOLS: "AI tools",
}

/** `skills.level` is free text; these are the values the sheet has always stored (lowercase). */
export const SKILL_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const
export type SkillLevel = (typeof SKILL_LEVELS)[number]

/** "some_VALUE here" -> "Some value here", for anything outside the maps. */
function humanize(value: string): string {
    const s = value.trim().replace(/[_-]+/g, " ").toLowerCase()
    return s.charAt(0).toUpperCase() + s.slice(1)
}

export const projectStatusLabel = (v: string | null | undefined) => {
    const k = normalizeProjectStatus(v)
    return k ? STATUS[k] : v ? humanize(v) : ""
}
export const projectVisibilityLabel = (v: string | null | undefined) => {
    const k = normalizeProjectVisibility(v)
    return k ? VISIBILITY[k] : v ? humanize(v) : ""
}
/** Custom types are shown as the user typed them. */
export const projectTypeLabel = (v: string | null | undefined) => {
    const k = normalizeProjectType(v)
    return k ? TYPE[k] : v ?? ""
}
export const projectLinkLabel = (v: string | null | undefined) => {
    const k = normalizeProjectLinkType(v)
    return k ? LINK[k] : v ? humanize(v) : "Link"
}
export const projectMediaLabel = (v: string | null | undefined) => {
    const k = normalizeProjectMediaType(v)
    return k ? MEDIA[k] : v ? humanize(v) : ""
}
export const skillCategoryLabel = (v: string | null | undefined) =>
    v && v in SKILL_CATEGORY ? SKILL_CATEGORY[v as SkillCategory] : v ? humanize(v) : ""
export const skillLevelLabel = (v: string | null | undefined) => (v ? humanize(v) : "")
