import { SARVAM_LANGUAGE, VOICE_UNAVAILABLE, isSarvamConfigured, sarvamFetch, type SarvamResult } from "./client"
import { SARVAM_SPEAKER, SARVAM_TTS_MODEL } from "./tts"

// Streaming text to speech (plan/voice VO-2): mp3 bytes as they are made, so
// playback starts before the whole reply is synthesised. A non-200 reply is a
// JSON error and is returned as one, never streamed to a player.

/** The stream endpoint takes up to 3500 characters. */
export const MAX_STREAM_CHARS = 3500

export async function synthesizeStream(input: {
    text: string
    speaker?: string
    languageCode?: string
    /** 0.3 to 3, 1 is normal. */
    pace?: number
}): Promise<SarvamResult<{ stream: ReadableStream<Uint8Array>; mimeType: string }>> {
    if (!isSarvamConfigured()) return { success: false, error: VOICE_UNAVAILABLE, unavailable: true }
    const text = input.text.trim().slice(0, MAX_STREAM_CHARS)
    if (!text) return { success: false, error: "There is nothing to say." }
    try {
        const res = await sarvamFetch("/text-to-speech/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text,
                language_code: input.languageCode ?? SARVAM_LANGUAGE,
                model: SARVAM_TTS_MODEL,
                speaker: input.speaker ?? SARVAM_SPEAKER,
                output_audio_codec: "mp3",
                ...(input.pace ? { pace: Math.min(3, Math.max(0.3, input.pace)) } : {}),
            }),
        })
        if (!res.ok || !res.body) {
            const detail = await res.text().catch(() => "")
            console.error("[sarvam/tts-stream]", res.status, detail.slice(0, 300))
            if (res.status === 401 || res.status === 403) return { success: false, error: VOICE_UNAVAILABLE, unavailable: true }
            return { success: false, error: "Could not read that out." }
        }
        return { success: true, stream: res.body, mimeType: "audio/mpeg" }
    } catch (error: unknown) {
        console.error("[sarvam/tts-stream] failed:", error)
        return { success: false, error: "Could not read that out." }
    }
}
