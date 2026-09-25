"use server"

import { db, users, skills, certifications } from "@repo/db"
import { getSession } from '@repo/auth'
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import {
    ContactInfo, UserCertification, UserProfile, UserSkill
} from "@/types/user"
import { and, eq, ilike } from "drizzle-orm"

export async function getUserProfile() {
    const session = await getSession(headers())

    if (!session?.user?.email) {
        throw new Error("User not authenticated")
    }

    const user = await db.query.users.findFirst({
        where: eq(users.email, session.user.email),
        with: {
            userSkills: true,
            // skills (legacy) also available
        }
    })

    // Get skills and certifications separately since the relations may differ
    const userSkillsList = await db.query.skills.findMany({
        where: eq(skills.userId, session.user.id as string)
    })
    const certList = await db.query.certifications.findMany({
        where: eq(certifications.userId, session.user.id as string)
    })

    if (!user) {
        throw new Error("User not found")
    }

    return {
        id: user.id,
        username: user?.username,
        name: user.name || "",
        email: user.email,
        emailVerified: user.emailVerified ?? undefined,
        image: user.image || "",
        role: user.role,
        hasResume: user?.hasResume,
        resume: user?.resume,
        bio: user.bio || "",
        university: user.university || "",
        location: user.location || "",
        company: "",
        createdAt: user?.createdAt,
        occupation: user?.occupation || "",
        website: user?.website || "",
        semester: user?.semester || "",
        careerGoals: user?.careerGoals || [],
        targetCompanies: user?.targetCompanies || [],
        expectedSalary: user?.expectedSalary || null,
        noticePeriod: user?.noticePeriod || null,
        workExperience: user?.workExperience || null,
        skills: userSkillsList.map(skill => ({
            id: skill.id,
            name: skill.name,
            level: skill.level,
            category: skill.category,
            order: skill.order,
        })),
        certifications: certList.map(cert => ({
            id: cert.id,
            name: cert.name,
            issuer: cert.issuer,
            issuedDate: cert.issuedDate,
            link: cert.link
        })),
        contactInfo: {
            phone: user?.phone,
            gender: user?.gender,
            yearofbirth: user?.yearofbirth
        } as ContactInfo,
        credits: user?.credits,
        xp: user?.currentXp,
        creditsShared: user?.creditsShared,
        maxCreditsShared: user?.maxCreditsShared
    }
}

export async function updateUserProfile(data: Partial<UserProfile>) {
    const session = await getSession(headers())

    if (!session?.user?.email) {
        throw new Error("User not authenticated")
    }

    const userUpdateData: any = {
        name: data.name,
        bio: data.bio,
        gender: data.contactInfo?.gender,
        phone: data.contactInfo?.phone,
        yearofbirth: data.contactInfo?.yearofbirth,
        university: data.university,
        company: data.company,
        occupation: data.occupation,
        location: data.location,
        website: data.website,
        image: data.image,
        semester: data.semester,
        careerGoals: data.careerGoals,
        targetCompanies: data.targetCompanies,
        expectedSalary: data.expectedSalary,
        noticePeriod: data.noticePeriod,
        workExperience: data.workExperience,
    };

    const [updatedUser] = await db.update(users).set(userUpdateData).where(
        eq(users.email, session.user.email)
    ).returning()

    if (!updatedUser) {
        throw new Error("Failed to update user")
    }

    const userSkillsList = await db.query.skills.findMany({
        where: eq(skills.userId, updatedUser.id)
    })
    const certList = await db.query.certifications.findMany({
        where: eq(certifications.userId, updatedUser.id)
    })

    revalidatePath('/profile')

    return {
        id: updatedUser.id,
        username: updatedUser?.username,
        name: updatedUser.name || "",
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified ?? undefined,
        image: updatedUser.image || "",
        role: updatedUser.role,
        gender: updatedUser.gender || "",
        phone: updatedUser.phone || "",
        yearofbirth: updatedUser.yearofbirth || "",
        bio: updatedUser.bio || "",
        university: updatedUser.university || "",
        location: updatedUser.location || "",
        xp: updatedUser.currentXp,
        credits: updatedUser.credits,
        socialLinks: {},
        website: "",
        occupation: "",
        createdAt: updatedUser.createdAt,
        skills: userSkillsList.map(skill => ({
            id: skill.id,
            name: skill.name,
            level: skill.level,
            category: skill.category
        })) as UserSkill[],
        certifications: certList.map(cert => ({
            id: cert.id,
            name: cert.name,
            issuer: cert.issuer,
            issuedDate: cert.issuedDate as Date,
            link: cert.link
        })) as UserCertification[],
        contactInfo: {
            phone: updatedUser?.phone,
            gender: updatedUser?.gender,
            yearofbirth: updatedUser?.yearofbirth
        } as ContactInfo,
        semester: updatedUser.semester || "",
        careerGoals: updatedUser.careerGoals || [],
        targetCompanies: updatedUser.targetCompanies || [],
        expectedSalary: updatedUser.expectedSalary || null,
        noticePeriod: updatedUser.noticePeriod || null,
        workExperience: updatedUser.workExperience || null,
    }
}

