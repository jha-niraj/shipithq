import { SARVAM_LANGUAGE, VOICE_UNAVAILABLE, isSarvamConfigured, sarvamFetch, type SarvamResult } from "./client"

// Text to speech (plan/practice-workspace, PW-4). One call per finished reply;
// the answer is base64 WAV, which the browser plays straight from a data URL.

export const SARVAM_TTS_MODEL = "bulbul:v3"
/** The mentor's voice: Bulbul v3's default, even and calm (Niraj, 2026-09-22). */
export const SARVAM_SPEAKER = "shubh"
/** bulbul:v3 takes 2500 characters; a mentor turn that long is a bug elsewhere. */
export const MAX_SPEECH_CHARS = 2000

export async function synthesize(input: {
    text: string
    speaker?: string
    languageCode?: string
}): Promise<SarvamResult<{ audioBase64: string; mimeType: string }>> {
    if (!isSarvamConfigured()) return { success: false, error: VOICE_UNAVAILABLE, unavailable: true }
    const text = input.text.trim().slice(0, MAX_SPEECH_CHARS)
    if (!text) return { success: false, error: "There is nothing to say." }

    try {
        const res = await sarvamFetch("/text-to-speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text,
                target_language_code: input.languageCode ?? SARVAM_LANGUAGE,
                model: SARVAM_TTS_MODEL,
                speaker: input.speaker ?? SARVAM_SPEAKER,
            }),
        })
        if (!res.ok) {
            const detail = await res.text().catch(() => "")
            console.error("[sarvam/tts]", res.status, detail.slice(0, 300))
            if (res.status === 401 || res.status === 403) return { success: false, error: VOICE_UNAVAILABLE, unavailable: true }
            return { success: false, error: "Could not read that out." }
        }
        // The audio arrives in chunks that are one file once joined.
        const data = (await res.json()) as { audios?: string[] }
        const audioBase64 = (data.audios ?? []).join("")
        if (!audioBase64) return { success: false, error: "Could not read that out." }
        return { success: true, audioBase64, mimeType: "audio/wav" }
    } catch (error: unknown) {
        console.error("[sarvam/tts] failed:", error)
        return { success: false, error: "Could not read that out." }
    }
}
