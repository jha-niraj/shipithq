"use server"

import { db, users, companies, companyMembers, companyRoles, withTransaction, ROLE_PRESETS, type RolePresetKey } from "@repo/db"
import { eq, inArray } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { checkWorkEmail } from "@repo/auth/work-email"
import { getMyPendingInvitation } from "@/actions/team/invite.action"
import { headers } from "next/headers"

/**
 * Get pending company info from user registration
 * This fetches the company name that was entered during registration
 */
export async function getPendingCompanyInfo() {
    const session = await getSession(headers())

    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.user.id),
            columns: {
                company: true,
                name: true,
                email: true
            }
        })

        if (!user) {
            return { success: false, error: "User not found" }
        }

        // Generate a suggested website URL from company name
        const suggestedWebsite = user.company
            ? `https://${user.company.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`
            : null

        return {
            success: true,
            data: {
                companyName: user.company || "",
                userName: user.name || "",
                userEmail: user.email,
                suggestedWebsite
            }
        }
    } catch (error) {
        console.error("Get pending company info error:", error)
        return { success: false, error: "Failed to fetch company info" }
    }
}

interface OnboardingData {
    companyName: string
    slug: string
    website?: string
    industry?: string
    companySize?: string
    description?: string
    userRole: string
    hiringGoals?: string[]
    city?: string
    state?: string
    country?: string
    inviteBy?: string // University slug for referral tracking
}

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean; suggestions?: string[] }> {
    if (!slug || slug.length < 2) {
        return { available: false }
    }

    try {
        const existingCompany = await db.query.companies.findFirst({
            where: eq(companies.slug, slug),
            columns: { id: true }
        })

        if (!existingCompany) {
            return { available: true }
        }

        // Generate suggestions if slug is taken
        const suggestions: string[] = []
        const baseSlugs = [
            `${slug}-hq`,
            `${slug}-team`,
            `${slug}-inc`,
            `${slug}-${Math.floor(Math.random() * 100)}`,
            `${slug}-${new Date().getFullYear()}`
        ]

        for (const suggestion of baseSlugs) {
            const exists = await db.query.companies.findFirst({
                where: eq(companies.slug, suggestion),
                columns: { id: true }
            })
            if (!exists) {
                suggestions.push(suggestion)
            }
            if (suggestions.length >= 3) break
        }

        return { available: false, suggestions }
    } catch {
        return { available: false }
    }
}

/** "hr@mail.acme.io" -> ["mail.acme.io", "acme.io"]: each suffix a company could own. */
function domainCandidates(domain: string): string[] {
    const parts = domain.split(".")
    const out: string[] = []
    for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join("."))
    return out
}

/** The company already on ShipItHQ for this email's domain, if any (plan/hiring-app HA-5). */
async function companyForEmailDomain(domain: string) {
    return db.query.companies.findFirst({
        where: inArray(companies.websiteDomain, domainCandidates(domain)),
        columns: { id: true, name: true },
    })
}

const ASK_FOR_INVITE = (name: string) =>
    `${name} is already on ShipItHQ. Ask an admin there to invite you; the invite arrives by email.`

/**
 * What onboarding should show before the form (plan/hiring-app HA-5): the form,
 * or "ask for an invite" when the email's company already exists, or the
 * work-email message.
 */
export async function getOnboardingEligibility(): Promise<
    | { status: "ok" }
    | { status: "invited"; code: string; companyName: string; roleName: string }
    | { status: "company_exists"; companyName: string; message: string }
    | { status: "work_email_required"; message: string }
    | { status: "already_member" }
    | { status: "unauthorized" }
> {
    const session = await getSession(headers())
    if (!session?.user?.id) return { status: "unauthorized" }
    const workEmail = checkWorkEmail(session.user.email ?? "")
    if (!workEmail.ok) return { status: "work_email_required", message: workEmail.message }
    const member = await db.query.companyMembers.findFirst({
        where: eq(companyMembers.userId, session.user.id),
        columns: { id: true },
    })
    if (member) return { status: "already_member" }
    // An invitation wins over everything else (HA-8): someone who registered from
    // an invite link lands here after verifying, and should join, not create.
    const invite = await getMyPendingInvitation()
    if (invite) return { status: "invited", ...invite }
    const existing = await companyForEmailDomain(workEmail.domain)
    if (existing) return { status: "company_exists", companyName: existing.name, message: ASK_FOR_INVITE(existing.name) }
    return { status: "ok" }
}

/**
 * Creates the company with its creator as Owner (plan/hiring-app HA-5).
 *
 * - The creator is always the Owner (FOUNDER until HA-6's roles land),
 *   whatever job title they picked. Choosing "Recruiter" used to make the
 *   person who created the company a mere recruiter of it.
 * - One company per person: someone already in a company cannot make another.
 * - A domain that already has a company gets "ask for an invite", not a second
 *   company. The unique `website_domain` also settles two people from a new
 *   domain onboarding at the same moment: one wins, the other is told to ask.
 * - The company and the membership are written in one transaction, so a
 *   failure never leaves a company with no owner.
 */
