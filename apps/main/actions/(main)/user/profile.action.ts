"use server"

import { getSession } from '@repo/auth';
import { headers } from 'next/headers';
import {
    db, users, workExperiences, portfolioProjects, projectLinks, projectMedia,
    socialLinks, userEducations, skills, skillEndorsements, certifications,
    userProfiles, profileViews, achievements, recentActivities,
    follow, userProjectV2Progress,
    withTransaction
} from "@repo/db";
import { revalidatePath } from "next/cache";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import {
    normalizeProjectLinkType, normalizeProjectMediaType, normalizeProjectStatus,
    normalizeProjectType, normalizeProjectVisibility,
} from "@repo/db/profile-values";
import { loadPublicProfile, profileStats, type PublicProfileResult } from "@/lib/profile/read";
import { PROFILE_LIMITS } from "@/lib/profile/limits";

export type ProfileTheme = "OCEAN_BLUE" | "SUNSET_ORANGE" | "FOREST_GREEN" | "PURPLE_DREAM" | "DARK_MODE";
export type ProfileLayout = "DEFAULT" | "MINIMAL" | "SHOWCASE" | "PORTFOLIO";
export type ProfileVisibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

// ================= WORK EXPERIENCE ACTIONS =================

export async function getWorkExperiences() {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required", data: [] };
        }

        const experiences = await db.query.workExperiences.findMany({
            where: eq(workExperiences.userId, session.user.id),
            orderBy: [desc(workExperiences.isCurrentlyWorking), desc(workExperiences.startDate)]
        });

        return { success: true, data: experiences };
    } catch (error) {
        console.error("Error fetching work experiences:", error);
        return { success: false, message: "Failed to fetch work experiences", data: [] };
    }
}

export async function addWorkExperience(data: {
    companyName: string;
    companyLogo?: string;
    roleTitle: string;
    companyWebsite?: string;
    description?: string;
    bulletPoints?: string[];
    startDate: Date;
    endDate?: Date;
    isCurrentlyWorking: boolean;
}) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required" };
        }

        const [experience] = await db.insert(workExperiences).values({
            userId: session.user.id,
            ...data
        }).returning();

        revalidatePath("/profile");
        return { success: true, message: "Work experience added successfully", data: experience };
    } catch (error) {
        console.error("Error adding work experience:", error);
        return { success: false, message: "Failed to add work experience" };
    }
}

export async function updateWorkExperience(id: string, data: {
    companyName?: string;
    companyLogo?: string;
    roleTitle?: string;
    companyWebsite?: string;
    description?: string;
    bulletPoints?: string[];
    startDate?: Date;
    /** `null` clears it - `undefined` would leave the old date in place. */
    endDate?: Date | null;
    isCurrentlyWorking?: boolean;
}) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required" };
        }

        // Verify ownership
        const existing = await db.query.workExperiences.findFirst({
            where: eq(workExperiences.id, id),
            columns: { userId: true }
        });

        if (!existing || existing.userId !== session.user.id) {
            return { success: false, message: "Unauthorized" };
        }

        const [experience] = await db.update(workExperiences).set(data).where(eq(workExperiences.id, id)).returning();

        revalidatePath("/profile");
        return { success: true, message: "Work experience updated successfully", data: experience };
    } catch (error) {
        console.error("Error updating work experience:", error);
        return { success: false, message: "Failed to update work experience" };
    }
}

export async function deleteWorkExperience(id: string) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required" };
        }

        // Verify ownership
        const existing = await db.query.workExperiences.findFirst({
            where: eq(workExperiences.id, id),
            columns: { userId: true }
        });

        if (!existing || existing.userId !== session.user.id) {
            return { success: false, message: "Unauthorized" };
        }

        await db.delete(workExperiences).where(eq(workExperiences.id, id));

        revalidatePath("/profile");
        return { success: true, message: "Work experience deleted successfully" };
    } catch (error) {
        console.error("Error deleting work experience:", error);
        return { success: false, message: "Failed to delete work experience" };
    }
}

// ================= PORTFOLIO PROJECT ACTIONS =================

type ProjectLinkInput = { linkType: string; url: string; description?: string | null };
type ProjectMediaInput = { mediaUrl: string; mediaType: string; caption?: string | null };

/**
 * One stored spelling per value (plan/profile PRF-7). Every writer goes through
 * here, so a caller passing "Public", "LIVE SITE" or "Image" still stores the
 * canonical value. A custom project type is kept as typed.
 */
