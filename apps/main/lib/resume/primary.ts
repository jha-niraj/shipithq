import "server-only"

import { db, users, resumeDraft, workExperiences, userEducations, skills, portfolioProjects, socialLinks, certifications } from "@repo/db"
import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { renderResumeText, type ResumeDraftContent } from "@repo/db/resume"
import { normalizeProjectLinkType } from "@repo/db/profile-values"

export { renderResumeText }

// ─────────────────────────────────────────────────────────────────────────────
// "The user's resume", resolved once, in one place.
//
// This product had TWO unconnected resume systems and every feature picked one at
// random:
//
//   1. an uploaded PDF        `users.resume` / `users.resumeText` / `users.hasResume`
//                             read by mock interviews and knowme
//   2. a structured builder   the `resume_draft` table - templates, ATS scoring,
//                             JD tailoring
//
// Nothing bridged them. So the cover-letter generator built its applicant profile
// straight from the raw profile tables while the user's actual resume said
// something else - it could contradict the document it was attached to, and it
// threw away every curation decision the user had made in the builder.
//
// The fix is one resolver with an explicit priority order, and one plain-text
// rendering that every LLM consumer shares. If two features disagree about who
// the user is, that is now a bug in one function rather than an emergent property
// of six.
// ─────────────────────────────────────────────────────────────────────────────

export type ResumeSource = "default-draft" | "recent-draft" | "uploaded-pdf" | "profile" | "none"

export interface ResolvedResume {
    /** Where the content came from. Surface this in the UI - a user should know
     *  whether their cover letter was written from their curated resume or from a
     *  PDF they uploaded eight months ago. */
    source: ResumeSource
    /** Set when the source was a `resume_draft` row. */
    draftId: string | null
    /** Human label for the source, for UI ("Primary resume: Backend SWE"). */
    label: string
    /** Structured content, when the source has it. Null for `uploaded-pdf`. */
    content: ResumeDraftContent | null
    /** Plain-text rendering. Always populated except for `source: "none"`.
     *  This is what goes into a prompt - never the raw JSON. */
    text: string
    /** True when the user has nothing at all and should be sent to build one. */
    isEmpty: boolean
}

/**
 * Resolve the resume to use for this user.
 *
 * Priority, most to least authoritative:
 *
 *   1. the draft marked `isDefault`      an explicit choice by the user
 *   2. the newest UNTAILORED draft       the closest thing to a master; a
 *                                        JD-tailored copy is deliberately skipped,
 *                                        because tailoring narrows a resume to one
 *                                        job and using it as the base for a
 *                                        different job compounds the narrowing
 *   3. the uploaded PDF's extracted text unstructured, but it is what the user
 *                                        actually sends to employers
 *   4. the profile tables                synthesised; better than nothing
 */
