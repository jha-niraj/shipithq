import "server-only"
import crypto from "crypto"

// ─────────────────────────────────────────────────────────────────────────────
// Dispatching a job to apps/worker from the hiring app (plan/hiring-rounds
// HR-11: aptitude question generation). A copy of apps/admin/lib/workers.ts;
// both follow apps/main's `startBackgroundJob` protocol.
//
// The same protocol as apps/main's `startBackgroundJob`: a `background_job` row
// is inserted by the caller, then `POST /api/v1/jobs` with a token signed by
// WORKER_SECRET for that one jobId. In production the WORKER service binding is
// used (declared in wrangler.jsonc); locally, WORKER_URL.
//
// Two rules copied from apps/main/lib/workers/client.ts, where both were learned
// the hard way:
// - Call `fetch(url, init)`, never `fetch(new Request(...))`. `next dev` swaps
//   in its own `Request` class, and undici then reads the object as the URL
//   "[object Request]".
// - Import `@opennextjs/cloudflare` lazily. Outside a Worker it cannot resolve.
// ─────────────────────────────────────────────────────────────────────────────

interface ServiceBinding {
    fetch: (input: string | Request, init?: RequestInit) => Promise<Response>
}

async function workerBinding(): Promise<ServiceBinding | null> {
    try {
        const { getCloudflareContext } = await import("@opennextjs/cloudflare")
        const ctx = await getCloudflareContext({ async: true })
        const binding = (ctx?.env as Record<string, unknown> | undefined)?.WORKER
        return binding && typeof (binding as ServiceBinding).fetch === "function" ? (binding as ServiceBinding) : null
    } catch {
        return null
    }
}

/** A token the worker accepts for starting exactly this job, valid for 5 minutes. */
function jobToken(userId: string, jobId: string): string {
    const secret = process.env.WORKER_SECRET
    if (!secret) throw new Error("WORKER_SECRET is not set for the hiring app")
    const now = Math.floor(Date.now() / 1000)
    const payload = JSON.stringify({ userId, action: "start_job", jobId, iat: now, exp: now + 300 })
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url")
    return `${Buffer.from(payload).toString("base64url")}.${signature}`
}

/**
 * Hand a job to the worker. Throws with a readable reason when it is refused or
 * unreachable; the caller marks its rows failed.
 */
export async function dispatchJob(type: string, jobId: string, userId: string, input: unknown): Promise<void> {
    const init: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jobToken(userId, jobId)}` },
        body: JSON.stringify({ type, jobId, input }),
    }
    const binding = await workerBinding()
    let res: Response
    try {
        res = binding
            ? await binding.fetch("https://shipithq-worker/api/v1/jobs", init)
            : await fetch(`${process.env.WORKER_URL || "http://localhost:8787"}/api/v1/jobs`, init)
    } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error)
        const hint = process.env.NODE_ENV !== "production" ? " Start apps/worker (`pnpm dev`) or set WORKER_URL." : ""
        throw new Error(`The job worker is not reachable (${detail}).${hint}`)
    }
    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`The job worker refused the job (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`)
    }
}