export async function updateUserSkills(skillsList: UserSkill[]) {
    const session = await getSession(headers())

    if (!session?.user?.email) {
        throw new Error("User not authenticated")
    }

    const user = await db.query.users.findFirst({
        where: eq(users.email, session.user.email),
        columns: { id: true }
    })

    if (!user) {
        throw new Error("User not found")
    }

    for (const skill of skillsList) {
        if (skill.id) {
            await db.update(skills).set({
                name: skill.name,
                level: typeof skill.level === 'number' ? String(skill.level) : skill.level,
                category: skill.category || 'FRONTEND',
                ...(skill.order !== undefined && { order: skill.order }),
            // Scoped to the caller: this matched on id alone, so anyone could rewrite
            // anyone's skill by sending its id (plan/profile PRF-9).
            }).where(and(eq(skills.id, skill.id), eq(skills.userId, user.id)))
        } else {
            await db.insert(skills).values({
                name: skill.name,
                level: typeof skill.level === 'number' ? String(skill.level) : skill.level,
                category: skill.category || 'FRONTEND',
                order: skill.order ?? 0,
                userId: user.id
            })
        }
    }

    const updatedSkills = await db.query.skills.findMany({
        where: eq(skills.userId, user.id)
    })

    revalidatePath('/profile')
    revalidatePath('/ai/resume')

    return updatedSkills.map(skill => ({
        id: skill.id,
        name: skill.name,
        level: skill.level,
        category: skill.category,
        order: skill.order,
    })) as UserSkill[]
}

export async function deleteSkill(id: string) {
    const session = await getSession(headers())
    if (!session?.user?.email) {
        throw new Error("User not authenticated")
    }
    const user = await db.query.users.findFirst({
        where: eq(users.email, session.user.email),
        columns: { id: true },
    })
    if (!user) throw new Error("User not found")
    const skill = await db.query.skills.findFirst({
        where: eq(skills.id, id),
        columns: { userId: true },
    })
    if (!skill || skill.userId !== user.id) {
        throw new Error("Unauthorized to delete this skill")
    }
    await db.delete(skills).where(eq(skills.id, id))
    revalidatePath("/profile")
    revalidatePath("/ai/resume")
}

export async function updateUserCertifications(certificationsList: UserCertification[]) {
    const session = await getSession(headers())

    if (!session?.user?.email) {
        throw new Error("User not authenticated")
    }

    const user = await db.query.users.findFirst({
        where: eq(users.email, session.user.email),
        columns: { id: true }
    })

    if (!user) {
        throw new Error("User not found")
    }

    for (const cert of certificationsList) {
        if (cert.id) {
            await db.update(certifications).set({
                name: cert.name,
                issuer: cert.issuer,
                issuedDate: cert.issuedDate,
                link: cert.link || "",
            }).where(eq(certifications.id, cert.id))
        } else {
            await db.insert(certifications).values({
                name: cert.name,
                issuer: cert.issuer,
                issuedDate: cert.issuedDate!,
                link: cert.link || "",
                userId: user.id
            })
        }
    }

    const updatedCerts = await db.query.certifications.findMany({
        where: eq(certifications.userId, user.id)
    })

    revalidatePath('/profile')

    return updatedCerts.map(cert => ({
        id: cert.id,
        name: cert.name,
        issuer: cert.issuer,
        issuedDate: cert.issuedDate,
        link: cert.link
    })) as UserCertification[]
}