function projectValues<T extends { status?: string; visibility?: string; projectType?: string }>(data: T): T {
    const out = { ...data };
    if (data.status !== undefined) out.status = normalizeProjectStatus(data.status) ?? "IN_PROGRESS";
    if (data.visibility !== undefined) out.visibility = normalizeProjectVisibility(data.visibility) ?? "PUBLIC";
    if (data.projectType !== undefined) out.projectType = normalizeProjectType(data.projectType) ?? data.projectType.trim();
    return out;
}

/** Rows with no URL are the sheet's empty starter rows, not links. */
function projectLinkRows(projectId: string, links: ProjectLinkInput[]) {
    return links
        .filter((l) => l.url?.trim())
        .map((l) => ({
            projectId,
            linkType: normalizeProjectLinkType(l.linkType) ?? "LIVE_SITE",
            url: l.url.trim(),
            description: l.description?.trim() || null,
        }));
}

function projectMediaRows(projectId: string, media: ProjectMediaInput[]) {
    return media
        .filter((m) => m.mediaUrl?.trim())
        .map((m) => ({
            projectId,
            mediaUrl: m.mediaUrl.trim(),
            mediaType: normalizeProjectMediaType(m.mediaType) ?? "IMAGE",
            caption: m.caption?.trim() || null,
        }));
}

export async function getPortfolioProjects() {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required", data: [] };
        }

        const projects = await db.query.portfolioProjects.findMany({
            where: eq(portfolioProjects.userId, session.user.id),
            with: {
                links: true,
                media: true
            },
            orderBy: [desc(portfolioProjects.startDate)]
        });

        return { success: true, data: projects };
    } catch (error) {
        console.error("Error fetching portfolio projects:", error);
        return { success: false, message: "Failed to fetch portfolio projects", data: [] };
    }
}

export async function addPortfolioProject(data: {
    projectName: string;
    projectType: string;
    description?: string;
    bulletPoints?: string[];
    status: string;
    visibility: string;
    technologies: string[];
    startDate: Date;
    endDate?: Date;
    thumbnailUrl?: string;
    links?: { linkType: string; url: string; description?: string | null }[];
    media?: { mediaUrl: string; mediaType: string; caption?: string | null }[];
}) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required" };
        }

        const { links, media, ...projectData } = data;

        const project = await withTransaction(async (tx) => {
            const [created] = await tx.insert(portfolioProjects).values({
                userId: session.user.id,
                ...projectValues(projectData),
            }).returning();
            const linkRows = projectLinkRows(created!.id, links ?? []);
            const mediaRows = projectMediaRows(created!.id, media ?? []);
            if (linkRows.length) await tx.insert(projectLinks).values(linkRows);
            if (mediaRows.length) await tx.insert(projectMedia).values(mediaRows);
            return created!;
        });

        const fullProject = await db.query.portfolioProjects.findFirst({
            where: eq(portfolioProjects.id, project!.id),
            with: { links: true, media: true }
        });

        revalidatePath("/profile");
        return { success: true, message: "Project added successfully", data: fullProject };
    } catch (error) {
        console.error("Error adding portfolio project:", error);
        return { success: false, message: "Failed to add project" };
    }
}

export async function updatePortfolioProject(id: string, data: {
    projectName?: string;
    projectType?: string;
    description?: string;
    bulletPoints?: string[];
    status?: string;
    visibility?: string;
    technologies?: string[];
    startDate?: Date;
    /** `null` clears it - `undefined` would leave the old date in place. */
    endDate?: Date | null;
    thumbnailUrl?: string;
    links?: { linkType: string; url: string; description?: string | null }[];
    media?: { mediaUrl: string; mediaType: string; caption?: string | null }[];
}) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required" };
        }

        const existing = await db.query.portfolioProjects.findFirst({
            where: eq(portfolioProjects.id, id),
            columns: { userId: true }
        });

        if (!existing || existing.userId !== session.user.id) {
            return { success: false, message: "Unauthorized" };
        }

        const { links, media, ...projectData } = data;

        await withTransaction(async (tx) => {
            if (Object.keys(projectData).length > 0) {
                await tx.update(portfolioProjects).set(projectValues(projectData)).where(eq(portfolioProjects.id, id));
            }

            if (links !== undefined) {
                await tx.delete(projectLinks).where(eq(projectLinks.projectId, id));
                const linkRows = projectLinkRows(id, links);
                if (linkRows.length > 0) await tx.insert(projectLinks).values(linkRows);
            }

            if (media !== undefined) {
                await tx.delete(projectMedia).where(eq(projectMedia.projectId, id));
                const mediaRows = projectMediaRows(id, media);
                if (mediaRows.length > 0) await tx.insert(projectMedia).values(mediaRows);
            }
        });

        const project = await db.query.portfolioProjects.findFirst({
            where: eq(portfolioProjects.id, id),
            with: { links: true, media: true }
        });

        revalidatePath("/profile");
        revalidatePath("/ai/resume");
        return { success: true, message: "Project updated successfully", data: project };
    } catch (error) {
        console.error("Error updating portfolio project:", error);
        return { success: false, message: "Failed to update project" };
    }
}

