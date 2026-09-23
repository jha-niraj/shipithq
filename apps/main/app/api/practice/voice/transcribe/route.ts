import { NextRequest } from "next/server"
import { getSession } from "@repo/auth"
import { MAX_CLIP_BYTES, transcribe } from "@repo/ai/sarvam"

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/practice/voice/transcribe   multipart: audio
//
// The words said so far, for the mentor composer (plan/practice-workspace, PW-5).
// The browser records and posts the clip every couple of seconds; this returns
// the transcript for the WHOLE clip, which replaces what is in the box.
//
// A route rather than a server action because the payload is audio, and the key
// lives here rather than in the browser.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

export async function POST(request: NextRequest) {
    const session = await getSession(request.headers)
    if (!session?.user?.id) return json(401, { error: "Unauthorized" })

    let audio: File | null = null
    try {
        const form = await request.formData()
        const file = form.get("audio")
        audio = file instanceof File ? file : null
    } catch {
        return json(400, { error: "Expected an audio clip." })
    }
    if (!audio) return json(400, { error: "Expected an audio clip." })
    if (audio.size > MAX_CLIP_BYTES) return json(413, { error: "That recording is too long." })

    const result = await transcribe({ audio, filename: audio.name || "speech.webm" })
    if (!result.success) {
        // "Unavailable" is a state the panel shows, not a failure of this request.
        return json(result.unavailable ? 503 : 502, { error: result.error, unavailable: result.unavailable })
    }
    return json(200, { text: result.text })
}