export async function completeOnboarding(data: OnboardingData) {
    const session = await getSession(headers())

    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    const userId = session.user.id

    // A company email, checked on the server (plan/hiring-app HA-4). The sign-up
    // route checks it too, but a session made on apps/main (a student's gmail)
    // is valid here as well, so this is the check that actually guards company
    // creation.
    const workEmail = checkWorkEmail(session.user.email ?? "")
    if (!workEmail.ok) {
        return { success: false, error: workEmail.message }
    }

    try {
        const alreadyMember = await db.query.companyMembers.findFirst({
            where: eq(companyMembers.userId, userId),
            columns: { id: true },
        })
        if (alreadyMember) {
            return { success: false, error: "You already belong to a company on ShipItHQ." }
        }

        const existingForDomain = await companyForEmailDomain(workEmail.domain)
        if (existingForDomain) {
            return { success: false, error: ASK_FOR_INVITE(existingForDomain.name), code: "COMPANY_EXISTS" as const }
        }

        const slugTaken = await db.query.companies.findFirst({
            where: eq(companies.slug, data.slug),
            columns: { id: true }
        })
        if (slugTaken) {
            return { success: false, error: "This URL is already taken. Please choose a different one." }
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { email: true, name: true }
        })
        if (!user) {
            return { success: false, error: "User not found" }
        }

        const company = await withTransaction(async (tx) => {
            const [created] = await tx.insert(companies).values({
                name: data.companyName,
                slug: data.slug,
                website: data.website || null,
                websiteDomain: workEmail.domain,
                industry: data.industry || null,
                companySize: data.companySize || null,
                description: data.description || null,
                city: data.city || null,
                state: data.state || null,
                country: data.country || null,
                createdByUserId: userId,
                verificationStatus: "PENDING"
            }).returning({ id: companies.id })
            if (!created) throw new Error("Failed to create company")

            // The company's roles (plan/hiring-app HA-6): the fixed Owner and the
            // three editable presets. The creator is the Owner.
            const roles = await tx.insert(companyRoles).values(
                (Object.keys(ROLE_PRESETS) as RolePresetKey[]).map((key) => ({
                    companyId: created.id,
                    name: ROLE_PRESETS[key].name,
                    permissions: ROLE_PRESETS[key].permissions,
                    isOwner: key === "OWNER",
                    presetKey: key,
                    updatedAt: new Date(),
                })),
            ).returning({ id: companyRoles.id, presetKey: companyRoles.presetKey })
            const ownerRoleId = roles.find((role) => role.presetKey === "OWNER")?.id
            if (!ownerRoleId) throw new Error("Failed to create the Owner role")

            await tx.insert(companyMembers).values({
                userId,
                companyId: created.id,
                email: user.email,
                displayName: user.name,
                role: "FOUNDER",
                roleId: ownerRoleId,
                jobTitle: data.userRole as "CEO" | "CTO" | "COFOUNDER" | "VP_ENGINEERING" | "HR_HEAD" | "HR_MANAGER" | "RECRUITER" | "HIRING_MANAGER" | "OTHER",
                inviteStatus: "ACCEPTED",
                acceptedAt: new Date(),
                permissions: ["view_jobs", "post_jobs", "view_applications", "review_candidates", "manage_members", "manage_company", "manage_billing"],
            })

            // `user.onboardingCompleted` is NOT set: it belongs to apps/main's
            // student onboarding. Here, a membership is what "onboarded" means.
            return created
        })

        return { success: true, companyId: company.id }
    } catch (error: unknown) {
        // The unique domain: someone from the same domain onboarded a moment earlier.
        const text = error instanceof Error ? `${error.message} ${String((error as { cause?: unknown }).cause ?? "")}` : String(error)
        if (/website_domain/i.test(text)) {
            const winner = await companyForEmailDomain(workEmail.domain).catch(() => null)
            return { success: false, error: ASK_FOR_INVITE(winner?.name ?? "Your company"), code: "COMPANY_EXISTS" as const }
        }
        console.error("Onboarding error:", error instanceof Error ? error.message : error)
        return { success: false, error: "Failed to complete onboarding" }
    }
}

export async function getUserCompany() {
    const session = await getSession(headers())

    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const companyMember = await db.query.companyMembers.findFirst({
            where: eq(companyMembers.userId, session.user.id),
            with: { company: true }
        })

        if (!companyMember) {
            return { success: false, error: "No company found" }
        }

        return { success: true, data: companyMember }
    } catch (error) {
        console.error("Get company error:", error)
        return { success: false, error: "Failed to fetch company" }
    }
}
