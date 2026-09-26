"use server"

import { createHash } from "node:crypto"
import { isSarvamConfigured, synthesize } from "@repo/sarvamai/speech"
import { getIncidentCase } from "@/content/incidents/cases"
import { getR2Object, getR2SignedUrl, isR2Configured, uploadToR2 } from "@/lib/r2-client"

/**
 * Narration for an Incidents chapter (plan/incidents INC-21): the incident lead reads
 * one paragraph aloud, with Sarvam's text to speech. The audio is the same for every
 * reader, so each paragraph is synthesised once and kept in R2 (private, served by a
 * signed URL; CLAUDE.md "Images go to R2"), keyed by a hash of its text: editing a
 * paragraph makes new audio, and an unchanged one is never paid for twice.
 *
 * Without R2 (a local .env with placeholder keys), it still works: the audio comes
 * back inline as a data URL and is simply not cached.
 *
 * Reading is free, so this works signed out too; the text only ever comes from the
 * case file, never from the caller.
 */

type Result = { success: true; url: string } | { success: false; error: string; unavailable?: boolean }

export async function narrationFor(slug: string, chapterId: string, index: number): Promise<Result> {
    const c = getIncidentCase(slug)
    const chapter = c?.chapters?.find((ch) => ch.id === chapterId)
    const says = chapter?.blocks.filter((b): b is { kind: "say"; text: string } => b.kind === "say") ?? []
    const text = says[index]?.text
    if (!text) return { success: false, error: "Nothing to read." }
    if (!isSarvamConfigured()) return { success: false, error: "Narration is not available.", unavailable: true }
    if (!isR2Configured()) {
        const spoken = await synthesize({ text })
        return spoken.success
            ? { success: true, url: `data:${spoken.mimeType};base64,${spoken.audioBase64}` }
            : { success: false, error: spoken.error, unavailable: spoken.unavailable }
    }

    const hash = createHash("sha256").update(text).digest("hex").slice(0, 16)
    const key = `incidents/narration/${slug}/${chapterId}-${index}-${hash}.wav`
    try {
        const existing = await getR2Object(key)
        if (existing) {
            await existing.body.cancel().catch(() => undefined)
            return { success: true, url: await getR2SignedUrl(key, 24 * 60 * 60) }
        }
        const spoken = await synthesize({ text })
        if (!spoken.success) return { success: false, error: spoken.error, unavailable: spoken.unavailable }
        await uploadToR2({ key, body: Buffer.from(spoken.audioBase64, "base64"), contentType: spoken.mimeType })
        return { success: true, url: await getR2SignedUrl(key, 24 * 60 * 60) }
    } catch (error: unknown) {
        console.error("[incidents] narration failed:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not read that out." }
    }
}
