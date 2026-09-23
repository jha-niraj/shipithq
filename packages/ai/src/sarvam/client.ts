// Sarvam AI, the voice provider for ShipItHQ (plan/practice-workspace, PW-4).
//
// Server only: `SARVAM_API_KEY` is a secret and never reaches a browser. The
// callers are a route handler (speech to text) and a server action (speech), and
// both hand the caller a plain result rather than throwing, because voice is a
// convenience on top of a typed conversation - a failed transcription must never
// fail the turn.
//
// Docs: https://docs.sarvam.ai (speech-to-text, text-to-speech).

export const SARVAM_BASE_URL = "https://api.sarvam.ai"

/** Indian English. Sarvam takes BCP-47 codes; "unknown" asks it to detect. */
export const SARVAM_LANGUAGE = "en-IN"

/** How long any one Sarvam call may take before it is abandoned. */
export const SARVAM_TIMEOUT_MS = 20_000

export type SarvamResult<T> =
    | ({ success: true } & T)
    | { success: false; error: string; unavailable?: boolean }

declare const process: { env: Record<string, string | undefined> }

/** The key, or null when voice is simply not configured in this environment. */
export function sarvamKey(): string | null {
    const key = process.env.SARVAM_API_KEY?.trim()
    return key ? key : null
}

export const isSarvamConfigured = (): boolean => sarvamKey() !== null

/** "Voice is off" is a state the UI shows, not an error it reports. */
export const VOICE_UNAVAILABLE = "Voice is unavailable right now. You can still type."

export async function sarvamFetch(
    path: string,
    init: { method: "POST"; body: BodyInit; headers?: Record<string, string> },
): Promise<Response> {
    const key = sarvamKey()
    if (!key) throw new Error("SARVAM_API_KEY is not set")
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SARVAM_TIMEOUT_MS)
    try {
        return await fetch(`${SARVAM_BASE_URL}${path}`, {
            method: init.method,
            headers: { "api-subscription-key": key, ...(init.headers ?? {}) },
            body: init.body,
            signal: controller.signal,
        })
    } finally {
        clearTimeout(timer)
    }
}