export async function deletePortfolioProject(id: string) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required" };
        }

        // Verify ownership
        const existing = await db.query.portfolioProjects.findFirst({
            where: eq(portfolioProjects.id, id),
            columns: { userId: true }
        });

        if (!existing || existing.userId !== session.user.id) {
            return { success: false, message: "Unauthorized" };
        }

        await db.delete(portfolioProjects).where(eq(portfolioProjects.id, id));

        revalidatePath("/profile");
        return { success: true, message: "Project deleted successfully" };
    } catch (error) {
        console.error("Error deleting portfolio project:", error);
        return { success: false, message: "Failed to delete project" };
    }
}

// ================= SOCIAL LINK ACTIONS =================

export async function getSocialLinks() {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required", data: [] };
        }

        const links = await db.query.socialLinks.findMany({
            where: eq(socialLinks.userId, session.user.id),
            orderBy: [asc(socialLinks.order), desc(socialLinks.createdAt)]
        });

        return { success: true, data: links };
    } catch (error) {
        console.error("Error fetching social links:", error);
        return { success: false, message: "Failed to fetch social links", data: [] };
    }
}

export async function addSocialLink(data: {
    platform: string;
    url: string;
    label?: string;
    order?: number;
}) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required" };
        }

        const [socialLink] = await db.insert(socialLinks).values({
            userId: session.user.id,
            ...data
        }).returning();

        revalidatePath("/profile");
        return { success: true, message: "Social link added successfully", data: socialLink };
    } catch (error) {
        console.error("Error adding social link:", error);
        return { success: false, message: "Failed to add social link" };
    }
}

export async function updateSocialLink(id: string, data: {
    platform?: string;
    url?: string;
    label?: string;
    order?: number;
}) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required" };
        }

        // Verify ownership
        const existing = await db.query.socialLinks.findFirst({
            where: eq(socialLinks.id, id),
            columns: { userId: true }
        });

        if (!existing || existing.userId !== session.user.id) {
            return { success: false, message: "Unauthorized" };
        }

        const [socialLink] = await db.update(socialLinks).set(data).where(eq(socialLinks.id, id)).returning();

        revalidatePath("/profile");
        return { success: true, message: "Social link updated successfully", data: socialLink };
    } catch (error) {
        console.error("Error updating social link:", error);
        return { success: false, message: "Failed to update social link" };
    }
}

export async function deleteSocialLink(id: string) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required" };
        }

        // Verify ownership
        const existing = await db.query.socialLinks.findFirst({
            where: eq(socialLinks.id, id),
            columns: { userId: true }
        });

        if (!existing || existing.userId !== session.user.id) {
            return { success: false, message: "Unauthorized" };
        }

        await db.delete(socialLinks).where(eq(socialLinks.id, id));

        revalidatePath("/profile");
        return { success: true, message: "Social link deleted successfully" };
    } catch (error) {
        console.error("Error deleting social link:", error);
        return { success: false, message: "Failed to delete social link" };
    }
}

// ================= USER EDUCATION ACTIONS =================

export async function getUserEducations() {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required", data: [] };
        }

        const educations = await db.query.userEducations.findMany({
            where: eq(userEducations.userId, session.user.id),
            orderBy: [asc(userEducations.order), desc(userEducations.startDate)]
        });

        return { success: true, data: educations };
    } catch (error) {
        console.error("Error fetching educations:", error);
        return { success: false, message: "Failed to fetch educations", data: [] };
    }
}

export async function addUserEducation(data: {
    degree?: string;
    institution: string;
    startDate: Date;
    endDate?: Date;
    bulletPoints?: string[];
    order?: number;
}) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required" };
        }

        const [education] = await db.insert(userEducations).values({
            userId: session.user.id,
            ...data
        }).returning();

        revalidatePath("/profile");
        revalidatePath("/ai/resume");
        return { success: true, message: "Education added successfully", data: education };
    } catch (error) {
        console.error("Error adding education:", error);
        return { success: false, message: "Failed to add education" };
    }
}