export async function resolveUserResume(userId: string): Promise<ResolvedResume> {
    // Asked for directly rather than fetched-then-filtered.
    //
    // This used to take the 25 most recent drafts and `.find()` the first
    // untailored one in JS. Someone who tailors a lot - which is the whole point
    // of the feature - can easily have 25 tailored copies newer than their master,
    // and the master then falls off the end of the page. The resolver would drop
    // silently to the uploaded PDF, and their cover letters would quietly start
    // being written from a stale document.
    //
    // `isDefault DESC` first, then untailored-before-tailored, then recency: one
    // row, and it is correct however many drafts exist.
    const [chosen] = await db
        .select({
            id: resumeDraft.id,
            name: resumeDraft.name,
            content: resumeDraft.content,
            isDefault: resumeDraft.isDefault,
            tailoredFor: resumeDraft.tailoredFor,
        })
        .from(resumeDraft)
        .where(eq(resumeDraft.userId, userId))
        .orderBy(
            desc(resumeDraft.isDefault),
            sql`CASE WHEN ${resumeDraft.tailoredFor} IS NULL THEN 0 ELSE 1 END`,
            desc(resumeDraft.updatedAt),
        )
        .limit(1)

    const isDefaultPick = chosen?.isDefault ? chosen : undefined

    if (chosen) {
        const content = chosen.content as unknown as ResumeDraftContent
        return {
            source: isDefaultPick ? "default-draft" : "recent-draft",
            draftId: chosen.id,
            label: chosen.name,
            content,
            text: renderResumeText(content),
            isEmpty: false,
        }
    }

    const [user] = await db
        .select({ resumeText: users.resumeText, hasResume: users.hasResume, name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

    if (user?.hasResume && user.resumeText?.trim()) {
        return {
            source: "uploaded-pdf",
            draftId: null,
            label: "Uploaded resume",
            content: null,
            text: user.resumeText.trim(),
            isEmpty: false,
        }
    }

    const content = await buildContentFromProfile(userId)
    const text = renderResumeText(content)
    const hasAnything =
        content.experience.length > 0 || content.projects.length > 0 || content.skills.length > 0
    return {
        source: hasAnything ? "profile" : "none",
        draftId: null,
        label: hasAnything ? "Your profile" : "No resume yet",
        content: hasAnything ? content : null,
        text: hasAnything ? text : "",
        isEmpty: !hasAnything,
    }
}

/**
 * Synthesise resume content from the profile tables.
 *
 * The mapping is the same one `createDraftFromProfile` uses, and lives here so the
 * two cannot drift - the fallback a cover letter reads and the draft the builder
 * creates must describe the same person.
 */
export async function buildContentFromProfile(userId: string): Promise<ResumeDraftContent> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

    const [exp, projects, edu, links, userSkills, certs] = await Promise.all([
        db.query.workExperiences.findMany({
            where: eq(workExperiences.userId, userId),
            orderBy: [desc(workExperiences.startDate)],
        }),
        db.query.portfolioProjects.findMany({
            where: eq(portfolioProjects.userId, userId),
            orderBy: [desc(portfolioProjects.startDate)],
            with: { links: true },
        }),
        db.query.userEducations.findMany({
            where: eq(userEducations.userId, userId),
            orderBy: [desc(userEducations.startDate)],
        }),
        db.query.socialLinks.findMany({ where: eq(socialLinks.userId, userId) }),
        db.query.skills.findMany({ where: eq(skills.userId, userId) }),
        db.query.certifications.findMany({ where: eq(certifications.userId, userId) }),
    ])

    const skillMap = new Map<string, string[]>()
    for (const s of userSkills) {
        if (!skillMap.has(s.category)) skillMap.set(s.category, [])
        skillMap.get(s.category)!.push(s.name)
    }

    return {
        header: {
            name: user?.name ?? "",
            email: user?.email ?? "",
            phone: user?.phone ?? undefined,
            title: user?.occupation ?? undefined,
            location: user?.location ?? undefined,
            summary: user?.bio ?? undefined,
            github: links.find((l) => l.platform === "GITHUB")?.url,
            linkedin: links.find((l) => l.platform === "LINKEDIN")?.url,
            portfolio: links.find((l) => l.platform === "PORTFOLIO")?.url,
            website: links.find((l) => l.platform === "WEBSITE")?.url,
        },
        experience: exp.map((e) => ({
            id: e.id,
            company: e.companyName,
            role: e.roleTitle,
            startDate: e.startDate.toISOString(),
            endDate: e.endDate?.toISOString(),
            current: e.isCurrentlyWorking,
            bullets: (e.bulletPoints as string[]) ?? [],
        })),
        projects: projects.map((p) => ({
            id: p.id,
            name: p.projectName,
            description: p.description ?? undefined,
            technologies: (p.technologies as string[]) ?? [],
            github: p.links.find((l) => normalizeProjectLinkType(l.linkType) === "GITHUB")?.url,
            liveUrl: p.links.find((l) => { const t = normalizeProjectLinkType(l.linkType); return t === "LIVE_SITE" || t === "DEMO" })?.url,
            bullets: (p.bulletPoints as string[]) ?? [],
        })),
        education: edu.map((e) => ({
            id: e.id,
            institution: e.institution,
            degree: e.degree ?? undefined,
            startDate: e.startDate?.toISOString() ?? "",
            endDate: e.endDate?.toISOString(),
            bullets: (e.bulletPoints as string[]) ?? [],
        })),
        skills: Array.from(skillMap.entries()).map(([category, items]) => ({ category, items })),
        certifications: certs.map((c) => ({
            id: c.id,
            name: c.name,
            issuer: c.issuer,
            date: c.issuedDate?.toISOString(),
            url: c.link,
        })),
    }
}

/**
 * The primary draft's id, or null.
 *
 * Cheaper than `resolveUserResume` for callers that only need to know whether one
 * is set (a UI badge, a "mark as primary" button's state).
 */
export async function getDefaultDraftId(userId: string): Promise<string | null> {
    const [row] = await db
        .select({ id: resumeDraft.id })
        .from(resumeDraft)
        .where(and(eq(resumeDraft.userId, userId), eq(resumeDraft.isDefault, true)))
        .limit(1)
    return row?.id ?? null
}

/** Drafts that are candidates to BE the default: anything not JD-tailored. */
export async function listMasterCandidates(userId: string) {
    return db
        .select({
            id: resumeDraft.id,
            name: resumeDraft.name,
            isDefault: resumeDraft.isDefault,
            updatedAt: resumeDraft.updatedAt,
        })
        .from(resumeDraft)
        .where(and(eq(resumeDraft.userId, userId), isNull(resumeDraft.tailoredFor)))
        .orderBy(desc(resumeDraft.isDefault), desc(resumeDraft.updatedAt))
}
