"use server"

import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { db, users, resumeFiles } from "@repo/db"
import { and, desc, eq } from "drizzle-orm"
import { uploadToR2, deleteFromR2, getR2SignedUrl, isR2Configured, warnIfR2Misconfigured } from "@/lib/r2-client"
import { startBackgroundJob } from "@/actions/(main)/workers/jobs.action"

async function extractTextFromPDFBuffer(buffer: ArrayBuffer): Promise<string> {
    try {
        const { extractText } = await import("unpdf")
        // `.slice(0)` is a COPY, and it is load-bearing. unpdf hands the array to
        // pdf.js, which takes ownership of it and DETACHES the underlying
        // ArrayBuffer. The caller still needs those bytes to upload the file to
        // R2 afterwards, and on a detached buffer `new Uint8Array(buffer)` throws
        // "Cannot perform Construct on a detached ArrayBuffer" - which is exactly
        // how every PDF resume upload failed after its text had been extracted.
        const uint8 = new Uint8Array(buffer.slice(0))
        const { text } = await extractText(uint8, { mergePages: true })
        return text?.trim() ?? ""
    } catch (error) {
        console.error("unpdf extraction error:", error)
        return ""
    }
}

async function extractTextFromDOCXBuffer(buffer: ArrayBuffer): Promise<string> {
    try {
        const mammoth = await import("mammoth")

        // `{ arrayBuffer }` is the BROWSER build's input. The server build wants
        // `{ buffer: Buffer }` and rejects an ArrayBuffer with "Could not find
        // file in options" - which the catch below then swallowed, so every DOCX
        // upload extracted nothing, dispatched no structuring job, and told the
        // user we could not read their file.
        //
        // Buffer exists here (the Worker runs with nodejs_compat), so prefer it
        // and keep the arrayBuffer form as the fallback for a browser bundle.
        const result = typeof Buffer !== "undefined"
            ? await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
            : await mammoth.extractRawText({ arrayBuffer: buffer })

        return result.value?.trim() ?? ""
    } catch (error: unknown) {
        // Logged rather than silent: an extractor that returns "" is
        // indistinguishable from a scanned PDF, and that ambiguity is exactly
        // what hid the bug above.
        console.error("mammoth extraction error:", error)
        return ""
    }
}

export async function extractResumeText(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    const isDocx =
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.toLowerCase().endsWith(".docx")

    if (isPdf) return extractTextFromPDFBuffer(buffer)
    if (isDocx) return extractTextFromDOCXBuffer(buffer)
    return ""
}

/**
 * Hand the freshly extracted text to the worker to be turned into a structured
 * resume draft.
 *
 * Best-effort and never awaited for its result: the upload has already
 * succeeded by this point, and a parser that is down must not turn a stored
 * resume into an error the user sees. If it fails they still have their file,
 * their text, and every non-AI feature that reads it.
 *
 * Free (no `cost`): the user did not ask for a generation, we are doing this
 * because the rest of the product needs it.
 */
async function dispatchResumeStructuring(draftName: string): Promise<string | undefined> {
    try {
        const res = await startBackgroundJob(
            "resume_structure",
            { draftName },
            {
                // One structuring run at a time. Re-uploading twice in a minute is
                // a correction, not a request for two resumes.
                singleFlight: true,
            },
        )
        return res.success ? res.jobId : undefined
    } catch (error: unknown) {
        console.error("Resume structuring dispatch failed:", error)
        return undefined
    }
}

/**
 * The mirror (plan/profile PRF-17): `users.resume` / `resume_text` / `has_resume`
 * always equal the PRIMARY `resume_file`, so every reader that predates that table
 * keeps working. Call after anything that changes which file is primary.
 */
async function syncPrimaryMirror(userId: string) {
    const primary = await db.query.resumeFiles.findFirst({
        where: and(eq(resumeFiles.userId, userId), eq(resumeFiles.isPrimary, true)),
        columns: { r2Key: true, text: true },
    })
    await db.update(users).set(
        primary
            ? { hasResume: true, resume: primary.r2Key, resumeText: primary.text }
            : { hasResume: false, resume: null, resumeText: null },
    ).where(eq(users.id, userId))
}

/**
 * Upload a resume file. It is stored as a NEW `resume_file` and becomes the primary
 * (the newest upload is what AI features read until the user picks another).
 *
 * `options.name` names the file in the Resume pane; `options.buildDraft` (default
 * true, so onboarding and the hub behave as before) also turns its text into an
 * editable draft in the Resume Builder through the `resume_structure` job.
 */
