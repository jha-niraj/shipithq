// Company Actions - Server actions for company management
"use server"

import { db, companies } from "@repo/db"
import { recordOptions } from "@repo/db/options"
import { requirePermission } from "@/lib/permissions"
import { PUBLIC_PREFIX, publicUrl, putObject, r2Configured } from "@/lib/r2"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { CompanySocialLinks, MediaItem } from "@/types"

// Update company profile
export async function updateCompanyProfile(data: {
    name?: string
    tagline?: string
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
                tagline: data.tagline === undefined ? undefined : data.tagline.trim().slice(0, 120) || null,
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

        // New values join the shared option dataset (plan/hiring-ui HU-2), best effort.
        const org = `company:${member.companyId}`
        await Promise.all([
            data.industry ? recordOptions("industry", [data.industry], org) : null,
            data.headquarters ? recordOptions("city", [data.headquarters], org) : null,
            data.techStack?.length ? recordOptions("tech", data.techStack, org) : null,
            data.benefits?.length ? recordOptions("benefit", data.benefits, org) : null,
        ]).catch((error: unknown) => console.error("updateCompanyProfile options:", error instanceof Error ? error.message : error))

        revalidatePath(`/c/${updated.slug}`)
        return { success: true, data: updated }
    } catch (error: unknown) {
        console.error("Error updating company profile:", error)
        return { success: false, error: "Failed to update profile" }
    }
}

// Update company cover image (plan/hiring-ui HU-11: its own column, no longer a gallery item)
export async function updateCompanyCover(coverUrl: string | null) {
    try {
        const auth = await requirePermission("edit_company")
        if (!auth.ok) return { success: false, error: auth.error }
        const [updated] = await db.update(companies)
            .set({ coverUrl })
            .where(eq(companies.id, auth.ctx.companyId))
            .returning({ slug: companies.slug })
        if (updated) revalidatePath(`/c/${updated.slug}`)
        return { success: true }
    } catch (error: unknown) {
        console.error("Error updating cover:", error)
        return { success: false, error: "Failed to update cover" }
    }
}

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }
const IMAGE_MAX_BYTES = 5 * 1024 * 1024

/**
 * Upload the company's cover, logo or a Life photo to R2 under the public prefix
 * (plan/hiring-ui HU-11) and put it on the company. Keys carry a timestamp, so a
 * new cover never overwrites a cached old one.
 */
export async function uploadCompanyImage(formData: FormData): Promise<{ success: true; url: string } | { success: false; error: string }> {
    try {
        const auth = await requirePermission("edit_company")
        if (!auth.ok) return { success: false, error: auth.error }
        const kind = formData.get("kind")
        const file = formData.get("file")
        if (kind !== "cover" && kind !== "logo" && kind !== "life") return { success: false, error: "Unknown image kind" }
        if (!(file instanceof File)) return { success: false, error: "Pick an image" }
        const ext = IMAGE_TYPES[file.type]
        if (!ext) return { success: false, error: "Use a JPG, PNG or WebP image" }
        if (file.size > IMAGE_MAX_BYTES) return { success: false, error: "Images up to 5 MB" }
        if (!r2Configured()) return { success: false, error: "Image storage isn't set up" }

        const companyId = auth.ctx.companyId
        // Checked before the upload, so a refused photo leaves nothing behind in R2.
        const gallery = kind === "life"
            ? (((await db.query.companies.findFirst({ where: eq(companies.id, companyId), columns: { mediaGallery: true } }))?.mediaGallery as MediaItem[] | null) ?? []).filter((m) => m.type !== "cover")
            : []
        if (gallery.length >= 24) return { success: false, error: "Life holds up to 24 photos; remove one first" }

        const key = `${PUBLIC_PREFIX}companies/${companyId}/${kind}-${Date.now()}.${ext}`
        await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type)
        const url = publicUrl(key)

        if (kind === "life") {
            await db.update(companies).set({ mediaGallery: [...gallery, { id: `${Date.now()}`, type: "image", url }] }).where(eq(companies.id, companyId))
        } else {
            await db.update(companies).set(kind === "cover" ? { coverUrl: url } : { logoUrl: url }).where(eq(companies.id, companyId))
        }
        revalidatePath(`/c/${auth.ctx.member.company.slug}`)
        return { success: true, url }
    } catch (error: unknown) {
        console.error("uploadCompanyImage:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not upload the image" }
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

        revalidatePath(`/c/${auth.ctx.member.company.slug}`)
        return { success: true, data: updated }
    } catch (error: unknown) {
        console.error("Error removing media:", error)
        return { success: false, error: "Failed to remove media" }
    }
}