export async function updateContactInfo(contactData: ContactInfo) {
    const session = await getSession(headers())

    if (!session?.user?.email) {
        throw new Error("User not authenticated")
    }

    const user = await db.query.users.findFirst({
        where: eq(users.email, session.user.email),
        columns: { id: true }
    })

    if (!user) {
        throw new Error("User not found")
    }

    const [updatedUser] = await db.update(users).set({
        phone: contactData.phone,
        gender: contactData.gender,
        yearofbirth: contactData.yearofbirth
    }).where(eq(users.id, user.id)).returning()

    if (!updatedUser) {
        throw new Error("Failed to fetch updated user")
    }

    revalidatePath('/profile')

    return {
        phone: updatedUser.phone,
        gender: updatedUser.gender,
        yearofbirth: updatedUser.yearofbirth,
    }
}

export async function getUserReferralCode() {
    const session = await getSession(headers());
    if (!session) {
        return null;
    }

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.email, session.user.email as string),
            columns: {
                referralCode: true,
                referralCount: true,
            },
        });
        if (!user) {
            return {
                success: false,
                message: "No user found"
            }
        }

        return {
            success: true,
            data: {
                referralCode: user.referralCode,
                referralCount: user.referralCount,
            }
        }
    } catch (err) {
        const error = err as Error;
        console.log("Error occurred while getting the referral code: " + error);
        throw new Error("Error occurred while getting the referral code");
    }
}

export async function checkUsername(username: string) {
    if (!username || username.length < 3) return false;

    const user = await db.query.users.findFirst({
        where: eq(users.username, username.toLowerCase()),
        columns: { id: true }
    });

    return user === null || user === undefined;
}

export async function updateUsername(newUsername: string) {
    const session = await getSession(headers());

    if (!session?.user) {
        return { success: false, message: "Unauthorized" };
    }

    const userId = session.user.id;

    try {
        const [updatedUser] = await db.update(users).set({
            username: newUsername.toLowerCase(),
        }).where(eq(users.id, userId)).returning();

        return { success: true, message: "Username updated successfully", updatedUsername: updatedUser?.username };
    } catch (error: unknown) {
        console.error("Update error:", error);
        return { success: false, message: "Failed to update username" };
    }
}

export async function searchUsers(query: string) {
    const usersList = await db.query.users.findMany({
        where: ilike(users.username, `%${query}%`),
        columns: {
            id: true,
            username: true,
            name: true,
            image: true,
            credits: true
        },
    })
    return usersList
}

export async function getUserByEmail(email: string) {
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
            columns: {
                id: true,
                name: true,
                email: true,
                username: true,
                image: true,
                bio: true,
                university: true,
                company: true,
                occupation: true,
                location: true,
                website: true,
                interests: true,
                currentXp: true,
                totalXp: true,
                currentLevel: true,
                credits: true,
                createdAt: true,
            },
            with: {
                userSkills: {
                    columns: {
                        name: true,
                        level: true,
                        category: true,
                    },
                },
            }
        });

        if (!user) {
            throw new Error("User not found");
        }

        // Also fetch legacy skills
        const userSkillsList = await db.query.skills.findMany({
            where: eq(skills.userId, user.id),
            columns: { name: true, level: true, category: true }
        });
        const certList = await db.query.certifications.findMany({
            where: eq(certifications.userId, user.id),
            columns: { name: true, issuer: true, issuedDate: true, link: true }
        });

        return {
            user: {
                ...user,
                skills: userSkillsList,
                certifications: certList,
                xp: user.currentXp,
            },
        };
    } catch (error) {
        console.error("Error fetching user:", error);
        throw new Error("Failed to fetch user");
    }
}
