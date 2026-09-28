"use server"

import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { db, resumeDraft, coerceResumeDraftContent } from "@repo/db"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { toErrorMessage } from "@/lib/errors"
import { resolveUserResume, buildContentFromProfile, type ResumeSource } from "@/lib/resume/primary"
import { startBackgroundJob } from "@/actions/(main)/workers/jobs.action"
import { priceOf } from "@/lib/credits/pricing"
import { recordResumeCreated } from "@/lib/resume/record-created"

// ─────────────────────────────────────────────────────────────────────────────
// JD-tailored resumes.
//
// Marking a default resume already exists upstream (`resumeDraft.isDefault`, the
// Star toggle in the resume hub). What did NOT exist, and is here:
//
// 1. **A resolver with a fallback chain.** Upstream's cover letter does a single
//    `findFirst orderBy(isDefault)`. If the user has no draft at all - which is most
//    people, who upload a PDF and never open the builder - that returns nothing and
//    the letter is written from the profile tables alone. `resolveUserResume` falls
//    back to the uploaded PDF and then to the profile, and renders one plain-text
//    form every consumer shares.
//
// 2. **Non-destructive tailoring.** `tailorResumeForJD` overwrites the draft it is
//    given - the honest resume you built is replaced by a version narrowed to one
//    application, and tailoring again narrows the already-narrowed copy.
//    `createTailoredResume` writes a SEPARATE draft and never touches the source.
//
// Neither costs credits, because neither did before. Introducing a price is a
// product decision, not a refactor.
// ─────────────────────────────────────────────────────────────────────────────

export interface ResolvedResumeSummary {
    source: ResumeSource
    draftId: string | null
    label: string
    /** True when the user has nothing to work from and should build one first. */
    isEmpty: boolean
    /** A short preview, so the UI can show what a generator will actually read. */
    preview: string
}

/**
 * Which resume the product will use for this user right now.
 *
 * Call this before any generate button so the UI can say "written from your
 * primary resume: Backend SWE" rather than leaving the user to guess. A user who
 * cannot see which document a cover letter was based on cannot tell a good result
 * from a stale one.
 */
export async function getResolvedResume(): Promise<
    { success: true; resume: ResolvedResumeSummary } | { success: false; error: string }
> {
    try {
        const session = await getSession(await headers())
        if (!session?.user?.id) return { success: false, error: "Unauthorized" }

        const resolved = await resolveUserResume(session.user.id)
        return {
            success: true,
            resume: {
                source: resolved.source,
                draftId: resolved.draftId,
                label: resolved.label,
                isEmpty: resolved.isEmpty,
                preview: resolved.text.slice(0, 600),
            },
        }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error, "Could not resolve your resume") }
    }
}

export interface CreateTailoredResumeInput {
    jobTitle: string
    company?: string
    jobDescription: string
    /** Defaults to the resolved primary. Pass to tailor from a specific resume. */
    sourceDraftId?: string
    /** Defaults to "<Job title> - <Company>". */
    name?: string
}

/**
 * Create a JD-tailored resume from the user's existing one.
 *
 * The point of this function, and the thing the user asked for: it does not ask for
 * experience, education or skills again. It reads what the user already has - the
 * primary resume, or whatever the resolver falls back to - and spins off a copy
 * narrowed to this job.
 *
 * The new draft is created here, populated with the SOURCE content, and handed to
 * the worker to rewrite. Created up front rather than by the job so that:
 *   - the user can open it immediately and see a real resume, not a spinner
 *   - a failed tailoring leaves a usable copy rather than an empty row
 *   - the job's input stays a pointer (two draft ids) rather than a payload
 */
