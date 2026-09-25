import "server-only"

/**
 * Reading a profile for someone other than its owner (plan/profile PRF-8).
 *
 * Server-only on purpose, not a server action: a `"use server"` export is a public
 * endpoint anybody can POST to with any username, so the thing that decides what a
 * stranger may see must not be one.
 *
 * Every field below is chosen. The previous reader returned `...user` - the whole
 * `users` row, with email, phone, resume text, credits and expected salary - and hid
 * the email in the CLIENT component, after the full row had already been serialised
 * into the page. Adding a column to `users` must never make it public by accident,
 * so nothing here spreads a row.
 */
import {
    db, users, userProfiles, portfolioProjects, skills, workExperiences, userEducations,
    socialLinks, certifications, follow, resumeDraft,
} from "@repo/db"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import { calculateLevelFromXp, lifetimeXp } from "@/lib/levels"

export type ProfileAccess = "PUBLIC" | "FOLLOWERS" | "PRIVATE"

export interface ProfileStats {
    /** Lifetime XP (`lifetimeXp`: `totalXp`, falling back to `currentXp`). */
    xp: number
    level: number
    /** From `LEVEL_CONFIG`, the same ladder that levels users up. Level 2 is 500 XP, not 1000. */
    levelProgress: { intoLevel: number; levelSpan: number; toNext: number; percent: number; isMax: boolean }
    /** Portfolio projects this viewer can see. Platform enrolments are not portfolio. */
    projects: number
    skills: number
    followers: number
    following: number
}

export interface PublicProfile {
    id: string
    /** `user_profile.id`, for `trackProfileView`. Null for users who never got a row. */
    profileId: string | null
    name: string | null
    username: string
    image: string | null
    headline: string | null
    bio: string | null
    location: string | null
    company: string | null
    occupation: string | null
    university: string | null
    website: string | null
    openToWork: boolean
    /** Only when the owner turned on `showEmail`. */
    email: string | null
    /**
     * The default resume's `/r/<slug>`, only when the owner shows their resume AND that
     * draft is marked public (Niraj, 2026-09-25). The uploaded file itself is never
     * exposed: it stays behind a signed URL for its owner.
     */
    resumeShareSlug: string | null
    /** Whole years across roles, overlaps merged. Null with no roles. */
    yearsExperience: number | null
    githubUrl: string | null
    linkedinUrl: string | null
    twitterUrl: string | null
    socialLinks: { id: string; platform: string; url: string; label: string | null }[]
    experiences: {
        id: string; companyName: string; companyLogo: string | null; companyWebsite: string | null
        roleTitle: string; description: string | null; bulletPoints: string[]
        startDate: Date; endDate: Date | null; isCurrentlyWorking: boolean
    }[]
    educations: {
        id: string; institution: string; degree: string | null
        startDate: Date; endDate: Date | null; bulletPoints: string[]
    }[]
    projects: {
        id: string; projectName: string; projectType: string; description: string | null
        bulletPoints: string[]; status: string; visibility: string; technologies: string[]
        startDate: Date; endDate: Date | null; thumbnailUrl: string | null
        links: { id: string; linkType: string; url: string; description: string | null }[]
        media: { id: string; mediaUrl: string; mediaType: string; caption: string | null }[]
    }[]
    skills: { id: string; name: string; level: string; category: string; endorsements: number }[]
    certifications: { id: string; name: string; issuer: string | null; issuedDate: Date | null; url: string | null }[]
    stats: ProfileStats
}

export type PublicProfileResult =
    | { status: "not_found" }
    /**
     * FOLLOWERS-only, seen by a non-follower: a face and a Follow prompt, nothing more.
     * PRIVATE is `not_found` to everyone but the owner - saying "this profile is
     * private" confirms an account exists at that username, which is what the owner
     * asked not to share (the same rule as /knowme/<username>).
     */
    | { status: "restricted"; access: "FOLLOWERS"; identity: { id: string; name: string | null; username: string; image: string | null } }
    | { status: "ok"; profile: PublicProfile; isOwn: boolean; isFollowing: boolean }

const count = (rows: { n: number }[]) => Number(rows[0]?.n ?? 0)