export async function uploadResume(
    file: File,
    _resumeText?: string,
    options?: { draftName?: string; name?: string; buildDraft?: boolean },
) {
    const session = await getSession(headers())
    if (!session?.user?.id) {
        throw new Error("You must be logged in to upload a resume")
    }
    const userId = session.user.id

    // Server-side text extraction: unpdf for PDF, mammoth for DOCX.
    const buffer = await file.arrayBuffer()
    const lower = file.name.toLowerCase()
    const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf")
    const isDocx =
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        lower.endsWith(".docx")

    const displayName = (options?.name?.trim() || file.name.replace(/\.(pdf|docx?|PDF|DOCX?)$/, "")).slice(0, 120) || "My resume"
    const draftName = options?.draftName?.trim() || displayName
    const buildDraft = options?.buildDraft !== false

    let resumeText = _resumeText ?? ""
    if (!resumeText) {
        if (isPdf) resumeText = await extractTextFromPDFBuffer(buffer).catch(() => "")
        else if (isDocx) resumeText = await extractTextFromDOCXBuffer(buffer).catch(() => "")
    }
    if (resumeText.length > 50000) resumeText = resumeText.substring(0, 50000)

    let r2Key: string | null = null
    let message: string | undefined
    if (!isR2Configured()) {
        warnIfR2Misconfigured()
        if (!resumeText) {
            return { success: false, url: undefined, message: "Storage not configured and no resume text provided" }
        }
        message = "Resume text saved (file upload disabled)"
    } else {
        try {
            r2Key = `resumes/${userId}-${Date.now()}-${file.name}`
            await uploadToR2({
                key: r2Key,
                body: new Uint8Array(buffer),
                contentType: file.type,
                metadata: { userId, originalName: file.name, uploadDate: new Date().toISOString() },
            })
        } catch (error: unknown) {
            console.error("Resume upload failed:", error)
            r2Key = null
            if (!resumeText) throw new Error("Failed to upload resume. Please try again.")
            message = "Resume text saved but file upload failed."
        }
    }

    // The new file becomes the primary; every other file stops being one.
    const [row] = await db.batch([
        db.insert(resumeFiles).values({
            userId,
            name: displayName,
            r2Key,
            mimeType: file.type || null,
            sizeBytes: file.size,
            text: resumeText || null,
            isPrimary: false,
        }).returning({ id: resumeFiles.id }),
        db.update(resumeFiles).set({ isPrimary: false }).where(eq(resumeFiles.userId, userId)),
    ])
    const fileId = row[0]!.id
    await db.update(resumeFiles).set({ isPrimary: true }).where(eq(resumeFiles.id, fileId))
    await syncPrimaryMirror(userId)

    // Only worth structuring if there is text; a scanned PDF is stored but never parsed.
    const structureJobId = buildDraft && resumeText ? await dispatchResumeStructuring(draftName) : undefined
    revalidatePath("/profile")
    const url = r2Key ? await getR2SignedUrl(r2Key).catch(() => undefined) : undefined
    // `hasText` lets the caller tell "no text in the file" from "the build job did not start".
    return { success: true, url, structureJobId, fileId, message, hasText: !!resumeText }
}

export interface ResumeFileSummary {
    id: string
    name: string
    mimeType: string | null
    sizeBytes: number | null
    isPrimary: boolean
    createdAt: Date
    /** False when only the text was kept (storage off or the upload failed). */
    hasFile: boolean
    /** False for a scanned PDF: stored, but AI can read nothing from it. */
    hasText: boolean
}

/** The signed-in user's uploaded resumes, primary first, then newest. */
export async function listResumeFiles(): Promise<ResumeFileSummary[]> {
    const session = await getSession(headers())
    if (!session?.user?.id) return []
    const rows = await db.query.resumeFiles.findMany({
        where: eq(resumeFiles.userId, session.user.id),
        columns: { id: true, name: true, mimeType: true, sizeBytes: true, isPrimary: true, createdAt: true, r2Key: true, text: true },
        orderBy: [desc(resumeFiles.isPrimary), desc(resumeFiles.createdAt)],
    })
    return rows.map((r) => ({
        id: r.id, name: r.name, mimeType: r.mimeType, sizeBytes: r.sizeBytes, isPrimary: r.isPrimary,
        createdAt: r.createdAt, hasFile: !!r.r2Key, hasText: !!r.text?.trim(),
    }))
}