export async function updateUserEducation(id: string, data: {
    degree?: string;
    institution?: string;
    startDate?: Date;
    /** `null` clears it - `undefined` would leave the old date in place. */
    endDate?: Date | null;
    bulletPoints?: string[];
    order?: number;
}) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required" };
        }

        const existing = await db.query.userEducations.findFirst({
            where: eq(userEducations.id, id),
            columns: { userId: true }
        });

        if (!existing || existing.userId !== session.user.id) {
            return { success: false, message: "Unauthorized" };
        }

        const [education] = await db.update(userEducations).set(data).where(eq(userEducations.id, id)).returning();

        revalidatePath("/profile");
        revalidatePath("/ai/resume");
        return { success: true, message: "Education updated successfully", data: education };
    } catch (error) {
        console.error("Error updating education:", error);
        return { success: false, message: "Failed to update education" };
    }
}

export async function deleteUserEducation(id: string) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required" };
        }

        const existing = await db.query.userEducations.findFirst({
            where: eq(userEducations.id, id),
            columns: { userId: true }
        });

        if (!existing || existing.userId !== session.user.id) {
            return { success: false, message: "Unauthorized" };
        }

        await db.delete(userEducations).where(eq(userEducations.id, id));

        revalidatePath("/profile");
        revalidatePath("/ai/resume");
        return { success: true, message: "Education deleted successfully" };
    } catch (error) {
        console.error("Error deleting education:", error);
        return { success: false, message: "Failed to delete education" };
    }
}

/**
 * Get public resume by username (shareable URL: /resume/[username])
 */
export async function getPublicResumeByUsername(username: string) {
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.username, username),
            columns: {
                id: true,
                name: true,
                username: true,
                occupation: true,
                location: true,
                image: true,
            },
        });
        if (!user) return { success: false, error: "Resume not found" };
        const viewerId = (await getSession(headers()))?.user?.id ?? null;

        const [experiences, projects, userSkills, educations, certs, links] = await Promise.all([
            db.query.workExperiences.findMany({
                where: eq(workExperiences.userId, user.id),
                orderBy: [desc(workExperiences.isCurrentlyWorking), desc(workExperiences.startDate)]
            }),
            db.query.portfolioProjects.findMany({
                // Private projects stay private here too (plan/resume RES-25): this had
                // no visibility filter, so a project set to Private still appeared on
                // /ai/resume/<username> for anyone. Same rule as lib/profile/read.ts.
                where: viewerId === user.id
                    ? eq(portfolioProjects.userId, user.id)
                    : and(eq(portfolioProjects.userId, user.id), sql`upper(${portfolioProjects.visibility}) = 'PUBLIC'`),
                with: { links: true },
                orderBy: [desc(portfolioProjects.startDate)]
            }),
            db.query.skills.findMany({
                where: eq(skills.userId, user.id),
                orderBy: [asc(skills.order), asc(skills.name)]
            }),
            db.query.userEducations.findMany({
                where: eq(userEducations.userId, user.id),
                orderBy: [asc(userEducations.order), desc(userEducations.startDate)]
            }),
            db.query.certifications.findMany({
                where: eq(certifications.userId, user.id),
                orderBy: [desc(certifications.issuedDate)]
            }),
            db.query.socialLinks.findMany({
                where: eq(socialLinks.userId, user.id),
                orderBy: [asc(socialLinks.order)]
            }),
        ]);

        return {
            success: true,
            user: {
                ...user,
                experiences,
                portfolioProjects: projects,
                skills: userSkills,
                educations,
                certifications: certs,
                socialLinks: links,
            }
        };
    } catch (error) {
        console.error("Error fetching public resume:", error);
        return { success: false, error: "Failed to load resume" };
    }
}

// ================= PROFILE COMPLETION =================

