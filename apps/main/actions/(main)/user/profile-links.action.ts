"use server"

import { db, users } from "@repo/db"
import { eq } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import type { ProfileLinks } from "@/lib/profile-links"

/**
 * The user's own LinkedIn / GitHub / Twitter / portfolio links.
 *
 * ── These already had a home ──
 *
 * `users` has carried `linkedinUrl`, `githubUrl`, `twitterUrl` and `websiteUrl` for a long
 * time. Nothing on the AI import page read or wrote them, so somebody who had already filled
 * them in on their profile was asked for the same four things again - and what they typed
 * here was thrown away the moment the draft was created.
 *
 * So this is not a new store, it is the missing read and write for an existing one. No new
 * table: a second copy of a user's GitHub URL is a second thing to keep in sync, and the
 * first one to go stale is the one nobody is looking at.
 *
 * ── Normalising on the way in ──
 *
 * People paste `github.com/x`, `@x`, `https://github.com/x/` and `x`. The import needs a
 * username for the GitHub API and a URL for Exa, so the column stores the canonical URL and
 * the callers derive what they need. Doing it here rather than in the form means the profile
 * page and the import page cannot disagree about what a "GitHub link" is.
 */

const clean = (v: string | null | undefined) => {
    const s = (v ?? "").trim()
    return s.length ? s.slice(0, 300) : null
}

/** `x`, `@x`, `github.com/x`, `https://github.com/x/` -> `https://github.com/x`. */
export async function normaliseGithub(raw: string | null | undefined): Promise<string | null> {
    const s = clean(raw)
    if (!s) return null
    const user = s
        .replace(/^https?:\/\//i, "")
        .replace(/^(www\.)?github\.com\//i, "")
        .replace(/^@/, "")
        .split(/[/?#]/)[0]
    return user ? `https://github.com/${user}` : null
}

/** `x`, `@x`, `twitter.com/x`, `x.com/x` -> `https://x.com/x`. */
export async function normaliseTwitter(raw: string | null | undefined): Promise<string | null> {
    const s = clean(raw)
    if (!s) return null
    const handle = s
        .replace(/^https?:\/\//i, "")
        .replace(/^(www\.)?(twitter|x)\.com\//i, "")
        .replace(/^@/, "")
        .split(/[/?#]/)[0]
    return handle ? `https://x.com/${handle}` : null
}

/** Anything that looks like a URL gets an https:// if it has none. */
export async function normaliseUrl(raw: string | null | undefined): Promise<string | null> {
    const s = clean(raw)
    if (!s) return null
    return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

export async function getMyProfileLinks(): Promise<ProfileLinks> {
    const session = await getSession(await headers())
    if (!session?.user?.id) return { linkedinUrl: null, githubUrl: null, twitterUrl: null, websiteUrl: null }

    const [row] = await db
        .select({
            linkedinUrl: users.linkedinUrl,
            githubUrl: users.githubUrl,
            twitterUrl: users.twitterUrl,
            websiteUrl: users.websiteUrl,
        })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1)

    return {
        linkedinUrl: row?.linkedinUrl ?? null,
        githubUrl: row?.githubUrl ?? null,
        twitterUrl: row?.twitterUrl ?? null,
        websiteUrl: row?.websiteUrl ?? null,
    }
}

/**
 * Save the four links.
 *
 * Only writes the fields it was given a value for, so importing with GitHub alone cannot
 * blank a LinkedIn URL the user set on their profile. `null` is "leave alone" here, not
 * "clear" - clearing is done on the profile page, which is where deleting a link is an
 * action the user is deliberately taking.
 */
export async function saveMyProfileLinks(input: {
    linkedinUrl?: string | null
    githubUrl?: string | null
    twitterUrl?: string | null
    websiteUrl?: string | null
}): Promise<{ success: boolean }> {
    try {
        const session = await getSession(await headers())
        if (!session?.user?.id) return { success: false }

        const patch: Record<string, string> = {}
        const linkedin = await normaliseUrl(input.linkedinUrl)
        const github = await normaliseGithub(input.githubUrl)
        const twitter = await normaliseTwitter(input.twitterUrl)
        const website = await normaliseUrl(input.websiteUrl)
        if (linkedin) patch.linkedinUrl = linkedin
        if (github) patch.githubUrl = github
        if (twitter) patch.twitterUrl = twitter
        if (website) patch.websiteUrl = website

        if (Object.keys(patch).length === 0) return { success: true }

        await db.update(users).set(patch).where(eq(users.id, session.user.id))
        return { success: true }
    } catch (error: unknown) {
        // Never fail the import over this. The links are a convenience for next time; the
        // draft the user actually asked for matters more.
        console.error("[profile-links] save failed:", error)
        return { success: false }
    }
}

/**
 * The profile editor's Links section (plan/profile PRF-11): the one place a link is
 * deliberately CLEARED, which `saveMyProfileLinks` above refuses to do. An empty
 * field here means "remove it". The website is edited in the Edit Profile sheet
 * (`users.website`), so it is not part of this.
 */
export async function setMyProfileLinks(input: {
    githubUrl: string
    linkedinUrl: string
    twitterUrl: string
}): Promise<{ success: true; links: ProfileLinks } | { success: false; error: string }> {
    try {
        const session = await getSession(await headers())
        if (!session?.user?.id) return { success: false, error: "Not authenticated" }

        const linkedin = await normaliseUrl(input.linkedinUrl)
        if (linkedin && !/^https?:\/\/([a-z0-9-]+\.)*linkedin\.com\//i.test(linkedin)) {
            return { success: false, error: "That is not a LinkedIn link" }
        }
        await db.update(users).set({
            githubUrl: await normaliseGithub(input.githubUrl),
            linkedinUrl: linkedin,
            twitterUrl: await normaliseTwitter(input.twitterUrl),
        }).where(eq(users.id, session.user.id))

        revalidatePath("/profile")
        return { success: true, links: await getMyProfileLinks() }
    } catch (error: unknown) {
        console.error("[profile-links] set failed:", error)
        return { success: false, error: "Could not save your links" }
    }
}