/** The one place profile numbers come from, for the owner and for visitors alike. */
export async function profileStats(userId: string, opts: { includePrivateProjects: boolean }): Promise<ProfileStats> {
    const projectWhere = opts.includePrivateProjects
        ? eq(portfolioProjects.userId, userId)
        // Case-insensitive until the PRF-7 backfill has run everywhere.
        : and(eq(portfolioProjects.userId, userId), sql`upper(${portfolioProjects.visibility}) = 'PUBLIC'`)

    const [projects, skillRows, followers, following, xp] = await Promise.all([
        db.select({ n: sql<number>`count(*)` }).from(portfolioProjects).where(projectWhere),
        db.select({ n: sql<number>`count(*)` }).from(skills).where(eq(skills.userId, userId)),
        db.select({ n: sql<number>`count(*)` }).from(follow).where(eq(follow.followingId, userId)),
        db.select({ n: sql<number>`count(*)` }).from(follow).where(eq(follow.followerId, userId)),
        db.query.users.findFirst({ where: eq(users.id, userId), columns: { totalXp: true, currentXp: true } }),
    ])

    const total = lifetimeXp(xp ?? {})
    const ladder = calculateLevelFromXp(total)
    const isMax = ladder.nextLevelXp === ladder.currentLevelXp

    return {
        xp: total,
        // Derived from XP, not read from `currentLevel`: the stored column is only
        // updated by `addXpToUser`, and referral XP bypasses it.
        level: ladder.currentLevel,
        levelProgress: {
            intoLevel: ladder.progressInCurrentLevel,
            levelSpan: ladder.nextLevelXp - ladder.currentLevelXp,
            toNext: Math.max(0, ladder.xpNeededForNextLevel),
            percent: Math.round(ladder.progressPercentage),
            isMax,
        },
        projects: count(projects),
        skills: count(skillRows),
        followers: count(followers),
        following: count(following),
    }
}

/**
 * The profile at `/profile/[username]`, as `viewerId` may see it. `viewerId` is null
 * for a signed-out visitor, which is a normal case now that the page is public.
 *
 * Access (Niraj, 2026-09-25: public by default, opt-out): `user_profile.visibility`
 * decides, and `users.isPublicProfile = false` also means private. A user with no
 * `user_profile` row is PUBLIC with every default. The owner always sees everything.
 */