export async function getProfileCompletion() {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, message: "Authentication required", completion: 0 };
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, session.user.id),
        });

        if (!user) {
            return { success: false, message: "User not found", completion: 0 };
        }

        const [userExperiences, userProjects, userSocialLinks, userSkills] = await Promise.all([
            db.query.workExperiences.findMany({ where: eq(workExperiences.userId, user.id) }),
            db.query.portfolioProjects.findMany({ where: eq(portfolioProjects.userId, user.id) }),
            db.query.socialLinks.findMany({ where: eq(socialLinks.userId, user.id) }),
            db.query.skills.findMany({ where: eq(skills.userId, user.id) }),
        ]);

        // Calculate completion percentage based on 6 key items shown in dialog
        let completed = 0;
        const total = 7;

        const defaultImage = "https://tse4.mm.bing.net/th?id=OIP.-BS8Y2nH1k93GJiitUVBCAHaHa&pid=Api&P=0";

        // 1. Basic Information (name, bio, profile picture)
        const hasBasicInfo = !!(user.name && user.bio && user.image && user.image !== defaultImage);
        if (hasBasicInfo) completed++;

        // 2. Resume
        const hasResume = !!user.resume;
        if (hasResume) completed++;

        // 3. Work Experience
        const hasExperience = userExperiences.length > 0;
        if (hasExperience) completed++;

        // 4. Portfolio Projects
        const hasProjects = userProjects.length > 0;
        if (hasProjects) completed++;

        // 5. Social Links
        const hasSocials = userSocialLinks.length > 0;
        if (hasSocials) completed++;

        // 6. Skills
        const hasSkills = userSkills && userSkills.length > 0;
        if (hasSkills) completed++;

        // 7. Career Details
        const hasCareerDetails = !!(user.careerGoals?.length > 0 || user.targetCompanies?.length > 0 || user.expectedSalary);
        if (hasCareerDetails) completed++;

        const completionPercentage = Math.round((completed / total) * 100);

        return {
            success: true,
            completion: completionPercentage,
            details: {
                hasBasicInfo,
                hasResume,
                hasExperience,
                hasProjects,
                hasSocials,
                hasSkills,
                hasCareerDetails
            }
        };
    } catch (error) {
        console.error("Error calculating profile completion:", error);
        return { success: false, message: "Failed to calculate profile completion", completion: 0 };
    }
}

// ============================================
// PROFILE REDESIGN - NEW FEATURES
// ============================================

/**
 * Get user's own profile (full access)
 */
export async function getOwnProfile() {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" };
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, session.user.id),
        });

        if (!user) {
            return { success: false, error: "User not found" };
        }

        const [
            userProfile,
            userPortfolioProjects,
            projectProgressList,
            userSkills,
            userRecentActivities,
            userAchievementsList,
            userExperiences,
            userCertifications,
            userSocialLinks,
            userEdus,
        ] = await Promise.all([
            db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, user.id) }),
            db.query.portfolioProjects.findMany({
                where: eq(portfolioProjects.userId, user.id),
                // Media too: the editor's project sheet opens with the rows it has.
                with: { links: true, media: true },
                orderBy: [desc(portfolioProjects.startDate)]
            }),
            db.query.userProjectV2Progress.findMany({
                where: eq(userProjectV2Progress.userId, user.id),
                with: {
                    project: {
                        columns: {
                            id: true,
                            slug: true,
                            title: true,
                            shortDescription: true,
                            description: true,
                            technologies: true,
                            generationType: true,
                            difficulty: true,
                        }
                    }
                },
                orderBy: (t, { desc }) => [desc(t.createdAt)]
            }),
            db.query.skills.findMany({
                where: eq(skills.userId, user.id),
                with: { endorsements: true }
            }),
            db.query.recentActivities.findMany({
                where: eq(recentActivities.userId, user.id),
                orderBy: [desc(recentActivities.createdAt)],
                limit: 20
            }),
            db.query.achievements.findMany({
                where: eq(achievements.userId, user.id),
                orderBy: (t, { desc }) => [desc(t.createdAt)],
                limit: 10
            }),
            db.query.workExperiences.findMany({
                where: eq(workExperiences.userId, user.id),
                orderBy: [desc(workExperiences.startDate)]
            }),
            db.query.certifications.findMany({
                where: eq(certifications.userId, user.id),
                orderBy: [desc(certifications.issuedDate)]
            }),
            db.query.socialLinks.findMany({
                where: eq(socialLinks.userId, user.id),
                orderBy: [asc(socialLinks.order), desc(socialLinks.createdAt)]
            }),
            db.query.userEducations.findMany({
                where: eq(userEducations.userId, user.id),
                orderBy: [asc(userEducations.order), desc(userEducations.startDate)]
            }),
        ]);

        const achievementsList = userAchievementsList.map(a => ({
            id: a.id,
            title: a.title,
            description: a.description,
        }));

        return {
            success: true,
            user: {
                ...user,
                userProfile,
                portfolioProjects: userPortfolioProjects,
                UserProjectV2Progress: projectProgressList,
                skills: userSkills,
                recentActivity: userRecentActivities,
                achievements: achievementsList,
                experiences: userExperiences,
                certifications: userCertifications,
                socialLinks: userSocialLinks,
                educations: userEdus,
            }
        };
    } catch (error) {
        console.error("Error fetching own profile:", error);
        return { success: false, error: "Failed to fetch profile" };
    }
}

