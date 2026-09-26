"use server"

import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import { isSarvamConfigured, synthesize } from "@repo/sarvamai/speech"

// The mentor's voice, on Sarvam (plan/practice-workspace, PW-4). Speech to text
// is the route at /api/practice/voice/transcribe, because it carries audio.

export async function speakMentorReply(text: string): Promise<
    { success: true; audioBase64: string; mimeType: string } | { success: false; error: string; unavailable?: boolean }
> {
    const session = await getSession(await headers())
    if (!session?.user?.id) return { success: false, error: "Not signed in." }
    const result = await synthesize({ text })
    if (!result.success) return { success: false, error: result.error, unavailable: result.unavailable }
    return { success: true, audioBase64: result.audioBase64, mimeType: result.mimeType }
}

/** Whether the panel should offer voice at all. */
export async function isVoiceAvailable(): Promise<boolean> {
    return isSarvamConfigured()
}
