/**
 * Profile-related types for the Hiring Platform
 * These types handle user profiles and authentication
 */

import type { CompanySocialLinks, CompanyVerificationStatus } from "./company"

// ============================================
// USER PROFILE INTERFACES
// ============================================

export interface UserProfile {
    id: string
    name: string | null
    email: string
    image: string | null
    phone: string | null
    bio: string | null
    createdAt: Date
}

export interface UpdateProfilePayload {
    name?: string
    phone?: string
    bio?: string
    image?: string
    displayName?: string
    jobTitleCustom?: string
}

export interface ChangePasswordPayload {
    currentPassword: string
    newPassword: string
    confirmPassword: string
}

// ============================================
// COMPANY DETAILS (FROM MEMBER PERSPECTIVE)
// ============================================

export interface CompanyDetails {
    id: string
    name: string
    slug: string
    logoUrl: string | null
    coverUrl: string | null
    tagline: string | null
    website: string | null
    description: string | null
    industry: string | null
    companySize: string | null
    foundedYear: number | null
    headquarters: string | null
    socialLinks: CompanySocialLinks | null
    address: string | null
    city: string | null
    state: string | null
    country: string | null
    pincode: string | null
    verificationStatus: CompanyVerificationStatus
    verifiedAt: Date | null
    memberCount: number
    jobCount: number
    createdAt: Date
    updatedAt: Date
}

export interface UpdateCompanyPayload {
    name?: string
    description?: string
    website?: string
    industry?: string
    companySize?: string
    foundedYear?: number
    headquarters?: string
    address?: string
    city?: string
    state?: string
    country?: string
    pincode?: string
    culture?: string
    techStack?: string[]
    benefits?: string[]
    socialLinks?: CompanySocialLinks
}

// ============================================
// PERMISSIONS
// ============================================

// NOTE: Permission type is defined in company.ts to avoid duplication
// Import from company.ts: export type { Permission } from "./company"