/**
 * Track a profile view for analytics
 */
export async function trackProfileView(profileId: string, source: string = "direct") {
    try {
        // The viewer comes from the session, never from the caller: a client could
        // otherwise pass anyone's id. Signed-out views count, with a null viewer.
        const session = await getSession(headers());
        const viewerId = session?.user?.id ?? null;

        const profile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.id, profileId),
            columns: { userId: true },
        });
        if (!profile || profile.userId === viewerId) {
            return { success: true };
        }

        await db.batch([
            db.insert(profileViews).values({ profileId, viewerId, source }),
            db.update(userProfiles).set({
                profileViews: sql`${userProfiles.profileViews} + 1`
            }).where(eq(userProfiles.id, profileId)),
        ]);

        return { success: true };
    } catch (error: unknown) {
        console.error("Error tracking profile view:", error);
        return { success: false, error: "Failed to track view" };
    }
}

/**
 * Update profile settings
 */
export async function updateProfileSettings(data: {
    coverGradient?: string;
    theme?: ProfileTheme;
    layout?: ProfileLayout;
    tagline?: string;
}) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" };
        }

        // Get or create profile
        let profile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, session.user.id),
        });

        if (!profile) {
            const [newProfile] = await db.insert(userProfiles).values({
                userId: session.user.id,
            }).returning();
            profile = newProfile!;
        }

        // Update profile
        const [updatedProfile] = await db.update(userProfiles).set({
            ...(data.coverGradient && { coverGradient: data.coverGradient }),
            ...(data.theme && { theme: data.theme }),
            ...(data.layout && { layout: data.layout }),
            ...(data.tagline !== undefined && { tagline: data.tagline }),
        }).where(eq(userProfiles.id, profile.id)).returning();

        // Recalculate completion score
        await calculateNewProfileCompletion(session.user.id);

        revalidatePath("/profile");
        return { success: true, profile: updatedProfile };
    } catch (error) {
        console.error("Error updating profile settings:", error);
        return { success: false, error: "Failed to update profile" };
    }
}

// ============================================
// SKILL ENDORSEMENTS
// ============================================

/**
 * Endorse a skill
 */
export async function endorseSkill(skillId: string, message?: string) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" };
        }

        // Check if skill exists
        const skill = await db.query.skills.findFirst({
            where: eq(skills.id, skillId),
            with: { user: true },
        });

        if (!skill) {
            return { success: false, error: "Skill not found" };
        }

        // Can't endorse own skills
        if (skill.userId === session.user.id) {
            return { success: false, error: "Cannot endorse your own skills" };
        }

        // Check if already endorsed
        const existingEndorsement = await db.query.skillEndorsements.findFirst({
            where: and(
                eq(skillEndorsements.skillId, skillId),
                eq(skillEndorsements.endorserId, session.user.id)
            ),
        });

        if (existingEndorsement) {
            return { success: false, error: "Already endorsed this skill" };
        }

        // Create endorsement
        await db.insert(skillEndorsements).values({
            skillId,
            endorserId: session.user.id,
            message,
        });

        revalidatePath(`/profile/${skill.user.username}`);
        return { success: true };
    } catch (error) {
        console.error("Error endorsing skill:", error);
        return { success: false, error: "Failed to endorse skill" };
    }
}

/**
 * Remove skill endorsement
 */
export async function removeEndorsement(skillId: string) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" };
        }

        await db.delete(skillEndorsements).where(
            and(
                eq(skillEndorsements.skillId, skillId),
                eq(skillEndorsements.endorserId, session.user.id)
            )
        );

        revalidatePath("/profile");
        return { success: true };
    } catch (error) {
        console.error("Error removing endorsement:", error);
        return { success: false, error: "Failed to remove endorsement" };
    }
}

// ============================================
// PROFILE ANALYTICS
// ============================================

/**
 * Get profile analytics
 */