export async function createTailoredResume(input: CreateTailoredResumeInput): Promise<{
    success: boolean
    draftId?: string
    jobId?: string
    sourceLabel?: string
    error?: string
    code?: string
    required?: number
    available?: number
}> {
    try {
        const session = await getSession(await headers())
        if (!session?.user?.id) return { success: false, error: "Unauthorized" }
        const userId = session.user.id

        const jobTitle = input.jobTitle.trim()
        const jobDescription = input.jobDescription.trim()
        if (!jobTitle) return { success: false, error: "Add the job title" }
        // Below this length there is nothing to tailor against and the model will
        // invent requirements to fill the gap.
        if (jobDescription.length < 80) {
            return { success: false, error: "Paste more of the job description - at least a few sentences" }
        }

        // Resolve the base resume. An explicit sourceDraftId wins; otherwise the
        // primary, then the resolver's fallbacks.
        let sourceDraftId = input.sourceDraftId ?? null
        let sourceLabel = ""
        let baseContent: unknown = null

        if (sourceDraftId) {
            const source = await db.query.resumeDraft.findFirst({
                where: and(eq(resumeDraft.id, sourceDraftId), eq(resumeDraft.userId, userId)),
            })
            if (!source) return { success: false, error: "That resume was not found" }
            sourceLabel = source.name
            baseContent = source.content
        } else {
            const resolved = await resolveUserResume(userId)
            if (resolved.isEmpty) {
                return {
                    success: false,
                    error: "Build a resume or fill in your profile first - there is nothing to tailor yet",
                }
            }
            sourceLabel = resolved.label
            if (resolved.draftId && resolved.content) {
                sourceDraftId = resolved.draftId
                baseContent = resolved.content
            } else {
                // The resolver fell back to the profile tables, or to an uploaded PDF
                // that has no structured form. Either way there is no draft to tailor
                // FROM, so materialise one - which also gives the user the master
                // resume they were missing, and marks it default so every other
                // feature starts using it too.
                //
                // A PDF's extracted text is deliberately NOT used as the base: it is
                // one unstructured blob, and asking a model to reverse it into
                // sections is how invented employers and dates get in.
                const content = resolved.content ?? (await buildContentFromProfile(userId))
                const hasAnything =
                    content.experience.length > 0 || content.projects.length > 0 || content.skills.length > 0
                if (!hasAnything) {
                    return {
                        success: false,
                        error:
                            "There is nothing to tailor yet. Add your experience and skills to your profile, or build a resume first.",
                    }
                }

                const [master] = await db
                    .insert(resumeDraft)
                    .values({
                        userId,
                        name: "My resume",
                        content: content as never,
                        importedFrom: "profile",
                        isDefault: true,
                    })
                    .returning({ id: resumeDraft.id, name: resumeDraft.name })
                if (!master) return { success: false, error: "Could not create your base resume" }
                // The activity ledger (plan/progress PRG-3).
                await recordResumeCreated(userId, master, "base")
                sourceDraftId = master.id
                sourceLabel = master.name
                baseContent = content
            }
        }

        if (!sourceDraftId || !baseContent) {
            return { success: false, error: "Could not work out which resume to tailor" }
        }

        const name =
            input.name?.trim() ||
            [jobTitle, input.company?.trim()].filter(Boolean).join(" - ") ||
            `Tailored - ${jobTitle}`

        // Seeded with the source content so it is immediately openable and readable.
        const [target] = await db
            .insert(resumeDraft)
            .values({
                userId,
                name,
                templateSlug: "clean-minimal",
                content: coerceResumeDraftContent(baseContent) as never,
                tailoredFor: jobTitle,
                tailoredForCompany: input.company?.trim() || null,
                jdSnapshot: jobDescription,
                sourceDraftId,
            })
            .returning({ id: resumeDraft.id })
        if (!target) return { success: false, error: "Could not create the tailored resume" }
        // The activity ledger (plan/progress PRG-3).
        await recordResumeCreated(userId, { id: target.id, name }, "tailored", { sourceDraftId, jobTitle, company: input.company?.trim() || null })

        // Same price the inline `tailorResumeForJD` charged. Rewiring the editor
        // to this action without it silently turned a 20-credit feature free.
        // The hold is taken here and settled or released by
        // `getBackgroundJobStatus` on the first terminal status, so a failed
        // tailoring refunds - which the inline version could not do once the
        // request had been killed.
        const started = await startBackgroundJob(
            "resume_tailor",
            {
                sourceDraftId,
                targetDraftId: target.id,
                jobTitle,
                company: input.company?.trim() || undefined,
                jobDescription,
            },
            {
                cost: priceOf("resume_tailor_jd"),
                reason: `Resume: tailored for ${jobTitle || "a job description"}`,
            },
        )

        if (!started.success) {
            // The draft exists and holds the untailored content, which is still
            // useful - so it is kept rather than rolled back, and the error says so.
            // `code`/`required`/`available` are passed through so the editor can
            // offer a route to /purchase on INSUFFICIENT_CREDITS instead of a
            // dead-end toast.
            return {
                success: false,
                draftId: target.id,
                error: started.code === "INSUFFICIENT_CREDITS"
                    ? (started.error ?? "Not enough credits to tailor this resume.")
                    : "Your resume was copied but tailoring could not start. Open it and try again.",
                code: started.code,
                required: started.required,
                available: started.available,
            }
        }

        revalidatePath("/ai/resume")
        return { success: true, draftId: target.id, jobId: started.jobId, sourceLabel }
    } catch (error: unknown) {
        console.error("[resume] createTailoredResume failed:", error)
        return { success: false, error: toErrorMessage(error, "Could not create the tailored resume") }
    }
}