export async function loadPublicProfile(username: string, viewerId: string | null): Promise<PublicProfileResult> {
    const user = await db.query.users.findFirst({
        where: eq(users.username, username),
        columns: {
            id: true, name: true, username: true, image: true, email: true, bio: true, headline: true,
            location: true, company: true, occupation: true, university: true, website: true,
            openToWork: true, isPublicProfile: true,
            githubUrl: true, linkedinUrl: true, twitterUrl: true,
        },
    })
    if (!user?.username) return { status: "not_found" }

    const isOwn = viewerId === user.id
    const profileRow = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, user.id),
        columns: { id: true, tagline: true, visibility: true, showEmail: true, showResume: true },
    })

    const access: ProfileAccess = user.isPublicProfile === false ? "PRIVATE" : (profileRow?.visibility ?? "PUBLIC")

    let isFollowing = false
    if (viewerId && !isOwn) {
        const row = await db.query.follow.findFirst({
            where: and(eq(follow.followerId, viewerId), eq(follow.followingId, user.id)),
            columns: { id: true },
        })
        isFollowing = !!row
    }

    if (!isOwn && access === "PRIVATE") return { status: "not_found" }
    if (!isOwn && access === "FOLLOWERS" && !isFollowing) {
        return {
            status: "restricted",
            access: "FOLLOWERS",
            identity: { id: user.id, name: user.name, username: user.username, image: user.image },
        }
    }

    const showEmail = isOwn || (profileRow?.showEmail ?? false)
    const showResume = isOwn || (profileRow?.showResume ?? true)

    const [projectRows, skillRows, experienceRows, educationRows, linkRows, certRows, stats, resume] = await Promise.all([
        db.query.portfolioProjects.findMany({
            where: isOwn
                ? eq(portfolioProjects.userId, user.id)
                : and(eq(portfolioProjects.userId, user.id), sql`upper(${portfolioProjects.visibility}) = 'PUBLIC'`),
            with: { links: true, media: true },
            orderBy: [desc(portfolioProjects.startDate)],
            limit: 50,
        }),
        db.query.skills.findMany({
            where: eq(skills.userId, user.id),
            with: { endorsements: { columns: { id: true } } },
            orderBy: [asc(skills.order), asc(skills.name)],
        }),
        db.query.workExperiences.findMany({
            where: eq(workExperiences.userId, user.id),
            orderBy: [desc(workExperiences.startDate)],
        }),
        db.query.userEducations.findMany({
            where: eq(userEducations.userId, user.id),
            orderBy: [asc(userEducations.order), desc(userEducations.startDate)],
        }),
        db.query.socialLinks.findMany({
            where: eq(socialLinks.userId, user.id),
            orderBy: [asc(socialLinks.order)],
        }),
        db.query.certifications.findMany({
            where: eq(certifications.userId, user.id),
            orderBy: [desc(certifications.issuedDate)],
        }),
        profileStats(user.id, { includePrivateProjects: isOwn }),
        showResume
            ? db.query.resumeDraft.findFirst({
                where: and(eq(resumeDraft.userId, user.id), eq(resumeDraft.isDefault, true), eq(resumeDraft.isPublic, true)),
                columns: { shareSlug: true },
            })
            : Promise.resolve(undefined),
    ])

    return {
        status: "ok",
        isOwn,
        isFollowing,
        profile: {
            id: user.id,
            profileId: profileRow?.id ?? null,
            name: user.name,
            username: user.username,
            image: user.image,
            headline: profileRow?.tagline || user.headline || user.occupation || null,
            bio: user.bio,
            location: user.location,
            company: user.company,
            occupation: user.occupation,
            university: user.university,
            website: user.website,
            openToWork: user.openToWork,
            email: showEmail ? user.email : null,
            resumeShareSlug: resume?.shareSlug ?? null,
            yearsExperience: yearsAcross(experienceRows),
            githubUrl: user.githubUrl,
            linkedinUrl: user.linkedinUrl,
            twitterUrl: user.twitterUrl,
            socialLinks: linkRows.map((l) => ({ id: l.id, platform: l.platform, url: l.url, label: l.label })),
            experiences: experienceRows.map((e) => ({
                id: e.id, companyName: e.companyName, companyLogo: e.companyLogo, companyWebsite: e.companyWebsite,
                roleTitle: e.roleTitle, description: e.description, bulletPoints: e.bulletPoints ?? [],
                startDate: e.startDate, endDate: e.endDate, isCurrentlyWorking: e.isCurrentlyWorking,
            })),
            educations: educationRows.map((e) => ({
                id: e.id, institution: e.institution, degree: e.degree,
                startDate: e.startDate, endDate: e.endDate, bulletPoints: e.bulletPoints ?? [],
            })),
            projects: projectRows.map((p) => ({
                id: p.id, projectName: p.projectName, projectType: p.projectType, description: p.description,
                bulletPoints: p.bulletPoints ?? [], status: p.status, visibility: p.visibility,
                technologies: p.technologies ?? [], startDate: p.startDate, endDate: p.endDate,
                thumbnailUrl: p.thumbnailUrl,
                links: p.links.map((l) => ({ id: l.id, linkType: l.linkType, url: l.url, description: l.description })),
                media: p.media.map((m) => ({ id: m.id, mediaUrl: m.mediaUrl, mediaType: m.mediaType, caption: m.caption })),
            })),
            skills: skillRows.map((s) => ({
                id: s.id, name: s.name, level: s.level, category: s.category, endorsements: s.endorsements.length,
            })),
            certifications: certRows.map((c) => ({
                id: c.id, name: c.name, issuer: c.issuer, issuedDate: c.issuedDate, url: c.link || null,
            })),
            stats,
        },
    }
}

/**
 * Years of experience from the roles themselves, with overlapping roles merged so
 * two concurrent jobs do not count twice. Rounded down; under a year reads as 0.
 */
function yearsAcross(rows: { startDate: Date; endDate: Date | null; isCurrentlyWorking: boolean }[]): number | null {
    if (!rows.length) return null
    const spans = rows
        .map((r) => [r.startDate.getTime(), (r.isCurrentlyWorking || !r.endDate ? new Date() : r.endDate).getTime()] as const)
        .filter(([a, b]) => b > a)
        .sort((x, y) => x[0] - y[0])
    let total = 0
    let [cs, ce] = spans[0] ?? [0, 0]
    for (const [a, b] of spans.slice(1)) {
        if (a <= ce) ce = Math.max(ce, b)
        else { total += ce - cs; cs = a; ce = b }
    }
    total += ce - cs
    return Math.floor(total / (365.25 * 24 * 3600 * 1000))
}
