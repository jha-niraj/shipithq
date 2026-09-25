"use server"

import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import {
    db, resumeDraft, users,
    workExperiences, portfolioProjects, projectLinks, userEducations, skills,
} from "@repo/db"
import { and, eq } from "drizzle-orm"
import type { ResumeDraftContent } from "@/types/resume-draft"
import { normalizeProjectLinkType } from "@repo/db/profile-values"

/**
 * Push what the user typed into a resume back onto their profile.
 *
 * ── The direction that was missing ──
 *
 * `syncProfileToResumeDraft` reads the profile INTO a draft, and the editor's Sync Profile
 * button calls it. Nothing ever went the other way, so the editor was a write-only surface:
 * you could type four jobs, two projects and a degree into a resume, press Save, and your
 * profile stayed empty. Which then made Sync Profile a no-op, because there was nothing on
 * the profile to sync - the two halves starved each other.
 *
 * ── The rules, and why each one is here ──
 *
 * 1. NEVER DELETE. A resume is a view of a career, frequently a deliberately trimmed one:
 *    you leave the Saturday job off a senior application. If this deleted profile rows the
 *    resume omitted, trimming a resume would silently destroy the record it was trimmed
 *    from.
 *
 * 2. MATCH ON CONTENT, NOT ID. A draft entry's `id` is a DB id only when it arrived from a
 *    profile sync; anything typed in the editor carries a `nanoid` that matches no row. Key
 *    on the identifying fields instead, or every save inserts another copy of the same job.
 *
 *    The key INCLUDES THE START DATE, and a matched row is consumed so no two draft entries
 *    can claim it. Both details are load-bearing: a real draft here held two separate stints
 *    at the same company under the same title, and on (company, role) alone the second
 *    entry matched the first one's row - so two jobs collapsed into one and the earlier
 *    stint was silently overwritten by the later one on the second save.
 *
 * 3. SKIP TAILORED DRAFTS. `createTailoredResume` makes a COPY rewritten by gpt-4o to suit
 *    one posting: reworded bullets, keywords leaned on, emphasis shifted. That is exactly
 *    what must not become the canonical history every future resume is generated from.
 *    `tailoredFor` marks those drafts and they are left alone.
 *
 * 4. SKIP ROWS THAT CANNOT BE WRITTEN. `start_date` is NOT NULL on all three tables, and a
 *    resume entry with no start date is perfectly normal while it is being filled in. Those
 *    are skipped, not defaulted to today - a wrong date is worse than a missing row.
 *
 * 5. NEVER FAIL THE SAVE. The draft is what the user pressed the button for. Every failure
 *    here is swallowed and counted.
 */

export interface ProfileWriteback {
    experience: number
    projects: number
    education: number
    skills: number
    skipped: number
}

const EMPTY: ProfileWriteback = { experience: 0, projects: 0, education: 0, skills: 0, skipped: 0 }

/** A local Date from a stored ISO string, or null. Never `new Date(bare)` - that is UTC. */
function toDate(iso: string | undefined | null): Date | null {
    if (!iso) return null
    const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(iso.trim())
    if (!m) return null
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3] ?? "1"))
}

const norm = (v: string | undefined | null) => (v ?? "").trim().toLowerCase()

/** Same year and month. Resume dates are month-precision, so comparing days would make two
 *  identical entries look different because one was stored on the 8th and one on the 1st. */
function sameMonth(a: Date | null | undefined, b: Date | null | undefined): boolean {
    if (!a || !b) return false
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}
const clean = (b: string[]) => b.map(x => x.trim()).filter(Boolean)

/**
 * A resume skill group is freeform text; `skills.category` is an 11-value pg enum. An
 * unmapped value is a database error, not a bad label, so anything unrecognised is skipped
 * rather than guessed into the wrong bucket.
 */
