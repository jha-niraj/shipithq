import "server-only"
import { isAgentConfigured, signedUrl } from "@repo/sarvamai/agents"
import { loadVoiceSession, takeSignedUrl, type VoiceRef } from "@/lib/voice/session"

/*
 * The signed-URL proxy's decision (plan/voice VO-4), apart from the route so it
 * can be checked without a server. The Sarvam browser SDK asks
 * `GET {baseUrl}orgs/{org}/workspaces/{ws}/apps/{app}/url`; the ids in that path
 * are ignored and ours are used, so a browser can't point us at another agent.
 */

export type ProxyReply = { status: number; body: string }

const err = (status: number, error: string): ProxyReply => ({ status, body: JSON.stringify({ error }) })

/** "mock:<id>" or "round:<id>", as the client sends it in X-Voice-Session. */
export function parseVoiceRef(header: string | null): VoiceRef | null {
    const m = /^(mock|round|standup|incident):([a-z0-9-]{10,40})$/.exec((header ?? "").trim())
    return m ? { kind: m[1] as VoiceRef["kind"], id: m[2]! } : null
}

export function isSignedUrlPath(path: string[]): boolean {
    return path.length === 7 && path[0] === "orgs" && path[2] === "workspaces" && path[4] === "apps" && path[6] === "url"
}

export async function signedUrlFor(userId: string | null, path: string[], sessionHeader: string | null): Promise<ProxyReply> {
    if (!userId) return err(401, "Sign in first.")
    if (!isSignedUrlPath(path)) return err(404, "Not found.")
    const ref = parseVoiceRef(sessionHeader)
    if (!ref) return err(400, "Which interview is this for?")
    const session = await loadVoiceSession(userId, ref)
    if (!session) return err(404, "That interview doesn't exist.")
    if (!session.live) return err(409, "This interview has ended.")
    if (!session.consentedAt || session.mode !== "VOICE") return err(409, "Agree to the recording first.")
    // Checked before counting, so a missing key doesn't use up the session's reconnects.
    if (!isAgentConfigured()) return err(503, "Live voice isn't available right now. You can type your answers instead.")
    if (!(await takeSignedUrl(session))) return err(429, "This interview has reconnected too many times. End it and start again.")
    const r = await signedUrl()
    return r.ok ? { status: 200, body: r.body } : err(r.status, r.error)
}