export async function getProfileAnalytics(userId?: string) {
    try {
        const session = await getSession(headers());
        const targetUserId = userId || session?.user?.id;

        if (!targetUserId) {
            return { success: false, error: "User ID required" };
        }

        // Only allow viewing own analytics
        if (session?.user?.id !== targetUserId) {
            return { success: false, error: "Unauthorized" };
        }

        const profile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, targetUserId),
            with: {
                views: {
                    orderBy: [desc(profileViews.viewedAt)],
                    limit: 100,
                },
            },
        });

        if (!profile) {
            return { success: false, error: "Profile not found" };
        }

        // Calculate analytics
        const totalViews = profile.profileViews;
        const last7DaysViews = profile.views.filter(
            (v) =>
                new Date(v.viewedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length;

        const last30DaysViews = profile.views.filter(
            (v) =>
                new Date(v.viewedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length;

        // Source breakdown
        const sourceBreakdown = profile.views.reduce((acc: Record<string, number>, view) => {
            const source = view.source || "direct";
            acc[source] = (acc[source] || 0) + 1;
            return acc;
        }, {});

        // Geographic breakdown
        const geoBreakdown = profile.views.reduce((acc: Record<string, number>, view) => {
            if (view.country) {
                acc[view.country] = (acc[view.country] || 0) + 1;
            }
            return acc;
        }, {});

        return {
            success: true,
            analytics: {
                totalViews,
                last7DaysViews,
                last30DaysViews,
                sourceBreakdown,
                geoBreakdown,
                recentViews: profile.views.slice(0, 20),
            },
        };
    } catch (error) {
        console.error("Error fetching profile analytics:", error);
        return { success: false, error: "Failed to fetch analytics" };
    }
}

// ============================================
// NEW PROFILE COMPLETION (WITH PROFILE REDESIGN)
// ============================================

/**
 * Calculate profile completion score (new version with profile customization)
 */
export async function calculateNewProfileCompletion(userId: string) {
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) {
            return { success: false, error: "User not found" };
        }

        const [userProfile, userSkills, userExperiences, userCertifications, userProjects, userSocialLinks] = await Promise.all([
            db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) }),
            db.query.skills.findMany({ where: eq(skills.userId, userId) }),
            db.query.workExperiences.findMany({ where: eq(workExperiences.userId, userId) }),
            db.query.certifications.findMany({ where: eq(certifications.userId, userId) }),
            db.query.portfolioProjects.findMany({ where: eq(portfolioProjects.userId, userId) }),
            db.query.socialLinks.findMany({ where: eq(socialLinks.userId, userId) }),
        ]);

        let score = 0;

        // Basic info (25 points)
        if (user.name) score += 5;
        if (user.image) score += 5;
        if (user.bio) score += 10;
        if (user.location) score += 5;

        // Profile customization (10 points)
        if (userProfile?.coverGradient) score += 5;
        if (userProfile?.tagline) score += 3;
        if (userProfile?.theme) score += 2;

        // Career Details (15 points)
        if (user.careerGoals && user.careerGoals.length > 0) score += 5;
        if (user.targetCompanies && user.targetCompanies.length > 0) score += 5;
        if (user.expectedSalary) score += 5;

        // Skills (15 points)
        if (userSkills.length > 0) score += 5;
        if (userSkills.length >= 5) score += 5;
        if (userSkills.length >= 10) score += 5;

        // Experience (10 points)
        if (userExperiences.length > 0) score += 10;

        // Education & Certifications (10 points)
        if (user.university) score += 5;
        if (userCertifications.length > 0) score += 5;

        // Projects (10 points)
        if (userProjects.length > 0) score += 5;
        if (userProjects.length >= 3) score += 5;

        // Social & Contact (5 points)
        if (userSocialLinks && userSocialLinks.length > 0) score += 3;
        if (user.website) score += 2;

        // Update profile with new score
        if (userProfile) {
            await db.update(userProfiles).set({
                completionScore: score
            }).where(eq(userProfiles.id, userProfile.id));
        }

        return { success: true, score };
    } catch (error) {
        console.error("Error calculating profile completion:", error);
        return { success: false, error: "Failed to calculate completion" };
    }
}

/**
 * A profile as the current viewer may see it (plan/profile PRF-8). The decision
 * about what a stranger sees lives in `lib/profile/read.ts`; this is only the
 * session lookup in front of it. Signed-out is a normal viewer, not an error.
 */
export async function getProfileByUsername(username: string): Promise<PublicProfileResult> {
    try {
        const session = await getSession(headers());
        return await loadPublicProfile(username, session?.user?.id ?? null);
    } catch (error: unknown) {
        console.error("Error fetching profile by username:", error);
        return { status: "not_found" };
    }
}

