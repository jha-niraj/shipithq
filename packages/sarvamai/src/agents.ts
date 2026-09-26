// Sarvam Voice Agents (plan/voice VO-3): the server half of a live interview.
//
// The browser runs `sarvam-conv-ai-sdk/browser`, which asks for a single-use
// signed WebSocket URL and then talks to the agent directly. That request comes
// to our proxy route, which calls `signedUrl()` here with the key, so no Sarvam
// secret reaches a browser. After the call, `fetchTranscript()` reads what was
// said from Sarvam: that copy, not the browser's, is what gets scored.
//
// The Voice Agents key is a different key from SARVAM_API_KEY: it is made in
// the Voice Agents dashboard (Settings, API Key) and sent as X-API-Key.

declare const process: { env: Record<string, string | undefined> }

const RUNTIME = "https://apps.sarvam.ai/api/app-runtime"
const ANALYTICS = "https://apps.sarvam.ai/api/analytics/v1"
const TIMEOUT_MS = 15_000

export interface AgentConfig {
    apiKey: string
    orgId: string
    workspaceId: string
    appId: string
}

type EnvLike = Record<string, string | undefined> | { [key: string]: unknown }

/**
 * The four keys, or null when live voice isn't configured. Reads `process.env`
 * by default; a Cloudflare Worker passes its own `env`, which is where its
 * secrets live.
 */
export function agentConfig(env?: EnvLike): AgentConfig | null {
    const e = (env ?? process.env) as Record<string, unknown>
    const read = (k: string) => (typeof e[k] === "string" ? (e[k] as string).trim() : "")
    const apiKey = read("SARVAM_AGENTS_API_KEY")
    const orgId = read("SARVAM_AGENTS_ORG_ID")
    const workspaceId = read("SARVAM_AGENTS_WORKSPACE_ID")
    const appId = read("SARVAM_AGENTS_APP_ID")
    return apiKey && orgId && workspaceId && appId ? { apiKey, orgId, workspaceId, appId } : null
}

export const isAgentConfigured = (): boolean => agentConfig() !== null

/** What the browser SDK puts in its config: the ids, never the key. */
export function publicAgentIds(): { org_id: string; workspace_id: string; app_id: string } | null {
    const c = agentConfig()
    return c ? { org_id: c.orgId, workspace_id: c.workspaceId, app_id: c.appId } : null
}

async function call(url: string, key: string): Promise<Response> {
    return fetch(url, { headers: { "X-API-Key": key }, signal: AbortSignal.timeout(TIMEOUT_MS) })
}

/**
 * A single-use signed WebSocket URL for the configured agent, as the SDK
 * expects it from `GET {baseUrl}orgs/{org}/workspaces/{ws}/apps/{app}/url`.
 * The body is passed through untouched.
 */
export async function signedUrl(): Promise<{ ok: true; status: number; body: string } | { ok: false; status: number; error: string }> {
    const c = agentConfig()
    if (!c) return { ok: false, status: 503, error: "Live voice isn't configured." }
    try {
        const res = await call(`${RUNTIME}/orgs/${encodeURIComponent(c.orgId)}/workspaces/${encodeURIComponent(c.workspaceId)}/apps/${encodeURIComponent(c.appId)}/url`, c.apiKey)
        const body = await res.text()
        if (!res.ok) {
            console.error("[sarvam/agents] signed url", res.status, body.slice(0, 300))
            return { ok: false, status: res.status === 401 || res.status === 403 ? 503 : 502, error: "Couldn't start the voice session." }
        }
        return { ok: true, status: 200, body }
    } catch (error: unknown) {
        console.error("[sarvam/agents] signed url failed:", error)
        return { ok: false, status: 502, error: "Couldn't start the voice session." }
    }
}

export interface TranscriptTurn {
    role: "interviewer" | "candidate"
    text: string
    /** Seconds from the start of the call, when Sarvam gives it. */
    at?: number
}

/** A turn's speaker, whatever Sarvam calls it. Unknown roles are dropped rather than guessed. */
function roleOf(raw: unknown): TranscriptTurn["role"] | null {
    const r = String(raw ?? "").toLowerCase()
    if (["bot", "agent", "assistant", "ai"].includes(r)) return "interviewer"
    if (["user", "human", "caller", "customer"].includes(r)) return "candidate"
    return null
}

/** Normalise the transcript body, which the docs don't describe: a list of turns, possibly under a key. */
export function normaliseTranscript(body: unknown): TranscriptTurn[] | null {
    const obj = body as Record<string, unknown> | null
    const list = Array.isArray(body) ? body
        : Array.isArray(obj?.transcript) ? obj!.transcript
        : Array.isArray(obj?.messages) ? obj!.messages
        : Array.isArray(obj?.turns) ? obj!.turns
        : Array.isArray((obj?.data as Record<string, unknown> | undefined)?.transcript) ? (obj!.data as Record<string, unknown>).transcript
        : null
    if (!Array.isArray(list)) return null
    const turns: TranscriptTurn[] = []
    for (const t of list as Record<string, unknown>[]) {
        const role = roleOf(t?.role ?? t?.speaker ?? t?.type)
        const text = String(t?.content ?? t?.text ?? t?.message ?? "").trim()
        if (!role || !text) continue
        const at = Number(t?.start_time ?? t?.time_in_call_secs ?? t?.timestamp)
        turns.push({ role, text, ...(Number.isFinite(at) ? { at } : {}) })
    }
    return turns
}

/**
 * What was said in one call. `ready: false` while Sarvam hasn't finished the
 * record (it can lag the end of a call): the caller retries rather than scoring
 * an empty transcript.
 */
export async function fetchTranscript(interactionId: string, env?: EnvLike): Promise<
    { ok: true; ready: true; turns: TranscriptTurn[]; raw: unknown } | { ok: true; ready: false } | { ok: false; error: string }
> {
    const c = agentConfig(env)
    if (!c) return { ok: false, error: "Live voice isn't configured." }
    if (!interactionId) return { ok: false, error: "No interaction id." }
    try {
        const res = await call(`${ANALYTICS}/${encodeURIComponent(c.orgId)}/${encodeURIComponent(c.workspaceId)}/${encodeURIComponent(c.appId)}/transcripts/${encodeURIComponent(interactionId)}`, c.apiKey)
        if (res.status === 404) return { ok: true, ready: false }
        if (!res.ok) {
            const detail = await res.text().catch(() => "")
            console.error("[sarvam/agents] transcript", res.status, detail.slice(0, 300))
            return res.status >= 500 ? { ok: true, ready: false } : { ok: false, error: `Transcript request failed (${res.status}).` }
        }
        const raw = (await res.json()) as unknown
        const turns = normaliseTranscript(raw)
        if (!turns || turns.length === 0) return { ok: true, ready: false }
        return { ok: true, ready: true, turns, raw }
    } catch (error: unknown) {
        console.error("[sarvam/agents] transcript failed:", error)
        return { ok: true, ready: false }
    }
}