const CATEGORY: Record<string, string> = {
    language: "LANGUAGES", languages: "LANGUAGES", programming: "LANGUAGES",
    "programming languages": "LANGUAGES",
    frontend: "FRONTEND", "front end": "FRONTEND", "front-end": "FRONTEND", ui: "FRONTEND",
    backend: "BACKEND", "back end": "BACKEND", "back-end": "BACKEND", server: "BACKEND",
    api: "API", apis: "API",
    database: "DATABASE", databases: "DATABASE", db: "DATABASE",
    devops: "DEVOPS", infrastructure: "DEVOPS", infra: "DEVOPS", ci: "DEVOPS",
    cloud: "CLOUD",
    framework: "FRAMEWORKS_LIBRARIES", frameworks: "FRAMEWORKS_LIBRARIES",
    libraries: "FRAMEWORKS_LIBRARIES", "frameworks & libraries": "FRAMEWORKS_LIBRARIES",
    "frameworks and libraries": "FRAMEWORKS_LIBRARIES",
    tools: "TOOLS_DATABASES", tooling: "TOOLS_DATABASES",
    platforms: "PLATFORMS", platform: "PLATFORMS",
    ai: "AI_TOOLS", "ai tools": "AI_TOOLS", ml: "AI_TOOLS",
}

