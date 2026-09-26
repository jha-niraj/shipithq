import { NextRequest } from "next/server"
import { getSession } from "@repo/auth"
import { signedUrlFor } from "@/lib/voice/proxy"

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/voice/sarvam/orgs/:org/workspaces/:ws/apps/:app/url
//
// The Sarvam browser SDK's `baseUrl` (plan/voice VO-4). It returns a single-use
// signed WebSocket URL for our interviewer agent, with the key added here, to a
// signed-in user who owns the live, consented voice interview named in the
// X-Voice-Session header. Same-origin only: no CORS headers are sent.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const session = await getSession(request.headers)
    const { path } = await params
    const reply = await signedUrlFor(session?.user?.id ?? null, path, request.headers.get("x-voice-session"))
    return new Response(reply.body, { status: reply.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } })
}