async function ownFile(id: string) {
    const session = await getSession(headers())
    if (!session?.user?.id) return null
    const row = await db.query.resumeFiles.findFirst({
        where: and(eq(resumeFiles.id, id), eq(resumeFiles.userId, session.user.id)),
    })
    return row ? { userId: session.user.id, row } : null
}

/** Make this file the one AI features read. */
export async function setPrimaryResumeFile(id: string) {
    const own = await ownFile(id)
    if (!own) return { success: false as const, error: "Resume not found" }
    await db.batch([
        db.update(resumeFiles).set({ isPrimary: false }).where(eq(resumeFiles.userId, own.userId)),
        db.update(resumeFiles).set({ isPrimary: true }).where(eq(resumeFiles.id, id)),
    ])
    await syncPrimaryMirror(own.userId)
    revalidatePath("/profile")
    return { success: true as const }
}

/**
 * Delete one uploaded resume: the stored object, then the row. Deleting the primary
 * promotes the newest remaining file, or clears the mirror when none is left.
 */
export async function deleteResumeFile(id: string) {
    const own = await ownFile(id)
    if (!own) return { success: false as const, error: "Resume not found" }
    if (own.row.r2Key) {
        try {
            await deleteFromR2(own.row.r2Key)
        } catch (error: unknown) {
            // The row goes regardless: a user asking to delete a file must not be
            // stuck with it because storage was briefly unreachable.
            console.error("Failed to delete resume object from R2:", error)
        }
    }
    await db.delete(resumeFiles).where(eq(resumeFiles.id, id))
    if (own.row.isPrimary) {
        const next = await db.query.resumeFiles.findFirst({
            where: eq(resumeFiles.userId, own.userId),
            orderBy: [desc(resumeFiles.createdAt)],
            columns: { id: true },
        })
        if (next) await db.update(resumeFiles).set({ isPrimary: true }).where(eq(resumeFiles.id, next.id))
    }
    await syncPrimaryMirror(own.userId)
    revalidatePath("/profile")
    return { success: true as const }
}

/** A short-lived link to one uploaded file, fetched on click. */
export async function getResumeFileUrl(id: string) {
    const own = await ownFile(id)
    if (!own?.row.r2Key) return null
    try {
        return { url: await getR2SignedUrl(own.row.r2Key, 60 * 60), name: own.row.name }
    } catch (error: unknown) {
        console.error("Failed to sign resume URL:", error)
        return null
    }
}

/**
 * Delete the PRIMARY uploaded resume (the old single-file API, kept for the user
 * store). Another file, if any, becomes primary.
 */
export async function deleteResume() {
    const session = await getSession(headers())
    if (!session?.user?.id) {
        throw new Error("You must be logged in to delete your resume")
    }
    const primary = await db.query.resumeFiles.findFirst({
        where: and(eq(resumeFiles.userId, session.user.id), eq(resumeFiles.isPrimary, true)),
        columns: { id: true },
    })
    if (primary) {
        const res = await deleteResumeFile(primary.id)
        if (!res.success) throw new Error("Failed to delete resume. Please try again.")
        return { success: true }
    }
    await db.update(users).set({ hasResume: false, resume: null, resumeText: null }).where(eq(users.id, session.user.id))
    revalidatePath("/profile")
    return { success: true }
}

export async function getResume() {
    const session = await getSession(headers())
    if (!session?.user?.id) return null
    const userId = session.user.id

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { hasResume: true, resume: true },
        })

        if (!user?.hasResume || !user?.resume) return null

        const signedUrl = await getR2SignedUrl(user.resume)
        const originalName = user.resume.split("-").slice(2).join("-") || "resume.pdf"
        return { url: signedUrl, name: originalName }
    } catch (error) {
        console.error("Failed to fetch resume:", error)
        return null
    }
}

export async function getResumeSignedUrl(expiresIn = 7 * 24 * 60 * 60) {
    const session = await getSession(headers())
    if (!session?.user?.id) return null
    const userId = session.user.id

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { hasResume: true, resume: true },
        })

        if (!user?.hasResume || !user?.resume) return null

        const signedUrl = await getR2SignedUrl(user.resume, expiresIn)
        const originalName = user.resume.split("-").slice(2).join("-") || "resume.pdf"
        return { url: signedUrl, name: originalName }
    } catch (error) {
        console.error("Failed to generate signed URL:", error)
        return null
    }
}