export async function syncResumeDraftToProfile(
    draftId: string,
    content: ResumeDraftContent,
): Promise<{ success: boolean; written?: ProfileWriteback }> {
    try {
        const session = await getSession(await headers())
        if (!session?.user?.id) return { success: false }
        const userId = session.user.id

        // Rule 3: a tailored copy is written for one job, not for the record.
        const [draft] = await db
            .select({ tailoredFor: resumeDraft.tailoredFor })
            .from(resumeDraft)
            .where(and(eq(resumeDraft.id, draftId), eq(resumeDraft.userId, userId)))
            .limit(1)
        if (!draft) return { success: false }
        if (draft.tailoredFor) return { success: true, written: EMPTY }

        const written: ProfileWriteback = { ...EMPTY }

        // ── Experience ────────────────────────────────────────────────────────
        const existingExp = await db
            .select({
                id: workExperiences.id,
                companyName: workExperiences.companyName,
                roleTitle: workExperiences.roleTitle,
                startDate: workExperiences.startDate,
            })
            .from(workExperiences)
            .where(eq(workExperiences.userId, userId))
        const claimedExp = new Set<string>()

        for (const e of content.experience ?? []) {
            const company = e.company?.trim()
            const role = e.role?.trim()
            const start = toDate(e.startDate)
            if (!company || !role || !start) { written.skipped++; continue }

            const match = existingExp.find(
                x => !claimedExp.has(x.id)
                    && norm(x.companyName) === norm(company)
                    && norm(x.roleTitle) === norm(role)
                    && sameMonth(x.startDate, start),
            )
            if (match) claimedExp.add(match.id)
            const row = {
                companyName: company,
                roleTitle: role,
                companyWebsite: e.companyUrl?.trim() || null,
                bulletPoints: clean(e.bullets ?? []),
                startDate: start,
                endDate: e.current ? null : toDate(e.endDate),
                isCurrentlyWorking: !!e.current,
            }
            if (match) {
                await db.update(workExperiences).set(row)
                    .where(and(eq(workExperiences.id, match.id), eq(workExperiences.userId, userId)))
            } else {
                await db.insert(workExperiences).values({ ...row, userId })
            }
            written.experience++
        }

        // ── Projects ──────────────────────────────────────────────────────────
        const existingProj = await db
            .select({ id: portfolioProjects.id, projectName: portfolioProjects.projectName })
            .from(portfolioProjects)
            .where(eq(portfolioProjects.userId, userId))
        const claimedProj = new Set<string>()

        for (const p of content.projects ?? []) {
            const name = p.name?.trim()
            if (!name) { written.skipped++; continue }

            const match = existingProj.find(x => !claimedProj.has(x.id) && norm(x.projectName) === norm(name))
            if (match) claimedProj.add(match.id)
            const row = {
                projectName: name,
                description: p.description?.trim() || null,
                bulletPoints: clean(p.bullets ?? []),
                technologies: (p.technologies ?? []).map(t => t.trim()).filter(Boolean),
            }
            let projectId = match?.id
            if (match) {
                await db.update(portfolioProjects).set(row)
                    .where(and(eq(portfolioProjects.id, match.id), eq(portfolioProjects.userId, userId)))
            } else {
                // `projectType` and `startDate` are NOT NULL with no default. A resume
                // project carries neither, so they take the same fallbacks the profile's
                // own Add Project sheet uses rather than blocking the write.
                const [created] = await db.insert(portfolioProjects).values({
                    ...row, userId, projectType: "PERSONAL", startDate: new Date(),
                }).returning({ id: portfolioProjects.id })
                projectId = created?.id
            }

            // Links live in their own table, one row per type.
            if (projectId) {
                const links = await db.select({ id: projectLinks.id, linkType: projectLinks.linkType })
                    .from(projectLinks).where(eq(projectLinks.projectId, projectId))
                for (const [linkType, url] of [["GITHUB", p.github], ["LIVE_SITE", p.liveUrl]] as const) {
                    const value = url?.trim()
                    if (!value) continue
                    // Compared normalised: rows from before PRF-7 say "LIVE SITE".
                    const existing = links.find(l => normalizeProjectLinkType(l.linkType) === linkType)
                    if (existing) {
                        await db.update(projectLinks).set({ url: value }).where(eq(projectLinks.id, existing.id))
                    } else {
                        await db.insert(projectLinks).values({ projectId, linkType, url: value })
                    }
                }
            }
            written.projects++
        }

        // ── Education ─────────────────────────────────────────────────────────
        const existingEdu = await db
            .select({
                id: userEducations.id,
                institution: userEducations.institution,
                degree: userEducations.degree,
                startDate: userEducations.startDate,
            })
            .from(userEducations)
            .where(eq(userEducations.userId, userId))
        const claimedEdu = new Set<string>()

        for (const e of content.education ?? []) {
            const institution = e.institution?.trim()
            const start = toDate(e.startDate)
            if (!institution || !start) { written.skipped++; continue }

            const match = existingEdu.find(
                x => !claimedEdu.has(x.id)
                    && norm(x.institution) === norm(institution)
                    && norm(x.degree) === norm(e.degree)
                    && sameMonth(x.startDate, start),
            )
            if (match) claimedEdu.add(match.id)
            const row = {
                institution,
                degree: e.degree?.trim() || null,
                bulletPoints: clean(e.bullets ?? []),
                startDate: start,
                endDate: toDate(e.endDate),
            }
            if (match) {
                await db.update(userEducations).set(row)
                    .where(and(eq(userEducations.id, match.id), eq(userEducations.userId, userId)))
            } else {
                await db.insert(userEducations).values({ ...row, userId })
            }
            written.education++
        }

        // ── Skills ────────────────────────────────────────────────────────────
        const existingSkills = await db
            .select({ id: skills.id, name: skills.name })
            .from(skills)
            .where(eq(skills.userId, userId))

        for (const group of content.skills ?? []) {
            const category = CATEGORY[norm(group.category)]
            if (!category) { written.skipped += group.items.length; continue }
            for (const item of group.items) {
                const name = item.trim()
                if (!name) continue
                if (existingSkills.some(x => norm(x.name) === norm(name))) continue
                await db.insert(skills).values({
                    userId, name, category: category as typeof skills.$inferInsert.category,
                    // `level` is NOT NULL and a resume records none. The profile's own
                    // sheet offers four; the middle one is the honest default.
                    level: "intermediate",
                })
                written.skills++
            }
        }

        return { success: true, written }
    } catch (error: unknown) {
        // Rule 5. The draft save is the thing the user asked for.
        console.error("[resume-to-profile] writeback failed:", error)
        return { success: false }
    }
}
