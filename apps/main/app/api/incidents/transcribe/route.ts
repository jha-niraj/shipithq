import { NextRequest } from "next/server"
import { MAX_CLIP_BYTES, transcribe } from "@repo/sarvamai/speech"

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/incidents/transcribe   multipart: audio
//
// Speech to text for asking the incident lead by voice (plan/incidents INC-48): the
// same shape as /api/practice/voice/transcribe, the whole clip so far in, its words out.
//
// TEMPORARY: no session required, so Niraj can test signed out (2026-09-27). The
// practice route needs a session, and a signed-out POST to it was redirected to
// /signin, which is the "Failed to find Server Action" 500. Put the check back with
// INC-52 before launch.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

export async function POST(request: NextRequest) {
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
    if (!result.success) return json(result.unavailable ? 503 : 502, { error: result.error, unavailable: result.unavailable })
    return json(200, { text: result.text })
}
