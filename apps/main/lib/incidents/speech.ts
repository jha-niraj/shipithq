import "server-only"
import { createHash } from "node:crypto"
import { isSarvamConfigured, synthesize } from "@repo/sarvamai/speech"
import { getR2Object, getR2SignedUrl, isR2Configured, uploadToR2 } from "@/lib/r2-client"

/**
 * Speech for Incidents (plan/incidents INC-21, INC-31): Sarvam text to speech, cached in
 * R2 by a hash of the text when `cacheAs` is given (the same words are never paid for
 * twice), and returned inline as a data URL when R2 is not configured or the text is
 * one-off (an answer to a question).
 */

export type Spoken = { success: true; url: string } | { success: false; error: string; unavailable?: boolean }

export async function speak(text: string, cacheAs?: string): Promise<Spoken> {
    if (!isSarvamConfigured()) return { success: false, error: "Voice is not available.", unavailable: true }
    const clean = text.trim()
    if (!clean) return { success: false, error: "Nothing to say." }
    if (!cacheAs || !isR2Configured()) {
        const s = await synthesize({ text: clean })
        return s.success ? { success: true, url: `data:${s.mimeType};base64,${s.audioBase64}` } : { success: false, error: s.error, unavailable: s.unavailable }
    }
    const key = `incidents/speech/${cacheAs}-${createHash("sha256").update(clean).digest("hex").slice(0, 16)}.wav`
    const existing = await getR2Object(key)
    if (existing) {
        await existing.body.cancel().catch(() => undefined)
        return { success: true, url: await getR2SignedUrl(key, 24 * 60 * 60) }
    }
    const s = await synthesize({ text: clean })
    if (!s.success) return { success: false, error: s.error, unavailable: s.unavailable }
    await uploadToR2({ key, body: Buffer.from(s.audioBase64, "base64"), contentType: s.mimeType })
    return { success: true, url: await getR2SignedUrl(key, 24 * 60 * 60) }
}