/**
 * The signed-in user's own profile numbers. It used to take any `userId` with no
 * check, which let anyone read anyone's credit balance. Visitors get their numbers
 * from `loadPublicProfile`; both come from `profileStats`, so they agree.
 */
export async function getUserProfileStats() {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) return { success: false as const, error: "Not authenticated" };
        const stats = await profileStats(session.user.id, { includePrivateProjects: true });
        return { success: true as const, stats };
    } catch (error: unknown) {
        console.error("Error fetching user profile stats:", error);
        return { success: false as const, error: "Failed to fetch stats" };
    }
}

// ================= EDIT PROFILE SHEET (plan/profile PRF-10) =================

export interface ProfileDetailsInput {
    name: string;
    headline: string;
    bio: string;
    location: string;
    website: string;
    occupation: string;
    company: string;
    university: string;
    openToWork: boolean;
    careerGoals: string[];
    targetCompanies: string[];
    expectedSalary: string;
    noticePeriod: string;
    workExperience: string;
    visibility: ProfileVisibility;
    showEmail: boolean;
    showResume: boolean;
}


function cleanText(v: unknown, max: number): string | null {
    if (typeof v !== "string") return null;
    const t = v.trim().slice(0, max);
    return t || null;
}

/** http(s) only, scheme added when missing - a profile link is clicked by strangers. */
function cleanWebsite(v: unknown): { url: string | null; error: string | null } {
    const raw = typeof v === "string" ? v.trim() : "";
    if (!raw) return { url: null, error: null };
    try {
        const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
        if (u.protocol !== "https:" && u.protocol !== "http:") return { url: null, error: "Website must be an http or https link" };
        return { url: u.toString(), error: null };
    } catch {
        return { url: null, error: "Website is not a valid link" };
    }
}

/**
 * Everything the Edit Profile sheet saves, in one call and one batch.
 *
 * It replaces a pair of calls - `updateUserProfile` (a broad `Partial<UserProfile>`
 * writer) then `updateProfileSettings` - with an explicit allow-list: every column
 * this can touch is named below, and nothing else reaches `.set()`. Privacy lives
 * here too, because the sheet is where a user opts out of the public-by-default
 * profile (Niraj, 2026-09-25); `users.isPublicProfile` is kept in step with the
 * visibility so follow rules and the public reader agree.
 */
export async function saveProfileDetails(input: ProfileDetailsInput) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) return { success: false as const, error: "Not authenticated" };
        const userId = session.user.id;

        const name = cleanText(input.name, PROFILE_LIMITS.name);
        if (!name) return { success: false as const, error: "Your name cannot be empty", field: "name" as const };
        const website = cleanWebsite(input.website);
        if (website.error) return { success: false as const, error: website.error, field: "website" as const };

        const visibility: ProfileVisibility =
            input.visibility === "PRIVATE" || input.visibility === "FOLLOWERS" ? input.visibility : "PUBLIC";
        const list = (v: unknown, max: number) =>
            Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean))].slice(0, max) : [];
        const headline = cleanText(input.headline, PROFILE_LIMITS.headline);

        await db.batch([
            db.update(users).set({
                name,
                bio: cleanText(input.bio, PROFILE_LIMITS.bio),
                location: cleanText(input.location, PROFILE_LIMITS.short),
                website: website.url,
                occupation: cleanText(input.occupation, PROFILE_LIMITS.short),
                company: cleanText(input.company, PROFILE_LIMITS.short),
                university: cleanText(input.university, PROFILE_LIMITS.short),
                openToWork: input.openToWork === true,
                careerGoals: list(input.careerGoals, 5),
                targetCompanies: list(input.targetCompanies, 20),
                expectedSalary: cleanText(input.expectedSalary, 20),
                noticePeriod: cleanText(input.noticePeriod, 40),
                workExperience: cleanText(input.workExperience, 40),
                isPublicProfile: visibility !== "PRIVATE",
            }).where(eq(users.id, userId)),
            db.insert(userProfiles).values({
                userId,
                tagline: headline,
                visibility,
                showEmail: input.showEmail === true,
                showResume: input.showResume !== false,
            }).onConflictDoUpdate({
                target: userProfiles.userId,
                set: {
                    tagline: headline,
                    visibility,
                    showEmail: input.showEmail === true,
                    showResume: input.showResume !== false,
                },
            }),
        ]);

        await calculateNewProfileCompletion(userId);
        revalidatePath("/profile");
        return { success: true as const };
    } catch (error: unknown) {
        console.error("Error saving profile details:", error);
        return { success: false as const, error: "Could not save your profile" };
    }
}
