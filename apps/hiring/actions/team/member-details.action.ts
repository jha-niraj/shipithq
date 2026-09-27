"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { companyMembers, db, users } from "@repo/db"
import { recordOptions } from "@repo/db/options"
import { requirePermission } from "@/lib/permissions"
import { PUBLIC_PREFIX, publicUrl, putObject, r2Configured } from "@/lib/r2"
import { MEMBER_TITLE_WORDS, titleToEnum } from "@/lib/member-titles"

/*
 * A member's own details (plan/hiring-ui HU-14): the first-run step after an
 * invite is accepted, and later the profile. Job title (a choice with "Other",
 * kept in the shared dataset), LinkedIn, portfolio, photo, and whether they show
 * on the company's People tab to other companies (on by default, Niraj 2026-09-28).
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

export interface MemberDetails {
    name: string
    image: string | null
    title: string
    linkedinUrl: string
    portfolioUrl: string
    showOnPeople: boolean
    companyName: string
}

const url = (v: string) => {
    const t = v.trim()
    if (!t) return null
    const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`
    try { return new URL(withScheme).toString().slice(0, 300) } catch { return undefined }
}

export async function getMemberDetails(): Promise<Result<MemberDetails>> {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    const m = await db.query.companyMembers.findFirst({
        where: eq(companyMembers.id, auth.ctx.memberId),
        with: { user: { columns: { name: true, image: true } }, company: { columns: { name: true } } },
    })
    if (!m) return { success: false, error: "Not found" }
    return {
        success: true,
        data: {
            name: m.displayName || m.user?.name || "",
            image: m.user?.image ?? null,
            title: m.jobTitle === "OTHER" ? m.jobTitleCustom ?? "" : MEMBER_TITLE_WORDS[m.jobTitle] ?? "",
            linkedinUrl: m.linkedinUrl ?? "",
            portfolioUrl: m.portfolioUrl ?? "",
            showOnPeople: m.showOnPeople,
            companyName: m.company?.name ?? "",
        },
    }
}

export async function saveMemberDetails(input: { title: string; linkedinUrl: string; portfolioUrl: string; showOnPeople: boolean }): Promise<Result<null>> {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    const linkedin = url(input.linkedinUrl)
    const portfolio = url(input.portfolioUrl)
    if (linkedin === undefined) return { success: false, error: "That LinkedIn link doesn't look right" }
    if (portfolio === undefined) return { success: false, error: "That portfolio link doesn't look right" }
    if (linkedin && !/linkedin\.com\//i.test(linkedin)) return { success: false, error: "The LinkedIn link should be a linkedin.com address" }
    const title = input.title.replace(/\s+/g, " ").trim().slice(0, 60)
    const mapped = titleToEnum(title)
    try {
        await db.update(companyMembers).set({
            jobTitle: mapped.jobTitle,
            jobTitleCustom: mapped.jobTitleCustom,
            linkedinUrl: linkedin,
            portfolioUrl: portfolio,
            showOnPeople: input.showOnPeople,
        }).where(eq(companyMembers.id, auth.ctx.memberId))
        if (title) await recordOptions("member_title", [title], `company:${auth.ctx.companyId}`).catch(() => null)
        revalidatePath(`/c/${auth.ctx.member.company.slug}`)
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("saveMemberDetails:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not save your details" }
    }
}

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }

/** The member's photo, to R2's public prefix, set as their user image (the same picture across ShipItHQ). */
export async function uploadMemberPhoto(formData: FormData): Promise<Result<{ url: string }>> {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    const file = formData.get("file")
    if (!(file instanceof File)) return { success: false, error: "Pick a photo" }
    const ext = PHOTO_TYPES[file.type]
    if (!ext) return { success: false, error: "Use a JPG, PNG or WebP image" }
    if (file.size > 5 * 1024 * 1024) return { success: false, error: "Photos up to 5 MB" }
    if (!r2Configured()) return { success: false, error: "Image storage isn't set up" }
    try {
        const key = `${PUBLIC_PREFIX}users/${auth.ctx.userId}/photo-${Date.now()}.${ext}`
        await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type)
        const photo = publicUrl(key)
        await db.update(users).set({ image: photo }).where(eq(users.id, auth.ctx.userId))
        return { success: true, data: { url: photo } }
    } catch (error: unknown) {
        console.error("uploadMemberPhoto:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not upload the photo" }
    }
}
