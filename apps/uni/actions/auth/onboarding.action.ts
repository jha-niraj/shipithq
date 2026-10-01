"use server"

import { db, users, universities, universityMembers, departments } from "@repo/db"
import { eq, and } from "drizzle-orm"
import { getSession, refreshSession } from "@repo/auth"
import { headers } from "next/headers"
import type {
    UniversityMemberJobTitle,
    UniversityPermission
} from "@/types";

// ============================================
// TYPES
// ============================================

interface UniversityOnboardingData {
    universityName: string;
    website?: string;
    description?: string;
    universityType?: string;
    affiliatedTo?: string;
    accreditation?: string;
    establishedYear?: number;
    emailDomain: string;
    // Asked in onboarding and saved since AUTH-14 (they used to be asked and dropped).
    city?: string;
    state?: string;
    studentCount?: string;
    /** Department names to create, one row each. */
    departments?: string[];
    // User info
    userRole: UniversityMemberJobTitle;
    /** The role's own words when it maps to OTHER (e.g. "Administrative Staff"). */
    jobTitleCustom?: string;
    displayName?: string;
    phone?: string;
}

// Default permissions for HEAD role
const HEAD_PERMISSIONS: UniversityPermission[] = [
    "view_classes",
    "create_classes",
    "edit_classes",
    "delete_classes",
    "create_assignments",
    "edit_assignments",
    "delete_assignments",
    "grade_submissions",
    "view_students",
    "verify_students",
    "manage_student_credits",
    "manage_departments",
    "manage_members",
    "invite_members",
    "manage_university",
    "manage_billing",
    "manage_credits",
    "manage_placements",
    "view_job_applications",
    "view_analytics",
    "view_reports",
];

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Complete onboarding for a new university
 */
export async function completeUniversityOnboarding(data: UniversityOnboardingData) {
    const session = await getSession(headers());

    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    try {
        // Create university slug from name
        const slug = data.universityName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") +
            "-" + Math.random().toString(36).substring(2, 8);

        // Get user email
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { email: true, name: true },
        });

        if (!user) {
            return { success: false, error: "User not found" };
        }

        // Create university
        const universityRows = await db.insert(universities).values({
            name: data.universityName,
            slug,
            website: data.website || null,
            description: data.description || null,
            universityType: data.universityType as "PUBLIC" | "PRIVATE" | "DEEMED" | "AUTONOMOUS" | "STATE" | "CENTRAL" | "AFFILIATED" | "COMMUNITY_COLLEGE" | "TECHNICAL_INSTITUTE" | "OTHER" | undefined || null,
            affiliatedTo: data.affiliatedTo || null,
            accreditation: data.accreditation || null,
            establishedYear: data.establishedYear || null,
            emailDomain: data.emailDomain,
            city: data.city?.trim() || null,
            state: data.state?.trim() || null,
            studentCount: data.studentCount || null,
            createdByUserId: userId,
            verificationStatus: "PENDING",
        }).returning();

        const university = universityRows[0];
        if (!university) {
            return { success: false, error: "Failed to create university" };
        }

        // Create university member (the user who registered as HEAD)
        await db.insert(universityMembers).values({
            userId,
            universityId: university.id,
            email: user.email,
            displayName: data.displayName || user.name,
            phone: data.phone || null,
            role: "HEAD",
            jobTitle: data.userRole,
            jobTitleCustom: data.jobTitleCustom || null,
            inviteStatus: "ACCEPTED",
            acceptedAt: new Date(),
            permissions: HEAD_PERMISSIONS,
        });

        // The departments picked in onboarding, one row each (AUTH-14).
        const names = [...new Set((data.departments ?? []).map((d) => d.trim()).filter(Boolean))]
        if (names.length) {
            await db.insert(departments).values(names.map((name) => ({ universityId: university.id, name }))).onConflictDoNothing()
        }

        // Mark user onboarding as completed and set role to UNI
        await db.update(users).set({
            onboardingCompleted: true,
            role: "UNI",
        }).where(eq(users.id, userId));

        // Rewrite better-auth's cached session cookie, or the middleware keeps reading
        // `onboarding: false` and sends /home straight back here (as apps/main does).
        await refreshSession(await headers());

        return { success: true, universityId: university.id, slug };
    } catch (error) {
        console.error("University onboarding error:", error);
        return { success: false, error: "Failed to complete onboarding" };
    }
}

/**
 * Get current user's university
 */
export async function getUserUniversity() {
    const session = await getSession(headers());

    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const universityMember = await db.query.universityMembers.findFirst({
            where: eq(universityMembers.userId, session.user.id),
            with: { university: true },
        });

        if (!universityMember) {
            return { success: false, error: "No university found" };
        }

        return {
            success: true,
            data: {
                member: universityMember,
                university: universityMember.university,
            }
        };
    } catch (error) {
        console.error("Get university error:", error);
        return { success: false, error: "Failed to fetch university" };
    }
}

/**
 * Get current user's university member details
 */
export async function getCurrentMemberDetails() {
    const session = await getSession(headers());

    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const member = await db.query.universityMembers.findFirst({
            where: and(
                eq(universityMembers.userId, session.user.id),
                eq(universityMembers.isActive, true),
            ),
            with: {
                university: { columns: { id: true, name: true } },
                department: { columns: { id: true, name: true } },
            },
        });

        if (!member) {
            return { success: false, error: "Member not found" };
        }

        return {
            success: true,
            member: {
                id: member.id,
                role: member.role,
                jobTitle: member.jobTitle,
                displayName: member.displayName,
                permissions: member.permissions,
                university: member.university,
                department: member.department,
            },
        };
    } catch (error) {
        console.error("Get current member details error:", error);
        return { success: false, error: "Failed to fetch member details" };
    }
}

// Export alias for backward compatibility with onboarding page
export const completeOnboarding = completeUniversityOnboarding;
