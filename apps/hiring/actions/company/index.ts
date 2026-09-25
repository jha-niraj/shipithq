// Company Actions - Server actions for company management
"use server"

import { db, companies, companyMembers, jobs, jobApplications } from "@repo/db"
import { requirePermission } from "@/lib/permissions"
import { eq, and, count } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type {
    CompanySocialLinks, MediaItem, AddMediaInput
} from "@/types"

// Note: CompanyProfile is imported from @/types

// Get company profile
export async function getCompanyProfile() {
    try {
        const auth = await requirePermission()
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const company = await db.query.companies.findFirst({
            where: eq(companies.id, member.companyId),
            with: {
                members: { columns: { id: true } }
            }
        })

        if (!company) return { success: false, error: "Company not found" }

        // Get jobs count separately since jobs relation is not defined on companies
        const jobsRows = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))

        return {
            success: true,
            data: {
                ...company,
                jobsCount: jobsRows.length,
                membersCount: company.members.length
            }
        }
    } catch (error) {
        console.error("Error fetching company profile:", error)
        return { success: false, error: "Failed to fetch company profile" }
    }
}

// Update company profile
export async function updateCompanyProfile(data: {
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
}) {
    try {
        const auth = await requirePermission("edit_company")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const updatedRows = await db.update(companies)
            .set({
                name: data.name,
                description: data.description,
                website: data.website,
                industry: data.industry,
                companySize: data.companySize,
                foundedYear: data.foundedYear,
                headquarters: data.headquarters,
                techStack: data.techStack,
                benefits: data.benefits,
                culture: data.culture,
                socialLinks: data.socialLinks
            })
            .where(eq(companies.id, member.companyId))
            .returning()

        const updated = updatedRows[0]
        if (!updated) return { success: false, error: "Failed to update profile" }

        revalidatePath("/company")
        revalidatePath(`/companies/${updated.slug}`)
        return { success: true, data: updated }
    } catch (error) {
        console.error("Error updating company profile:", error)
        return { success: false, error: "Failed to update profile" }
    }
}

// Update company logo
export async function updateCompanyLogo(logoUrl: string) {
    try {
        const auth = await requirePermission("edit_company")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const [updated] = await db.update(companies)
            .set({ logoUrl })
            .where(eq(companies.id, member.companyId))
            .returning()

        revalidatePath("/company")
        return { success: true, data: updated }
    } catch (error) {
        console.error("Error updating logo:", error)
        return { success: false, error: "Failed to update logo" }
    }
}

// Update company cover image - stores in mediaGallery with type "cover"
export async function updateCompanyCover(coverUrl: string) {
    try {
        const auth = await requirePermission("edit_company")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        // Get existing media gallery and update/add cover image
        const company = await db.query.companies.findFirst({
            where: eq(companies.id, member.companyId)
        })
        if (!company) return { success: false, error: "Company not found" }

        const existingGallery = (company.mediaGallery as MediaItem[] | null) ?? []

        // Filter out existing cover and add new one
        const updatedGallery = existingGallery.filter((item: MediaItem) => item.type !== "cover")
        updatedGallery.unshift({ url: coverUrl, type: "cover", caption: "Company cover image" })

        const [updated] = await db.update(companies)
            .set({ mediaGallery: updatedGallery })
            .where(eq(companies.id, member.companyId))
            .returning()

        revalidatePath("/company")
        return { success: true, data: updated }
    } catch (error) {
        console.error("Error updating cover:", error)
        return { success: false, error: "Failed to update cover" }
    }
}

// Add media to gallery
export async function addMediaToGallery(media: AddMediaInput) {
    try {
        const auth = await requirePermission("edit_company")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const company = await db.query.companies.findFirst({
            where: eq(companies.id, member.companyId)
        })
        if (!company) return { success: false, error: "Company not found" }

        const currentGallery = (company.mediaGallery as MediaItem[]) || []
        const newItem: MediaItem = { ...media, id: Date.now().toString() }
        const newGallery = [...currentGallery, newItem]

        const [updated] = await db.update(companies)
            .set({ mediaGallery: newGallery })
            .where(eq(companies.id, member.companyId))
            .returning()

        revalidatePath("/company")
        return { success: true, data: updated }
    } catch (error) {
        console.error("Error adding media:", error)
        return { success: false, error: "Failed to add media" }
    }
}

// Remove media from gallery
export async function removeMediaFromGallery(mediaId: string) {
    try {
        const auth = await requirePermission("edit_company")
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const company = await db.query.companies.findFirst({
            where: eq(companies.id, member.companyId)
        })
        if (!company) return { success: false, error: "Company not found" }

        const currentGallery = (company.mediaGallery as MediaItem[]) || []
        const newGallery = currentGallery.filter((m) => m.id !== mediaId)

        const [updated] = await db.update(companies)
            .set({ mediaGallery: newGallery })
            .where(eq(companies.id, member.companyId))
            .returning()

        revalidatePath("/company")
        return { success: true, data: updated }
    } catch (error) {
        console.error("Error removing media:", error)
        return { success: false, error: "Failed to remove media" }
    }
}

// Get company public stats
export async function getCompanyPublicStats() {
    try {
        const auth = await requirePermission()
        if (!auth.ok) return { success: false, error: auth.error }
        const member = auth.ctx.member

        const activeJobsRows = await db
            .select({ count: count() })
            .from(jobs)
            .where(and(eq(jobs.companyId, member.companyId), eq(jobs.status, "ACTIVE")))

        const allJobIds = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.companyId, member.companyId))
        const jobIds = allJobIds.map(j => j.id)

        let totalHires = 0
        if (jobIds.length > 0) {
            const { inArray } = await import("drizzle-orm")
            const hiresRows = await db
                .select({ count: count() })
                .from(jobApplications)
                .where(and(inArray(jobApplications.jobId, jobIds), eq(jobApplications.status, "HIRED")))
            totalHires = hiresRows[0]?.count ?? 0
        }

        const company = await db.query.companies.findFirst({
            where: eq(companies.id, member.companyId),
            columns: { avgTimeToHireDays: true }
        })

        return {
            success: true,
            data: {
                activeJobs: activeJobsRows[0]?.count ?? 0,
                totalHires,
                avgTimeToHireDays: company?.avgTimeToHireDays || 0
            }
        }
    } catch (error) {
        console.error("Error fetching stats:", error)
        return { success: false, error: "Failed to fetch stats" }
    }
}
