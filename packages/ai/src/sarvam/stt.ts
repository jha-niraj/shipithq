import { SARVAM_LANGUAGE, VOICE_UNAVAILABLE, isSarvamConfigured, sarvamFetch, type SarvamResult } from "./client"

// Speech to text (plan/practice-workspace, PW-4).
//
// The REST endpoint, called with the audio recorded SO FAR every couple of
// seconds, rather than Sarvam's WebSocket. The socket would give word-by-word
// text, but it cannot be opened from the browser without handing it the key, and
// relaying it needs a long-lived connection in the worker. Niraj chose the
// simpler shape (2026-09-22): words land in the composer in bursts of about two
// seconds, the key stays on the server, and there is nothing to keep alive.

/** Longest clip accepted per call. Sarvam's sync endpoint is for short audio. */
export const MAX_CLIP_SECONDS = 30
export const MAX_CLIP_BYTES = 8 * 1024 * 1024

export const SARVAM_STT_MODEL = "saarika:v2.5"

export async function transcribe(input: {
    audio: Blob
    /** A filename decides the container Sarvam reads; keep the recorder's type. */
    filename?: string
    languageCode?: string
}): Promise<SarvamResult<{ text: string; languageCode?: string }>> {
    if (!isSarvamConfigured()) return { success: false, error: VOICE_UNAVAILABLE, unavailable: true }
    if (input.audio.size === 0) return { success: true, text: "" }
    if (input.audio.size > MAX_CLIP_BYTES) return { success: false, error: "That recording is too long." }

    const form = new FormData()
    form.append("file", input.audio, input.filename ?? "speech.webm")
    form.append("model", SARVAM_STT_MODEL)
    form.append("language_code", input.languageCode ?? SARVAM_LANGUAGE)

    try {
        const res = await sarvamFetch("/speech-to-text", { method: "POST", body: form })
        if (!res.ok) {
            const detail = await res.text().catch(() => "")
            console.error("[sarvam/stt]", res.status, detail.slice(0, 300))
            // 401 and 403 are a key problem, which is "unavailable", not "try again".
            if (res.status === 401 || res.status === 403) return { success: false, error: VOICE_UNAVAILABLE, unavailable: true }
            return { success: false, error: "Could not hear that. Try again." }
        }
        const data = (await res.json()) as { transcript?: string; language_code?: string }
        return { success: true, text: (data.transcript ?? "").trim(), languageCode: data.language_code }
    } catch (error: unknown) {
        console.error("[sarvam/stt] failed:", error)
        return { success: false, error: "Could not hear that. Try again." }
    }
}
