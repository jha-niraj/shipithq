/**
 * Company-related types for the Hiring Platform
 * These types handle company profiles, members, and settings
 */

// ============================================
// ENUMS (Mirror Prisma enums)
// ============================================

export type CompanyMemberRole = 
    | "FOUNDER"
    | "ADMIN"
    | "HIRING_MANAGER"
    | "RECRUITER"
    | "INTERVIEWER"

export type CompanyMemberJobTitle =
    | "CEO"
    | "CTO"
    | "COFOUNDER"
    | "VP_ENGINEERING"
    | "ENGINEERING_MANAGER"
    | "HR_HEAD"
    | "HR_MANAGER"
    | "TALENT_ACQUISITION"
    | "RECRUITER"
    | "HIRING_MANAGER"
    | "TECH_LEAD"
    | "INTERVIEWER"
    | "OTHER"

export type CompanyVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED"

export type MemberInviteStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED"

export type CompanyInvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED"

// ============================================
// COMPANY INTERFACES
// ============================================

export interface CompanySocialLinks {
    linkedin?: string
    twitter?: string
    github?: string
    website?: string
    [key: string]: string | undefined // Index signature for Prisma JSON compatibility
}

export interface CompanyCulture {
    values?: string[]
    workStyle?: string
    teamSize?: string
    description?: string
    [key: string]: string | string[] | undefined // Index signature for Prisma JSON compatibility
}

export interface MediaItem {
    id?: string
    type: "image" | "video" | "cover"
    url: string
    title?: string
    description?: string
    caption?: string
    [key: string]: string | undefined // Index signature for Prisma JSON compatibility
}

export interface CompanyProfile {
    id: string
    name: string
    slug: string
    // Logo field - may be logoUrl in DB
    logo?: string | null
    logoUrl?: string | null
    // Cover image - not in current schema
    coverImage?: string | null
    // Tagline - not in current schema
    tagline?: string | null
    description: string | null
    website: string | null
    industry: string | null
    // Size field - companySize in DB
    size?: string | null
    companySize?: string | null
    // Founded field - foundedYear in DB
    founded?: number | null
    foundedYear?: number | null
    headquarters: string | null
    // Locations - not in current schema
    locations?: string[]
    techStack?: string[] | unknown
    benefits?: string[] | unknown
    culture?: string | CompanyCulture | null
    mediaGallery?: MediaItem[] | unknown
    socialLinks?: CompanySocialLinks | unknown
    // Verification
    verificationStatus?: CompanyVerificationStatus
    isVerified?: boolean
    // Counts
    jobsCount?: number
    membersCount?: number
    // Allow additional fields from Prisma
    [key: string]: unknown
}

export interface UpdateCompanyProfileData {
    name?: string
    description?: string
    website?: string
    industry?: string
    companySize?: string
    foundedYear?: number
    headquarters?: string
    techStack?: string[]
    benefits?: string[]
    culture?: string
    socialLinks?: CompanySocialLinks
}

export interface CompanyStats {
    activeJobs: number
    totalHires: number
    avgTimeToHireDays: number
}

// ============================================
// TEAM MEMBER INTERFACES
// ============================================

export type Permission =
    // Jobs
    | "view_jobs"
    | "post_jobs"
    | "edit_jobs"
    | "delete_jobs"
    | "manage_jobs"
    // Applications
    | "view_applications"
    | "review_candidates"
    | "manage_candidates"
    // Assessments
    | "manage_assessments"
    // Team
    | "manage_members"
    | "manage_team"
    // Company
    | "manage_company"
    | "manage_settings"
    // Billing
    | "manage_billing"
    // Analytics
    | "view_analytics"
    // Interviews
    | "conduct_interviews"

export interface TeamMember {
    id: string
    userId: string
    companyId: string
    /** LEGACY fixed role; permissions come from `roleId` (plan/hiring-app HA-6). */
    role: CompanyMemberRole
    /** The member's company role, and its name and owner flag, for display. */
    roleId: string | null
    roleName: string
    isOwner: boolean
    jobTitle: CompanyMemberJobTitle | null
    jobTitleCustom: string | null
    displayName: string | null
    email: string | null
    phone: string | null
    permissions: Permission[]
    inviteStatus: MemberInviteStatus
    isActive: boolean
    lastActiveAt: Date | null
    createdAt: Date
    updatedAt: Date
    user: {
        id: string
        name: string | null
        email: string
        image: string | null
    }
    jobsPosted?: number
}

export interface UpdateTeamMemberPayload {
    role?: CompanyMemberRole
    jobTitle?: CompanyMemberJobTitle
    jobTitleCustom?: string
    isActive?: boolean
    permissions?: Permission[]
}

export interface InviteTeamMemberPayload {
    email: string
    name?: string
    /** The company role the invitee joins with (plan/hiring-app HA-8). */
    roleId: string
    /** LEGACY; derived from `roleId` when not given. */
    role?: CompanyMemberRole
    jobTitle?: CompanyMemberJobTitle
    permissions?: Permission[]
    message?: string
}

export interface PendingInvite {
    id: string
    email: string
    name: string | null
    role: CompanyMemberRole
    jobTitle: CompanyMemberJobTitle
    inviteCode: string
    status: MemberInviteStatus
    message: string | null
    invitedAt: Date
    expiresAt: Date | null
    invitedBy: {
        id: string
        displayName: string | null
        user: {
            name: string | null
            email: string
        }
    }
}

export interface TeamStats {
    totalMembers: number
    pendingInvites: number
    jobsPosted: number
    candidatesProcessed?: number
}

// ============================================
// MEDIA GALLERY INTERFACES
// ============================================

export interface AddMediaInput {
    type: "image" | "video"
    url: string
    title?: string
    description?: string
}
